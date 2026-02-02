const logger = require('../utils/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`${req.method} ${req.path} ${res.statusCode}`, {
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};

module.exports = requestLogger;
