require('dotenv').config();
const pool = require('../config/database');
const { getNowBaghdad } = require('../utils/timezone');
const moment = require('moment-timezone');

async function checkOverdueTasks() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const now = getNowBaghdad();
    const nowUTC = moment.utc().toDate();
    
    console.log(`[${new Date().toISOString()}] فحص المهام المتأخرة...`);
    
    // جلب المهام المعلقة التي تجاوزت وقت الاستحقاق + فترة السماح
    const overdueTasks = await client.query(
      `SELECT dt.id, dt.due_date_time, s.grace_minutes
       FROM daily_tasks dt
       LEFT JOIN schedules s ON dt.schedule_id = s.id
       WHERE dt.status = 'pending'
       AND dt.due_date_time + INTERVAL '1 minute' * COALESCE(s.grace_minutes, 0) < $1`,
      [nowUTC]
    );
    
    console.log(`تم العثور على ${overdueTasks.rows.length} مهمة متأخرة`);
    
    let updated = 0;
    
    for (const task of overdueTasks.rows) {
      await client.query(
        `UPDATE daily_tasks
         SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'`,
        [task.id]
      );
      updated++;
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ تم تحديث ${updated} مهمة إلى حالة متأخرة`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في فحص المهام المتأخرة:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

checkOverdueTasks();