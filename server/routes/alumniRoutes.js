// In server/routes/alumniRoutes.js
const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');
const { authenticateToken } = require('../middleware/auth');

// Profile routes
router.get('/profile/:studentId', authenticateToken, alumniController.getProfile);
router.put('/profile/:studentId', authenticateToken, alumniController.updateProfile);
router.post('/profile/:studentId/email/request-otp', authenticateToken, alumniController.requestEmailChangeOtp);
router.post('/profile/:studentId/email/verify-otp', authenticateToken, alumniController.verifyEmailChangeOtp);

// Employment routes
router.get('/employment/:studentId', authenticateToken, alumniController.getEmploymentHistory);
router.post('/employment/:studentId', authenticateToken, alumniController.addEmploymentRecord);
router.put('/employment/:id', authenticateToken, alumniController.updateEmploymentRecord);

// Survey routes - FIXED PATHS
router.get('/survey/college/:collegeId', alumniController.getCollegeSurvey);
router.post('/survey/submit/:studentId', alumniController.submitSurveyResponse);
router.get('/survey/responses/:studentId', authenticateToken, alumniController.getSurveyResponses);
router.get('/survey/status/:studentId', authenticateToken, alumniController.checkSurveyStatus);

module.exports = router;