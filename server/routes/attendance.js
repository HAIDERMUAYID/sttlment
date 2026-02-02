const express = require('express');
const router = express.Router();
const { getAttendance, getAttendanceStats } = require('../controllers/attendanceController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('attendance', 'view'), getAttendance);
router.get('/stats', requirePermission('attendance', 'manage_stats'), getAttendanceStats);

module.exports = router;