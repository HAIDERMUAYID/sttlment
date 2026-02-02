const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { getPermissionDefinitions, getUserPermissions, updateUserPermissions, getUsersWithPermissionOnPage } = require('../controllers/permissionsController');

const router = express.Router();
router.use(authenticate);

router.get('/definitions', requirePermission('users', 'manage_permissions'), getPermissionDefinitions);
router.get('/users-by-page', requirePermission('users', 'view'), getUsersWithPermissionOnPage);
router.get('/users/:id', requirePermission('users', 'manage_permissions'), getUserPermissions);
router.put('/users/:id', requirePermission('users', 'manage_permissions'), updateUserPermissions);

module.exports = router;
