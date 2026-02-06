const express = require('express');
const router = express.Router();
const { login, verifyToken, changePassword } = require('../controllers/authController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, login);
router.get('/verify', authenticate, verifyToken);
router.post('/change-password', authenticate, requirePermission('change_password', 'self_update'), changePassword);

module.exports = router;