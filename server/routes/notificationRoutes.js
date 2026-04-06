const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, notificationController.getMyNotifications);
router.post('/', authenticateToken, notificationController.createNotification);
router.put('/:id/read', authenticateToken, notificationController.markNotificationRead);

module.exports = router;
