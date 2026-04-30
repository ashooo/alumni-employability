const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { authenticateToken } = require('../middleware/auth');

// ─── Admin: Template management ─────────────────────────────────────────────
router.get('/templates', authenticateToken, surveyController.getTemplates);
router.get('/templates/:id', authenticateToken, surveyController.getTemplate);
router.post('/templates', authenticateToken, surveyController.createTemplate);
router.put('/templates/:id', authenticateToken, surveyController.updateTemplate);
router.put('/templates/:id/activate', authenticateToken, surveyController.activateTemplate);
router.post('/templates/:id/clone', authenticateToken, surveyController.cloneTemplate);
router.delete('/templates/:id', authenticateToken, surveyController.deleteTemplate);

// ─── Admin: Question management ─────────────────────────────────────────────
router.get('/questions', authenticateToken, surveyController.getQuestions);
router.post('/questions', authenticateToken, surveyController.createQuestion);
router.put('/questions/:id', authenticateToken, surveyController.updateQuestion);
router.delete('/questions/:id', authenticateToken, surveyController.deleteQuestion);

// ─── Admin: Template ↔ Question links ───────────────────────────────────────
router.post('/templates/:id/questions', authenticateToken, surveyController.addQuestionToTemplate);
router.delete('/templates/:templateId/questions/:questionId', authenticateToken, surveyController.removeQuestionFromTemplate);
router.put('/templates/:id/questions/reorder', authenticateToken, surveyController.reorderQuestions);

// ─── Legacy / alumni-facing routes ──────────────────────────────────────────
router.get('/', authenticateToken, surveyController.getSurvey);
router.get('/versions', authenticateToken, surveyController.getVersions);
router.get('/responses/:studentId', authenticateToken, surveyController.getSurveyResponses);

// Compatibility routes mounted under /api/admin/survey.
// Keep these protected so the admin namespace is never publicly writable.
router.get('/college/:collegeId', authenticateToken, surveyController.getCollegeSurvey);
router.post('/submit/:studentId', authenticateToken, surveyController.submitSurveyResponse);

module.exports = router;
