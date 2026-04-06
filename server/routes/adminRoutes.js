const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminController = require('../controllers/adminController');
const programController = require('../controllers/programController'); // Add this
const { authenticateToken } = require('../middleware/auth');

// Public route (for activation page - no token needed)
router.get('/alumni/check/:studentId', adminController.checkAlumniRecord);

// Protected routes (require authentication)
router.get('/alumni', authenticateToken, adminController.getAlumniRecords);
router.get('/programs', authenticateToken, adminController.getPrograms);
router.get('/batch-years', authenticateToken, adminController.getBatchYears);

// Program management routes
router.get('/programs/list', authenticateToken, programController.getAllPrograms);
router.get('/programs/college/:collegeId', authenticateToken, programController.getProgramsByCollege);
router.post('/programs', authenticateToken, programController.createProgram);
router.put('/programs/:id', authenticateToken, programController.updateProgram);
router.delete('/programs/:id', authenticateToken, programController.deleteProgram);
router.post('/programs/bulk', authenticateToken, programController.bulkCreatePrograms);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
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
    if (ext !== '.xlsx' && ext !== '.xls' && ext !== '.csv') {
      return cb(new Error('Only Excel and CSV files are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Import route with file upload
router.post('/import', authenticateToken, upload.single('file'), adminController.importAlumni);

// Import history and error reports
router.get('/import-history', authenticateToken, adminController.getImportHistory);
router.get('/import/:importId/errors', authenticateToken, adminController.downloadErrorReport);

module.exports = router;