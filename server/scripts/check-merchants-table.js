const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..', '..');
const envPaths = [
  path.join(root, '.env'),
  path.join(root, 'server', 'config', '.env'),
  path.join(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) require('dotenv').config({ path: envPath, override: true });

const pool = require('../config/database');

async function checkMerchantsTable() {
  try {
    console.log('🔍 التحقق من وجود جدول merchants...');
    
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'merchants'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ جدول merchants موجود');
      
      // التحقق من عدد الصفوف
      const countResult = await pool.query('SELECT COUNT(*) FROM merchants');
      console.log(`📊 عدد التجار في الجدول: ${countResult.rows[0].count}`);
      
      process.exit(0);
    } else {
      console.log('❌ جدول merchants غير موجود');
      console.log('💡 يرجى تشغيل: cd server && node migrations/runMigrations.js');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ خطأ في التحقق:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkMerchantsTable();
