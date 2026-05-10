const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/check-student', authController.checkStudentRecord);
router.post('/register', authController.register);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/change-password/verify-current', authenticateToken, authController.verifyCurrentPassword);
router.post('/change-password/request-otp', authenticateToken, authController.requestChangePasswordOtp);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/forgot-password/request-otp', authController.requestForgotPasswordOtp);
router.post('/forgot-password/verify-otp', authController.verifyForgotPasswordOtp);
router.post('/forgot-password/reset', authController.resetPasswordWithOtp);

module.exports = router;
