const pool = require('../config/database');
const { toBaghdadTime, getTodayBaghdad, combineDateAndTimeBaghdadToUTC } = require('../utils/timezone');
const { auditLog } = require('../middleware/auth');
const { runGenerateDailyTasks } = require('../services/dailyTaskGenerator');
const { getRtgsConfig, buildFeeExpr } = require('../utils/rtgsCalculation');
const moment = require('moment-timezone');

// الحصول على المهام اليومية
// view: department_pending | department_completed | my_pending | '' (الكل)
// date: يوم واحد، أو dateFrom+dateTo لفترة
const getDailyTasks = async (req, res) => {
  try {
    const { date, dateFrom, dateTo, status, assignedTo, view } = req.query;
    const userId = req.user?.id;
    
    let query = `
      SELECT dt.*,
             t.title as template_title,
             t.category_id,
             t.required_fields as template_required_fields,
             c.name as category_name,
             u.name as assigned_to_name,
             s.due_time,
             s.grace_minutes,
             (SELECT u2.name FROM task_executions te2 LEFT JOIN users u2 ON u2.id = te2.done_by_user_id WHERE te2.daily_task_id = dt.id ORDER BY te2.done_at DESC LIMIT 1) AS done_by_name,
             (SELECT te2.done_at FROM task_executions te2 WHERE te2.daily_task_id = dt.id ORDER BY te2.done_at DESC LIMIT 1) AS executed_at
      FROM daily_tasks dt
      LEFT JOIN task_templates t ON dt.template_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON dt.assigned_to_user_id = u.id
      LEFT JOIN schedules s ON dt.schedule_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (dateFrom && dateTo) {
      query += ` AND dt.task_date >= $${paramCount++} AND dt.task_date <= $${paramCount++}`;
      params.push(dateFrom, dateTo);
    } else if (date) {
      query += ` AND dt.task_date = $${paramCount++}`;
      params.push(date);
    }
    // لا فلتر تاريخ = بحث عام (كل التواريخ)
    
    if (view === 'department_pending') {
      query += ` AND dt.status IN ('pending', 'overdue')`;
    } else if (view === 'department_completed') {
      query += ` AND dt.status = 'completed'`;
    } else if (view === 'my_pending' && userId) {
      query += ` AND dt.assigned_to_user_id = $${paramCount++} AND dt.status IN ('pending', 'overdue')`;
      params.push(userId);
    }
    
    if (status && !view) {
      query += ` AND dt.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (assignedTo) {
      query += ` AND dt.assigned_to_user_id = $${paramCount++}`;
      params.push(assignedTo);
    }
    
    query += ' ORDER BY dt.task_date DESC, dt.due_date_time';
    
    const result = await pool.query(query, params);
    
    const tasks = result.rows.map(task => ({
      ...task,
      due_date_time: task.due_date_time ? toBaghdadTime(task.due_date_time).format('YYYY-MM-DD HH:mm:ss') : null,
      executed_at: task.executed_at ? toBaghdadTime(task.executed_at).format('YYYY-MM-DD HH:mm') : null
    }));
    
    res.json(tasks);
  } catch (error) {
    console.error('خطأ في جلب المهام اليومية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// الحصول على المهام الخاصة
// view: department_pending | department_completed | my_pending | '' (الكل)
// dateFrom, dateTo: فترة إنشاء المهمة (created_at)
const getAdHocTasks = async (req, res) => {
  try {
    const { status, assignedTo, createdBy, view, dateFrom, dateTo } = req.query;
    const userId = req.user?.id;
    
    let query = `
      SELECT aht.*,
             t.title as template_title,
             c.name as category_name,
             u1.name as created_by_name,
             u2.name as assigned_to_name,
             (SELECT u3.name FROM task_executions te3 LEFT JOIN users u3 ON u3.id = te3.done_by_user_id WHERE te3.ad_hoc_task_id = aht.id ORDER BY te3.done_at DESC LIMIT 1) AS done_by_name,
             (SELECT te3.done_at FROM task_executions te3 WHERE te3.ad_hoc_task_id = aht.id ORDER BY te3.done_at DESC LIMIT 1) AS executed_at
      FROM ad_hoc_tasks aht
      LEFT JOIN task_templates t ON aht.template_id = t.id
      LEFT JOIN categories c ON aht.category_id = c.id
      LEFT JOIN users u1 ON aht.created_by_user_id = u1.id
      LEFT JOIN users u2 ON aht.assigned_to_user_id = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (dateFrom && dateTo) {
      query += ` AND aht.created_at::date >= $${paramCount++} AND aht.created_at::date <= $${paramCount++}`;
      params.push(dateFrom, dateTo);
    }
    
    if (view === 'department_pending') {
      query += ` AND aht.status = 'pending'`;
    } else if (view === 'department_completed') {
      query += ` AND aht.status = 'completed'`;
    } else if (view === 'my_pending' && userId) {
      query += ` AND aht.status = 'pending' AND (aht.assigned_to_user_id = $${paramCount} OR aht.created_by_user_id = $${paramCount++})`;
      params.push(userId);
    }
    
    if (status && !view) {
      query += ` AND aht.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (assignedTo) {
      query += ` AND aht.assigned_to_user_id = $${paramCount++}`;
      params.push(assignedTo);
    }
    
    if (createdBy) {
      query += ` AND aht.created_by_user_id = $${paramCount++}`;
      params.push(createdBy);
    }
    
    query += ' ORDER BY aht.created_at DESC';
    
    const result = await pool.query(query, params);
    
    const tasks = result.rows.map(task => ({
      ...task,
      due_date_time: task.due_date_time ? toBaghdadTime(task.due_date_time).format('YYYY-MM-DD HH:mm:ss') : null,
      executed_at: task.executed_at ? toBaghdadTime(task.executed_at).format('YYYY-MM-DD HH:mm') : null
    }));
    
    res.json(tasks);
  } catch (error) {
    console.error('خطأ في جلب المهام الخاصة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// إنشاء مهمة خاصة
const createAdHocTask = async (req, res) => {
  try {
    const { templateId, categoryId, assignedToUserId, title, description, dueDateTime, beneficiary } = req.body;
    
    if (!title && !templateId) {
      return res.status(400).json({ error: 'العنوان أو القالب مطلوب' });
    }
    
    // إذا كان المستخدم ليس لديه صلاحية إنشاء مهام خاصة (ما عدا عند استخدام قالب)
    // السماح لأي موظف بإنشاء مهمة من قالب
    if (req.user.role === 'employee' && !req.user.can_create_ad_hoc && !templateId) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لإنشاء مهام خاصة. استخدم "إنشاء مهمة من قالب" لإنشاء مهمة من قالب موجود' });
    }
    
    let finalTitle = title;
    let finalCategoryId = categoryId;
    
    // إذا تم تحديد قالب، جلب بياناته
    if (templateId) {
      const template = await pool.query('SELECT * FROM task_templates WHERE id = $1', [templateId]);
      if (template.rows.length > 0) {
        if (!finalTitle) finalTitle = template.rows[0].title;
        if (!finalCategoryId) finalCategoryId = template.rows[0].category_id;
      }
    }
    
    const result = await pool.query(
      `INSERT INTO ad_hoc_tasks (template_id, category_id, created_by_user_id, assigned_to_user_id, title, description, due_date_time, beneficiary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        templateId || null,
        finalCategoryId || null,
        req.user.id,
        assignedToUserId || null,
        finalTitle,
        description || null,
        dueDateTime || null,
        beneficiary || null
      ]
    );
    
    // Get user name for notification
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userResult.rows[0]?.name || 'مستخدم';
    
    // Broadcast real-time update
    if (global.wsServer) {
      global.wsServer.broadcast('task_created', {
        userId: req.user.id,
        userName,
        taskId: result.rows[0].id,
        taskType: 'ad-hoc',
        title: finalTitle,
      }, req.user.id);
    }
    
    await auditLog(
      req.user.id,
      'create_ad_hoc_task',
      'ad_hoc_task',
      result.rows[0].id,
      { title: finalTitle },
      req.ip,
      req.get('user-agent')
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء المهمة الخاصة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// مساعد: جلب مجموع STTLE لتسوية (تاريخ + مصرف) لمطابقة مهام التسوية الحكومية — يستخدم إعدادات RTGS (حد 5542 حسب التاريخ)
async function getGovernmentSettlementSumSttle(poolClient, sttlDate, bankDisplayName) {
  const dateStr = String(sttlDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const rtgsCfg = await getRtgsConfig();
  const feeExpr = buildFeeExpr(rtgsCfg);
  const result = await poolClient.query(
    `SELECT COALESCE(SUM(r.amount - ${feeExpr}), 0) AS sum_sttle
     FROM rtgs r
     LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
     WHERE r.sttl_date = $1 AND COALESCE(sm.display_name_ar, r.inst_id2, '') = $2`,
    [dateStr, String(bankDisplayName).trim()]
  );
  return result.rows[0] ? parseFloat(result.rows[0].sum_sttle) : 0;
}

// تنفيذ مهمة (يومية أو خاصة)
// onBehalfOfUserId: اختياري — عند التنفيذ بدلاً عن زميل
// للمهام من فئة التسوية الحكومية مع المصارف: settlement_date, settlement_value مطلوبان ويُقارنان مع STTLE
const executeTask = async (req, res) => {
  try {
    const { dailyTaskId, adHocTaskId, resultStatus, notes, durationMinutes, onBehalfOfUserId, settlement_date, settlement_value } = req.body;
    
    if (!dailyTaskId && !adHocTaskId) {
      return res.status(400).json({ error: 'يجب تحديد مهمة يومية أو خاصة' });
    }
    
    if (!resultStatus || !['completed', 'completed_late', 'skipped', 'cancelled'].includes(resultStatus)) {
      return res.status(400).json({ error: 'حالة النتيجة مطلوبة وصحيحة' });
    }
    
    let verificationStatus = null;
    // تنسيق التاريخ دائماً YYYY-MM-DD للمقارنة مع getGovernmentSettlementSumSttle
    const rawDate = settlement_date ? String(settlement_date).trim().slice(0, 10) : null;
    const settlementDateVal = rawDate ? rawDate.replace(/\//g, '-') : null;
    const settlementValueNum = settlement_value != null && settlement_value !== '' ? parseFloat(String(settlement_value).replace(/,/g, '')) : null;
    
    if (dailyTaskId && (resultStatus === 'completed' || resultStatus === 'completed_late')) {
      const taskWithTemplate = await pool.query(
        `SELECT dt.id, dt.assigned_to_user_id, t.required_fields
         FROM daily_tasks dt
         LEFT JOIN task_templates t ON dt.template_id = t.id
         WHERE dt.id = $1`,
        [dailyTaskId]
      );
      const row = taskWithTemplate.rows[0];
      const rf = row?.required_fields || {};
      if (rf.category_type === 'government_settlement_bank' && rf.bank_display_name) {
        if (!settlementDateVal || (settlementValueNum === null || isNaN(settlementValueNum))) {
          return res.status(400).json({
            error: 'مهام التسوية الحكومية مع المصارف تتطلب تاريخ التسوية وقيمة التسوية',
            code: 'SETTLEMENT_REQUIRED',
          });
        }
        const conn = await pool.connect();
        try {
          const expectedSumSttle = await getGovernmentSettlementSumSttle(conn, settlementDateVal, rf.bank_display_name);
          const tolerance = 0.01;
          const matched = Math.abs(settlementValueNum - expectedSumSttle) <= tolerance;
          if (!matched) {
            return res.status(400).json({
              error: 'غير مطابقة — قيمة التسوية المدخلة لا تطابق مجموع STTLE في صفحة التسويات الحكومية لهذا التاريخ والمصرف.',
              verification_status: 'mismatch',
              expected_sum_sttle: expectedSumSttle,
              code: 'SETTLEMENT_MISMATCH',
            });
          }
          verificationStatus = 'matched';
        } finally {
          conn.release();
        }
      }
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // تحديد on_behalf_of_user_id تلقائياً:
      // - للمهام المجدولة: إذا نفذها شخص غير المسؤول → on_behalf_of_user_id = assigned_to_user_id
      // - للمهام المجدولة: إذا نفذها نفس المسؤول → on_behalf_of_user_id = null
      // - للمهام الخاصة: دائماً null (لأنها غير مكلفة لشخص معين)
      let finalOnBehalfOfUserId = null;
      
      if (dailyTaskId) {
        // مهمة مجدولة: جلب assigned_to_user_id
        const taskResult = await client.query(
          'SELECT assigned_to_user_id FROM daily_tasks WHERE id = $1',
          [dailyTaskId]
        );
        
        if (taskResult.rows.length > 0) {
          const assignedToUserId = taskResult.rows[0].assigned_to_user_id;
          
          // إذا نفذها شخص غير المسؤول → ضبط on_behalf_of_user_id
          if (assignedToUserId && req.user.id !== assignedToUserId) {
            finalOnBehalfOfUserId = assignedToUserId;
          }
          // إذا نفذها نفس المسؤول → on_behalf_of_user_id = null (لا حاجة لـ "بدلاً عن")
        }
      }
      // للمهام الخاصة: finalOnBehalfOfUserId يبقى null
      
      const executionResult = await client.query(
        `INSERT INTO task_executions (daily_task_id, ad_hoc_task_id, done_by_user_id, on_behalf_of_user_id, done_at, result_status, notes, duration_minutes, settlement_date, settlement_value, verification_status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          dailyTaskId || null,
          adHocTaskId || null,
          req.user.id,
          finalOnBehalfOfUserId,
          resultStatus,
          notes || null,
          durationMinutes || null,
          settlementDateVal || null,
          settlementValueNum != null && !isNaN(settlementValueNum) ? settlementValueNum : null,
          verificationStatus,
        ]
      );
      
      // تحديث حالة المهمة
      if (dailyTaskId) {
        await client.query(
          `UPDATE daily_tasks
           SET status = CASE
             WHEN $1 IN ('completed', 'completed_late') THEN 'completed'
             WHEN $1 = 'cancelled' THEN 'cancelled'
             WHEN $1 = 'skipped' THEN 'skipped'
             ELSE status
           END,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [resultStatus, dailyTaskId]
        );
      } else if (adHocTaskId) {
        await client.query(
          `UPDATE ad_hoc_tasks
           SET status = CASE
             WHEN $1 IN ('completed', 'completed_late') THEN 'completed'
             WHEN $1 = 'cancelled' THEN 'cancelled'
             WHEN $1 = 'skipped' THEN 'skipped'
             ELSE status
           END,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [resultStatus, adHocTaskId]
        );
      }
      
      await client.query('COMMIT');
      
      // Get user name for notification
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
      const userName = userResult.rows[0]?.name || 'مستخدم';
      
      // Broadcast real-time update
      if (global.wsServer) {
        global.wsServer.broadcast('task_executed', {
          userId: req.user.id,
          userName,
          taskId: dailyTaskId || adHocTaskId,
          taskType: dailyTaskId ? 'daily' : 'ad-hoc',
          resultStatus,
        }, req.user.id);
      }
      
      await auditLog(
        req.user.id,
        'execute_task',
        dailyTaskId ? 'daily_task' : 'ad_hoc_task',
        dailyTaskId || adHocTaskId,
        { resultStatus },
        req.ip,
        req.get('user-agent')
      );
      
      res.status(201).json(executionResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('خطأ في تنفيذ المهمة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// الحصول على سجلات التنفيذ
const getExecutions = async (req, res) => {
  try {
    const { dateFrom, dateTo, doneBy, taskId } = req.query;
    
    let query = `
      SELECT te.*,
             u.name as done_by_name,
             obh.name as on_behalf_of_name,
             dt.task_date as daily_task_date,
             dt.assigned_to_user_id as daily_task_assigned_to,
             assigned_user.name as assigned_to_name,
             aht.title as ad_hoc_task_title
      FROM task_executions te
      LEFT JOIN users u ON te.done_by_user_id = u.id
      LEFT JOIN users obh ON te.on_behalf_of_user_id = obh.id
      LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
      LEFT JOIN users assigned_user ON dt.assigned_to_user_id = assigned_user.id
      LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (dateFrom) {
      query += ` AND te.done_at >= $${paramCount++}`;
      params.push(dateFrom);
    }
    
    if (dateTo) {
      query += ` AND te.done_at <= $${paramCount++}`;
      params.push(dateTo);
    }
    
    if (doneBy) {
      query += ` AND te.done_by_user_id = $${paramCount++}`;
      params.push(doneBy);
    }
    
    if (taskId) {
      query += ` AND (te.daily_task_id = $${paramCount} OR te.ad_hoc_task_id = $${paramCount++})`;
      params.push(taskId);
    }
    
    query += ' ORDER BY te.done_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    const executions = result.rows.map(exec => ({
      ...exec,
      done_at: exec.done_at ? toBaghdadTime(exec.done_at).format('YYYY-MM-DD HH:mm:ss') : null
    }));
    
    res.json(executions);
  } catch (error) {
    console.error('خطأ في جلب سجلات التنفيذ:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// إرفاق ملف لتنفيذ مهمة
const addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
    const r = await pool.query(
      `SELECT id FROM task_executions WHERE id = $1`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'تنفيذ المهمة غير موجود' });
    const fileUrl = `/api/uploads/${file.filename}`;
    await pool.query(
      `INSERT INTO attachments (task_execution_id, file_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, fileUrl, file.originalname || file.filename, file.size, file.mimetype || null]
    );
    res.status(201).json({ message: 'تم رفع المرفق', fileUrl, fileName: file.originalname || file.filename });
  } catch (error) {
    console.error('خطأ في رفع المرفق:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// البحث عن المهام (اليومية والخاصة) حسب النص
const searchTasks = async (req, res) => {
  try {
    const { q, status, view, date, dateFrom, dateTo, limit = 50 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ dailyTasks: [], adHocTasks: [] });
    }
    
    const searchTerm = `%${q.trim()}%`;
    const userId = req.user?.id;
    const params = [searchTerm];
    let paramCount = 2;
    
    let dailyQuery = `
      SELECT dt.*,
             t.title as template_title,
             t.category_id,
             c.name as category_name,
             u.name as assigned_to_name,
             s.due_time,
             s.grace_minutes
      FROM daily_tasks dt
      LEFT JOIN task_templates t ON dt.template_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON dt.assigned_to_user_id = u.id
      LEFT JOIN schedules s ON dt.schedule_id = s.id
      WHERE (t.title ILIKE $1 OR c.name ILIKE $1)
    `;
    
    if (view === 'department_pending') {
      dailyQuery += ` AND dt.status IN ('pending', 'overdue')`;
    } else if (view === 'department_completed') {
      dailyQuery += ` AND dt.status = 'completed'`;
    } else if (view === 'my_pending' && userId) {
      dailyQuery += ` AND dt.assigned_to_user_id = $${paramCount++} AND dt.status IN ('pending', 'overdue')`;
      params.push(userId);
    } else if (status) {
      dailyQuery += ` AND dt.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (dateFrom && dateTo) {
      dailyQuery += ` AND dt.task_date >= $${paramCount++} AND dt.task_date <= $${paramCount++}`;
      params.push(dateFrom, dateTo);
    } else if (date) {
      dailyQuery += ` AND dt.task_date = $${paramCount++}`;
      params.push(date);
    }
    
    dailyQuery += ` ORDER BY dt.task_date DESC, dt.due_date_time LIMIT $${paramCount++}`;
    params.push(parseInt(limit));
    
    const adHocParams = [searchTerm];
    let adHocParamCount = 2;
    
    let adHocQuery = `
      SELECT aht.*,
             t.title as template_title,
             c.name as category_name,
             u1.name as created_by_name,
             u2.name as assigned_to_name
      FROM ad_hoc_tasks aht
      LEFT JOIN task_templates t ON aht.template_id = t.id
      LEFT JOIN categories c ON aht.category_id = c.id
      LEFT JOIN users u1 ON aht.created_by_user_id = u1.id
      LEFT JOIN users u2 ON aht.assigned_to_user_id = u2.id
      WHERE (aht.title ILIKE $1 OR t.title ILIKE $1 OR c.name ILIKE $1 OR aht.description ILIKE $1)
    `;
    
    if (view === 'department_pending') {
      adHocQuery += ` AND aht.status = 'pending'`;
    } else if (view === 'department_completed') {
      adHocQuery += ` AND aht.status = 'completed'`;
    } else if (view === 'my_pending' && userId) {
      adHocQuery += ` AND aht.status = 'pending' AND (aht.assigned_to_user_id = $${adHocParamCount} OR aht.created_by_user_id = $${adHocParamCount++})`;
      adHocParams.push(userId);
    } else if (status) {
      adHocQuery += ` AND aht.status = $${adHocParamCount++}`;
      adHocParams.push(status);
    }
    
    if (dateFrom && dateTo) {
      adHocQuery += ` AND aht.created_at::date >= $${adHocParamCount++} AND aht.created_at::date <= $${adHocParamCount++}`;
      adHocParams.push(dateFrom, dateTo);
    } else if (date) {
      adHocQuery += ` AND aht.created_at::date = $${adHocParamCount++}`;
      adHocParams.push(date);
    }
    
    adHocQuery += ` ORDER BY aht.created_at DESC LIMIT $${adHocParamCount++}`;
    adHocParams.push(parseInt(limit));
    
    const [dailyResult, adHocResult] = await Promise.all([
      pool.query(dailyQuery, params),
      pool.query(adHocQuery, adHocParams)
    ]);
    
    const dailyTasks = dailyResult.rows.map(task => ({
      ...task,
      due_date_time: task.due_date_time ? toBaghdadTime(task.due_date_time).format('YYYY-MM-DD HH:mm:ss') : null
    }));
    
    const adHocTasks = adHocResult.rows.map(task => ({
      ...task,
      due_date_time: task.due_date_time ? toBaghdadTime(task.due_date_time).format('YYYY-MM-DD HH:mm:ss') : null
    }));
    
    res.json({ dailyTasks, adHocTasks });
  } catch (error) {
    console.error('خطأ في البحث عن المهام:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// توليد المهام اليومية يدوياً — لمن لديه صلاحية عرض المهام (المشرفون والموظفون والأدمن)
const generateDailyTasks = async (req, res) => {
  try {
    const result = await runGenerateDailyTasks();
    res.json({
      success: true,
      message: `تم توليد ${result.generated} مهمة، ${result.skipped} تم تخطيها (موجودة مسبقاً)`,
      generated: result.generated,
      skipped: result.skipped,
      total: result.total
    });
  } catch (error) {
    console.error('خطأ في توليد المهام:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// التأكد من توليد مهام اليوم تلقائياً (يُستدعى عند فتح صفحة المهام — آمن للتكرار)
const ensureDailyTasks = async (req, res) => {
  try {
    const result = await runGenerateDailyTasks();
    res.json({
      success: true,
      message: result.generated > 0
        ? `تم توليد ${result.generated} مهمة تلقائياً`
        : 'مهام اليوم جاهزة',
      generated: result.generated,
      skipped: result.skipped,
      total: result.total
    });
  } catch (error) {
    console.error('خطأ في التأكد من المهام اليومية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف مهمة يومية — للأدمن فقط (task_executions تُحذف تلقائياً CASCADE)
const deleteDailyTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'معرف المهمة غير صالح' });
    const result = await pool.query('DELETE FROM daily_tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'المهمة غير موجودة' });
    await auditLog(req.user.id, 'delete_daily_task', 'daily_task', id, {}, req.ip, req.get('user-agent'));
    res.json({ success: true, message: 'تم حذف المهمة' });
  } catch (error) {
    console.error('خطأ في حذف المهمة اليومية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف مهمة خاصة — للأدمن فقط (task_executions تُحذف تلقائياً CASCADE)
const deleteAdHocTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'معرف المهمة غير صالح' });
    const result = await pool.query('DELETE FROM ad_hoc_tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'المهمة غير موجودة' });
    await auditLog(req.user.id, 'delete_ad_hoc_task', 'ad_hoc_task', id, {}, req.ip, req.get('user-agent'));
    res.json({ success: true, message: 'تم حذف المهمة' });
  } catch (error) {
    console.error('خطأ في حذف المهمة الخاصة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف جميع المهام — للأدمن فقط (اليومية + الخاصة، وسجلات التنفيذ تُحذف CASCADE)
const deleteAllTasks = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const dailyResult = await client.query('DELETE FROM daily_tasks RETURNING id');
      const adHocResult = await client.query('DELETE FROM ad_hoc_tasks RETURNING id');
      await client.query('COMMIT');
      const dailyCount = dailyResult.rowCount || 0;
      const adHocCount = adHocResult.rowCount || 0;
      await auditLog(req.user.id, 'delete_all_tasks', 'tasks', 0, { dailyCount, adHocCount }, req.ip, req.get('user-agent'));
      res.json({
        success: true,
        message: `تم حذف جميع المهام (${dailyCount} يومية، ${adHocCount} خاصة)`,
        dailyCount,
        adHocCount,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('خطأ في حذف جميع المهام:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = {
  getDailyTasks,
  getAdHocTasks,
  createAdHocTask,
  executeTask,
  getExecutions,
  addAttachment,
  searchTasks,
  generateDailyTasks,
  ensureDailyTasks,
  deleteDailyTask,
  deleteAdHocTask,
  deleteAllTasks
};