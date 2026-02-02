const express = require('express');
const router = express.Router();
const { login, verifyToken, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, login);
router.get('/verify', authenticate, verifyToken);
router.post('/change-password', authenticate, changePassword);

module.exports = router;