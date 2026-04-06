const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const { authenticateToken } = require('../middleware/auth');

// All program routes are protected (admin only)
router.get('/list', authenticateToken, programController.getAllPrograms);
router.get('/stats', authenticateToken, programController.getProgramStats);
router.get('/college/:collegeId', authenticateToken, programController.getProgramsByCollege);
router.get('/:id', authenticateToken, programController.getProgramById);
router.post('/', authenticateToken, programController.createProgram);
router.post('/bulk', authenticateToken, programController.bulkCreatePrograms);
router.put('/:id', authenticateToken, programController.updateProgram);
router.delete('/:id', authenticateToken, programController.deleteProgram);

module.exports = router;