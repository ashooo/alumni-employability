const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
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
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
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

const buildModelInput = (academicData, degreeName, hardAve, softAve, internshipExp, certifications) => {
  return {
    CGPA: parseNumeric(academicData.cgpa),
    'Average Prof Grade': parseNumeric(academicData.prof_grade),
    'Average Elec Grade': parseNumeric(academicData.elec_grade),
    'OJT Grade': parseNumeric(academicData.ojt_grade),
    'Leadership POS': academicData.leader_pos === 'Yes' || academicData.leader_pos === true ? 'Yes' : 'No',
    'Act Member POS': academicData.act_member_pos === 'Yes' || academicData.act_member_pos === true ? 'Yes' : 'No',
    'Soft Skills Ave': parseNumeric(softAve.toFixed(2)),
    'Hard Skills Ave': parseNumeric(hardAve.toFixed(2)),
    'Board Exam': parseNumeric(academicData.board_exam),
    'Internship Experience': parseNumeric(internshipExp.toFixed(1)),
    'Certifications': Math.round(certifications)
  };
};

/**
 * Fetch an alumni's academic snapshot from the DB.
 * Returns the latest snapshot with program info for display on the survey.
 */
const getAcademicProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();

    const alumniProfile = await refactorPrisma.alumniProfile.findFirst({
      where: { student_id: String(studentId) },
      include: {
        academic_snapshots: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: { program: true }
        },
        user: { select: { first_name: true, last_name: true } }
      }
    });

    if (!alumniProfile) {
      return res.status(404).json({ error: 'Alumni profile not found' });
    }

    const snapshot = alumniProfile.academic_snapshots[0];
    if (!snapshot) {
      return res.status(404).json({ error: 'No academic record found for this alumni' });
    }

    return res.json({
      cgpa: Number(snapshot.cgpa) || 0,
      prof_grade: Number(snapshot.prof_grade) || 0,
      elec_grade: Number(snapshot.elec_grade) || 0,
      ojt_grade: Number(snapshot.ojt_grade) || 0,
      gender: snapshot.gender || '',
      age: snapshot.age || 0,
      year_graduated: snapshot.year_graduated || new Date().getFullYear(),
      degree_id: snapshot.program_id || alumniProfile.current_program_id,
      degree_name: snapshot.program?.name || '',
      leader_pos: Boolean(snapshot.leader_pos),
      act_member_pos: Boolean(snapshot.act_member_pos),
      student_name: `${alumniProfile.user?.first_name || ''} ${alumniProfile.user?.last_name || ''}`.trim()
    });
  } catch (error) {
    console.error('Get academic profile error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

const submitEmployabilitySurvey = async (req, res) => {
  try {
    const { studentId, academicData, skillRatings, additionalAnswers } = req.body;

    if (!studentId || !Array.isArray(skillRatings)) {
      return res.status(400).json({ error: 'Missing required survey data' });
    }

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();

    // Fetch the alumni profile + latest academic snapshot from DB (source of truth)
    const alumniProfile = await refactorPrisma.alumniProfile.findFirst({
      where: { student_id: String(studentId) },
      include: {
        user: true,
        academic_snapshots: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: { program: true }
        }
      }
    });

    if (!alumniProfile || !alumniProfile.user) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    const snapshot = alumniProfile.academic_snapshots[0];
    if (!snapshot) {
      return res.status(404).json({ error: 'No academic record found. Contact admin.' });
    }

    const program = snapshot.program;
    if (!program) {
      return res.status(400).json({ error: 'Program not found for academic record' });
    }

    // Build academicData from DB, only leader_pos and act_member_pos come from user input
    const dbAcademicData = {
      cgpa: Number(snapshot.cgpa) || 0,
      prof_grade: Number(snapshot.prof_grade) || 0,
      elec_grade: Number(snapshot.elec_grade) || 0,
      ojt_grade: Number(snapshot.ojt_grade) || 0,
      gender: snapshot.gender || '',
      age: snapshot.age || 0,
      year_graduated: snapshot.year_graduated || new Date().getFullYear(),
      degree_id: program.id,
      board_exam: snapshot.board_exam ? 1 : 0,
      leader_pos: academicData?.leader_pos === true || academicData?.leader_pos === 'Yes',
      act_member_pos: academicData?.act_member_pos === true || academicData?.act_member_pos === 'Yes'
    };

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

    // Derive synthetic features for model consistency (1-5 scale)
    // Internship logic: OJT performace + leadership bonus
    let internshipExp = 2.0; // Default
    if (dbAcademicData.ojt_grade <= 1.3) internshipExp = 4.5;
    else if (dbAcademicData.ojt_grade <= 1.6) internshipExp = 4.0;
    else if (dbAcademicData.ojt_grade <= 1.9) internshipExp = 3.5;
    else if (dbAcademicData.ojt_grade <= 2.2) internshipExp = 3.0;
    else if (dbAcademicData.ojt_grade <= 2.5) internshipExp = 2.5;
    else internshipExp = 1.5;

    if (dbAcademicData.leader_pos) internshipExp += 0.4;
    if (dbAcademicData.act_member_pos) internshipExp += 0.3;
    internshipExp = Math.min(5.0, Math.max(1.0, internshipExp));

    // Certifications logic: Board exam + Skills + Program
    let certifications = 1.0; // Baseline
    if (dbAcademicData.board_exam) certifications += 1.2;
    if (adjustedHardAve >= 8.0) certifications += 1.0;
    else if (adjustedHardAve >= 6.0) certifications += 0.5;

    const techPrograms = ['BSCS', 'BSIT', 'BSECE'];
    if (techPrograms.includes(program.code)) certifications += 0.6;
    if (adjustedSoftAve >= 8.0) certifications += 0.5;
    certifications = Math.min(5, Math.max(1, Math.round(certifications)));

    const modelInput = buildModelInput(
      dbAcademicData,
      program.name,
      adjustedHardAve,
      adjustedSoftAve,
      internshipExp,
      certifications
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
      academicData: {
        ...dbAcademicData,
        soft_skills_ave: adjustedSoftAve,
        hard_skills_ave: adjustedHardAve
      },
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
  getAcademicProfile,
  submitEmployabilitySurvey,
  getLatestPrediction,
  testPrediction
};
