const express = require('express');
const router = express.Router();
const { getDailyReport, getMonthlyReport, getCoverageReport, exportToExcel, exportToPdf } = require('../controllers/reportsController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/daily', requirePermission('reports', 'view'), getDailyReport);
router.get('/monthly', requirePermission('reports', 'view'), getMonthlyReport);
router.get('/coverage', requirePermission('reports', 'view'), getCoverageReport);
router.get('/export', requirePermission('reports', 'export_excel'), exportToExcel);
router.get('/export-pdf', requirePermission('reports', 'export_pdf'), exportToPdf);

module.exports = router;