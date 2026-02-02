// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'خطأ في الخادم';

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    status = 400;
    message = 'خطأ في التحقق من البيانات';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'توكن غير صحيح';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'انتهت صلاحية التوكن';
  }

  // Database errors
  if (err.code === '23505') {
    // Unique constraint violation
    status = 409;
    message = 'هذا السجل موجود بالفعل';
  }

  if (err.code === '23503') {
    // Foreign key constraint violation
    status = 400;
    message = 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى';
  }

  // Send error response
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
