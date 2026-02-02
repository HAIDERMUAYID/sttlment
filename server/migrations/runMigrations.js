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

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // إنشاء جدول لتتبع الهجرات المنفذة
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // الحصول على قائمة ملفات الهجرة
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f.match(/^\d+_/))
      .sort();
    
    console.log(`📦 تم العثور على ${files.length} ملف هجرة`);
    
    for (const file of files) {
      const migrationName = file.replace('.sql', '');
      
      // التحقق من تنفيذ الهجرة مسبقاً
      const check = await client.query(
        'SELECT id FROM migrations WHERE name = $1',
        [migrationName]
      );
      
      if (check.rows.length > 0) {
        console.log(`⏭️  تم تخطي: ${migrationName} (منفذة مسبقاً)`);
        continue;
      }
      
      console.log(`🔄 تنفيذ: ${migrationName}...`);
      
      const migrationFile = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationFile, 'utf8');
      
      // تنفيذ الهجرة
      await client.query(sql);
      
      // تسجيل الهجرة
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );
      
      console.log(`✅ اكتمل: ${migrationName}`);
    }
    
    await client.query('COMMIT');
    console.log('✅ تم تنفيذ جميع الهجرات بنجاح');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في تنفيذ الهجرة:', error);
    throw error;
  } finally {
    client.release();
  }
}

// تشغيل الهجرات
runMigrations()
  .then(() => {
    console.log('✅ اكتملت جميع الهجرات');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل تنفيذ الهجرات:', error);
    process.exit(1);
  });
