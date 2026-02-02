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

async function reset() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  بدء حذف البيانات...\n');
    
    // حذف البيانات بترتيب صحيح (حسب Foreign Keys)
    const tables = [
      'attachments',
      'task_executions',
      'ad_hoc_tasks',
      'daily_tasks',
      'schedules',
      'task_templates',
      'categories',
      'attendance',
      'audit_log',
      'settings',
      'users'
    ];
    
    for (const table of tables) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`   ✅ تم حذف ${result.rowCount} سجل من ${table}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ تم حذف جميع البيانات بنجاح!\n');
    console.log('💡 يمكنك الآن تشغيل npm run seed لإضافة البيانات الجديدة\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في حذف البيانات:', error);
    throw error;
  } finally {
    client.release();
  }
}

reset()
  .then(() => {
    console.log('✅ اكتمل حذف البيانات');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل حذف البيانات:', error);
    process.exit(1);
  });
