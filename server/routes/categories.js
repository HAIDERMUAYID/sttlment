const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoriesController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('categories', 'view'), getCategories);
router.post('/', requirePermission('categories', 'create'), createCategory);
router.put('/:id', requirePermission('categories', 'edit'), updateCategory);
router.delete('/:id', requirePermission('categories', 'delete'), deleteCategory);

module.exports = router;