const express = require('express');
const router = express.Router();
const { getDailyTasks, getAdHocTasks, createAdHocTask, executeTask, getExecutions, addAttachment, searchTasks, generateDailyTasks, ensureDailyTasks, deleteDailyTask, deleteAdHocTask, deleteAllTasks } = require('../controllers/tasksController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { upload } = require('../config/multer');
const { taskExecutionLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/daily', requirePermission('tasks', 'view'), getDailyTasks);
router.get('/ad-hoc', requirePermission('tasks', 'view'), getAdHocTasks);
router.get('/search', requirePermission('tasks', 'view'), searchTasks);
router.post('/ad-hoc', requirePermission('tasks', 'create_ad_hoc'), createAdHocTask);
router.post('/execute', taskExecutionLimiter, requirePermission('tasks', 'execute'), executeTask);
router.get('/executions', requirePermission('tasks', 'view'), getExecutions);
router.post('/executions/:id/attachments', upload.single('file'), requirePermission('tasks', 'execute'), addAttachment);
router.post('/generate-daily', requirePermission('tasks', 'view'), generateDailyTasks);
router.get('/ensure-daily', requirePermission('tasks', 'view'), ensureDailyTasks);
router.delete('/daily/:id', requirePermission('tasks', 'delete_task'), deleteDailyTask);
router.delete('/ad-hoc/:id', requirePermission('tasks', 'delete_task'), deleteAdHocTask);
router.delete('/all', requirePermission('tasks', 'delete_task'), deleteAllTasks);

module.exports = router;