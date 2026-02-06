const pool = require('../config/database');
const moment = require('moment-timezone');
const { toBaghdadTime, getTodayBaghdad } = require('../utils/timezone');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const BAGHDAD = 'Asia/Baghdad';

/** تخزين مؤقت خفيف للتقارير — TTL 90 ثانية، بدون تغيير في الـ API */
const REPORT_CACHE_TTL_MS = 90 * 1000;
const reportFullCache = new Map();
const reportDailyCache = new Map();
const reportComprehensiveCache = new Map();

function getCached(cache, key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  return null;
}
function setCached(cache, key, data) {
  cache.set(key, { data, expiresAt: Date.now() + REPORT_CACHE_TTL_MS });
}

function getReportFullCached(dateFrom, dateTo) {
  return getCached(reportFullCache, `full:${dateFrom}:${dateTo}`);
}
function setReportFullCached(dateFrom, dateTo, data) {
  setCached(reportFullCache, `full:${dateFrom}:${dateTo}`, data);
}
function getReportDailyCached(date) {
  return getCached(reportDailyCache, `daily:${date}`);
}
function setReportDailyCached(date, data) {
  setCached(reportDailyCache, `daily:${date}`, data);
}
function getReportComprehensiveCached(dateFrom, dateTo) {
  return getCached(reportComprehensiveCache, `comprehensive:${dateFrom}:${dateTo}`);
}
function setReportComprehensiveCached(dateFrom, dateTo, data) {
  setCached(reportComprehensiveCache, `comprehensive:${dateFrom}:${dateTo}`, data);
}

/** المهمة الملغاة تعتبر كأنها غير موجودة — لا تحتسب على القسم أو الموظف (إلغاء لسبب خارجي) */
const EXCLUDE_CANCELLED = " AND te.result_status <> 'cancelled'";

/** حساب نطاق التاريخ من فلتر الفترة */
function getDateRange(period, date, month, year, dateFrom, dateTo) {
  const now = moment().tz(BAGHDAD);
  let start;
  let end;
  if (period === 'day' && date) {
    start = date;
    end = date;
  } else if (period === 'week') {
    end = dateTo || now.format('YYYY-MM-DD');
    start = dateFrom || now.clone().subtract(6, 'days').format('YYYY-MM-DD');
  } else if (period === 'month' && month && year) {
    start = moment().tz(BAGHDAD).year(parseInt(year, 10)).month(parseInt(month, 10) - 1).startOf('month').format('YYYY-MM-DD');
    end = moment().tz(BAGHDAD).year(parseInt(year, 10)).month(parseInt(month, 10) - 1).endOf('month').format('YYYY-MM-DD');
  } else if (period === 'custom' && dateFrom && dateTo) {
    start = dateFrom;
    end = dateTo;
  } else {
    // افتراضي: شهر الحالي
    start = now.clone().startOf('month').format('YYYY-MM-DD');
    end = now.format('YYYY-MM-DD');
  }
  return { dateFrom: start, dateTo: end };
}

// تقرير يومي
const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || getTodayBaghdad();
    const cached = getReportDailyCached(date);
    if (cached) return res.json(cached);

    // المهام المجدولة
    const scheduledTasks = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
       FROM daily_tasks
       WHERE task_date = $1`,
      [date]
    );
    
    // المهام المنفذة متأخرة (الملغاة لا تحتسب)
    const lateTasks = await pool.query(
      `SELECT COUNT(*) as count
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE dt.task_date = $1 AND te.result_status = 'completed_late'${EXCLUDE_CANCELLED}`,
      [date]
    );
    
    // الحضور
    const attendance = await pool.query(
      `SELECT COUNT(*) as present_count
       FROM attendance
       WHERE date = $1`,
      [date]
    );
    
    // المهام الخاصة
    const adHocTasks = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM ad_hoc_tasks
       WHERE DATE(created_at AT TIME ZONE 'Asia/Baghdad') = $1`,
      [date]
    );
    
    // إحصائيات إضافية: المهام حسب الموظف (الملغاة لا تحتسب)
    const tasksByUser = await pool.query(
      `SELECT 
         u.id, u.name,
         COUNT(te.id) as tasks_done,
         COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as on_time,
         COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END) as late
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       LEFT JOIN users u ON te.done_by_user_id = u.id
       WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)${EXCLUDE_CANCELLED}
       GROUP BY u.id, u.name
       ORDER BY tasks_done DESC`,
      [date]
    );
    
    // إحصائيات حسب الفئة (الملغاة لا تحتسب)
    const tasksByCategory = await pool.query(
      `SELECT 
         c.id, c.name,
         COUNT(te.id) as tasks_count,
         COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as completed
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
       LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)${EXCLUDE_CANCELLED}
       GROUP BY c.id, c.name
       ORDER BY tasks_count DESC`,
      [date]
    );
    
    // إحصائيات الأسبوع (آخر 7 أيام)
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStats = await pool.query(
      `SELECT 
         COUNT(DISTINCT dt.task_date) as days_with_tasks,
         COUNT(DISTINCT te.done_by_user_id) as active_employees,
         COUNT(te.id) as total_executions,
         COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as on_time_count
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE (dt.task_date BETWEEN $1 AND $2 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') BETWEEN $1 AND $2)`,
      [weekStart.toISOString().slice(0, 10), date]
    );
    
    // إحصائيات الحضور الأسبوعية
    const weekAttendance = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as unique_attendees,
              COUNT(*) as total_records
       FROM attendance
       WHERE date BETWEEN $1 AND $2`,
      [weekStart.toISOString().slice(0, 10), date]
    );
    
    // متوسط مدة المهام
    const avgDuration = await pool.query(
      `SELECT AVG(duration_minutes) as avg_duration,
              SUM(duration_minutes) as total_duration
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)
         AND te.duration_minutes IS NOT NULL`,
      [date]
    );
    
    const payload = {
      date,
      scheduled: scheduledTasks.rows[0],
      late: parseInt(lateTasks.rows[0].count),
      attendance: parseInt(attendance.rows[0].present_count),
      adHoc: adHocTasks.rows[0],
      tasksByUser: tasksByUser.rows,
      tasksByCategory: tasksByCategory.rows,
      weekStats: weekStats.rows[0],
      weekAttendance: weekAttendance.rows[0],
      avgDuration: avgDuration.rows[0],
    };
    setReportDailyCached(date, payload);
    res.json(payload);
  } catch (error) {
    console.error('خطأ في جلب التقرير اليومي:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تقرير شهري حسب الموظف والفئة
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'الشهر والسنة مطلوبان' });
    }
    
    const result = await pool.query(
      `SELECT 
         u.id as user_id,
         u.name as user_name,
         c.id as category_id,
         c.name as category_name,
         COUNT(te.id) as tasks_done,
         COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as on_time,
         COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END) as late,
         COUNT(CASE WHEN dt.assigned_to_user_id != te.done_by_user_id THEN 1 END) as coverage_count
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       LEFT JOIN task_templates t ON dt.template_id = t.id OR (SELECT template_id FROM ad_hoc_tasks WHERE id = te.ad_hoc_task_id) = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON te.done_by_user_id = u.id
       WHERE EXTRACT(MONTH FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $1
         AND EXTRACT(YEAR FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $2${EXCLUDE_CANCELLED}
       GROUP BY u.id, u.name, c.id, c.name
       ORDER BY u.name, c.name`,
      [month, year]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب التقرير الشهري:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تقرير التغطية (من قام بمهام الآخرين)
const getCoverageReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'تاريخ البداية والنهاية مطلوبان' });
    }
    
    const result = await pool.query(
      `SELECT 
         u1.id as done_by_id,
         u1.name as done_by_name,
         u2.id as assigned_to_id,
         u2.name as assigned_to_name,
         COUNT(*) as coverage_count
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       JOIN users u1 ON te.done_by_user_id = u1.id
       JOIN users u2 ON dt.assigned_to_user_id = u2.id
       WHERE dt.assigned_to_user_id != te.done_by_user_id
         AND dt.task_date BETWEEN $1 AND $2${EXCLUDE_CANCELLED}
       GROUP BY u1.id, u1.name, u2.id, u2.name
       ORDER BY coverage_count DESC`,
      [dateFrom, dateTo]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب تقرير التغطية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تصدير Excel
const exportToExcel = async (req, res) => {
  try {
    const { type, month, year, dateFrom, dateTo } = req.query;
    
    let data = [];
    let filename = 'report.xlsx';
    
    if (type === 'monthly') {
      const report = await pool.query(
        `SELECT 
           u.name as "الموظف",
           c.name as "الفئة",
           COUNT(te.id) as "عدد المهام",
           COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as "في الوقت",
           COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END) as "متأخر"
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN task_templates t ON dt.template_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN users u ON te.done_by_user_id = u.id
         WHERE EXTRACT(MONTH FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $1
           AND EXTRACT(YEAR FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $2${EXCLUDE_CANCELLED}
         GROUP BY u.name, c.name
         ORDER BY u.name, c.name`,
        [month, year]
      );
      data = report.rows;
      filename = `monthly_report_${year}_${month}.xlsx`;
    }
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('التقرير');
    
    // Add headers
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
    }
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('خطأ في تصدير Excel:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تصدير PDF (تقرير يومي)
const exportToPdf = async (req, res) => {
  try {
    const date = req.query.date || getTodayBaghdad();
    const scheduled = await pool.query(
      `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
       FROM daily_tasks WHERE task_date = $1`,
      [date]
    );
    const late = await pool.query(
      `SELECT COUNT(*) as c FROM task_executions te JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE dt.task_date = $1 AND te.result_status = 'completed_late'${EXCLUDE_CANCELLED}`,
      [date]
    );
    const att = await pool.query(`SELECT COUNT(*) as c FROM attendance WHERE date = $1`, [date]);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${date}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).text('تقرير يومي - قسم التسويات والمطابقة', { align: 'center' });
    doc.moveDown().fontSize(12).text(`التاريخ: ${date}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('ملخص المهام المجدولة');
    doc.fontSize(11)
      .text(`المجموع: ${scheduled.rows[0].total}  |  مكتملة: ${scheduled.rows[0].completed}  |  متأخرة: ${scheduled.rows[0].overdue}  |  معلقة: ${scheduled.rows[0].pending}`);
    doc.text(`مكتملة متأخرة: ${late.rows[0].c}  |  الحضور: ${att.rows[0].c}`);
    doc.end();
  } catch (error) {
    console.error('خطأ في تصدير PDF:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تقرير شامل يغطي كل النظام (قسم، موظفون، مهام، حضور، تسويات، CT، تجار، فئات)
const getComprehensiveReport = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const { dateFrom, dateTo } = getDateRange(
      period,
      req.query.date,
      req.query.month,
      req.query.year,
      req.query.dateFrom,
      req.query.dateTo
    );
    const cached = getReportComprehensiveCached(dateFrom, dateTo);
    if (cached) return res.json(cached);

    const summary = {};
    const department = { employeesSummary: [], categories: [] };
    const employees = [];
    const tasks = { scheduled: {}, adHoc: {}, overdue: [], coverage: [] };
    const settlements = { imports: [], movementCount: 0, totalAmount: 0, totalSttle: 0, totalFees: 0, totalAcq: 0 };
    const govSettlements = { summaries: [], detailsByBank: [], taskCount: 0 };
    const ctMatching = { total: 0, matched: 0, notMatched: 0, records: [] };
    const merchants = { total: 0, disbursementsCount: 0, disbursementsTotal: 0 };
    const categories = [];
    const govTasks = [];
    const audit = [];

    const empIdsResult = await pool.query(
      `SELECT id, name FROM users WHERE role = 'employee' AND active = true ORDER BY name`
    );
    const empIds = (empIdsResult.rows || []).map((r) => r.id);
    const empIdsParam = empIds.length ? empIds : [-1];

    // —— Summary KPIs (التسويات من gov_settlement_summaries فقط — لا استخدام لجدول rtgs) ——
    const [attSummary, taskSummary, adHocSummary, settlementsAgg, ctAgg, govTaskCount, disbAgg, empCount] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT user_id) as present_employees, COUNT(*) as total_days
         FROM attendance WHERE date >= $1 AND date <= $2`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
         FROM daily_tasks WHERE task_date >= $1 AND task_date <= $2`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM ad_hoc_tasks
         WHERE (created_at AT TIME ZONE '${BAGHDAD}')::date >= $1 AND (created_at AT TIME ZONE '${BAGHDAD}')::date <= $2`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT COALESCE(SUM(movement_count), 0)::bigint as movement_count,
                COALESCE(SUM(sum_amount), 0)::float as total_amount,
                COALESCE(SUM(sum_fees), 0)::float as total_fees,
                COALESCE(SUM(sum_acq), 0)::float as total_acq,
                COALESCE(SUM(sum_sttle), 0)::float as total_sttle
         FROM gov_settlement_summaries WHERE sttl_date >= $1 AND sttl_date <= $2`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ movement_count: 0, total_amount: 0, total_fees: 0, total_acq: 0, total_sttle: 0 }] })),
      pool.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN match_status = 'matched' THEN 1 END) as matched,
                COUNT(CASE WHEN COALESCE(match_status, '') != 'matched' THEN 1 END) as not_matched
         FROM ct_records WHERE sttl_date_from <= $2 AND sttl_date_to >= $1`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ total: 0, matched: 0, not_matched: 0 }] })),
      pool.query(
        `SELECT COUNT(*) as c FROM daily_tasks
         WHERE target_settlement_date IS NOT NULL AND target_settlement_date >= $1 AND target_settlement_date <= $2`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
         FROM merchant_disbursements WHERE transfer_date >= $1 AND transfer_date <= $2`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ cnt: 0, total: 0 }] })),
      pool.query('SELECT COUNT(*) as c FROM users WHERE role = \'employee\' AND active = true')
    ]);

    const att = attSummary.rows[0] || {};
    const sched = taskSummary.rows[0] || {};
    const adHoc = adHocSummary.rows[0] || {};
    const s = settlementsAgg.rows[0] || {};
    const c = ctAgg.rows[0] || {};
    const totalEmployees = parseInt(empCount.rows[0]?.c || 0);
    const totalSched = parseInt(sched.total || 0);
    const completedSched = parseInt(sched.completed || 0);

    summary.totalEmployees = totalEmployees;
    summary.presentEmployees = parseInt(att.present_employees || 0);
    summary.totalAttendanceDays = parseInt(att.total_days || 0);
    summary.scheduledTotal = totalSched;
    summary.scheduledCompleted = completedSched;
    summary.scheduledOverdue = parseInt(sched.overdue || 0);
    summary.scheduledPending = parseInt(sched.pending || 0);
    summary.adHocTotal = parseInt(adHoc.total || 0);
    summary.adHocCompleted = parseInt(adHoc.completed || 0);
    summary.settlementMovementCount = parseInt(s.movement_count || 0);
    summary.settlementTotalAmount = parseFloat(s.total_amount || 0);
    summary.settlementTotalFees = parseFloat(s.total_fees || 0);
    summary.settlementTotalAcq = parseFloat(s.total_acq || 0);
    summary.settlementTotalSttle = parseFloat(s.total_sttle || 0);
    summary.ctTotal = parseInt(c.total || 0);
    summary.ctMatched = parseInt(c.matched || 0);
    summary.ctNotMatched = parseInt(c.not_matched || 0);
    summary.govTaskCount = parseInt(govTaskCount.rows[0]?.c || 0);
    summary.disbursementsCount = parseInt(disbAgg.rows[0]?.cnt || 0);
    summary.disbursementsTotal = parseFloat(disbAgg.rows[0]?.total || 0);
    summary.completionRate = totalSched > 0 ? Math.round((completedSched / totalSched) * 100) : 0;

    settlements.movementCount = summary.settlementMovementCount;
    settlements.totalAmount = summary.settlementTotalAmount;
    settlements.totalFees = summary.settlementTotalFees;
    settlements.totalAcq = summary.settlementTotalAcq;
    settlements.totalSttle = summary.settlementTotalSttle;

    ctMatching.total = summary.ctTotal;
    ctMatching.matched = summary.ctMatched;
    ctMatching.notMatched = summary.ctNotMatched;

    merchants.total = parseInt((await pool.query('SELECT COUNT(*) as c FROM merchants')).rows[0]?.c || 0);
    merchants.disbursementsCount = summary.disbursementsCount;
    merchants.disbursementsTotal = summary.disbursementsTotal;

    // —— Department: employees summary + categories ——
    const [byUser, byCat] = await Promise.all([
      pool.query(
        `SELECT te.done_by_user_id as user_id, u.name,
                COUNT(te.id)::int as tasks_done,
                COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
                COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late,
                COUNT(CASE WHEN dt.assigned_to_user_id != te.done_by_user_id THEN 1 END)::int as coverage
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN users u ON te.done_by_user_id = u.id
         WHERE te.done_by_user_id = ANY($1::int[]) AND dt.task_date >= $2 AND dt.task_date <= $3${EXCLUDE_CANCELLED}
         GROUP BY te.done_by_user_id, u.name`,
        [empIdsParam, dateFrom, dateTo]
      ),
      pool.query(
        `SELECT COALESCE(c.name, 'بدون فئة') as name,
                COUNT(te.id)::int as total,
                COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as completed,
                COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
         LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ((dt.task_date >= $1 AND dt.task_date <= $2) OR (DATE(te.done_at AT TIME ZONE '${BAGHDAD}') >= $1 AND DATE(te.done_at AT TIME ZONE '${BAGHDAD}') <= $2))${EXCLUDE_CANCELLED}
         GROUP BY c.id, c.name ORDER BY total DESC`,
        [dateFrom, dateTo]
      )
    ]);

    const attendanceByUser = await pool.query(
      `SELECT user_id, COUNT(*)::int as days_present FROM attendance
       WHERE user_id = ANY($1::int[]) AND date >= $2 AND date <= $3 GROUP BY user_id`,
      [empIdsParam, dateFrom, dateTo]
    );
    const attMap = Object.fromEntries((attendanceByUser.rows || []).map((r) => [r.user_id, r.days_present]));

    department.employeesSummary = (byUser.rows || []).map((row) => ({
      user_id: row.user_id,
      name: row.name,
      tasks_done: row.tasks_done,
      on_time: row.on_time,
      late: row.late,
      coverage: row.coverage,
      days_present: attMap[row.user_id] || 0
    }));
    department.categories = (byCat.rows || []).map((r) => ({ name: r.name, total: r.total, completed: r.completed, late: r.late }));

    // —— Per-employee detail ——
    for (const emp of empIdsResult.rows || []) {
      const [empTasks, empAdHoc, empAtt, empCat, empCoverage] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int as total, COUNT(te.id)::int as done,
                  COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END)::int as on_time,
                  COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END)::int as late,
                  AVG(te.duration_minutes)::float as avg_duration
           FROM task_executions te JOIN daily_tasks dt ON te.daily_task_id = dt.id
           WHERE te.done_by_user_id = $1 AND dt.task_date >= $2 AND dt.task_date <= $3${EXCLUDE_CANCELLED}`,
          [emp.id, dateFrom, dateTo]
        ),
        pool.query(
          `SELECT COUNT(*)::int as total, COUNT(te.id)::int as done
           FROM ad_hoc_tasks aht
           LEFT JOIN task_executions te ON te.ad_hoc_task_id = aht.id
           WHERE aht.assigned_to_user_id = $1
             AND (aht.created_at AT TIME ZONE '${BAGHDAD}')::date >= $2 AND (aht.created_at AT TIME ZONE '${BAGHDAD}')::date <= $3`,
          [emp.id, dateFrom, dateTo]
        ),
        pool.query(
          `SELECT COUNT(*)::int as days FROM attendance WHERE user_id = $1 AND date >= $2 AND date <= $3`,
          [emp.id, dateFrom, dateTo]
        ),
        pool.query(
          `SELECT COALESCE(c.name, 'بدون فئة') as name, COUNT(te.id)::int as cnt
           FROM task_executions te
           LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
           LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
           LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE te.done_by_user_id = $1 AND ((dt.task_date >= $2 AND dt.task_date <= $3) OR (DATE(te.done_at AT TIME ZONE '${BAGHDAD}') >= $2 AND DATE(te.done_at AT TIME ZONE '${BAGHDAD}') <= $3))${EXCLUDE_CANCELLED}
           GROUP BY c.id, c.name`,
          [emp.id, dateFrom, dateTo]
        ),
        pool.query(
          `SELECT COUNT(*)::int as c FROM task_executions te
           JOIN daily_tasks dt ON te.daily_task_id = dt.id
           WHERE te.done_by_user_id = $1 AND dt.assigned_to_user_id != $1 AND dt.task_date >= $2 AND dt.task_date <= $3${EXCLUDE_CANCELLED}`,
          [emp.id, dateFrom, dateTo]
        )
      ]);
      const t = empTasks.rows[0] || {};
      const a = empAdHoc.rows[0] || {};
      employees.push({
        id: emp.id,
        name: emp.name,
        attendanceDays: parseInt(empAtt.rows[0]?.days || 0),
        scheduledTotal: parseInt(t.total || 0),
        scheduledDone: parseInt(t.done || 0),
        onTime: parseInt(t.on_time || 0),
        late: parseInt(t.late || 0),
        avgDurationMinutes: t.avg_duration != null ? Math.round(parseFloat(t.avg_duration)) : null,
        adHocTotal: parseInt(a.total || 0),
        adHocDone: parseInt(a.done || 0),
        coverage: parseInt(empCoverage.rows[0]?.c || 0),
        categories: (empCat.rows || []).map((r) => ({ name: r.name, count: r.cnt }))
      });
    }

    // —— Tasks: overdue, coverage matrix ——
    const [overdueRows, coverageRows] = await Promise.all([
      pool.query(
        `SELECT dt.id, dt.task_date, t.title, u.name as assigned_name, u2.name as done_by_name, dt.status
         FROM daily_tasks dt
         LEFT JOIN task_templates t ON dt.template_id = t.id
         LEFT JOIN users u ON dt.assigned_to_user_id = u.id
         LEFT JOIN LATERAL (SELECT done_by_user_id FROM task_executions WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1) te ON true
         LEFT JOIN users u2 ON te.done_by_user_id = u2.id
         WHERE dt.task_date >= $1 AND dt.task_date <= $2 AND dt.status = 'overdue'
         ORDER BY dt.task_date LIMIT 100`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT u1.name as done_by_name, u2.name as assigned_to_name, COUNT(*)::int as count
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         JOIN users u1 ON te.done_by_user_id = u1.id
         JOIN users u2 ON dt.assigned_to_user_id = u2.id
         WHERE dt.assigned_to_user_id != te.done_by_user_id AND dt.task_date >= $1 AND dt.task_date <= $2${EXCLUDE_CANCELLED}
         GROUP BY u1.id, u1.name, u2.id, u2.name ORDER BY count DESC`,
        [dateFrom, dateTo]
      )
    ]);
    tasks.scheduled = { total: summary.scheduledTotal, completed: summary.scheduledCompleted, overdue: summary.scheduledOverdue, pending: summary.scheduledPending };
    tasks.adHoc = { total: summary.adHocTotal, completed: summary.adHocCompleted };
    tasks.overdue = (overdueRows.rows || []).map((r) => ({ id: r.id, task_date: r.task_date, title: r.title, assigned_name: r.assigned_name, done_by_name: r.done_by_name, status: r.status }));
    tasks.coverage = (coverageRows.rows || []).map((r) => ({ done_by_name: r.done_by_name, assigned_to_name: r.assigned_to_name, count: r.count }));

    // —— قائمة ملفات الاستيراد (سياق فقط — الأرقام من جداول التسويات) ——
    const ilRows = await pool.query(
      `SELECT id, filename, inserted_rows, created_at
       FROM import_logs WHERE (created_at AT TIME ZONE '${BAGHDAD}')::date >= $1 AND (created_at AT TIME ZONE '${BAGHDAD}')::date <= $2
       ORDER BY created_at DESC LIMIT 50`,
      [dateFrom, dateTo]
    );
    settlements.imports = (ilRows.rows || []).map((r) => ({
      id: r.id,
      filename: r.filename,
      inserted_rows: r.inserted_rows,
      created_at: r.created_at ? toBaghdadTime(r.created_at).format('YYYY-MM-DD HH:mm') : null
    }));

    // —— ملخص التسويات (من gov_settlement_summaries فقط) ——
    const govSumRows = await pool.query(
      `SELECT sttl_date, bank_display_name, movement_count, sum_amount, sum_fees, sum_acq, sum_sttle
       FROM gov_settlement_summaries
       WHERE sttl_date >= $1 AND sttl_date <= $2
       ORDER BY sttl_date DESC, bank_display_name LIMIT 200`,
      [dateFrom, dateTo]
    ).catch(() => ({ rows: [] }));
    govSettlements.summaries = (govSumRows.rows || []).map((r) => ({
      sttl_date: r.sttl_date,
      bank_display_name: r.bank_display_name,
      movement_count: r.movement_count,
      sum_amount: parseFloat(r.sum_amount || 0),
      sum_fees: parseFloat(r.sum_fees || 0),
      sum_acq: parseFloat(r.sum_acq || 0),
      sum_sttle: parseFloat(r.sum_sttle || 0)
    }));
    govSettlements.taskCount = summary.govTaskCount;

    // —— توزيع التسويات حسب المصرف (من gov_settlement_details للتفاصيل) ——
    const detailsByBank = await pool.query(
      `SELECT bank_display_name, COUNT(*)::int as row_count,
              SUM(movement_count)::int as total_movements,
              COALESCE(SUM(sum_amount), 0)::float as sum_amount,
              COALESCE(SUM(sum_sttle), 0)::float as sum_sttle
       FROM gov_settlement_details
       WHERE sttl_date >= $1 AND sttl_date <= $2
       GROUP BY bank_display_name ORDER BY sum_sttle DESC LIMIT 50`,
      [dateFrom, dateTo]
    ).catch(() => ({ rows: [] }));
    govSettlements.detailsByBank = (detailsByBank.rows || []).map((r) => ({
      bank_display_name: r.bank_display_name,
      row_count: r.row_count,
      total_movements: r.total_movements,
      sum_amount: parseFloat(r.sum_amount || 0),
      sum_sttle: parseFloat(r.sum_sttle || 0)
    }));

    // —— CT records list ——
    const ctRows = await pool.query(
      `SELECT c.id, c.sttl_date_from, c.sttl_date_to, c.ct_value, c.sum_acq, c.sum_fees, c.match_status, c.ct_received_date, u.name as user_name
       FROM ct_records c LEFT JOIN users u ON c.user_id = u.id
       WHERE (c.sttl_date_from <= $2 AND c.sttl_date_to >= $1) ORDER BY c.sttl_date_from DESC LIMIT 100`,
      [dateFrom, dateTo]
    ).catch(() => ({ rows: [] }));
    ctMatching.records = (ctRows.rows || []).map((r) => ({
      id: r.id,
      sttl_date_from: r.sttl_date_from,
      sttl_date_to: r.sttl_date_to,
      ct_value: parseFloat(r.ct_value || 0),
      sum_acq: parseFloat(r.sum_acq || 0),
      sum_fees: parseFloat(r.sum_fees || 0),
      match_status: r.match_status,
      ct_received_date: r.ct_received_date,
      user_name: r.user_name
    }));

    // Categories (already from byCat)
    categories.push(...department.categories);

    // —— Gov tasks (target_settlement_date) ——
    const govTaskRows = await pool.query(
      `SELECT dt.id, dt.target_settlement_date, t.title, u.name as assigned_name, te.settlement_date, te.verification_status, u2.name as executed_name
       FROM daily_tasks dt
       LEFT JOIN task_templates t ON dt.template_id = t.id
       LEFT JOIN users u ON dt.assigned_to_user_id = u.id
       LEFT JOIN LATERAL (SELECT settlement_date, verification_status, done_by_user_id FROM task_executions WHERE daily_task_id = dt.id ORDER BY done_at DESC LIMIT 1) te ON true
       LEFT JOIN users u2 ON te.done_by_user_id = u2.id
       WHERE dt.target_settlement_date IS NOT NULL AND dt.target_settlement_date >= $1 AND dt.target_settlement_date <= $2
       ORDER BY dt.target_settlement_date DESC LIMIT 100`,
      [dateFrom, dateTo]
    ).catch(() => ({ rows: [] }));
    govTasks.push(...(govTaskRows.rows || []).map((r) => ({
      id: r.id,
      target_settlement_date: r.target_settlement_date,
      title: r.title,
      assigned_name: r.assigned_name,
      settlement_date: r.settlement_date,
      verification_status: r.verification_status,
      executed_name: r.executed_name
    })));

    // —— Audit (last 50) ——
    const auditRows = await pool.query(
      `SELECT id, user_id, action, entity_type, entity_id, details, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT 50`
    ).catch(() => ({ rows: [] }));
    const userNames = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [auditRows.rows?.map((x) => x.user_id).filter(Boolean) || []]).catch(() => ({ rows: [] }));
    const nameMap = Object.fromEntries((userNames.rows || []).map((r) => [r.id, r.name]));
    audit.push(...(auditRows.rows || []).map((r) => ({
      id: r.id,
      user_name: nameMap[r.user_id] || null,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      created_at: r.created_at ? toBaghdadTime(r.created_at).format('YYYY-MM-DD HH:mm') : null
    })));

    const payload = {
      period,
      dateFrom,
      dateTo,
      summary,
      department,
      employees,
      tasks,
      settlements,
      govSettlements,
      ctMatching,
      merchants,
      categories,
      govTasks,
      audit
    };
    setReportComprehensiveCached(dateFrom, dateTo, payload);
    res.json(payload);
  } catch (error) {
    console.error('خطأ في التقرير الشامل:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تقرير حقيقي مبسّط: محصلات حسب المصرف، مهام حسب الفئة، مهام حسب القالب+الفئة، توزيع الموظفين (مع صورة). بدون ملفات محملة أو سجل تدقيق.
const getReportFull = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const { dateFrom, dateTo } = getDateRange(
      period,
      req.query.date,
      req.query.month,
      req.query.year,
      req.query.dateFrom,
      req.query.dateTo
    );

    const cached = getReportFullCached(dateFrom, dateTo);
    if (cached) return res.json(cached);

    const [settlementsByBankRows, tasksByCategoryRows, tasksByTemplateRows, employeesRows] = await Promise.all([
      pool.query(
        `SELECT COALESCE(bank_display_name, 'غير معرف') as bank_name, COUNT(*)::int as settlement_count
         FROM gov_settlement_summaries WHERE sttl_date >= $1 AND sttl_date <= $2
         GROUP BY bank_display_name ORDER BY settlement_count DESC`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT COALESCE(c.name, 'بدون فئة') as category_name, COUNT(te.id)::int as task_count
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
         LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ((dt.task_date >= $1 AND dt.task_date <= $2) OR (DATE(te.done_at AT TIME ZONE '${BAGHDAD}') >= $1 AND DATE(te.done_at AT TIME ZONE '${BAGHDAD}') <= $2))${EXCLUDE_CANCELLED}
         GROUP BY c.id, c.name ORDER BY task_count DESC`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT COALESCE(t.title, 'بدون قالب') as template_title, COALESCE(c.name, 'بدون فئة') as category_name, COUNT(te.id)::int as task_count
         FROM task_executions te
         LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
         LEFT JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
         LEFT JOIN task_templates t ON dt.template_id = t.id OR aht.template_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ((dt.task_date >= $1 AND dt.task_date <= $2) OR (DATE(te.done_at AT TIME ZONE '${BAGHDAD}') >= $1 AND DATE(te.done_at AT TIME ZONE '${BAGHDAD}') <= $2))${EXCLUDE_CANCELLED}
         GROUP BY t.id, t.title, c.id, c.name ORDER BY task_count DESC`,
        [dateFrom, dateTo]
      ),
      pool.query(
        `SELECT u.id, u.name, u.avatar_url,
                (SELECT COUNT(*)::int FROM attendance a WHERE a.user_id = u.id AND a.date >= $1 AND a.date <= $2) as attendance_days,
                (SELECT COUNT(te.id)::int FROM task_executions te JOIN daily_tasks dt ON te.daily_task_id = dt.id WHERE te.done_by_user_id = u.id AND dt.task_date >= $1 AND dt.task_date <= $2 AND te.result_status <> 'cancelled') as tasks_done,
                (SELECT COUNT(te.id)::int FROM task_executions te JOIN daily_tasks dt ON te.daily_task_id = dt.id WHERE te.done_by_user_id = u.id AND te.result_status = 'completed' AND dt.task_date >= $1 AND dt.task_date <= $2) as on_time,
                (SELECT COUNT(te.id)::int FROM task_executions te JOIN daily_tasks dt ON te.daily_task_id = dt.id WHERE te.done_by_user_id = u.id AND te.result_status = 'completed_late' AND dt.task_date >= $1 AND dt.task_date <= $2) as late
         FROM users u WHERE u.role = 'employee' AND u.active = true ORDER BY u.name`,
        [dateFrom, dateTo]
      )
    ]);

    const settlementsByBank = (settlementsByBankRows.rows || []).map((r) => ({
      bank_name: r.bank_name,
      settlement_count: parseInt(r.settlement_count || 0)
    }));
    const tasksByCategory = (tasksByCategoryRows.rows || []).map((r) => ({
      category_name: r.category_name,
      task_count: parseInt(r.task_count || 0)
    }));
    const tasksByTemplateAndCategory = (tasksByTemplateRows.rows || []).map((r) => ({
      template_title: r.template_title,
      category_name: r.category_name,
      task_count: parseInt(r.task_count || 0)
    }));
    const employees = (employeesRows.rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      avatar_url: r.avatar_url || null,
      attendance_days: parseInt(r.attendance_days || 0),
      tasks_done: parseInt(r.tasks_done || 0),
      on_time: parseInt(r.on_time || 0),
      late: parseInt(r.late || 0)
    }));

    const payload = {
      period,
      dateFrom,
      dateTo,
      settlementsByBank,
      tasksByCategory,
      tasksByTemplateAndCategory,
      employees
    };
    setReportFullCached(dateFrom, dateTo, payload);
    res.json(payload);
  } catch (error) {
    console.error('خطأ في التقرير:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getCoverageReport,
  getComprehensiveReport,
  getReportFull,
  exportToExcel,
  exportToPdf
};