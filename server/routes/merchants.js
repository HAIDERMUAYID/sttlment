const express = require('express');
const router = express.Router();
const {
  getMerchants,
  getMerchant,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getFilterOptions,
  importMerchants
} = require('../controllers/merchantsController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('merchants', 'view'), getMerchants);
router.get('/filter-options', requirePermission('merchants', 'view'), getFilterOptions);
router.get('/:id', requirePermission('merchants', 'view'), getMerchant);
router.post('/', requirePermission('merchants', 'create'), createMerchant);
router.post('/import', requirePermission('merchants', 'import'), importMerchants);
router.put('/:id', requirePermission('merchants', 'edit'), updateMerchant);
router.delete('/:id', requirePermission('merchants', 'delete'), deleteMerchant);

module.exports = router;
