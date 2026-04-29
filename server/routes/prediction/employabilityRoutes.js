const express = require('express');
const employabilityController = require('../../controllers/employabilityController');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.get('/academic-profile/:studentId', authenticateToken, employabilityController.getAcademicProfile);
router.post('/submit', authenticateToken, employabilityController.submitEmployabilitySurvey);
router.post('/test', authenticateToken, employabilityController.testPrediction);
router.get('/latest/:studentId', authenticateToken, employabilityController.getLatestPrediction);

module.exports = router;

