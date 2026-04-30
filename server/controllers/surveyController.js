const {
  getSurveyDefinition,
  getSurveyStatus,
  getSurveyResponses,
  submitSurveyResponse
} = require('../services/surveyDataService');

const mgmt = require('../services/surveyManagementService');

// ─── Alumni-facing (existing, unchanged) ────────────────────────────────────

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

// ─── Admin: Template management ─────────────────────────────────────────────

const getTemplates = async (req, res) => {
  try {
    const { kind, is_active, path_key } = req.query;
    const filters = {};
    if (kind) filters.kind = kind;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (path_key) filters.path_key = path_key;

    const templates = await mgmt.listTemplates(filters);
    return res.json(templates);
  } catch (error) {
    console.error('List templates error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to list templates'
    });
  }
};

const getTemplate = async (req, res) => {
  try {
    const template = await mgmt.getTemplateWithQuestions(req.params.id);
    return res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch template'
    });
  }
};

const createTemplateHandler = async (req, res) => {
  try {
    const template = await mgmt.createTemplate(req.body);
    return res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create template'
    });
  }
};

const updateTemplateHandler = async (req, res) => {
  try {
    const template = await mgmt.updateTemplate(req.params.id, req.body);
    return res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update template'
    });
  }
};

const activateTemplateHandler = async (req, res) => {
  try {
    const { is_active } = req.body;
    const template = await mgmt.toggleTemplateActive(req.params.id, is_active);
    return res.json(template);
  } catch (error) {
    console.error('Activate template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to toggle template'
    });
  }
};

const cloneTemplateHandler = async (req, res) => {
  try {
    const { new_key, new_name } = req.body;
    const cloned = await mgmt.cloneTemplate(req.params.id, new_key, new_name);
    return res.status(201).json(cloned);
  } catch (error) {
    console.error('Clone template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to clone template'
    });
  }
};

const deleteTemplateHandler = async (req, res) => {
  try {
    await mgmt.deleteTemplate(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete template'
    });
  }
};

// ─── Admin: Question management ─────────────────────────────────────────────

const getQuestions = async (req, res) => {
  try {
    const { question_type, is_active, search } = req.query;
    const filters = {};
    if (question_type) filters.question_type = question_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (search) filters.search = search;

    const questions = await mgmt.listQuestions(filters);
    return res.json(questions);
  } catch (error) {
    console.error('List questions error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to list questions'
    });
  }
};

const createQuestionHandler = async (req, res) => {
  try {
    const question = await mgmt.createQuestion(req.body);
    return res.status(201).json(question);
  } catch (error) {
    console.error('Create question error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create question'
    });
  }
};

const updateQuestionHandler = async (req, res) => {
  try {
    const question = await mgmt.updateQuestion(req.params.id, req.body);
    return res.json(question);
  } catch (error) {
    console.error('Update question error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update question'
    });
  }
};

const deleteQuestionHandler = async (req, res) => {
  try {
    await mgmt.deleteQuestion(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete question'
    });
  }
};

// ─── Admin: Template ↔ Question links ───────────────────────────────────────

const addQuestionToTemplateHandler = async (req, res) => {
  try {
    const { question_id, display_order, is_required, section_key } = req.body;

    if (!question_id) {
      return res.status(400).json({ error: 'question_id is required' });
    }

    const link = await mgmt.addQuestionToTemplate(
      req.params.id,
      question_id,
      { display_order, is_required, section_key }
    );
    return res.status(201).json(link);
  } catch (error) {
    console.error('Add question to template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to add question to template'
    });
  }
};

const removeQuestionFromTemplateHandler = async (req, res) => {
  try {
    await mgmt.removeQuestionFromTemplate(req.params.templateId, req.params.questionId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Remove question from template error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to remove question from template'
    });
  }
};

const reorderQuestionsHandler = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    await mgmt.reorderTemplateQuestions(req.params.id, items);
    return res.json({ success: true });
  } catch (error) {
    console.error('Reorder questions error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reorder questions'
    });
  }
};

module.exports = {
  // Alumni-facing
  getSurvey,
  getVersions,
  getCollegeSurvey,
  submitSurveyResponse: submitSurveyResponseHandler,
  getSurveyResponses: getSurveyResponsesHandler,
  checkSurveyStatus: checkSurveyStatusHandler,

  // Admin: templates
  getTemplates,
  getTemplate,
  createTemplate: createTemplateHandler,
  updateTemplate: updateTemplateHandler,
  activateTemplate: activateTemplateHandler,
  cloneTemplate: cloneTemplateHandler,
  deleteTemplate: deleteTemplateHandler,

  // Admin: questions
  getQuestions,
  createQuestion: createQuestionHandler,
  updateQuestion: updateQuestionHandler,
  deleteQuestion: deleteQuestionHandler,

  // Admin: template ↔ question links
  addQuestionToTemplate: addQuestionToTemplateHandler,
  removeQuestionFromTemplate: removeQuestionFromTemplateHandler,
  reorderQuestions: reorderQuestionsHandler
};
