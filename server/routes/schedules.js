const express = require('express');
const router = express.Router();
const { getSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule } = require('../controllers/schedulesController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('schedules', 'view'), getSchedules);
router.get('/:id', requirePermission('schedules', 'view'), getSchedule);
router.post('/', requirePermission('schedules', 'create'), createSchedule);
router.put('/:id', requirePermission('schedules', 'edit'), updateSchedule);
router.delete('/:id', requirePermission('schedules', 'delete'), deleteSchedule);

module.exports = router;