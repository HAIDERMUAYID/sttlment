const path = require('path');
const fs = require('fs');
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) require('dotenv').config({ path: envPath, override: true });

const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// Trust proxy (لإصلاح مشكلة express-rate-limit)
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  const requestLogger = require('./middleware/requestLogger');
  app.use(requestLogger);
}

// Rate limiting - استثناء TV Dashboard من rate limiting
app.use('/api', (req, res, next) => {
  // TV Dashboard لا يحتاج rate limiting لأنه للعرض العام
  // req.path سيكون مثل '/tv-dashboard' أو '/tv-dashboard/settings'
  if (req.path === '/tv-dashboard' || req.path.startsWith('/tv-dashboard/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tv-dashboard', require('./routes/tvDashboard'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/merchants', require('./routes/merchants'));
app.use('/api/merchant-disbursements', require('./routes/merchantDisbursements'));
app.use('/api/rtgs', require('./routes/rtgs'));
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server (5001 افتراضياً—المنفذ 5000 غالباً مستخدم من AirPlay على macOS)
const PORT = process.env.PORT || 5001;

// Start server with error handling
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize WebSocket server AFTER HTTP server is listening
  let wsServer = null;
  try {
    const WebSocketServer = require('./websocket/server');
    wsServer = new WebSocketServer(server);
    console.log('✅ WebSocket server initialized');
    console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}/ws`);
  } catch (error) {
    console.warn('⚠️  WebSocket server not available:', error.message);
  }
  
  // Make WebSocket server available globally for controllers
  global.wsServer = wsServer;

  // توليد المهام اليومية تلقائياً — كل يوم 00:10 بتوقيت بغداد
  try {
    const cron = require('node-cron');
    const { runGenerateDailyTasks } = require('./services/dailyTaskGenerator');
    cron.schedule('10 0 * * *', async () => {
      try {
        const result = await runGenerateDailyTasks();
        console.log(`[Cron] توليد المهام التلقائي: ${result.generated} مُنشأة، ${result.skipped} مُخطاة`);
      } catch (err) {
        console.error('[Cron] خطأ في توليد المهام التلقائي:', err.message);
      }
    }, { timezone: 'Asia/Baghdad' }); // 00:10 بغداد كل يوم
    console.log('✅ جدولة توليد المهام اليومية: كل يوم 00:10 (بغداد)');
  } catch (err) {
    console.warn('⚠️  node-cron غير متاح — توليد المهام التلقائي معطّل:', err.message);
  }
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ المنفذ ${PORT} مستخدم بالفعل.`);
    console.error('💡 جرب: lsof -ti:5001 | xargs kill -9');
    process.exit(1);
  } else {
    console.error('❌ خطأ في الخادم:', error);
    process.exit(1);
  }
});