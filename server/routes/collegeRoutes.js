const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');
const { authenticateToken } = require('../middleware/auth');

// All college routes are protected (admin only)
router.get('/', authenticateToken, collegeController.getColleges);
router.get('/stats', authenticateToken, collegeController.getCollegeStats);
router.get('/:id', authenticateToken, collegeController.getCollegeById);
router.post('/', authenticateToken, collegeController.addCollege);
router.put('/:id', authenticateToken, collegeController.updateCollege);
router.delete('/:id', authenticateToken, collegeController.deleteCollege);

module.exports = router;