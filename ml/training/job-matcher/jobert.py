from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# ============================================
# 1. LOAD PRETRAINED MODEL (RAW, NO TRAINING)
# ============================================
model = SentenceTransformer("TechWolf/JobBERT-v2")

# ============================================
# 2. PREPARE YOUR 1,100 JOBS (from your dataset)
# ============================================
jobs = [
    {
        'job_id': '3902668440',
        'job_title': 'Sr Human Resource Generalist',
        'job_description': 'Full-cycle HR support...',
        'job_skill_set': ['payroll processing', 'FMLA', 'employee relations']
    },
    # ... 1,099 more jobs
]

# ============================================
# 3. BUILD JOB TEXTS & EMBED (ONE-TIME)
# ============================================
def build_job_text(job):
    skills = ', '.join(job['job_skill_set'])
    desc = job['job_description'][:300]
    return f"{job['job_title']}. Key skills: {skills}. {desc}"

job_texts = [build_job_text(job) for job in jobs]

# Raw model usage - just call encode()
job_embeddings = model.encode(job_texts, show_progress_bar=True)

# ============================================
# 4. BUILD FAISS INDEX
# ============================================
embeddings_array = np.array(job_embeddings).astype('float32')
faiss.normalize_L2(embeddings_array)

index = faiss.IndexFlatIP(1024)  # JobBERT-v2 outputs 1024-dim vectors
index.add(embeddings_array)

# ============================================
# 5. QUERY WITH A CANDIDATE (RUNTIME)
# ============================================
candidate_skills = ['payroll processing', 'employee relations', 'HR compliance']

def build_candidate_text(skills):
    return f"Candidate with experience in {', '.join(skills)}."

candidate_text = build_candidate_text(candidate_skills)

# Raw model usage again - just encode
candidate_embedding = model.encode([candidate_text])
candidate_vec = np.array(candidate_embedding).astype('float32')
faiss.normalize_L2(candidate_vec)

# Search
scores, indices = index.search(candidate_vec, 10)

# ============================================
# 6. RETURN RESULTS
# ============================================
for score, idx in zip(scores[0], indices[0]):
    job = jobs[idx]
    print(f"{job['job_title']}: {score:.3f}")