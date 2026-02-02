const express = require('express');
const router = express.Router();
const { getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } = require('../controllers/templatesController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('templates', 'view'), getTemplates);
router.get('/:id', requirePermission('templates', 'view'), getTemplate);
router.post('/', requirePermission('templates', 'create'), createTemplate);
router.put('/:id', requirePermission('templates', 'edit'), updateTemplate);
router.delete('/:id', requirePermission('templates', 'delete'), deleteTemplate);

module.exports = router;