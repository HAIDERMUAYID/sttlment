const rateLimit = require('express-rate-limit');

/** الحل الجذري: طلبات القراءة (GET) لا تُحسب في الحد — فقط طلبات الكتابة (POST/PUT/DELETE/PATCH) */
const apiWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 عملية كتابة لكل 15 دقيقة لكل IP — المستخدم العادي لا يصل لها
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

// للتوافق مع الكود الحالي — يُستخدم فقط لطلبات الكتابة
const apiLimiter = apiWriteLimiter;

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
