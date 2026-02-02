const express = require('express');
const router = express.Router();
const {
  getDisbursements,
  getDisbursementsKpi,
  createDisbursement,
  updateDisbursement,
  deleteDisbursement,
  getMerchantsOptions,
} = require('../controllers/merchantDisbursementsController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('merchant_disbursements', 'view'), getDisbursements);
router.get('/kpi', requirePermission('merchant_disbursements', 'view'), getDisbursementsKpi);
router.get('/merchants-options', requirePermission('merchant_disbursements', 'view'), getMerchantsOptions);
router.post('/', requirePermission('merchant_disbursements', 'create_disbursement'), createDisbursement);
router.put('/:id', requirePermission('merchant_disbursements', 'update_disbursement'), updateDisbursement);
router.delete('/:id', requirePermission('merchant_disbursements', 'delete_disbursement'), deleteDisbursement);

module.exports = router;
