const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getRtgs,
  getRtgsFilterOptions,
  getSettlementMaps,
  getImportLogs,
  deleteImportLog,
  deleteAllRtgs,
  importRtgs,
  getGovernmentSettlements,
  getGovernmentSettlementsByTransactionDate,
  getGovernmentSettlementSum,
  exportRtgs,
  matchRrnExcel,
  getAcqFeesSummary,
  createCtRecord,
  getCtRecords,
  updateCtRecord,
  deleteCtRecord,
  getCtMatchingReport,
  getRtgsSettings,
  updateRtgsSettings,
  backfillGovSettlementSummaries,
} = require('../controllers/rtgsController');
const { authenticate, requirePermission } = require('../middleware/auth');

// رفع ملف CSV في الذاكرة (المتحكم يتوقع req.file.buffer)
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB لملفات كبيرة
  fileFilter: (req, file, cb) => {
    const ok = /\.(csv|txt)$/i.test(file.originalname) || file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || file.mimetype === 'text/plain';
    cb(null, !!ok);
  },
});

// رفع ملف Excel للمطابقة (قراءة فقط)
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname) || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel';
    cb(null, !!ok);
  },
});

router.use(authenticate);

router.get('/', requirePermission('rtgs', 'view'), getRtgs);
router.get('/filter-options', requirePermission('rtgs', 'view'), getRtgsFilterOptions);
router.get('/settlement-maps', requirePermission('rtgs', 'view'), getSettlementMaps);
router.get('/import-logs', requirePermission('rtgs', 'view_import_logs'), getImportLogs);
router.delete('/import-logs/:id', requirePermission('rtgs', 'delete_import'), deleteImportLog);
router.delete('/all', requirePermission('rtgs', 'delete_all'), deleteAllRtgs);
router.post('/import', uploadCsv.single('file'), requirePermission('rtgs', 'import'), importRtgs);
router.get('/government-settlements', requirePermission('government_settlements', 'view'), getGovernmentSettlements);
router.get('/government-settlements-by-transaction-date', requirePermission('government_settlements', 'view'), getGovernmentSettlementsByTransactionDate);
router.get('/government-settlement-sum', requirePermission('government_settlements', 'view'), getGovernmentSettlementSum);
router.get('/export', requirePermission('rtgs', 'export'), exportRtgs);
router.post('/match-rrn-excel', uploadExcel.single('file'), requirePermission('rtgs', 'view'), matchRrnExcel);

router.get('/settings', requirePermission('rtgs_settings', 'view'), getRtgsSettings);
router.put('/settings', requirePermission('rtgs_settings', 'edit'), updateRtgsSettings);
router.post('/backfill-gov-settlements', requirePermission('rtgs', 'import'), backfillGovSettlementSummaries);

router.get('/acq-fees-summary', requirePermission('ct_matching', 'view'), getAcqFeesSummary);
router.post('/ct-records', requirePermission('ct_matching', 'create_ct'), createCtRecord);
router.get('/ct-records', requirePermission('ct_matching', 'view'), getCtRecords);
router.put('/ct-records/:id', requirePermission('ct_matching', 'edit_ct'), updateCtRecord);
router.delete('/ct-records/:id', requirePermission('ct_matching', 'delete_ct'), deleteCtRecord);
router.get('/ct-matching-report', requirePermission('ct_matching', 'view'), getCtMatchingReport);

module.exports = router;
