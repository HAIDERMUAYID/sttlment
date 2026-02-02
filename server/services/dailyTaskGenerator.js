/**
 * خدمة توليد المهام اليومية — تُستدعى من الـ API (يدوياً) ومن الجدولة التلقائية (cron)
 * منطق موحد: يومية + أسبوعية + شهرية + target_settlement_date
 */
const pool = require('../config/database');
const { getTodayBaghdad, combineDateAndTimeBaghdadToUTC } = require('../utils/timezone');
const moment = require('moment-timezone');

/**
 * تشغيل توليد المهام اليومية لليوم الحالي (بغداد).
 * آمن للتكرار: لا يُنشئ مهمة مكررة لنفس الجدول ونفس التاريخ.
 * @returns {{ generated: number, skipped: number, total: number }}
 */
async function runGenerateDailyTasks() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const today = getTodayBaghdad();
    const now = moment.tz('Asia/Baghdad');
    const dayOfWeek = now.day();
    const dayOfMonth = now.date();

    const dailySchedules = await client.query(
      `SELECT * FROM schedules
       WHERE active = true AND frequency_type = 'daily' AND $1 = ANY(days_of_week)`,
      [dayOfWeek]
    );
    const weeklySchedules = await client.query(
      `SELECT * FROM schedules
       WHERE active = true AND frequency_type = 'weekly' AND day_of_week_single = $1`,
      [dayOfWeek]
    );
    const monthlySchedules = await client.query(
      `SELECT * FROM schedules
       WHERE active = true AND frequency_type = 'monthly' AND day_of_month = $1`,
      [dayOfMonth]
    );

    const allSchedules = [
      ...dailySchedules.rows,
      ...weeklySchedules.rows,
      ...monthlySchedules.rows
    ];

    let generated = 0;
    let skipped = 0;

    for (const schedule of allSchedules) {
      const existing = await client.query(
        'SELECT id FROM daily_tasks WHERE schedule_id = $1 AND task_date = $2',
        [schedule.id, today]
      );
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const dueDateTime = combineDateAndTimeBaghdadToUTC(today, schedule.due_time);
      let targetSettlementDate = null;
      const offsetDays = schedule.settlement_offset_days != null ? parseInt(schedule.settlement_offset_days, 10) : 0;
      if (!isNaN(offsetDays) && offsetDays !== 0) {
        const d = moment.tz(today, 'YYYY-MM-DD', 'Asia/Baghdad').add(offsetDays, 'days');
        targetSettlementDate = d.format('YYYY-MM-DD');
      }

      await client.query(
        `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status, target_settlement_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          schedule.id,
          schedule.template_id,
          schedule.default_assignee_user_id,
          today,
          dueDateTime,
          'pending',
          targetSettlementDate
        ]
      );
      generated++;
    }

    await client.query('COMMIT');
    return { generated, skipped, total: allSchedules.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runGenerateDailyTasks };
