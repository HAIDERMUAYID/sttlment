const express = require('express');
const router = express.Router();
const { getDashboardData, getDashboardSettings, updateDashboardSettings } = require('../controllers/tvDashboardController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.get('/', getDashboardData); // TV dashboard — عادة عام أو حسب الصلاحيات

router.get('/settings', authenticate, requirePermission('tv_settings', 'view'), getDashboardSettings);
router.put('/settings', authenticate, requirePermission('tv_settings', 'edit'), updateDashboardSettings);

module.exports = router;