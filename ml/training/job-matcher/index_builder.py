"""
build_index.py - FIXED VERSION

One-time offline preprocessing:
- Embeds all O*NET occupations using JobBERT-v2
- Builds and saves a FAISS index (cosine similarity)
- Exports the model to ONNX for optimized deployment
- Saves occupation metadata for overlap calculation
"""

import json
import numpy as np
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
BASE_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

INPUT_JSON = PROCESSED_DIR / "occupation_profiles.json"
INDEX_PATH = MODELS_DIR / "onet_embeddings.faiss"
META_PATH = MODELS_DIR / "occupation_metadata.json"
ONNX_MODEL_DIR = MODELS_DIR / "jobbert_v2_onnx"

# ----------------------------------------------------------------------
# Helper function - matches the one in merge_dataset.py
# ----------------------------------------------------------------------
def flatten_occupation_for_embedding(occ: dict) -> str:
    """
    Convert an occupation profile into a deduplicated natural-language string
    suitable for JobBERT-v2 embedding.
    
    Excludes interests (they are personality signals, not competencies).
    """
    title = occ.get("Title", "")
    
    # Extract competency names (safe access)
    skill_names = [s["name"] for s in occ.get("skills", []) if isinstance(s, dict) and "name" in s]
    knowledge_names = [k["name"] for k in occ.get("knowledge", []) if isinstance(k, dict) and "name" in k]
    ability_names = occ.get("abilities", []) if isinstance(occ.get("abilities", []), list) else []
    tech_names = occ.get("technology_skills", []) if isinstance(occ.get("technology_skills", []), list) else []
    
    # Combine and deduplicate
    all_competencies = skill_names + knowledge_names + ability_names + tech_names
    all_competencies = sorted(set(all_competencies))  # deduplication + stable order
    
    comp_text = ", ".join(all_competencies) if all_competencies else "None specified"
    return f"{title}. Skills include {comp_text}."

# ----------------------------------------------------------------------
# Step 1: Load occupations and create text profiles
# ----------------------------------------------------------------------
print("Loading occupation profiles...")
with open(INPUT_JSON, "r", encoding="utf-8") as f:
    occupations = json.load(f)

texts = [flatten_occupation_for_embedding(occ) for occ in occupations]
print(f"Loaded {len(texts)} occupations.")

# Print first example to verify
print("\nExample flattened text:")
print(texts[0][:200] + "...")

# ----------------------------------------------------------------------
# Step 2: Load JobBERT-v2 and generate embeddings
# ----------------------------------------------------------------------
print("\nLoading JobBERT-v2 model...")
model = SentenceTransformer("TechWolf/JobBERT-v2")

print("Generating embeddings...")
embeddings = model.encode(texts, batch_size=32, show_progress_bar=True)

print(f"Generated embeddings with shape: {embeddings.shape}")

# ----------------------------------------------------------------------
# Step 3: Build FAISS index
# ----------------------------------------------------------------------
vectors = embeddings.astype(np.float32)
faiss.normalize_L2(vectors)

dim = vectors.shape[1]  # should be 1024
index = faiss.IndexFlatIP(dim)
index.add(vectors)

faiss.write_index(index, str(INDEX_PATH))
print(f"\n✓ FAISS index saved to {INDEX_PATH} (dimension = {dim})")

# ----------------------------------------------------------------------
# Step 4: Save occupation metadata
# ----------------------------------------------------------------------
metadata = []
for occ in occupations:
    # Extract competency names
    skill_names = [s["name"] for s in occ.get("skills", []) if isinstance(s, dict) and "name" in s]
    knowledge_names = [k["name"] for k in occ.get("knowledge", []) if isinstance(k, dict) and "name" in k]
    ability_names = occ.get("abilities", []) if isinstance(occ.get("abilities", []), list) else []
    tech_names = occ.get("technology_skills", []) if isinstance(occ.get("technology_skills", []), list) else []
    
    all_comp = skill_names + knowledge_names + ability_names + tech_names
    all_comp = sorted(set(all_comp))
    
    metadata.append({
        "title": occ.get("Title", "Unknown"),
        "competencies": all_comp,
        # Note: Your JSON doesn't have SOC codes at the top level
        # You may need to add this field or use a different identifier
    })

with open(META_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"✓ Metadata saved to {META_PATH}")

# ----------------------------------------------------------------------
# Step 5: Export model to ONNX for optimized deployment
# ----------------------------------------------------------------------
print("\nExporting JobBERT-v2 to ONNX...")

try:
    # Method 1: Use optimum library (recommended for deployment)
    # This requires: pip install optimum[exporters]
    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        from transformers import AutoTokenizer
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained("TechWolf/JobBERT-v2")
        
        # Export to ONNX
        ort_model = ORTModelForFeatureExtraction.from_pretrained(
            "TechWolf/JobBERT-v2",
            export=True,
        )
        
        # Save ONNX model and tokenizer
        ONNX_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        ort_model.save_pretrained(str(ONNX_MODEL_DIR))
        tokenizer.save_pretrained(str(ONNX_MODEL_DIR))
        
        print(f"✓ ONNX model (optimum) saved to {ONNX_MODEL_DIR}")
        
    except ImportError:
        print("⚠ optimum library not installed, trying alternative method...")
        
        # Method 2: Manual export using torch
        import torch
        from transformers import AutoModel, AutoTokenizer
        
        # Load the base transformer
        base_model = AutoModel.from_pretrained("TechWolf/JobBERT-v2")
        tokenizer = AutoTokenizer.from_pretrained("TechWolf/JobBERT-v2")
        
        # Create dummy input
        dummy_text = "Sample text for ONNX export"
        inputs = tokenizer(dummy_text, return_tensors="pt")
        
        # Export to ONNX
        ONNX_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        onnx_path = ONNX_MODEL_DIR / "model.onnx"
        
        torch.onnx.export(
            base_model,
            (inputs["input_ids"], inputs["attention_mask"]),
            str(onnx_path),
            input_names=["input_ids", "attention_mask"],
            output_names=["last_hidden_state"],
            dynamic_axes={
                "input_ids": {0: "batch", 1: "sequence"},
                "attention_mask": {0: "batch", 1: "sequence"},
                "last_hidden_state": {0: "batch", 1: "sequence"},
            },
            opset_version=14,
        )
        
        # Save tokenizer
        tokenizer.save_pretrained(str(ONNX_MODEL_DIR))
        
        print(f"✓ ONNX model (torch) saved to {onnx_path}")
        print("⚠ Note: This export only includes the base model, not the pooling layer")
        print("   For production, consider using optimum library: pip install optimum[exporters]")
        
except Exception as e:
    print(f"✗ ONNX export failed: {e}")
    print("\nFor deployment optimization, you have two options:")
    print("1. Install optimum: pip install optimum[exporters] optimum[onnxruntime]")
    print("2. Use the standard model with CPU optimization (still fast for inference)")
    print("\nThe FAISS index and metadata are ready for deployment even without ONNX.")

print("\n" + "="*70)
print("✅ Offline build complete!")
print("="*70)
print(f"\nGenerated files:")
print(f"  - {INDEX_PATH} (FAISS index)")
print(f"  - {META_PATH} (occupation metadata)")
if ONNX_MODEL_DIR.exists():
    print(f"  - {ONNX_MODEL_DIR}/ (ONNX model)")
print(f"\nYou can now deploy these files for optimized runtime matching.")