const express = require('express');
const router = express.Router();
const multer = require('multer');
const superAdminController = require('../controllers/superAdminController');
const { authenticateToken, authorize } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  }
});

// Public system settings (safe keys only)
router.get('/public-settings/:key', superAdminController.getPublicSetting);

router.use(authenticateToken, authorize('superadmin'));

// User/admin management
router.get('/users', superAdminController.listUsers);
router.post('/admins', superAdminController.createAdmin);
router.put('/users/:id/role', superAdminController.updateUserRole);
router.delete('/admins/:id', superAdminController.removeAdmin);

// Audit logs
router.get('/audit-logs', superAdminController.listAuditLogs);

// System settings
router.get('/settings/:key', superAdminController.getSetting);
router.put('/settings/:key', superAdminController.upsertSetting);
router.post('/settings/upload-logo', upload.single('logo'), superAdminController.uploadLogo);

module.exports = router;

