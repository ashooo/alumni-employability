const express = require('express');
const jobMatchingController = require('../../controllers/jobMatchingController');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.post('/test', authenticateToken, jobMatchingController.testJobMatching);
router.post('/generate/:studentId', authenticateToken, jobMatchingController.generateJobMatching);
router.get('/latest/:studentId', authenticateToken, jobMatchingController.getLatestJobMatching);

module.exports = router;
