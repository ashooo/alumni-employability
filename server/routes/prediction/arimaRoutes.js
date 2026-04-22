const express = require('express');
const predictionController = require('../../controllers/predictionController');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, predictionController.getArimaPrediction);

module.exports = router;

