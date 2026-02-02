const express = require('express');
const router = express.Router();
const { getAuditLog } = require('../controllers/auditLogController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);
router.get('/', requirePermission('audit_log', 'view'), getAuditLog);

module.exports = router;
