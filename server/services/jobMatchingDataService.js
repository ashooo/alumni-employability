const fs = require('fs');
const path = require('path');
const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { runMlScript } = require('../utils/mlRunner');

const ML_ROOT = path.resolve(__dirname, '../../ml');
const JOB_MATCHING_SCRIPT = 'scripts/predict_job_matching.py';
const JOB_MATCHING_TIMEOUT_MS = 180000;
const JOB_MATCHING_MODEL_NAME = 'job_matcher';
const JOB_MATCHING_MODEL_VERSION = 'jobbert_v2_onnx';
const MAX_TOP_N = 20;

const CANDIDATE_KIND_PRIORITY = {
  HARD_SKILL: 0,
  SOFT_SKILL: 1,
  TECHNOLOGY: 2,
  KNOWLEDGE: 3,
  ABILITY: 4,
  INTEREST: 5
};

const REQUIRED_RUNTIME_FILES = [
  path.join(ML_ROOT, 'scripts', 'predict_job_matching.py'),
  path.join(ML_ROOT, 'scripts', 'job-matching', 'job-matcher.py'),
  path.join(ML_ROOT, 'models', 'job_matcher_config.json'),
  path.join(ML_ROOT, 'models', 'occupation_metadata.json'),
  path.join(ML_ROOT, 'models', 'onet_embeddings.faiss'),
  path.join(ML_ROOT, 'models', 'jobbert_v2_onnx', 'config.json'),
  path.join(ML_ROOT, 'models', 'jobbert_v2_onnx', 'model.onnx'),
  path.join(ML_ROOT, 'models', 'jobbert_v2_onnx', 'tokenizer.json')
];

const normalizeCandidateSkills = (values) => {
  const rawValues = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(/[\r\n,]+/)
      : [];

  const seen = new Set();
  const normalized = [];

  for (const rawValue of rawValues) {
    const text = String(rawValue || '').trim();
    if (!text) {
      continue;
    }

    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(text);
  }

  return normalized;
};

const clampTopN = (value, fallback = 10) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsed, MAX_TOP_N));
};

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const getJobMatchingRuntimeStatus = () => {
  const missingPaths = REQUIRED_RUNTIME_FILES.filter((filePath) => !fs.existsSync(filePath));

  return {
    ready: missingPaths.length === 0,
    modelName: JOB_MATCHING_MODEL_NAME,
    modelVersion: JOB_MATCHING_MODEL_VERSION,
    missingPaths: missingPaths.map((filePath) => path.relative(ML_ROOT, filePath).replace(/\\/g, '/'))
  };
};

const getLatestCandidateSubmission = async (studentId) => {
  const refactorPrisma = requireRefactorPrisma();
  const alumniProfile = await refactorPrisma.alumniProfile.findUnique({
    where: { student_id: String(studentId) },
    include: {
      current_program: {
        include: {
          college: true
        }
      }
    }
  });

  if (!alumniProfile) {
    const error = new Error('Alumni profile not found in refactor schema');
    error.statusCode = 404;
    throw error;
  }

  const submission = await refactorPrisma.surveySubmission.findFirst({
    where: {
      alumni_profile_id: alumniProfile.id,
      status: 'COMPLETED',
      submission_competencies: {
        some: {
          selected: true,
          competency: {
            is_active: true
          }
        }
      }
    },
    orderBy: [
      { submitted_at: 'desc' },
      { created_at: 'desc' }
    ],
    include: {
      template: true,
      academic_snapshot: true,
      submission_competencies: {
        where: {
          selected: true,
          competency: {
            is_active: true
          }
        },
        include: {
          competency: true
        }
      }
    }
  });

  return {
    alumniProfile,
    submission
  };
};

const buildCandidateProfileFromSubmission = (submission) => {
  const competencyEntries = (submission?.submission_competencies || [])
    .filter((entry) => entry.competency && entry.selected !== false)
    .map((entry) => ({
      id: entry.competency.id,
      name: entry.competency.name,
      kind: entry.competency.kind,
      score: entry.score === null || entry.score === undefined ? null : Number(entry.score),
      importance: entry.importance === null || entry.importance === undefined ? null : Number(entry.importance)
    }))
    .sort((left, right) => {
      const leftKindPriority = CANDIDATE_KIND_PRIORITY[left.kind] ?? 99;
      const rightKindPriority = CANDIDATE_KIND_PRIORITY[right.kind] ?? 99;
      if (leftKindPriority !== rightKindPriority) {
        return leftKindPriority - rightKindPriority;
      }

      const rightScore = right.score ?? -1;
      const leftScore = left.score ?? -1;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.name.localeCompare(right.name);
    });

  return {
    candidateSkills: normalizeCandidateSkills(competencyEntries.map((entry) => entry.name)),
    competencies: competencyEntries,
    submissionId: submission?.id || null,
    academicSnapshotId: submission?.academic_snapshot_id || null,
    branchPath: submission?.branch_path || null,
    templateKey: submission?.template?.template_key || null
  };
};

const runJobMatchingPrediction = async ({ candidateSkills, topN }) => {
  const runtimeStatus = getJobMatchingRuntimeStatus();
  if (!runtimeStatus.ready) {
    const error = new Error(
      `Job-matching runtime is not ready. Missing files: ${runtimeStatus.missingPaths.join(', ')}`
    );
    error.statusCode = 503;
    throw error;
  }

  const normalizedSkills = normalizeCandidateSkills(candidateSkills);
  if (normalizedSkills.length === 0) {
    const error = new Error('At least one candidate skill is required for job matching');
    error.statusCode = 400;
    throw error;
  }

  const result = await runMlScript({
    scriptPath: JOB_MATCHING_SCRIPT,
    input: {
      candidate_skills: normalizedSkills,
      top_n: clampTopN(topN)
    },
    timeoutMs: JOB_MATCHING_TIMEOUT_MS
  });

  if (result.code !== 0) {
    const error = new Error(result.stderr || 'Job-matching runtime failed');
    error.statusCode = 500;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    const parseError = new Error(`Failed to parse job-matching output: ${result.stdout}`);
    parseError.statusCode = 500;
    throw parseError;
  }

  if (parsed.status !== 'success') {
    const runtimeError = new Error(parsed.message || 'Job-matching runtime returned an error');
    runtimeError.statusCode = 500;
    throw runtimeError;
  }

  return parsed;
};

const persistJobMatchingPrediction = async ({
  alumniProfileId,
  academicSnapshotId,
  submissionId,
  candidateSkills,
  prediction
}) => {
  const refactorPrisma = requireRefactorPrisma();
  const topMatch = Array.isArray(prediction.matches) ? prediction.matches[0] : null;
  const topScore = Number(topMatch?.final_score ?? topMatch?.score);

  return refactorPrisma.mlPrediction.create({
    data: {
      prediction_type: 'JOB_MATCHING',
      model_name: JOB_MATCHING_MODEL_NAME,
      model_version: prediction.model_version || JOB_MATCHING_MODEL_VERSION,
      alumni_profile_id: alumniProfileId,
      academic_snapshot_id: academicSnapshotId || null,
      submission_id: submissionId || null,
      input_snapshot: {
        candidate_skills: candidateSkills,
        top_n: prediction.top_n ?? null,
        submission_id: submissionId || null
      },
      output_json: prediction,
      confidence: Number.isFinite(topScore) ? topScore : null
    }
  });
};

const generateJobMatchingPrediction = async ({ studentId, topN, candidateSkills }) => {
  const { alumniProfile, submission } = await getLatestCandidateSubmission(studentId);

  const manualSkills = normalizeCandidateSkills(candidateSkills);
  const candidateProfile = submission ? buildCandidateProfileFromSubmission(submission) : null;
  const resolvedSkills = manualSkills.length > 0 ? manualSkills : candidateProfile?.candidateSkills || [];

  if (resolvedSkills.length === 0) {
    const error = new Error(
      'No saved competencies were found for this alumni. Complete the survey path or provide candidate skills manually.'
    );
    error.statusCode = 404;
    throw error;
  }

  const prediction = await runJobMatchingPrediction({
    candidateSkills: resolvedSkills,
    topN
  });

  const storedPrediction = await persistJobMatchingPrediction({
    alumniProfileId: alumniProfile.id,
    academicSnapshotId: candidateProfile?.academicSnapshotId || null,
    submissionId: candidateProfile?.submissionId || null,
    candidateSkills: resolvedSkills,
    prediction
  });

  return {
    studentId: String(studentId),
    source: manualSkills.length > 0 ? 'manual_override' : 'latest_submission',
    submissionId: candidateProfile?.submissionId || null,
    academicSnapshotId: candidateProfile?.academicSnapshotId || null,
    candidateSkills: resolvedSkills,
    predictionId: storedPrediction.id,
    prediction
  };
};

const getLatestJobMatchingPrediction = async (studentId) => {
  const refactorPrisma = requireRefactorPrisma();
  const prediction = await refactorPrisma.mlPrediction.findFirst({
    where: {
      prediction_type: 'JOB_MATCHING',
      alumni_profile: {
        student_id: String(studentId)
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    include: {
      alumni_profile: true,
      academic_snapshot: true,
      submission: true
    }
  });

  if (!prediction) {
    return null;
  }

  const output = prediction.output_json || {};
  const inputSnapshot = prediction.input_snapshot || {};
  const matches = Array.isArray(output.matches) ? output.matches : [];

  return {
    id: prediction.id,
    studentId: prediction.alumni_profile.student_id,
    predictionType: prediction.prediction_type,
    modelName: prediction.model_name,
    modelVersion: prediction.model_version,
    confidence: prediction.confidence === null || prediction.confidence === undefined
      ? null
      : Number(prediction.confidence),
    topN: output.top_n ?? inputSnapshot.top_n ?? matches.length,
    totalMatches: output.total_matches ?? matches.length,
    candidateSkills: normalizeCandidateSkills(
      inputSnapshot.candidate_skills || output.candidate_skills || []
    ),
    matches,
    sourceSubmissionId: prediction.submission_id,
    academicSnapshotId: prediction.academic_snapshot_id,
    predictionDate: prediction.created_at,
    createdAt: prediction.created_at,
    updatedAt: prediction.updated_at
  };
};

const testJobMatchingPrediction = async ({ candidateSkills, topN }) => {
  return runJobMatchingPrediction({
    candidateSkills,
    topN
  });
};

module.exports = {
  generateJobMatchingPrediction,
  getJobMatchingRuntimeStatus,
  getLatestJobMatchingPrediction,
  testJobMatchingPrediction
};
