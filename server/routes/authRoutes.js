const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/check-student', authController.checkStudentRecord);
router.post('/register', authController.register);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/change-password/request-otp', authenticateToken, authController.requestChangePasswordOtp);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;