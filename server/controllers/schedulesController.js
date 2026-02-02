const pool = require('../config/database');
const { auditLog } = require('../middleware/auth');

const getSchedules = async (req, res) => {
  try {
    const { active } = req.query;
    let query = `
      SELECT s.*,
             t.title as template_title,
             t.category_id,
             c.name as category_name,
             u.name as assignee_name
      FROM schedules s
      LEFT JOIN task_templates t ON s.template_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON s.default_assignee_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (active !== undefined) {
      query += ` AND s.active = $${paramCount++}`;
      params.push(active === 'true');
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب الجداول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const getSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*,
              t.title as template_title,
              t.category_id,
              c.name as category_name,
              u.name as assignee_name
       FROM schedules s
       LEFT JOIN task_templates t ON s.template_id = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON s.default_assignee_user_id = u.id
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب الجدول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const createSchedule = async (req, res) => {
  try {
    const { templateId, frequencyType, daysOfWeek, dayOfWeekSingle, dayOfMonth, dueTime, graceMinutes, defaultAssigneeUserId, active, settlementOffsetDays } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'معرف القالب مطلوب' });
    }
    
    if (!dueTime) {
      return res.status(400).json({ error: 'وقت الاستحقاق مطلوب' });
    }
    
    const freqType = frequencyType || 'daily';
    
    // التحقق حسب نوع التكرار
    if (freqType === 'daily') {
      if (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return res.status(400).json({ error: 'أيام الأسبوع مطلوبة للمهام اليومية' });
      }
      if (!daysOfWeek.every(day => day >= 0 && day <= 6)) {
        return res.status(400).json({ error: 'أيام الأسبوع يجب أن تكون بين 0 و 6' });
      }
    } else if (freqType === 'weekly') {
      if (dayOfWeekSingle === undefined || dayOfWeekSingle < 0 || dayOfWeekSingle > 6) {
        return res.status(400).json({ error: 'يوم الأسبوع مطلوب للمهام الأسبوعية (0-6)' });
      }
    } else if (freqType === 'monthly') {
      if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
        return res.status(400).json({ error: 'يوم الشهر مطلوب للمهام الشهرية (1-31)' });
      }
    }
    
    const offsetDays = settlementOffsetDays != null ? parseInt(settlementOffsetDays, 10) : null;
    const result = await pool.query(
      `INSERT INTO schedules (template_id, frequency_type, days_of_week, day_of_week_single, day_of_month, due_time, grace_minutes, default_assignee_user_id, active, settlement_offset_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        templateId,
        freqType,
        freqType === 'daily' ? daysOfWeek : null,
        freqType === 'weekly' ? dayOfWeekSingle : null,
        freqType === 'monthly' ? dayOfMonth : null,
        dueTime,
        graceMinutes || 0,
        defaultAssigneeUserId || null,
        active !== false,
        offsetDays != null && !isNaN(offsetDays) ? offsetDays : 0
      ]
    );
    
    // Broadcast real-time update
    if (global.wsServer) {
      global.wsServer.broadcast('schedule_updated', {
        scheduleId: result.rows[0].id,
        action: 'created',
      });
    }
    
    // Broadcast real-time update
    if (global.wsServer) {
      global.wsServer.broadcast('schedule_updated', {
        scheduleId: result.rows[0].id,
        action: 'created',
      });
    }
    
    await auditLog(
      req.user.id,
      'create_schedule',
      'schedule',
      result.rows[0].id,
      { templateId, frequencyType: freqType, daysOfWeek, dayOfWeekSingle, dayOfMonth, dueTime },
      req.ip,
      req.get('user-agent')
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء الجدول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { templateId, frequencyType, daysOfWeek, dayOfWeekSingle, dayOfMonth, dueTime, graceMinutes, defaultAssigneeUserId, active, settlementOffsetDays } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (templateId !== undefined) {
      updates.push(`template_id = $${paramCount++}`);
      values.push(templateId);
    }
    
    if (frequencyType !== undefined) {
      if (!['daily', 'weekly', 'monthly'].includes(frequencyType)) {
        return res.status(400).json({ error: 'نوع التكرار يجب أن يكون daily أو weekly أو monthly' });
      }
      updates.push(`frequency_type = $${paramCount++}`);
      values.push(frequencyType);
    }
    
    if (daysOfWeek !== undefined) {
      if (!Array.isArray(daysOfWeek) || !daysOfWeek.every(day => day >= 0 && day <= 6)) {
        return res.status(400).json({ error: 'أيام الأسبوع يجب أن تكون مصفوفة من 0 إلى 6' });
      }
      updates.push(`days_of_week = $${paramCount++}`);
      values.push(daysOfWeek);
    }
    
    if (dayOfWeekSingle !== undefined) {
      if (dayOfWeekSingle < 0 || dayOfWeekSingle > 6) {
        return res.status(400).json({ error: 'يوم الأسبوع يجب أن يكون بين 0 و 6' });
      }
      updates.push(`day_of_week_single = $${paramCount++}`);
      values.push(dayOfWeekSingle);
    }
    
    if (dayOfMonth !== undefined) {
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        return res.status(400).json({ error: 'يوم الشهر يجب أن يكون بين 1 و 31' });
      }
      updates.push(`day_of_month = $${paramCount++}`);
      values.push(dayOfMonth);
    }
    
    if (dueTime !== undefined) {
      updates.push(`due_time = $${paramCount++}`);
      values.push(dueTime);
    }
    
    if (graceMinutes !== undefined) {
      updates.push(`grace_minutes = $${paramCount++}`);
      values.push(graceMinutes);
    }
    
    if (defaultAssigneeUserId !== undefined) {
      updates.push(`default_assignee_user_id = $${paramCount++}`);
      values.push(defaultAssigneeUserId);
    }
    
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    
    if (settlementOffsetDays !== undefined) {
      const v = parseInt(settlementOffsetDays, 10);
      updates.push(`settlement_offset_days = $${paramCount++}`);
      values.push(!isNaN(v) ? v : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'لا توجد تحديثات' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Broadcast real-time update
    if (global.wsServer) {
      global.wsServer.broadcast('schedule_updated', {
        scheduleId: id,
        action: 'updated',
      });
    }
    
    await auditLog(
      req.user.id,
      'update_schedule',
      'schedule',
      id,
      req.body,
      req.ip,
      req.get('user-agent')
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث الجدول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Broadcast real-time update
    if (global.wsServer) {
      global.wsServer.broadcast('schedule_updated', {
        scheduleId: id,
        action: 'deleted',
      });
    }
    
    await auditLog(
      req.user.id,
      'delete_schedule',
      'schedule',
      id,
      {},
      req.ip,
      req.get('user-agent')
    );
    
    res.json({ message: 'تم حذف الجدول بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الجدول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
};