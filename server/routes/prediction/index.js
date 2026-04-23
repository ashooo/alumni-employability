const express = require('express');
const arimaRoutes = require('./arimaRoutes');
const employabilityRoutes = require('./employabilityRoutes');
const jobMatchingRoutes = require('./jobMatchingRoutes');
const catalogRoutes = require('./catalogRoutes');

const router = express.Router();

// Model-specific routes
router.use('/arima', arimaRoutes);
router.use('/employability', employabilityRoutes);
router.use('/job-matching', jobMatchingRoutes);

// Catalog routes (organized namespace)
router.use('/catalog', catalogRoutes);

// Backward-compatible endpoints used by the current frontend
router.use('/', catalogRoutes);

module.exports = router;
