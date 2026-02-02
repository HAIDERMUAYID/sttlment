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

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  بدء حذف البيانات...\n');
    
    // حذف البيانات بترتيب صحيح (احترام Foreign Keys)
    console.log('   🗑️  حذف task_executions...');
    await client.query('DELETE FROM task_executions');
    console.log('   ✅ تم حذف task_executions');
    
    console.log('   🗑️  حذف attachments...');
    await client.query('DELETE FROM attachments');
    console.log('   ✅ تم حذف attachments');
    
    console.log('   🗑️  حذف daily_tasks...');
    await client.query('DELETE FROM daily_tasks');
    console.log('   ✅ تم حذف daily_tasks');
    
    console.log('   🗑️  حذف ad_hoc_tasks...');
    await client.query('DELETE FROM ad_hoc_tasks');
    console.log('   ✅ تم حذف ad_hoc_tasks');
    
    console.log('   🗑️  حذف attendance...');
    await client.query('DELETE FROM attendance');
    console.log('   ✅ تم حذف attendance');
    
    console.log('   🗑️  حذف schedules...');
    await client.query('DELETE FROM schedules');
    console.log('   ✅ تم حذف schedules');
    
    console.log('   🗑️  حذف task_templates...');
    await client.query('DELETE FROM task_templates');
    console.log('   ✅ تم حذف task_templates');
    
    console.log('   🗑️  حذف categories...');
    await client.query('DELETE FROM categories');
    console.log('   ✅ تم حذف categories');
    
    console.log('   🗑️  حذف audit_log...');
    await client.query('DELETE FROM audit_log');
    console.log('   ✅ تم حذف audit_log');
    
    console.log('   🗑️  حذف settings...');
    await client.query('DELETE FROM settings');
    console.log('   ✅ تم حذف settings');
    
    console.log('   🗑️  حذف users...');
    await client.query('DELETE FROM users');
    console.log('   ✅ تم حذف users');
    
    // إعادة تعيين Sequences
    console.log('\n   🔄 إعادة تعيين Sequences...');
    await client.query("SELECT setval('users_id_seq', 1, false)");
    await client.query("SELECT setval('categories_id_seq', 1, false)");
    await client.query("SELECT setval('task_templates_id_seq', 1, false)");
    await client.query("SELECT setval('schedules_id_seq', 1, false)");
    await client.query("SELECT setval('daily_tasks_id_seq', 1, false)");
    await client.query("SELECT setval('ad_hoc_tasks_id_seq', 1, false)");
    await client.query("SELECT setval('task_executions_id_seq', 1, false)");
    await client.query("SELECT setval('attendance_id_seq', 1, false)");
    await client.query("SELECT setval('audit_log_id_seq', 1, false)");
    await client.query("SELECT setval('attachments_id_seq', 1, false)");
    console.log('   ✅ تم إعادة تعيين Sequences');
    
    await client.query('COMMIT');
    
    console.log('\n✅ تم حذف جميع البيانات بنجاح!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في حذف البيانات:', error);
    throw error;
  } finally {
    client.release();
  }
}

resetDatabase()
  .then(() => {
    console.log('✅ اكتمل حذف البيانات');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل حذف البيانات:', error);
    process.exit(1);
  });
