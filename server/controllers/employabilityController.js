const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/db');
const { runMlScript, resolvePythonExecutable } = require('../utils/mlRunner');
const {
  getLatestRefactorPrediction,
  submitEmployabilitySurvey: persistEmployabilitySurvey
} = require('../services/employabilityDataService');

const HARD_SKILL_MIN_SELECTIONS = 4;
const HARD_SKILL_MAX_SELECTIONS = 10;
const SOFT_SKILL_MIN_SELECTIONS = 3;
const SOFT_SKILL_MAX_SELECTIONS = 7;
const HARD_SKILL_TARGET_COUNT = 6;
const SOFT_SKILL_TARGET_COUNT = 4;

const parseNumeric = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeAverageScore = (skills) => {
  if (!Array.isArray(skills) || skills.length === 0) {
    return 0;
  }

  const total = skills.reduce((acc, curr) => acc + Number.parseInt(curr.score, 10), 0);
  return total / skills.length;
};

const applyCoverageAdjustment = (averageScore, selectedCount, targetCount) => {
  if (!selectedCount || !targetCount || averageScore <= 0) {
    return 0;
  }

  const coverageRatio = Math.min(selectedCount, targetCount) / targetCount;
  const coverageMultiplier = Math.sqrt(Math.max(coverageRatio, 0));
  return averageScore * coverageMultiplier;
};

const validateSelectionCount = (count, minimum, maximum, label) => {
  if (count < minimum || count > maximum) {
    const error = new Error(`Please select between ${minimum} and ${maximum} ${label}.`);
    error.statusCode = 400;
    throw error;
  }
};

const requireRefactorPrisma = () => {
  const setupStatus = getRefactorSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getRefactorPrisma();
};

const ensureSubmissionAccess = (req, res, studentId) => {
  const requestUsername = String(studentId);
  const tokenUsername = String(req.user?.username || '');
  const role = String(req.user?.role || '').toLowerCase();

  if (!tokenUsername) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (role === 'admin' || role === 'superadmin') {
    return true;
  }

  if (tokenUsername !== requestUsername) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
};

const buildModelInput = (academicData, degreeName, hardAve, softAve) => {
  return {
    Gender: academicData.gender,
    Age: Number.parseInt(academicData.age, 10),
    Degree: degreeName || 'Unknown',
    'Year Graduated': Number.parseInt(academicData.year_graduated, 10),
    CGPA: parseNumeric(academicData.cgpa),
    'Average Prof Grade': parseNumeric(academicData.prof_grade),
    'Average Elec Grade': parseNumeric(academicData.elec_grade),
    'OJT Grade': parseNumeric(academicData.ojt_grade),
    'Leadership POS': academicData.leader_pos === 'Yes' || academicData.leader_pos === true ? 'Yes' : 'No',
    'Act Member POS': academicData.act_member_pos === 'Yes' || academicData.act_member_pos === true ? 'Yes' : 'No',
    'Soft Skills Ave': parseNumeric(softAve.toFixed(2)),
    'Hard Skills Ave': parseNumeric(hardAve.toFixed(2))
  };
};

const submitEmployabilitySurvey = async (req, res) => {
  try {
    const { studentId, academicData, skillRatings, additionalAnswers } = req.body;

    if (!studentId || !academicData || !Array.isArray(skillRatings)) {
      return res.status(400).json({ error: 'Missing required survey data' });
    }

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();

    const user = await refactorPrisma.user.findUnique({
      where: { username: String(studentId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User/Alumni record not found in refactor schema' });
    }

    const degreeId = Number.parseInt(academicData.degree_id, 10);
    if (!Number.isFinite(degreeId)) {
      return res.status(400).json({ error: 'A valid degree/program is required' });
    }

    const program = await refactorPrisma.program.findUnique({
      where: { id: degreeId }
    });

    if (!program) {
      return res.status(400).json({ error: 'Selected degree/program does not exist in refactor schema' });
    }

    const hardSkills = skillRatings.filter((skill) => skill.type === 'hard');
    const softSkills = skillRatings.filter((skill) => skill.type === 'soft');

    validateSelectionCount(
      hardSkills.length,
      HARD_SKILL_MIN_SELECTIONS,
      HARD_SKILL_MAX_SELECTIONS,
      'hard skills'
    );
    validateSelectionCount(
      softSkills.length,
      SOFT_SKILL_MIN_SELECTIONS,
      SOFT_SKILL_MAX_SELECTIONS,
      'soft skills'
    );

    const hardAve = computeAverageScore(hardSkills);
    const softAve = computeAverageScore(softSkills);
    const adjustedHardAve = applyCoverageAdjustment(
      hardAve,
      hardSkills.length,
      HARD_SKILL_TARGET_COUNT
    );
    const adjustedSoftAve = applyCoverageAdjustment(
      softAve,
      softSkills.length,
      SOFT_SKILL_TARGET_COUNT
    );

    const modelInput = buildModelInput(
      academicData,
      program.name,
      adjustedHardAve,
      adjustedSoftAve
    );

    let mlResult;
    try {
      mlResult = await runMlScript({
        scriptPath: 'scripts/predict_employability.py',
        input: modelInput
      });
    } catch (error) {
      console.error('[ML] Failed to start Python process in submit:', error);
      return res.status(500).json({ error: 'Failed to start ML pipeline' });
    }

    if (mlResult.code !== 0) {
      console.error('ML Prediction Process Error:', mlResult.stderr);
      return res.status(500).json({ error: 'ML Prediction service failed' });
    }

    let predictionResult;
    try {
      predictionResult = JSON.parse(mlResult.stdout);
    } catch (error) {
      console.error('Error parsing ML result:', error, mlResult.stdout);
      return res.status(500).json({ error: 'Failed to parse prediction result' });
    }

    if (predictionResult.status !== 'success') {
      return res.status(500).json({
        error: predictionResult.message || 'Prediction script returned error'
      });
    }

    const stored = await persistEmployabilitySurvey({
      studentId: String(studentId),
      academicData,
      skillRatings,
      additionalAnswers: additionalAnswers || {},
      modelInput,
      predictionResult
    });

    return res.json({
      success: true,
      message: 'Survey processed and prediction generated',
      storage: {
        refactor: true,
        refactor_submission_id: stored.surveySubmissionId
      },
      prediction: {
        employable: Boolean(predictionResult.employable),
        probability: predictionResult.probability,
        label: predictionResult.label,
        confidence: predictionResult.confidence,
        model_type: predictionResult.model_type || null
      }
    });
  } catch (error) {
    console.error('Employability survey error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error processing survey'
    });
  }
};

const getLatestPrediction = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const prediction = await getLatestRefactorPrediction(studentId);
    if (!prediction) {
      return res.status(404).json({ error: 'No prediction found for this alumni' });
    }

    return res.json(prediction);
  } catch (error) {
    console.error('Get latest prediction error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

const testPrediction = async (req, res) => {
  try {
    const { modelInput } = req.body;

    if (!modelInput) {
      return res.status(400).json({ error: 'Missing model input data' });
    }

    console.log(`[ML] Executing prediction with: ${resolvePythonExecutable()}`);

    const mlResult = await runMlScript({
      scriptPath: 'scripts/predict_employability.py',
      input: modelInput
    });

    if (mlResult.code !== 0) {
      console.error('ML Prediction Process Error:', mlResult.stderr);
      return res.status(500).json({ error: 'ML Prediction service failed', details: mlResult.stderr });
    }

    try {
      const predictionResult = JSON.parse(mlResult.stdout);
      if (predictionResult.status === 'success') {
        return res.json({
          success: true,
          prediction: predictionResult
        });
      }

      return res.status(500).json({ error: predictionResult.message });
    } catch (error) {
      console.error('Parsing error:', error, mlResult.stdout);
      return res.status(500).json({ error: 'Failed to parse prediction result' });
    }
  } catch (error) {
    console.error('Fatal Test Prediction Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  submitEmployabilitySurvey,
  getLatestPrediction,
  testPrediction
};
