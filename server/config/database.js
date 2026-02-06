const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// مسارات .env: جذر المشروع أولاً (بجانب package.json)، ثم server/config
const root = path.join(__dirname, '..', '..');
const envPaths = [
  path.join(root, '.env'),
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  require('dotenv').config({ path: envPath, override: true });
  if (!process.env.DATABASE_URL) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
    if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '').trim();
  }
}

const conn = process.env.DATABASE_URL;
if (!conn || typeof conn !== 'string' || !conn.trim()) {
  const tried = envPaths.join(', ');
  const hint = envPath
    ? 'الملف وُجد لكن DATABASE_URL غير معرف. ضع كل متغير في سطر منفصل:\nNODE_ENV=development\nPORT=5000\nDATABASE_URL=postgresql://...'
    : `لم يُعثر على .env. المسارات المحاولة: ${tried}`;
  throw new Error(`DATABASE_URL غير موجود أو فارغ.\n${hint}`);
}

const useSSL = conn.includes('render.com') || process.env.NODE_ENV === 'production';

let poolConfig;
try {
  const u = new URL(conn.trim());
  const pw = u.password || '';
  if (typeof pw !== 'string') {
    throw new Error('كلمة مرور الاتصال غير صالحة');
  }
  poolConfig = {
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(pw),
    host: u.hostname || 'localhost',
    port: parseInt(u.port || '5432', 10),
    database: (u.pathname || '/').slice(1) || 'sttlment',
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    // حجم الـ pool: اضبط POOL_MAX في .env (مثلاً 10–20 حسب الحمل)
    max: parseInt(process.env.POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} catch (e) {
  poolConfig = {
    connectionString: conn.trim(),
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;