import importlib.util
import json
import sys
from pathlib import Path


SCRIPT_ROOT = Path(__file__).resolve().parent
MODELS_DIR = SCRIPT_ROOT.parent / "models"
RUNTIME_SCRIPT = SCRIPT_ROOT / "job-matching" / "job-matcher.py"


def load_job_matcher():
    spec = importlib.util.spec_from_file_location("job_matcher_runtime", RUNTIME_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load job matcher runtime from {RUNTIME_SCRIPT}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.JobMatcher


def normalize_skills(values):
    if isinstance(values, str):
        values = values.replace("\r", "\n").replace(",", "\n").split("\n")
    elif not isinstance(values, list):
        values = []

    normalized = []
    seen = set()

    for value in values:
        text = str(value or "").strip()
        if not text:
            continue

        key = text.casefold()
        if key in seen:
            continue

        seen.add(key)
        normalized.append(text)

    return normalized


def parse_top_n(value, default=10):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    return max(1, min(parsed, 20))


def build_single_response(matcher, payload):
    candidate_skills = normalize_skills(
        payload.get("candidate_skills") or payload.get("skills") or payload.get("competencies")
    )
    if not candidate_skills:
        raise ValueError("candidate_skills cannot be empty")

    top_n = parse_top_n(payload.get("top_n", 10))
    candidate_titles = payload.get("candidate_titles")
    matches = matcher.match(
        candidate_skills,
        top_n=top_n,
        include_overlap=True,
        candidate_titles=candidate_titles
    )

    return {
        "status": "success",
        "model_type": "JobMatcher",
        "model_version": "jobbert_v2_onnx",
        "model_backend": "onnx",
        "top_n": top_n,
        "candidate_skills": candidate_skills,
        "total_matches": len(matches),
        "matches": matches,
    }


def build_batch_response(matcher, payload):
    raw_candidates = payload.get("candidates")
    if not isinstance(raw_candidates, list) or not raw_candidates:
        raise ValueError("candidates must be a non-empty list")

    top_n = parse_top_n(payload.get("top_n", 10))
    results = []

    for candidate in raw_candidates:
        normalized_candidate = normalize_skills(
            candidate.get("candidate_skills") or candidate.get("skills") or candidate.get("competencies")
        )
        if not normalized_candidate:
            raise ValueError("Each candidate must include candidate_skills")

        matches = matcher.match(
            normalized_candidate,
            top_n=top_n,
            include_overlap=True,
            candidate_titles=candidate.get("candidate_titles")
        )
        results.append(
            {
                "id": candidate.get("id"),
                "candidate_skills": normalized_candidate,
                "total_matches": len(matches),
                "matches": matches,
            }
        )

    return {
        "status": "success",
        "model_type": "JobMatcher",
        "model_version": "jobbert_v2_onnx",
        "model_backend": "onnx",
        "top_n": top_n,
        "candidate_count": len(results),
        "results": results,
    }


def main():
    try:
        input_raw = sys.stdin.read()
        if not input_raw.strip():
            print(json.dumps({"status": "error", "message": "No input data provided"}))
            return

        payload = json.loads(input_raw)
        job_matcher_class = load_job_matcher()
        matcher = job_matcher_class(models_dir=str(MODELS_DIR), use_onnx=True)

        if isinstance(payload, dict) and isinstance(payload.get("candidates"), list):
            response = build_batch_response(matcher, payload)
        else:
            if isinstance(payload, list):
                payload = {"candidate_skills": payload}
            response = build_single_response(matcher, payload)

        print(json.dumps(response))
    except Exception as error:
        print(
            json.dumps(
                {
                    "status": "error",
                    "message": str(error),
                }
            )
        )


if __name__ == "__main__":
    main()
