const {
  getSurveyDefinition,
  getSurveyStatus,
  getSurveyResponses,
  submitSurveyResponse
} = require('../services/surveyDataService');

const notImplemented = (feature) => (req, res) => {
  return res.status(501).json({
    error: `${feature} is not implemented on the refactor schema yet`
  });
};

const getSurvey = async (req, res) => {
  try {
    const survey = await getSurveyDefinition();
    return res.json({ categories: survey.categories });
  } catch (error) {
    console.error('Get survey error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch survey'
    });
  }
};

const getVersions = async (req, res) => {
  return res.json({
    versions: [1]
  });
};

const getCollegeSurvey = async (req, res) => {
  try {
    const survey = await getSurveyDefinition();
    return res.json({
      survey: survey.categories,
      version: survey.version,
      published_at: survey.published_at,
      template_key: survey.template_key,
      kind: survey.kind,
      path_key: survey.path_key,
      branching: survey.branching
    });
  } catch (error) {
    console.error('Get college survey error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch college survey'
    });
  }
};

const submitSurveyResponseHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { version, answers } = req.body;

    if (!studentId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await submitSurveyResponse({
      studentId,
      version,
      answers
    });

    return res.json({
      success: true,
      message: 'Survey submitted successfully'
    });
  } catch (error) {
    console.error('Submit survey error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to submit survey'
    });
  }
};

const getSurveyResponsesHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const responses = await getSurveyResponses(studentId);
    return res.json(responses);
  } catch (error) {
    console.error('Get survey responses error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch survey responses'
    });
  }
};

const checkSurveyStatusHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const status = await getSurveyStatus(studentId);
    return res.json(status);
  } catch (error) {
    console.error('Check survey status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch survey status'
    });
  }
};

module.exports = {
  getSurvey,
  getVersions,
  saveSurvey: notImplemented('Survey saving'),
  createVersion: notImplemented('Survey version creation'),
  addCategory: notImplemented('Adding survey categories'),
  deleteCategory: notImplemented('Deleting survey categories'),
  addQuestion: notImplemented('Adding survey questions'),
  updateQuestion: notImplemented('Updating survey questions'),
  deleteQuestion: notImplemented('Deleting survey questions'),
  getPublishedSurveys: notImplemented('Published survey listing'),
  publishSurvey: notImplemented('Publishing surveys'),
  archiveSurvey: notImplemented('Archiving surveys'),
  cloneSurvey: notImplemented('Cloning surveys'),
  getCollegeSurvey,
  submitSurveyResponse: submitSurveyResponseHandler,
  getSurveyResponses: getSurveyResponsesHandler,
  checkSurveyStatus: checkSurveyStatusHandler,
  activateSurvey: notImplemented('Activating surveys')
};
