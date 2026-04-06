const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { authenticateToken } = require('../middleware/auth');

// Admin routes (protected)
router.get('/', authenticateToken, surveyController.getSurvey);
router.get('/versions', authenticateToken, surveyController.getVersions);
router.post('/', authenticateToken, surveyController.saveSurvey);
router.post('/version/:version', authenticateToken, surveyController.createVersion);
router.post('/category', authenticateToken, surveyController.addCategory);
router.delete('/category/:id', authenticateToken, surveyController.deleteCategory);
router.post('/question', authenticateToken, surveyController.addQuestion);
router.put('/question/:id', authenticateToken, surveyController.updateQuestion);
router.delete('/question/:id', authenticateToken, surveyController.deleteQuestion);
router.get('/published', authenticateToken, surveyController.getPublishedSurveys);
router.post('/publish', authenticateToken, surveyController.publishSurvey);
router.put('/published/:id/archive', authenticateToken, surveyController.archiveSurvey);
router.post('/clone/:id', authenticateToken, surveyController.cloneSurvey);
router.get('/responses/:studentId', authenticateToken, surveyController.getSurveyResponses);
router.put('/published/:id/activate', authenticateToken, surveyController.activateSurvey);

// Alumni-facing routes (public - no auth needed for taking survey)
router.get('/college/:collegeId', surveyController.getCollegeSurvey);
router.post('/submit/:studentId', surveyController.submitSurveyResponse);

module.exports = router;