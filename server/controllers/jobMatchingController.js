const {
  generateJobMatchingPrediction,
  getLatestJobMatchingPrediction,
  testJobMatchingPrediction
} = require('../services/jobMatchingDataService');

const parseTopN = (value, fallback = 10) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsed, 20));
};

const resolveCandidateSkills = (body) => {
  if (!body || typeof body !== 'object') {
    return [];
  }

  return body.candidateSkills || body.candidate_skills || body.skills || [];
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

const generateJobMatching = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const result = await generateJobMatchingPrediction({
      studentId,
      topN: parseTopN(req.body?.topN),
      candidateSkills: resolveCandidateSkills(req.body)
    });

    return res.json({
      success: true,
      message: 'Job-matching prediction generated successfully',
      ...result
    });
  } catch (error) {
    console.error('Generate job-matching error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error generating job matches'
    });
  }
};

const getLatestJobMatching = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!ensureSubmissionAccess(req, res, studentId)) {
      return;
    }

    const prediction = await getLatestJobMatchingPrediction(studentId);
    if (!prediction) {
      return res.status(404).json({ error: 'No job-matching prediction found for this alumni' });
    }

    return res.json(prediction);
  } catch (error) {
    console.error('Get latest job-matching error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error fetching job matches'
    });
  }
};

const testJobMatching = async (req, res) => {
  try {
    const candidateSkills = resolveCandidateSkills(req.body);
    if (!Array.isArray(candidateSkills) && typeof candidateSkills !== 'string') {
      return res.status(400).json({ error: 'candidateSkills must be an array or comma-separated string' });
    }

    const prediction = await testJobMatchingPrediction({
      candidateSkills,
      topN: parseTopN(req.body?.topN)
    });

    return res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Test job-matching error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error testing job matches'
    });
  }
};

module.exports = {
  generateJobMatching,
  getLatestJobMatching,
  testJobMatching
};
