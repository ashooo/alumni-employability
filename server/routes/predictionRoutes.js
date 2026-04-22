const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const employabilityController = require('../controllers/employabilityController');
const { authenticateToken } = require('../middleware/auth');

router.get('/arima', authenticateToken, predictionController.getArimaPrediction);
router.post('/employability/submit', authenticateToken, employabilityController.submitEmployabilitySurvey);
router.post('/employability/test', authenticateToken, employabilityController.testPrediction);
router.get('/employability/latest/:studentId', authenticateToken, employabilityController.getLatestPrediction);

// Additional data for Assessment Wizard
router.get('/skills', authenticateToken, async (req, res) => {
  const { prisma } = require('../config/db');
  const skills = await prisma.skill.findMany();
  res.json(skills);
});

router.get('/degrees', authenticateToken, async (req, res) => {
  const { prisma } = require('../config/db');
  const degrees = await prisma.degree.findMany();
  res.json(degrees);
});

module.exports = router;
