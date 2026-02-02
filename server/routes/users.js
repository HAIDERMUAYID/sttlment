const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, toggleUserActive, deleteUser, uploadAvatar, deleteAvatar } = require('../controllers/usersController');
const { authenticate, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', requirePermission('users', 'view'), getUsers);
router.get('/:id', requirePermission('users', 'view'), getUser);
router.post('/', requirePermission('users', 'create'), createUser);
router.put('/:id', requirePermission('users', 'edit'), updateUser);
router.delete('/:id', requirePermission('users', 'delete'), deleteUser);
router.patch('/:id/toggle-active', requirePermission('users', 'toggle_active'), toggleUserActive);

// رفع وحذف الصورة الشخصية - متاح لجميع المستخدمين
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

module.exports = router;