const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rate limiter for task execution
const taskExecutionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 task executions per minute
  message: 'تم تجاوز الحد المسموح من تنفيذ المهام. يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  taskExecutionLimiter,
};
