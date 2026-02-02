const pool = require('../config/database');
const { toBaghdadTime } = require('../utils/timezone');

const getAuditLog = async (req, res) => {
  try {
    const { userId, action, entityType, dateFrom, dateTo, limit = 100 } = req.query;
    let query = `
      SELECT al.*, u.name as user_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let n = 1;
    if (userId) { query += ` AND al.user_id = $${n++}`; params.push(userId); }
    if (action) { query += ` AND al.action = $${n++}`; params.push(action); }
    if (entityType) { query += ` AND al.entity_type = $${n++}`; params.push(entityType); }
    if (dateFrom) { query += ` AND al.created_at::date >= $${n++}::date`; params.push(dateFrom); }
    if (dateTo) { query += ` AND al.created_at::date <= $${n++}::date`; params.push(dateTo); }
    query += ` ORDER BY al.created_at DESC LIMIT $${n}`;
    params.push(Math.min(parseInt(limit) || 100, 500));
    const result = await pool.query(query, params);
    const rows = result.rows.map((r) => ({
      ...r,
      created_at: r.created_at ? toBaghdadTime(r.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
    }));
    res.json(rows);
  } catch (error) {
    console.error('خطأ في جلب سجل التدقيق:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = { getAuditLog };
