const pool = require('../config/database');
const { toBaghdadTime, getTodayBaghdad } = require('../utils/timezone');

// الحصول على الحضور
const getAttendance = async (req, res) => {
  try {
    const { date, userId, dateFrom, dateTo } = req.query;
    
    let query = `
      SELECT a.*, u.name as user_name
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (date) {
      query += ` AND a.date = $${paramCount++}`;
      params.push(date);
    } else if (dateFrom && dateTo) {
      query += ` AND a.date BETWEEN $${paramCount++} AND $${paramCount++}`;
      params.push(dateFrom, dateTo);
    } else {
      // افتراضياً اليوم
      query += ` AND a.date = $${paramCount++}`;
      params.push(getTodayBaghdad());
    }
    
    if (userId) {
      query += ` AND a.user_id = $${paramCount++}`;
      params.push(userId);
    }
    
    query += ' ORDER BY a.first_login_at';
    
    const result = await pool.query(query, params);
    
    // عرض وقت الحضور = أول دخول للنظام ناقص 20 دقيقة (تقدير وقت الوصول — الموظف لا يفتح النظام فور وصوله)
    const ATTENDANCE_DISPLAY_OFFSET_MINUTES = 20;
    const attendance = result.rows.map(record => {
      const dateVal = record.date;
      const dateStr = dateVal instanceof Date
        ? dateVal.toISOString().slice(0, 10)
        : (typeof dateVal === 'string' ? dateVal.slice(0, 10) : dateVal);
      const baghdad = record.first_login_at ? toBaghdadTime(record.first_login_at) : null;
      const displayTime = baghdad ? baghdad.clone().subtract(ATTENDANCE_DISPLAY_OFFSET_MINUTES, 'minutes') : null;
      return {
        ...record,
        date: dateStr,
        first_login_at: baghdad ? baghdad.format('YYYY-MM-DD HH:mm:ss') : null,
        display_first_login_at: displayTime ? displayTime.format('YYYY-MM-DD HH:mm:ss') : null
      };
    });
    
    res.json(attendance);
  } catch (error) {
    console.error('خطأ في جلب الحضور:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// الحصول على إحصائيات الحضور
const getAttendanceStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'تاريخ البداية والنهاية مطلوبان' });
    }
    
    const result = await pool.query(
      `SELECT 
         u.id,
         u.name,
         COUNT(a.id) as days_present,
         MIN(a.first_login_at) as earliest_login,
         MAX(a.first_login_at) as latest_login,
         AVG(EXTRACT(EPOCH FROM (a.first_login_at::time - '09:00:00'::time))/60) as avg_minutes_after_9am
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id AND a.date BETWEEN $1 AND $2
       WHERE u.role = 'employee' AND u.active = true
       GROUP BY u.id, u.name
       ORDER BY u.name`,
      [dateFrom, dateTo]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب إحصائيات الحضور:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = { getAttendance, getAttendanceStats };