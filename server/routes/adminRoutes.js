const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminController = require('../controllers/adminController');
const programController = require('../controllers/programController');
const { authenticateToken } = require('../middleware/auth');

// Public route (no token needed)
router.get('/alumni/check/:studentId', adminController.checkAlumniRecord);

// Alumni records
router.get('/alumni', authenticateToken, adminController.getAlumniRecords);
router.patch('/alumni/:studentId', authenticateToken, adminController.deactivateAlumni || ((req, res) => res.status(501).json({ error: 'Not implemented' })));

// Programs & reference data
router.get('/programs', authenticateToken, adminController.getPrograms);
router.get('/batch-years', authenticateToken, adminController.getBatchYears);
router.get('/colleges', authenticateToken, async (req, res) => {
  const db = require('../config/db');
  try {
    const [colleges] = await db.query('SELECT * FROM colleges ORDER BY name ASC');
    res.json(colleges);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// Program management
router.get('/programs/list', authenticateToken, programController.getAllPrograms);
router.get('/programs/college/:collegeId', authenticateToken, programController.getProgramsByCollege);
router.post('/programs', authenticateToken, programController.createProgram);
router.put('/programs/:id', authenticateToken, programController.updateProgram);
router.delete('/programs/:id', authenticateToken, programController.deleteProgram);
router.post('/programs/bulk', authenticateToken, programController.bulkCreatePrograms);

// ── File upload config (legacy /import route) ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `alumni-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.csv') {
      return cb(new Error('Only .xlsx and .csv files are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// ── Import routes ─────────────────────────────────────────────────────────────

// NEW: Check duplicates against DB (called during preview step on frontend)
router.post('/import/check-duplicates', authenticateToken, adminController.checkDuplicates);

// NEW: Batch insert (called per-chunk after user confirms)
router.post('/import/batch', authenticateToken, adminController.importBatch);

// LEGACY: Single file-upload import (still works, now skips duplicates)
router.post('/import', authenticateToken, upload.single('file'), adminController.importAlumni);

// Import history & error reports
router.get('/import-history', authenticateToken, adminController.getImportHistory);
router.get('/import/:importId/errors', authenticateToken, adminController.downloadErrorReport);

module.exports = router;