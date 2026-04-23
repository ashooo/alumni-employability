const express = require('express');
const predictionCatalogController = require('../../controllers/predictionCatalogController');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.get('/competencies', authenticateToken, predictionCatalogController.getCompetencies);
router.get('/skills', authenticateToken, predictionCatalogController.getSkills);
router.get('/degrees', authenticateToken, predictionCatalogController.getDegrees);

module.exports = router;
