const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { authenticateToken } = require('../middleware/auth');

router.get('/arima', authenticateToken, predictionController.getArimaPrediction);

module.exports = router;
