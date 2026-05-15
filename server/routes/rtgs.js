const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getRtgs,
  getRtgsFilterOptions,
  getRtgsBankNames,
  getSettlementMaps,
  getRtgsUnmappedInstCodes,
  createSettlementMap,
  updateSettlementMap,
  deleteSettlementMap,
  getImportLogs,
  deleteImportLog,
  deleteAllRtgs,
  importRtgs,
  getGovernmentSettlements,
  getGovernmentSettlementsByTransactionDate,
  getGovernmentSettlementSum,
  getGovernmentSettlementDetails,
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
const { hasPermission } = require('../utils/permissions');

/** تعبئة مخزون التسويات: استيراد RTGS، أو (عرض التسويات الحكومية + تصدير RTGS) — للمحاسبين الذين لا يستوردون ملفات */
function requireGovSettlementBackfill(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }
  if (hasPermission(req.user.permissions, 'rtgs', 'import')) {
    return next();
  }
  if (
    hasPermission(req.user.permissions, 'government_settlements', 'view') &&
    hasPermission(req.user.permissions, 'rtgs', 'export')
  ) {
    return next();
  }
  return res.status(403).json({
    error: 'ليس لديك صلاحية لتعبئة جدول التسويات (يلزم: استيراد RTGS، أو عرض التسويات الحكومية مع تصدير RTGS).',
  });
}

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
router.get('/bank-names', requirePermission('rtgs', 'view'), getRtgsBankNames);
router.get('/settlement-maps', requirePermission('rtgs', 'view'), getSettlementMaps);
router.get('/unmapped-inst-codes', requirePermission('rtgs', 'view'), getRtgsUnmappedInstCodes);
router.post('/settlement-maps', requirePermission('rtgs', 'import'), createSettlementMap);
router.put('/settlement-maps/:id', requirePermission('rtgs', 'import'), updateSettlementMap);
router.delete('/settlement-maps/:id', requirePermission('rtgs', 'import'), deleteSettlementMap);
router.get('/import-logs', requirePermission('rtgs', 'view_import_logs'), getImportLogs);
router.delete('/import-logs/:id', requirePermission('rtgs', 'delete_import'), deleteImportLog);
router.delete('/all', requirePermission('rtgs', 'delete_all'), deleteAllRtgs);
router.post('/import', uploadCsv.single('file'), requirePermission('rtgs', 'import'), importRtgs);
router.get('/government-settlements', requirePermission('government_settlements', 'view'), getGovernmentSettlements);
router.get('/government-settlements-by-transaction-date', requirePermission('government_settlements', 'view'), getGovernmentSettlementsByTransactionDate);
router.get('/government-settlement-sum', requirePermission('government_settlements', 'view'), getGovernmentSettlementSum);
router.get('/government-settlement-details', requirePermission('government_settlements', 'view'), getGovernmentSettlementDetails);
router.get('/export', requirePermission('rtgs', 'export'), exportRtgs);
router.post('/match-rrn-excel', uploadExcel.single('file'), requirePermission('rtgs', 'view'), matchRrnExcel);

router.get('/settings', requirePermission('rtgs_settings', 'view'), getRtgsSettings);
router.put('/settings', requirePermission('rtgs_settings', 'edit'), updateRtgsSettings);
router.post('/backfill-gov-settlements', requireGovSettlementBackfill, backfillGovSettlementSummaries);

router.get('/acq-fees-summary', requirePermission('ct_matching', 'view'), getAcqFeesSummary);
router.post('/ct-records', requirePermission('ct_matching', 'create_ct'), createCtRecord);
router.get('/ct-records', requirePermission('ct_matching', 'view'), getCtRecords);
router.put('/ct-records/:id', requirePermission('ct_matching', 'edit_ct'), updateCtRecord);
router.delete('/ct-records/:id', requirePermission('ct_matching', 'delete_ct'), deleteCtRecord);
router.get('/ct-matching-report', requirePermission('ct_matching', 'view'), getCtMatchingReport);

module.exports = router;
