const pool = require('../config/database');
const { toBaghdadTime, getTodayBaghdad, getNowBaghdad } = require('../utils/timezone');
const { getGovernmentSettlementsDataForDate } = require('./rtgsController');

// القيم الافتراضية للشرائح المفعلة
const DEFAULT_ENABLED_SLIDES = {
  opening: true,
  overview: true,
  scheduledTasks: true,
  additionalTasks: true,
  employee: true,
  employeeMonthly: true,
  overdue: true,
  attendance: true,
  coverage: true,
  categories: true,
  recognition: true,
  rtgsImportsToday: true,
  rtgsSettlementsByImport: true,
  ctMatching: true,
  governmentSettlements: true,
  governmentSettlementCards: true,
  monthlyScheduledByCategory: true, // إنجازات الشهر - المهام المجدولة حسب الفئة
  monthlyAdditionalByEmployee: true, // المهام الإضافية الشهرية مجموعة حسب الموظف
  departmentMonthlyOverview: true, // إنجازات القسم الشهرية — شاملة لكل الموظفين
  settlementsMatchingOverview: true, // التسويات والمطابقة — شاملة مع KPI وقسم حسب الفئة
};

// إخفاء الأسماء في وضع الزائر
function anonymize(val, visitorMode) {
  if (!visitorMode || !val) return val;
  if (typeof val === 'string' && val.length > 1) return val.charAt(0) + '***';
  return '***';
}

// بيانات لوحة التحكم التلفزيونية
const getDashboardData = async (req, res) => {
  try {
    const today = getTodayBaghdad();
    const now = getNowBaghdad();
    const visitorMode = req.query.visitorMode === '1' || req.query.visitor === '1';

    // إعدادات لوحة التحكم
    const settingsResult = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['tv_dashboard']
    );
    
    let settings = {
      slideInterval: 10,
      autoRefresh: true,
      refreshInterval: 30,
      enabledSlides: { ...DEFAULT_ENABLED_SLIDES },
      rtgsDisplayMode: 'by_import_date',
      rtgsImportDateRange: 3,
      visitorMode: false,
      visibleEmployeeIds: [],
      visibleBankNames: [], // فارغ = الكل؛ غير فارغ = عرض المصارف المختارة فقط في كروت التسويات
      slideOrder: [],
      slideDurations: {},
      settlementCardsDateMode: 'previous_day',
      settlementCardsCustomDate: ''
    };
    if (settingsResult.rows.length > 0) {
      const value = settingsResult.rows[0].value;
      let parsed = value;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch (e) { parsed = {}; }
      }
      if (typeof parsed === 'object' && parsed !== null) {
        settings = { ...settings, ...parsed };
        if (parsed.enabledSlides && typeof parsed.enabledSlides === 'object') {
          settings.enabledSlides = { ...DEFAULT_ENABLED_SLIDES, ...parsed.enabledSlides };
        }
      }
    }
    const enabledSlides = settings.enabledSlides || DEFAULT_ENABLED_SLIDES;
    
    // تعريف التواريخ المهمة (يجب أن يكون في البداية)
    const monthStart = now.clone().startOf('month');
    const monthEnd = now.clone().endOf('month');
    const weekStart = now.clone().startOf('week');
    
    // الشريحة الافتتاحية
    const openingSlide = {
      type: 'opening',
      title: 'قسم التسويات والمطابقة',
      subtitle: 'شركة الصاقي للدفع الإلكتروني',
      date: now.format('YYYY-MM-DD'),
      time: now.format('HH:mm:ss')
    };
    
    // نظرة عامة على اليوم
    const overviewResult = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as done,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
       FROM daily_tasks
       WHERE task_date = $1`,
      [today]
    );
    
    const lateCount = await pool.query(
      `SELECT COUNT(*) as count
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE dt.task_date = $1 AND te.result_status = 'completed_late'`,
      [today]
    );
    
    // إحصائيات إضافية للنظرة العامة
    const totalEmployees = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND active = true`
    );
    
    const activeEmployeesToday = await pool.query(
      `SELECT COUNT(DISTINCT a.user_id) as count 
       FROM attendance a 
       WHERE a.date = $1`,
      [today]
    );
    
    const avgCompletionTime = await pool.query(
      `SELECT AVG(te.duration_minutes) as avg_duration
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE dt.task_date = $1 AND te.duration_minutes IS NOT NULL`,
      [today]
    );
    
    const overviewSlide = {
      type: 'overview',
      date: today,
      scheduled: parseInt(overviewResult.rows[0]?.total || 0),
      done: parseInt(overviewResult.rows[0]?.done || 0),
      overdue: parseInt(overviewResult.rows[0]?.overdue || 0),
      pending: parseInt(overviewResult.rows[0]?.pending || 0),
      late: parseInt(lateCount.rows[0]?.count || 0),
      totalEmployees: parseInt(totalEmployees.rows[0]?.count || 0),
      activeEmployeesToday: parseInt(activeEmployeesToday.rows[0]?.count || 0),
      avgCompletionTime: Math.round(parseFloat(avgCompletionTime.rows[0]?.avg_duration || 0)),
      completionRate: parseInt(overviewResult.rows[0]?.total || 0) > 0 
        ? Math.round((parseInt(overviewResult.rows[0]?.done || 0) / parseInt(overviewResult.rows[0]?.total || 0)) * 100)
        : 0
    };
    
    // صفحة المهام المجدولة اليوم (Scheduled Tasks Today)
    const scheduledTasksResult = await pool.query(
      `SELECT 
         dt.id,
         dt.status,
         dt.due_date_time,
         t.title,
         u.name as assigned_to_name,
         te.done_at,
         te.result_status,
         te.duration_minutes,
         u2.name as executed_by_name
       FROM daily_tasks dt
       LEFT JOIN task_templates t ON dt.template_id = t.id
       LEFT JOIN users u ON dt.assigned_to_user_id = u.id
       LEFT JOIN task_executions te ON dt.id = te.daily_task_id AND te.id = (
         SELECT id FROM task_executions 
         WHERE daily_task_id = dt.id 
         ORDER BY done_at DESC 
         LIMIT 1
       )
       LEFT JOIN users u2 ON te.done_by_user_id = u2.id
       WHERE dt.task_date = $1
       ORDER BY dt.due_date_time`,
      [today]
    );
    
    const scheduledTasksSlide = {
      type: 'scheduled-tasks',
      date: today,
      total: parseInt(overviewResult.rows[0]?.total || 0),
      completed: parseInt(overviewResult.rows[0]?.done || 0),
      overdue: parseInt(overviewResult.rows[0]?.overdue || 0),
      tasks: scheduledTasksResult.rows.map(task => {
        const dueTime = task.due_date_time ? toBaghdadTime(task.due_date_time) : null;
        const doneAt = task.done_at ? toBaghdadTime(task.done_at) : null;
        let delayMinutes = 0;
        
        if (dueTime && doneAt && task.result_status === 'completed_late') {
          delayMinutes = Math.max(0, doneAt.diff(dueTime, 'minutes'));
        } else if (dueTime && task.status === 'overdue') {
          delayMinutes = Math.max(0, now.diff(dueTime, 'minutes'));
        }
        
        return {
          id: task.id,
          title: task.title || 'مهمة بدون عنوان',
          status: task.status,
          expectedTime: dueTime ? dueTime.format('HH:mm') : null,
          actualCompletedTime: doneAt ? doneAt.format('HH:mm') : null,
          executedBy: task.executed_by_name || null,
          delayMinutes: delayMinutes
        };
      })
    };
    
    // صفحة المهام الإضافية (Additional Tasks)
    const additionalTasksResult = await pool.query(
      `SELECT 
         aht.id,
         aht.status,
         aht.due_date_time,
         aht.title,
         u.name as assigned_to_name,
         te.done_at,
         te.result_status,
         te.duration_minutes,
         u2.name as executed_by_name
       FROM ad_hoc_tasks aht
       LEFT JOIN users u ON aht.assigned_to_user_id = u.id
       LEFT JOIN task_executions te ON aht.id = te.ad_hoc_task_id AND te.id = (
         SELECT id FROM task_executions 
         WHERE ad_hoc_task_id = aht.id 
         ORDER BY done_at DESC 
         LIMIT 1
       )
       LEFT JOIN users u2 ON te.done_by_user_id = u2.id
       WHERE DATE(aht.created_at AT TIME ZONE 'Asia/Baghdad') = $1
       ORDER BY aht.created_at DESC`,
      [today]
    );
    
    const additionalTasksSlide = {
      type: 'additional-tasks',
      date: today,
      tasks: additionalTasksResult.rows.map(task => {
        const dueTime = task.due_date_time ? toBaghdadTime(task.due_date_time) : null;
        const doneAt = task.done_at ? toBaghdadTime(task.done_at) : null;
        
        // المهام الإضافية لا يوجد بها تأخير لأن الموظف نفسه ينشئها لنفسه ويكملها مباشرة
        // لذلك delayMinutes دائماً = 0
        
        return {
          id: task.id,
          title: task.title || 'مهمة بدون عنوان',
          status: task.status,
          expectedTime: dueTime ? dueTime.format('HH:mm') : null,
          actualCompletedTime: doneAt ? doneAt.format('HH:mm') : null,
          executedBy: task.executed_by_name || null,
          delayMinutes: 0 // المهام الإضافية لا يوجد بها تأخير
        };
      })
    };
    

    // شرائح الموظفين - إحصائيات يومية وشهرية
    const employeesResult = await pool.query(
      `SELECT 
         u.id,
         u.name,
         u.avatar_url,
         u.role
       FROM users u
       WHERE u.role = 'employee' AND u.active = true
       ORDER BY u.name`
    );

    let employeeRows = employeesResult.rows || [];
    const visibleIds = Array.isArray(settings.visibleEmployeeIds) && settings.visibleEmployeeIds.length > 0
      ? settings.visibleEmployeeIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n))
      : [];
    if (visibleIds.length > 0) {
      employeeRows = employeeRows.filter((e) => visibleIds.includes(parseInt(e.id, 10)));
    }

    const employeeSlides = [];

    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'لا يوجد موظفين في قاعدة البيانات' });
    }

    const empIds = employeeRows.map((e) => e.id);
    const todayStr = typeof today === 'string' ? today : (typeof today?.format === 'function' ? today.format('YYYY-MM-DD') : String(today));
    const monthStartStr = monthStart.format('YYYY-MM-DD');
    const monthEndStr = monthEnd.format('YYYY-MM-DD');
    const weekEndStr = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');

    // استعلامات مجمعة — استبدال N+1 بطلبات دفعة واحدة
    const [
      dailyAll,
      tasksAll,
      monthlyAll,
      monthlyScheduledStats,
      monthlyAdHocStats,
      bestDayAll,
      attendanceTodayAll,
      attendanceMonthlyAll,
      weekAll,
      categoriesAll,
      adHocAll
    ] = await Promise.all([
      pool.query(
        `SELECT te.done_by_user_id as user_id,
           COUNT(te.id)::int as tasks_done,
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late,
           COUNT(CASE WHEN dt.assigned_to_user_id != te.done_by_user_id THEN 1 END)::int as coverage,
           AVG(te.duration_minutes)::float as avg_duration,
           COALESCE(SUM(te.duration_minutes), 0)::int as total_duration
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         WHERE te.done_by_user_id = ANY($1::int[]) AND dt.task_date = $2
         GROUP BY te.done_by_user_id`,
        [empIds, todayStr]
      ),
      pool.query(
        `SELECT dt.assigned_to_user_id as user_id, dt.id, dt.status, dt.due_date_time, t.title,
           te.done_at, te.result_status, te.duration_minutes, u2.name as executed_by_name
         FROM daily_tasks dt
         LEFT JOIN task_templates t ON dt.template_id = t.id
         LEFT JOIN LATERAL (SELECT id, done_at, result_status, duration_minutes, done_by_user_id FROM task_executions WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1) te ON true
         LEFT JOIN users u2 ON te.done_by_user_id = u2.id
         WHERE dt.assigned_to_user_id = ANY($1::int[]) AND dt.task_date = $2
         ORDER BY dt.due_date_time NULLS LAST, dt.id`,
        [empIds, todayStr]
      ),
      pool.query(
        `SELECT te.done_by_user_id as user_id,
           COUNT(te.id)::int as tasks_done,
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late,
           COUNT(CASE WHEN dt.assigned_to_user_id != te.done_by_user_id THEN 1 END)::int as coverage,
           AVG(te.duration_minutes)::float as avg_duration,
           COALESCE(SUM(te.duration_minutes), 0)::int as total_duration
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         WHERE te.done_by_user_id = ANY($1::int[]) AND dt.task_date >= $2 AND dt.task_date <= $3
         GROUP BY te.done_by_user_id`,
        [empIds, monthStartStr, monthEndStr]
      ),
      pool.query(
        `SELECT dt.assigned_to_user_id as user_id,
           COUNT(*)::int as total,
           COUNT(te.id)::int as completed,
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late
         FROM daily_tasks dt
         LEFT JOIN LATERAL (SELECT id, result_status FROM task_executions WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1) te ON true
         WHERE dt.assigned_to_user_id = ANY($1::int[]) AND dt.task_date >= $2::date AND dt.task_date <= $3::date
         GROUP BY dt.assigned_to_user_id`,
        [empIds, monthStartStr, monthEndStr]
      ),
      pool.query(
        `SELECT aht.assigned_to_user_id as user_id,
           COUNT(*)::int as total,
           COUNT(te.id)::int as completed,
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late
         FROM ad_hoc_tasks aht
         LEFT JOIN LATERAL (SELECT id, result_status FROM task_executions WHERE ad_hoc_task_id = aht.id ORDER BY done_at DESC LIMIT 1) te ON true
         WHERE aht.assigned_to_user_id = ANY($1::int[])
           AND (aht.created_at AT TIME ZONE 'Asia/Baghdad')::date >= $2::date
           AND (aht.created_at AT TIME ZONE 'Asia/Baghdad')::date <= $3::date
         GROUP BY aht.assigned_to_user_id`,
        [empIds, monthStartStr, monthEndStr]
      ),
      pool.query(
        `SELECT user_id, task_date, tasks_count FROM (
           SELECT te.done_by_user_id as user_id, dt.task_date, COUNT(te.id)::int as tasks_count,
                  ROW_NUMBER() OVER (PARTITION BY te.done_by_user_id ORDER BY COUNT(te.id) DESC, dt.task_date DESC) as rn
           FROM task_executions te
           JOIN daily_tasks dt ON te.daily_task_id = dt.id
           WHERE te.done_by_user_id = ANY($1::int[]) AND dt.task_date >= $2 AND dt.task_date <= $3
           GROUP BY te.done_by_user_id, dt.task_date
         ) sub WHERE rn = 1`,
        [empIds, monthStartStr, monthEndStr]
      ),
      pool.query(
        `SELECT user_id, first_login_at FROM attendance WHERE user_id = ANY($1::int[]) AND date = $2`,
        [empIds, todayStr]
      ),
      pool.query(
        `SELECT user_id, COUNT(*)::int as days_present FROM attendance
         WHERE user_id = ANY($1::int[]) AND date >= $2 AND date <= $3
         GROUP BY user_id`,
        [empIds, monthStartStr, monthEndStr]
      ),
      pool.query(
        `SELECT te.done_by_user_id as user_id,
           COUNT(te.id)::int as tasks_done,
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         WHERE te.done_by_user_id = ANY($1::int[]) AND dt.task_date >= $2 AND dt.task_date <= $3
         GROUP BY te.done_by_user_id`,
        [empIds, weekStart.format('YYYY-MM-DD'), weekEndStr]
      ),
      pool.query(
        `SELECT user_id, name, SUM(cnt)::int as count FROM (
           SELECT dt.assigned_to_user_id as user_id, COALESCE(c.name, 'بدون فئة') as name, COUNT(dt.id)::int as cnt
           FROM daily_tasks dt
           LEFT JOIN task_templates t ON dt.template_id = t.id
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE dt.assigned_to_user_id = ANY($1::int[]) AND dt.task_date >= $2::date AND dt.task_date <= $3::date
           GROUP BY dt.assigned_to_user_id, c.id, c.name
           UNION ALL
           SELECT aht.assigned_to_user_id as user_id, COALESCE(c.name, 'بدون فئة') as name, COUNT(aht.id)::int as cnt
           FROM ad_hoc_tasks aht
           LEFT JOIN categories c ON aht.category_id = c.id
           WHERE aht.assigned_to_user_id = ANY($1::int[])
             AND (aht.created_at AT TIME ZONE 'Asia/Baghdad')::date >= $2::date
             AND (aht.created_at AT TIME ZONE 'Asia/Baghdad')::date <= $3::date
           GROUP BY aht.assigned_to_user_id, c.id, c.name
         ) sub GROUP BY user_id, name ORDER BY user_id, count DESC`,
        [empIds, monthStartStr, monthEndStr]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT aht.assigned_to_user_id as user_id, aht.id, aht.status, aht.due_date_time, aht.title,
           te.done_at, te.result_status, te.duration_minutes, u2.name as executed_by_name
         FROM ad_hoc_tasks aht
         LEFT JOIN LATERAL (SELECT id, done_at, result_status, duration_minutes, done_by_user_id FROM task_executions WHERE ad_hoc_task_id = aht.id ORDER BY done_at DESC LIMIT 1) te ON true
         LEFT JOIN users u2 ON te.done_by_user_id = u2.id
         WHERE aht.assigned_to_user_id = ANY($1::int[]) AND DATE(aht.created_at AT TIME ZONE 'Asia/Baghdad') = $2
         ORDER BY aht.created_at DESC`,
        [empIds, todayStr]
      )
    ]);

    const dailyByEmp = Object.fromEntries((dailyAll.rows || []).map((r) => [r.user_id, r]));
    const monthlyByEmp = Object.fromEntries((monthlyAll.rows || []).map((r) => [r.user_id, r]));
    const scheduledByEmp = Object.fromEntries((monthlyScheduledStats.rows || []).map((r) => [r.user_id, r]));
    const adHocByEmpMonthly = Object.fromEntries((monthlyAdHocStats.rows || []).map((r) => [r.user_id, r]));
    const weekByEmp = Object.fromEntries((weekAll.rows || []).map((r) => [r.user_id, r]));
    const attendanceTodayByEmp = Object.fromEntries((attendanceTodayAll.rows || []).map((r) => [r.user_id, r]));
    const attendanceMonthlyByEmp = Object.fromEntries((attendanceMonthlyAll.rows || []).map((r) => [r.user_id, r]));
    const bestDayByEmp = Object.fromEntries((bestDayAll.rows || []).map((r) => [r.user_id, r]));
    const tasksByEmp = {};
    for (const r of (tasksAll.rows || [])) {
      if (!tasksByEmp[r.user_id]) tasksByEmp[r.user_id] = [];
      tasksByEmp[r.user_id].push(r);
    }
    const categoriesByEmp = {};
    for (const r of (categoriesAll.rows || [])) {
      if (!categoriesByEmp[r.user_id]) categoriesByEmp[r.user_id] = [];
      categoriesByEmp[r.user_id].push(r);
    }
    const adHocByEmp = {};
    for (const r of (adHocAll.rows || [])) {
      if (!adHocByEmp[r.user_id]) adHocByEmp[r.user_id] = [];
      adHocByEmp[r.user_id].push(r);
    }

    for (const employee of employeeRows) {
      try {
        const daily = dailyByEmp[employee.id] || {};
        const monthly = monthlyByEmp[employee.id] || {};
        const week = weekByEmp[employee.id] || {};
        const employeeTasks = tasksByEmp[employee.id] || [];
        const adHocTasksResult = { rows: adHocByEmp[employee.id] || [] };
        const attendanceToday = { rows: attendanceTodayByEmp[employee.id] ? [attendanceTodayByEmp[employee.id]] : [] };
        const attendanceMonthly = { rows: attendanceMonthlyByEmp[employee.id] ? [{ days_present: attendanceMonthlyByEmp[employee.id].days_present }] : [] };
        const bestDay = { rows: bestDayByEmp[employee.id] ? [bestDayByEmp[employee.id]] : [] };
        const monthlyCategoriesStats = { rows: categoriesByEmp[employee.id] || [] };
        const sched = scheduledByEmp[employee.id] || {};
        const adhoc = adHocByEmpMonthly[employee.id] || {};
        const schedTotal = parseInt(sched.total || 0);
        const adHocTotal = parseInt(adhoc.total || 0);
        const schedCompleted = parseInt(sched.completed || 0);
        const adHocCompleted = parseInt(adhoc.completed || 0);
        const schedOnTime = parseInt(sched.on_time || 0);
        const adHocOnTime = parseInt(adhoc.on_time || 0);
        const schedLate = parseInt(sched.late || 0);
        const adHocLate = parseInt(adhoc.late || 0);
        const totalTasks = schedTotal + adHocTotal;
        const completedTasks = schedCompleted + adHocCompleted;
        const onTimeTasks = schedOnTime + adHocOnTime;
        const lateTasks = schedLate + adHocLate;
        const pendingTasks = Math.max(0, totalTasks - completedTasks);
        // نسبة الدقة = (المهام في الوقت / إجمالي المهام) × 100 — المعلقة والمتأخرة تخفضان النسبة
        const accuracyPct = totalTasks > 0
          ? Math.round((onTimeTasks / totalTasks) * 100)
          : 0;

      // Employee Daily Slide - المهام المجدولة
      const scheduledTasksArray = employeeTasks.map(task => {
            try {
              const dueTime = task.due_date_time ? toBaghdadTime(task.due_date_time) : null;
              const doneAt = task.done_at ? toBaghdadTime(task.done_at) : null;
              let delayMinutes = 0;
              
              if (dueTime && doneAt && task.result_status === 'completed_late') {
                delayMinutes = Math.max(0, doneAt.diff(dueTime, 'minutes'));
              } else if (dueTime && task.status === 'overdue') {
                delayMinutes = Math.max(0, now.diff(dueTime, 'minutes'));
              }
              
              return {
                id: task.id,
                title: task.title || 'مهمة بدون عنوان',
                status: task.status,
                expectedTime: dueTime ? dueTime.format('HH:mm') : null,
                actualCompletedTime: doneAt ? doneAt.format('HH:mm') : null,
                executedBy: task.executed_by_name || null,
                delayMinutes: delayMinutes,
                type: 'scheduled' // نوع المهمة: مجدولة
              };
            } catch {
              return {
                id: task.id,
                title: task.title || 'مهمة بدون عنوان',
                status: task.status || 'pending',
                expectedTime: null,
                actualCompletedTime: null,
                executedBy: null,
                delayMinutes: 0,
                type: 'scheduled'
              };
            }
          });
      
      // المهام الإضافية - لا يوجد بها تأخير لأن الموظف نفسه ينشئها ويكملها مباشرة
      const adHocTasksArray = adHocTasksResult.rows.map(task => {
            try {
              const dueTime = task.due_date_time ? toBaghdadTime(task.due_date_time) : null;
              const doneAt = task.done_at ? toBaghdadTime(task.done_at) : null;
              
              return {
                id: `ad-hoc-${task.id}`, // ID مميز للمهام الإضافية
                title: task.title || 'مهمة إضافية بدون عنوان',
                status: task.status || 'completed', // المهام الإضافية عادة مكتملة
                expectedTime: dueTime ? dueTime.format('HH:mm') : null,
                actualCompletedTime: doneAt ? doneAt.format('HH:mm') : null,
                executedBy: task.executed_by_name || null,
                delayMinutes: 0, // المهام الإضافية لا يوجد بها تأخير
                type: 'ad-hoc' // نوع المهمة: إضافية
              };
            } catch {
              return {
                id: `ad-hoc-${task.id}`,
                title: task.title || 'مهمة إضافية بدون عنوان',
                status: task.status || 'completed',
                expectedTime: null,
                actualCompletedTime: null,
                executedBy: null,
                delayMinutes: 0,
                type: 'ad-hoc'
              };
            }
          });
      
      // دمج المهام المجدولة والإضافية وترتيبها حسب الوقت المفترض
      const tasksArray = [...scheduledTasksArray, ...adHocTasksArray].sort((a, b) => {
        // ترتيب حسب الوقت المفترض (إن وجد)
        if (a.expectedTime && b.expectedTime) {
          return a.expectedTime.localeCompare(b.expectedTime);
        }
        if (a.expectedTime) return -1;
        if (b.expectedTime) return 1;
        return 0;
      });

      employeeSlides.push({
        type: 'employee',
        employee: {
          id: employee.id,
          name: employee.name,
          avatarUrl: employee.avatar_url,
          role: employee.role
        },
        daily: {
          tasksDone: parseInt(daily.tasks_done || 0),
          onTime: parseInt(daily.on_time || 0),
          late: parseInt(daily.late || 0),
          coverage: parseInt(daily.coverage || 0),
          avgDuration: Math.round(parseFloat(daily.avg_duration || 0)),
          totalDuration: parseInt(daily.total_duration || 0),
          attendance: attendanceToday.rows.length > 0 ? {
            present: true,
            loginTime: attendanceToday.rows[0].first_login_at 
              ? toBaghdadTime(attendanceToday.rows[0].first_login_at).format('HH:mm')
              : null
          } : { present: false },
          tasks: tasksArray
        },
        monthly: {
          tasksDone: parseInt(monthly.tasks_done || 0),
          onTime: parseInt(monthly.on_time || 0),
          late: parseInt(monthly.late || 0),
          coverage: parseInt(monthly.coverage || 0),
          avgDuration: Math.round(parseFloat(monthly.avg_duration || 0)),
          totalDuration: parseInt(monthly.total_duration || 0),
          attendance: {
            daysPresent: parseInt(attendanceMonthly.rows[0]?.days_present || 0),
            month: now.format('MMMM YYYY')
          },
          bestDay: bestDay.rows[0] ? {
            date: bestDay.rows[0].task_date,
            tasks: parseInt(bestDay.rows[0].tasks_count)
          } : null
        },
        weekly: {
          tasksDone: parseInt(week.tasks_done || 0),
          onTime: parseInt(week.on_time || 0)
        }
      });
      
      // Employee Monthly Slide — إحصائيات صحيحة: مجدولة + إضافية
      employeeSlides.push({
        type: 'employee-monthly',
        employee: {
          id: employee.id,
          name: employee.name,
          avatarUrl: employee.avatar_url,
          role: employee.role
        },
        daily: {
          attendance: attendanceToday.rows.length > 0 ? {
            present: true,
            loginTime: attendanceToday.rows[0].first_login_at 
              ? toBaghdadTime(attendanceToday.rows[0].first_login_at).format('HH:mm')
              : null
          } : { present: false }
        },
        monthly: {
          totalTasks,
          scheduledTotal: schedTotal,
          adHocTotal,
          completed: completedTasks,
          onTime: onTimeTasks,
          late: lateTasks,
          pending: pendingTasks,
          accuracy: accuracyPct,
          tasksDone: completedTasks,
          coverage: parseInt(monthly.coverage || 0),
          avgDuration: Math.round(parseFloat(monthly.avg_duration || 0)),
          totalDuration: parseInt(monthly.total_duration || 0),
          attendance: {
            daysPresent: parseInt(attendanceMonthly.rows[0]?.days_present || 0),
            month: now.format('MMMM YYYY'),
            loginTime: attendanceToday.rows.length > 0 && attendanceToday.rows[0].first_login_at
              ? toBaghdadTime(attendanceToday.rows[0].first_login_at).format('HH:mm')
              : null
          },
          categories: monthlyCategoriesStats.rows.map(cat => ({
            name: cat.name,
            count: parseInt(cat.count || 0)
          }))
        }
      });
      } catch {
        // نستمر مع الموظفين الآخرين حتى لو فشل أحدهم
      }
    }

    // شريحة إنجازات القسم الشهرية — إحصائيات مجمعة لكل الموظفين
    let departmentMonthlySlide = { type: 'department-monthly-overview', month: now.format('MMMM YYYY'), totalEmployees: employeeRows.length, monthly: { totalTasks: 0, scheduledTotal: 0, adHocTotal: 0, completed: 0, onTime: 0, late: 0, pending: 0, accuracy: 0, attendance: { daysPresent: 0 } }, categories: [] };
    try {
      let deptTotal = 0, deptSched = 0, deptAdHoc = 0, deptCompleted = 0, deptOnTime = 0, deptLate = 0, deptDays = 0;
      const catMap = new Map();
      for (const emp of employeeRows) {
        const s = scheduledByEmp[emp.id] || {};
        const a = adHocByEmpMonthly[emp.id] || {};
        const am = attendanceMonthlyByEmp[emp.id];
        const st = parseInt(s.total || 0), at = parseInt(a.total || 0);
        const sc = parseInt(s.completed || 0), ac = parseInt(a.completed || 0);
        const so = parseInt(s.on_time || 0), ao = parseInt(a.on_time || 0);
        const sl = parseInt(s.late || 0), al = parseInt(a.late || 0);
        deptSched += st;
        deptAdHoc += at;
        deptTotal += st + at;
        deptCompleted += sc + ac;
        deptOnTime += so + ao;
        deptLate += sl + al;
        deptDays += parseInt(am?.days_present || 0);
        for (const row of (categoriesByEmp[emp.id] || [])) {
          const n = row.name || 'بدون فئة';
          catMap.set(n, (catMap.get(n) || 0) + parseInt(row.count || 0));
        }
      }
      deptTotal = Math.max(deptTotal, deptSched + deptAdHoc);
      const deptPending = Math.max(0, deptTotal - deptCompleted);
      departmentMonthlySlide.monthly = {
        totalTasks: deptTotal,
        scheduledTotal: deptSched,
        adHocTotal: deptAdHoc,
        completed: deptCompleted,
        onTime: deptOnTime,
        late: deptLate,
        pending: deptPending,
        accuracy: deptTotal > 0 ? Math.round((deptOnTime / deptTotal) * 100) : 0,
        attendance: { daysPresent: deptDays, month: now.format('MMMM YYYY') }
      };
      departmentMonthlySlide.categories = Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => (b.count || 0) - (a.count || 0));
    } catch (e) {
      departmentMonthlySlide.monthly = { totalTasks: 0, scheduledTotal: 0, adHocTotal: 0, completed: 0, onTime: 0, late: 0, pending: 0, accuracy: 0, attendance: { daysPresent: 0 } };
      departmentMonthlySlide.categories = [];
    }
    
    // شريحة المهام المتأخرة — تصفية من المهام المجدولة
    const overdueTasks = (scheduledTasksSlide.tasks || []).filter(t => t.status === 'overdue');
    const overdueSlide = {
      type: 'overdue',
      date: today,
      tasks: overdueTasks.map(t => ({
        ...t,
        assignedTo: t.executedBy || 'غير محدد',
        dueTime: t.expectedTime
      }))
    };

    // شريحة الحضور — سجلات الحضور اليوم
    const attendanceRecords = await pool.query(
      `SELECT u.name, a.first_login_at
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.date = $1
       ORDER BY a.first_login_at`,
      [today]
    );
    const attendanceSlide = {
      type: 'attendance',
      date: today,
      present: parseInt(activeEmployeesToday.rows[0]?.count || 0),
      records: attendanceRecords.rows.map(r => ({
        name: r.name,
        time: r.first_login_at ? toBaghdadTime(r.first_login_at).format('HH:mm') : null
      }))
    };

    // شريحة التغطية — من قام بمهام الآخرين اليوم
    const coverageResult = await pool.query(
      `SELECT u.name, COUNT(*) as count
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       JOIN users u ON te.done_by_user_id = u.id
       WHERE dt.task_date = $1 AND dt.assigned_to_user_id != te.done_by_user_id
       GROUP BY u.id, u.name
       ORDER BY count DESC`,
      [today]
    );
    const coverageSlide = {
      type: 'coverage',
      date: today,
      coverage: coverageResult.rows.map(r => ({
        name: anonymize(r.name, visitorMode),
        count: parseInt(r.count || 0)
      }))
    };

    // شريحة الفئات — إحصائيات حسب الفئة اليوم
    let categoriesSlide = { type: 'categories', date: today, categories: [] };
    try {
      const catResult = await pool.query(
        `SELECT COALESCE(c.name, 'بدون فئة') as name, COUNT(te.id) as count
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
         LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)
         GROUP BY c.id, c.name ORDER BY count DESC`,
        [today]
      );
      categoriesSlide.categories = catResult.rows.map(r => ({ name: r.name, count: parseInt(r.count || 0) }));
    } catch (e) { /* ignore */ }

    // شريحة أفضل الأداء — ترتيب الموظفين
    let recognitionSlide = { type: 'recognition', date: today, topPerformers: [] };
    try {
      const perfResult = await pool.query(
        `SELECT u.name, COUNT(te.id) as tasks,
                COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as on_time
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN users u ON te.done_by_user_id = u.id
         WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)
           AND u.id IS NOT NULL
         GROUP BY u.id, u.name ORDER BY tasks DESC LIMIT 10`,
        [today]
      );
      recognitionSlide.topPerformers = perfResult.rows.map(r => ({
        name: anonymize(r.name, visitorMode),
        tasks: parseInt(r.tasks || 0),
        onTime: parseInt(r.on_time || 0)
      }));
    } catch (e) { /* ignore */ }

    // شرائح RTGS — استيراد اليوم وكروت التسويات (حسب تاريخ التحميل)
    let rtgsImportsSlide = { type: 'rtgs-imports-today', date: today, imports: [] };
    let rtgsSettlementsSlide = { type: 'rtgs-settlements-by-import', date: today, cards: [] };
    const rtgsDays = Math.max(1, parseInt(settings.rtgsImportDateRange, 10) || 3);
    const rtgsStart = now.clone().subtract(rtgsDays, 'days').format('YYYY-MM-DD');

    try {
      const ilResult = await pool.query(
        `SELECT il.id, il.filename, il.inserted_rows, il.created_at
         FROM import_logs il
         WHERE (il.created_at AT TIME ZONE 'Asia/Baghdad')::date >= $1::date
         ORDER BY il.created_at DESC`,
        [rtgsStart]
      );

      for (const il of ilResult.rows) {
        const rtgsSum = await pool.query(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(r.amount),0) as amt, COALESCE(SUM(r.fees),0) as fees,
                  COALESCE(SUM(r.acq),0) as acq, COALESCE(SUM(r.sttle),0) as sttle,
                  MIN(r.sttl_date)::text as dmin, MAX(r.sttl_date)::text as dmax
           FROM rtgs r WHERE r.import_log_id = $1`,
          [il.id]
        );
        const s = rtgsSum.rows[0] || {};
        const card = {
          importLogId: il.id,
          filename: il.filename || 'ملف',
          importedAt: il.created_at ? toBaghdadTime(il.created_at).format('YYYY-MM-DD HH:mm') : null,
          sttlDateFrom: s.dmin ? s.dmin.slice(0, 10) : null,
          sttlDateTo: s.dmax ? s.dmax.slice(0, 10) : null,
          rowCount: parseInt(s.cnt || 0),
          totalAmount: parseFloat(s.amt || 0),
          totalFees: parseFloat(s.fees || 0),
          totalAcq: parseFloat(s.acq || 0),
          totalSttle: parseFloat(s.sttle || 0)
        };
        rtgsImportsSlide.imports.push(card);
        rtgsSettlementsSlide.cards.push(card);
      }
    } catch (e) {
    }

    // شريحة CT Matching — سجلات CT للمطابقة
    let ctMatchingSlide = { type: 'ct-matching', records: [] };
    try {
      const ctResult = await pool.query(
        `SELECT c.id, c.sttl_date_from, c.sttl_date_to, c.ct_value, c.sum_acq, c.sum_fees,
                c.match_status, c.ct_received_date, c.notes,
                u.name as user_name
         FROM ct_records c
         LEFT JOIN users u ON c.user_id = u.id
         ORDER BY c.sttl_date_from DESC, c.id DESC LIMIT 20`
      );
      ctMatchingSlide.records = ctResult.rows.map(r => ({
        id: r.id,
        sttlDateFrom: r.sttl_date_from ? String(r.sttl_date_from).slice(0, 10) : null,
        sttlDateTo: r.sttl_date_to ? String(r.sttl_date_to).slice(0, 10) : null,
        ctValue: parseFloat(r.ct_value || 0),
        sumAcq: parseFloat(r.sum_acq || 0),
        sumFees: parseFloat(r.sum_fees || 0),
        matchStatus: r.match_status || 'not_matched',
        ctReceivedDate: r.ct_received_date ? String(r.ct_received_date).slice(0, 10) : null,
        userName: anonymize(r.user_name, visitorMode),
        notes: r.notes
      }));
    } catch (e) {
    }

    // شريحة التسوية الحكومية — مهام target_settlement_date
    let governmentSettlementsSlide = { type: 'government-settlements', date: today, tasks: [] };
    try {
      const govResult = await pool.query(
        `SELECT dt.id, dt.target_settlement_date, t.title, u.name as assigned_name,
                te.settlement_date, te.settlement_value, te.verification_status,
                u2.name as executed_name
         FROM daily_tasks dt
         LEFT JOIN task_templates t ON dt.template_id = t.id
         LEFT JOIN users u ON dt.assigned_to_user_id = u.id
         LEFT JOIN task_executions te ON dt.id = te.daily_task_id AND te.id = (
           SELECT id FROM task_executions WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1
         )
         LEFT JOIN users u2 ON te.done_by_user_id = u2.id
         WHERE dt.target_settlement_date IS NOT NULL
           AND (dt.task_date = $1 OR dt.target_settlement_date = $1)
         ORDER BY dt.target_settlement_date DESC`,
        [today]
      );
      governmentSettlementsSlide.tasks = govResult.rows.map(r => ({
        id: r.id,
        title: r.title || 'تسوية حكومية',
        targetSettlementDate: r.target_settlement_date ? String(r.target_settlement_date).slice(0, 10) : null,
        settlementDate: r.settlement_date ? String(r.settlement_date).slice(0, 10) : null,
        settlementValue: r.settlement_value != null ? parseFloat(r.settlement_value) : null,
        verificationStatus: r.verification_status || 'pending',
        assignedName: anonymize(r.assigned_name, visitorMode),
        executedName: anonymize(r.executed_name, visitorMode)
      }));
    } catch (e) {
    }

    // شريحة كروت التسويات الحكومية — نفس مصدر وطريقة صفحة التسويات الحكومية (rtgsController)
    const settlementDateMode = settings.settlementCardsDateMode || 'previous_day';
    const settlementCustomDate = String(settings.settlementCardsCustomDate || '').trim().slice(0, 10);
    let targetCardsDate;
    if (settlementDateMode === 'today') {
      targetCardsDate = today;
    } else if (settlementDateMode === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(settlementCustomDate)) {
      targetCardsDate = settlementCustomDate;
    } else {
      targetCardsDate = now.clone().subtract(1, 'days').format('YYYY-MM-DD'); // اليوم السابق
    }
    let governmentSettlementCardsSlide = { type: 'government-settlement-cards', date: targetCardsDate, cards: [] };
    try {
      const visibleBanks = Array.isArray(settings.visibleBankNames) && settings.visibleBankNames.length > 0
        ? settings.visibleBankNames.map((s) => String(s).trim()).filter(Boolean)
        : [];
      const { rows } = await getGovernmentSettlementsDataForDate(targetCardsDate, visibleBanks.length > 0 ? visibleBanks : []);
      const groupMap = new Map();
      for (const row of rows || []) {
        const sttlDate = row.sttl_date ? String(row.sttl_date).slice(0, 10) : null;
        const tranDate = row.transaction_date ? String(row.transaction_date).slice(0, 10) : null;
        const key = `${sttlDate}|${row.inst_id2 || ''}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            sttl_date: sttlDate,
            bank_name: row.bank_name || row.inst_id2 || '—',
            rows: [],
            totals: { movement_count: 0, sum_amount: 0, sum_fees: 0, sum_acq: 0, sum_sttle: 0 }
          });
        }
        const g = groupMap.get(key);
        const r = {
          transaction_date: tranDate,
          movement_count: parseInt(row.movement_count, 10),
          sum_amount: parseFloat(row.sum_amount || 0),
          sum_fees: parseFloat(row.sum_fees || 0),
          sum_acq: parseFloat(row.sum_acq || 0),
          sum_sttle: parseFloat(row.sum_sttle || 0)
        };
        g.rows.push(r);
        g.totals.movement_count += r.movement_count;
        g.totals.sum_amount += r.sum_amount;
        g.totals.sum_fees += r.sum_fees;
        g.totals.sum_acq += r.sum_acq;
        g.totals.sum_sttle += r.sum_sttle;
      }
      let cardsList = Array.from(groupMap.values());
      if (visibleBanks.length > 0) {
        cardsList = cardsList.filter((c) => visibleBanks.includes(c.bank_name || ''));
      }
      governmentSettlementCardsSlide.cards = cardsList;
    } catch (e) {
      // في حالة الخطأ (مثلاً جدول RTGS غير موجود) نترك cards فارغة
    }

    // شريحة التسويات والمطابقة — شاملة: KPI + حسب المصرف (الفئة)
    let settlementsMatchingOverviewSlide = { type: 'settlements-matching-overview', date: today, kpis: [], categories: [], month: now.format('MMMM YYYY') };
    try {
      const sttlFrom7 = now.clone().subtract(7, 'days').format('YYYY-MM-DD');
      const sttlTo7 = now.clone().add(1, 'days').format('YYYY-MM-DD');
      const [rtgsKpis, ctKpis, govCount, bankCategories] = await Promise.all([
        pool.query(
          `WITH il_ids AS (SELECT id FROM import_logs WHERE (created_at AT TIME ZONE 'Asia/Baghdad')::date >= $1)
           SELECT (SELECT COUNT(*) FROM il_ids)::int as import_count,
                  (SELECT COUNT(*)::bigint FROM rtgs r WHERE r.import_log_id IN (SELECT id FROM il_ids)) as movement_count,
                  (SELECT COALESCE(SUM(r.amount), 0)::float FROM rtgs r WHERE r.import_log_id IN (SELECT id FROM il_ids)) as total_amount,
                  (SELECT COALESCE(SUM(r.sttle), 0)::float FROM rtgs r WHERE r.import_log_id IN (SELECT id FROM il_ids)) as total_sttle`,
          [sttlFrom7]
        ).catch(() => ({ rows: [{ import_count: 0, movement_count: 0, total_amount: 0, total_sttle: 0 }] })),
        pool.query(
          `SELECT COUNT(*)::int as total,
                  COUNT(CASE WHEN match_status = 'matched' THEN 1 END)::int as matched,
                  COUNT(CASE WHEN match_status != 'matched' OR match_status IS NULL THEN 1 END)::int as not_matched,
                  COALESCE(SUM(ct_value), 0)::float as total_ct_value
           FROM ct_records
           WHERE (ct_received_date IS NULL OR ct_received_date >= $1)`,
          [sttlFrom7]
        ).catch(() => ({ rows: [{ total: 0, matched: 0, not_matched: 0, total_ct_value: 0 }] })),
        pool.query(
          `SELECT COUNT(*)::int as cnt FROM daily_tasks
           WHERE target_settlement_date IS NOT NULL
             AND (task_date = $1 OR target_settlement_date = $1)`,
          [today, today]
        ).catch(() => ({ rows: [{ cnt: 0 }] })),
        pool.query(
          `SELECT COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف') AS bank_name,
                  COUNT(*)::int AS movement_count,
                  COALESCE(SUM(r.sttle), 0)::float AS sum_sttle
           FROM rtgs r
           LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
           WHERE r.sttl_date >= $1 AND r.sttl_date <= $2
           GROUP BY sm.display_name_ar, r.inst_id2
           ORDER BY sum_sttle DESC`,
          [sttlFrom7, sttlTo7]
        ).catch(() => ({ rows: [] }))
      ]);

      const r = rtgsKpis.rows[0] || {};
      const c = ctKpis.rows[0] || {};
      const g = govCount.rows[0] || {};
      const movementCount = parseInt(r.movement_count || 0);
      const importCount = parseInt(r.import_count || 0);

      settlementsMatchingOverviewSlide.kpis = [
        { id: 'rtgs_imports', label: 'عدد الاستيرادات (RTGS)', value: importCount, suffix: '', icon: 'upload' },
        { id: 'rtgs_movements', label: 'عدد الحركات', value: movementCount, suffix: '', icon: 'activity' },
        { id: 'rtgs_amount', label: 'إجمالي قيمة الحركات', value: parseFloat(r.total_amount || 0), suffix: ' IQD', icon: 'dollar', format: 'number' },
        { id: 'rtgs_sttle', label: 'إجمالي التسوية (STTLE)', value: parseFloat(r.total_sttle || 0), suffix: ' IQD', icon: 'bank', format: 'number' },
        { id: 'ct_total', label: 'سجلات CT', value: parseInt(c.total || 0), suffix: '', icon: 'file' },
        { id: 'ct_matched', label: 'CT مطابقة', value: parseInt(c.matched || 0), suffix: '', icon: 'check' },
        { id: 'ct_not_matched', label: 'CT غير مطابقة', value: parseInt(c.not_matched || 0), suffix: '', icon: 'alert' },
        { id: 'gov_tasks', label: 'مهام التسوية الحكومية', value: parseInt(g.cnt || 0), suffix: '', icon: 'target' }
      ];
      settlementsMatchingOverviewSlide.categories = (bankCategories.rows || []).map(row => ({
        name: row.bank_name || '—',
        count: parseInt(row.movement_count || 0),
        value: parseFloat(row.sum_sttle || 0)
      }));
    } catch (e) {
      settlementsMatchingOverviewSlide.kpis = [];
      settlementsMatchingOverviewSlide.categories = [];
    }

    // شريحة إنجازات الشهر - المهام المجدولة حسب الفئة (عدد، منجزة، متأخرة، معلقة)
    let monthlyScheduledByCategorySlide = { type: 'monthly-scheduled-by-category', month: now.format('MMMM YYYY'), categories: [] };
    try {
      const mStart = monthStart.format('YYYY-MM-DD');
      const mEnd = monthEnd.format('YYYY-MM-DD');
      const monthlyCatResult = await pool.query(
        `WITH dt_with_te AS (
          SELECT dt.id, dt.status, dt.task_date, t.category_id, c.name as category_name,
                 te.result_status, te.done_by_user_id
          FROM daily_tasks dt
          LEFT JOIN task_templates t ON dt.template_id = t.id
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN LATERAL (
            SELECT result_status, done_by_user_id FROM task_executions
            WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1
          ) te ON true
          WHERE dt.task_date >= $1 AND dt.task_date <= $2
        )
        SELECT COALESCE(category_name, 'بدون فئة') as name,
               COUNT(*) as total,
               COUNT(CASE WHEN result_status = 'completed' THEN 1 END) as completed,
               COUNT(CASE WHEN result_status = 'completed_late' THEN 1 END) as completed_late,
               COUNT(CASE WHEN result_status IS NULL OR (result_status != 'completed' AND result_status != 'completed_late') THEN 1 END) as pending
        FROM dt_with_te
        GROUP BY category_id, category_name
        ORDER BY total DESC`,
        [mStart, mEnd]
      );
      monthlyScheduledByCategorySlide.categories = monthlyCatResult.rows.map(r => ({
        name: r.name,
        total: parseInt(r.total || 0),
        completed: parseInt(r.completed || 0),
        completedLate: parseInt(r.completed_late || 0),
        pending: parseInt(r.pending || 0)
      }));
    } catch (e) {
    }

    // شريحة المهام الإضافية الشهرية مجموعة حسب الموظف المنفذ
    let monthlyAdditionalByEmployeeSlide = { type: 'monthly-additional-by-employee', month: now.format('MMMM YYYY'), groups: [] };
    try {
      const mStart = monthStart.format('YYYY-MM-DD');
      const mEnd = monthEnd.format('YYYY-MM-DD');
      const adHocMonthlyResult = await pool.query(
        `SELECT aht.id, aht.title, aht.status, aht.due_date_time, aht.created_at,
                te.done_at, te.result_status, u.id as user_id, u.name as user_name, u.avatar_url
         FROM ad_hoc_tasks aht
         JOIN task_executions te ON te.ad_hoc_task_id = aht.id
         JOIN users u ON te.done_by_user_id = u.id
         WHERE (te.done_at AT TIME ZONE 'Asia/Baghdad')::date >= $1::date
           AND (te.done_at AT TIME ZONE 'Asia/Baghdad')::date <= $2::date
         ORDER BY u.name, te.done_at DESC`,
        [mStart, mEnd]
      );
      const rows = adHocMonthlyResult.rows || [];
      const groupMap = new Map();
      for (const row of rows) {
        const uid = row.user_id;
        if (!groupMap.has(uid)) {
          groupMap.set(uid, {
            employee: {
              id: uid,
              name: anonymize(row.user_name, visitorMode),
              avatarUrl: row.avatar_url || null
            },
            tasks: []
          });
        }
        const g = groupMap.get(uid);
        g.tasks.push({
          id: row.id,
          title: row.title || 'مهمة',
          status: row.status,
          doneAt: row.done_at ? toBaghdadTime(row.done_at).format('YYYY-MM-DD HH:mm') : null
        });
      }
      let groupsList = Array.from(groupMap.values());
      if (visibleIds.length > 0) {
        groupsList = groupsList.filter((g) => visibleIds.includes(g.employee.id));
      }
      monthlyAdditionalByEmployeeSlide.groups = groupsList;
    } catch (e) {
    }

    // تطبيق visitorMode على الشرائح
    if (visitorMode) {
      attendanceSlide.records = (attendanceSlide.records || []).map(r => ({ ...r, name: anonymize(r.name, visitorMode) }));
      overdueSlide.tasks = (overdueSlide.tasks || []).map(t => ({ ...t, assignedTo: anonymize(t.assignedTo, visitorMode) }));
      scheduledTasksSlide.tasks = (scheduledTasksSlide.tasks || []).map(t => ({ ...t, executedBy: anonymize(t.executedBy, visitorMode) }));
      additionalTasksSlide.tasks = (additionalTasksSlide.tasks || []).map(t => ({ ...t, executedBy: anonymize(t.executedBy, visitorMode) }));
      employeeSlides.forEach(s => {
        if (s.employee) s.employee.name = anonymize(s.employee.name, visitorMode);
        (s.daily?.tasks || []).forEach(t => { if (t.executedBy) t.executedBy = anonymize(t.executedBy, visitorMode); });
      });
    }

    // بناء قائمة الشرائح مع التصفية حسب enabledSlides
    // خريطة الشرائح حسب النوع
    const slideMap = {
      opening: openingSlide,
      overview: overviewSlide,
      overdue: overdueSlide,
      scheduledTasks: scheduledTasksSlide,
      additionalTasks: additionalTasksSlide,
      attendance: attendanceSlide,
      coverage: coverageSlide,
      categories: categoriesSlide,
      recognition: recognitionSlide,
      rtgsImportsToday: rtgsImportsSlide,
      rtgsSettlementsByImport: rtgsSettlementsSlide,
      ctMatching: ctMatchingSlide,
      governmentSettlements: governmentSettlementsSlide,
      governmentSettlementCards: governmentSettlementCardsSlide,
      settlementsMatchingOverview: settlementsMatchingOverviewSlide,
      monthlyScheduledByCategory: monthlyScheduledByCategorySlide,
      monthlyAdditionalByEmployee: monthlyAdditionalByEmployeeSlide,
      departmentMonthlyOverview: departmentMonthlySlide,
    };

    // ترتيب الشرائح حسب slideOrder إذا كان موجوداً
    let allSlides = [];
    const slideOrder = Array.isArray(settings.slideOrder) && settings.slideOrder.length > 0 
      ? settings.slideOrder 
      : Object.keys(slideMap);

    for (const key of slideOrder) {
      if (key === 'employee' || key === 'employeeMonthly') {
        if (enabledSlides[key] !== false && employeeSlides.length > 0) {
          allSlides.push(...employeeSlides.filter(s => s.type === key));
        }
      } else if (slideMap[key] && enabledSlides[key] !== false) {
        allSlides.push(slideMap[key]);
      }
    }

    // إضافة أي شرائح موظفين متبقية (employee daily/monthly) إذا لم تكن في الترتيب
    if (enabledSlides.employee !== false || enabledSlides.employeeMonthly !== false) {
      const existingEmpTypes = new Set(allSlides.filter(s => s.type === 'employee' || s.type === 'employee-monthly').map(s => `${s.type}-${s.employee?.id}`));
      for (const empSlide of employeeSlides) {
        const empKey = `${empSlide.type}-${empSlide.employee?.id}`;
        if (!existingEmpTypes.has(empKey) && enabledSlides[empSlide.type] !== false) {
          allSlides.push(empSlide);
        }
      }
    }

    allSlides = allSlides.filter(Boolean);

    const response = {
      settings: {
        slideInterval: settings.slideInterval || 10,
        autoRefresh: settings.autoRefresh !== false,
        refreshInterval: settings.refreshInterval || 30,
        visitorMode,
        enabledSlides,
        slideDurations: settings.slideDurations || {}
      },
      slides: allSlides
    };
    
    res.json(response);
  } catch (error) {
    console.error('TV Dashboard error:', error.message);
    
    // إرسال استجابة خطأ واضحة
    res.status(500).json({ 
      error: 'خطأ في الخادم',
      message: process.env.NODE_ENV === 'development' 
        ? `خطأ في الخادم: ${error.message}` 
        : 'حدث خطأ أثناء جلب البيانات. يرجى المحاولة لاحقاً.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// جلب إعدادات لوحة التحكم فقط
const getDashboardSettings = async (req, res) => {
  try {
    const r = await pool.query('SELECT value FROM settings WHERE key = $1', ['tv_dashboard']);
    let settings = {
      slideInterval: 10,
      visitorMode: false,
      autoRefresh: true,
      refreshInterval: 30,
      enabledSlides: { ...DEFAULT_ENABLED_SLIDES },
      rtgsDisplayMode: 'by_import_date',
      rtgsImportDateRange: 3,
      visibleEmployeeIds: [],
      visibleBankNames: [],
      slideOrder: [],
      slideDurations: {},
      settlementCardsDateMode: 'previous_day',
      settlementCardsCustomDate: ''
    };
    if (r.rows.length > 0) {
      const value = r.rows[0].value;
      let parsed = value;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch (e) { parsed = {}; }
      }
      if (typeof parsed === 'object' && parsed !== null) {
        settings = { ...settings, ...parsed };
        if (parsed.enabledSlides && typeof parsed.enabledSlides === 'object') {
          settings.enabledSlides = { ...DEFAULT_ENABLED_SLIDES, ...parsed.enabledSlides };
        }
      }
    }
    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب إعدادات لوحة التحكم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تحديث إعدادات لوحة التحكم
const updateDashboardSettings = async (req, res) => {
  try {
    const {
      slideInterval,
      enabledSlides,
      visitorMode,
      autoRefresh,
      refreshInterval,
      rtgsDisplayMode,
      rtgsImportDateRange,
      visibleEmployeeIds,
      visibleBankNames,
      slideOrder,
      slideDurations,
      settlementCardsDateMode,
      settlementCardsCustomDate
    } = req.body;

    const settings = {
      slideInterval: slideInterval ?? 10,
      visitorMode: !!visitorMode,
      autoRefresh: autoRefresh !== false,
      refreshInterval: refreshInterval ?? 30,
      enabledSlides: typeof enabledSlides === 'object' ? { ...DEFAULT_ENABLED_SLIDES, ...enabledSlides } : DEFAULT_ENABLED_SLIDES,
      rtgsDisplayMode: rtgsDisplayMode || 'by_import_date',
      rtgsImportDateRange: Math.min(7, Math.max(1, parseInt(rtgsImportDateRange, 10) || 3)),
      visibleEmployeeIds: Array.isArray(visibleEmployeeIds) ? visibleEmployeeIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n)) : [],
      visibleBankNames: Array.isArray(visibleBankNames) ? visibleBankNames.map((s) => String(s).trim()).filter(Boolean) : [],
      slideOrder: Array.isArray(slideOrder) ? slideOrder : [],
      slideDurations: typeof slideDurations === 'object' && slideDurations !== null ? slideDurations : {},
      settlementCardsDateMode: settlementCardsDateMode || 'previous_day',
      settlementCardsCustomDate: String(settlementCardsCustomDate || '').trim().slice(0, 10)
    };

    await pool.query(
      `INSERT INTO settings (key, value, description, updated_by_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = CURRENT_TIMESTAMP,
           updated_by_user_id = EXCLUDED.updated_by_user_id`,
      ['tv_dashboard', JSON.stringify(settings), 'إعدادات لوحة التحكم التلفزيونية', req.user?.id ?? null]
    );

    res.json({ message: 'تم تحديث الإعدادات بنجاح', settings });
  } catch (error) {
    console.error('خطأ في تحديث إعدادات لوحة التحكم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = { getDashboardData, getDashboardSettings, updateDashboardSettings };