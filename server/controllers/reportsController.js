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
const reportV2Cache = new Map();

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
function getReportV2Cached(key) {
  return getCached(reportV2Cache, `v2:${key}`);
}
function setReportV2Cached(key, data) {
  setCached(reportV2Cache, `v2:${key}`, data);
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

function parseCsvIntArray(val) {
  if (val == null || val === '') return null;
  const arr = String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  return arr.length ? arr : null;
}

function parseCsvTextArray(val) {
  if (val == null || val === '') return null;
  const arr = String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

function normalizeLimit(val, { min = 1, max = 200, def = 50 } = {}) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function buildReportV2CacheKey({ dateFrom, dateTo, employeeIds, categoryIds, templateIds, bankNames, tasksPage, tasksLimit, auditLimit }) {
  return [
    dateFrom,
    dateTo,
    employeeIds?.join('|') || '',
    categoryIds?.join('|') || '',
    templateIds?.join('|') || '',
    bankNames?.join('|') || '',
    tasksPage,
    tasksLimit,
    auditLimit,
  ].join('::');
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
         FROM (
           SELECT bank_display_name FROM gov_settlement_summaries
           WHERE sttl_date >= $1 AND sttl_date <= $2
           GROUP BY sttl_date, inst_id2, bank_display_name
         ) sub
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

// تقرير V2 موحّد — يعتمد على تاريخ التنفيذ done_at (بغداد)
const getReportV2 = async (req, res) => {
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
    // Boundary timestamps for Baghdad date range (inclusive day start, exclusive next-day start)
    const doneAtFromTs = moment.tz(dateFrom, BAGHDAD).startOf('day').toDate();
    const doneAtToTs = moment.tz(dateTo, BAGHDAD).add(1, 'day').startOf('day').toDate();

    // Filters (optional)
    const employeeIds = parseCsvIntArray(req.query.employeeIds);
    const categoryIds = parseCsvIntArray(req.query.categoryIds);
    const templateIds = parseCsvIntArray(req.query.templateIds);
    const bankNames = parseCsvTextArray(req.query.bankNames);

    // Paging
    const tasksPage = Math.max(1, parseInt(req.query.tasksPage || '1', 10));
    const tasksLimit = normalizeLimit(req.query.tasksLimit, { min: 1, max: 200, def: 50 });
    const auditLimit = normalizeLimit(req.query.auditLimit, { min: 0, max: 200, def: 50 });
    const tasksOffset = (tasksPage - 1) * tasksLimit;

    const cacheKey = buildReportV2CacheKey({
      dateFrom,
      dateTo,
      employeeIds,
      categoryIds,
      templateIds,
      bankNames,
      tasksPage,
      tasksLimit,
      auditLimit,
    });
    const cached = getReportV2Cached(cacheKey);
    if (cached) return res.json(cached);

    // Employees scope (default: all active employees)
    const empRows = await pool.query(
      `SELECT id, name, avatar_url
       FROM users
       WHERE role = 'employee' AND active = true
         AND ($1::int[] IS NULL OR id = ANY($1::int[]))
       ORDER BY name`,
      [employeeIds]
    );
    const employeesList = empRows.rows || [];
    const scopedEmpIds = employeesList.length ? employeesList.map((e) => e.id) : [];
    const scopedEmpIdsParam = scopedEmpIds.length ? scopedEmpIds : [-1];

    // Unified executions CTE across scheduled + ad-hoc (execution-based)
    // IMPORTANT: filter by Baghdad date range via timestamp boundaries (index-friendly)
    const baseExecutionsCte = `
      WITH base_executions AS (
        SELECT
          te.id as execution_id,
          te.done_at,
          DATE(te.done_at AT TIME ZONE '${BAGHDAD}') as done_date,
          te.result_status,
          te.duration_minutes,
          te.delay_minutes,
          te.done_by_user_id as user_id,
          'scheduled'::text as task_type,
          dt.id as task_id,
          dt.assigned_to_user_id as assigned_to_user_id,
          dt.task_date as scheduled_date,
          dt.due_date_time as due_date_time,
          t.id as template_id,
          t.title as template_title,
          c.id as category_id,
          c.name as category_name
        FROM task_executions te
        JOIN daily_tasks dt ON te.daily_task_id = dt.id
        LEFT JOIN task_templates t ON dt.template_id = t.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE te.daily_task_id IS NOT NULL
          AND te.result_status <> 'cancelled'
          AND te.done_at >= $1
          AND te.done_at < $2
          AND te.done_by_user_id = ANY($3::int[])
          AND ($4::int[] IS NULL OR c.id = ANY($4::int[]))
          AND ($5::int[] IS NULL OR t.id = ANY($5::int[]))
        UNION ALL
        SELECT
          te.id as execution_id,
          te.done_at,
          DATE(te.done_at AT TIME ZONE '${BAGHDAD}') as done_date,
          te.result_status,
          te.duration_minutes,
          te.delay_minutes,
          te.done_by_user_id as user_id,
          'ad_hoc'::text as task_type,
          aht.id as task_id,
          aht.assigned_to_user_id as assigned_to_user_id,
          (aht.created_at AT TIME ZONE '${BAGHDAD}')::date as scheduled_date,
          aht.due_date_time as due_date_time,
          t.id as template_id,
          t.title as template_title,
          c.id as category_id,
          c.name as category_name
        FROM task_executions te
        JOIN ad_hoc_tasks aht ON te.ad_hoc_task_id = aht.id
        LEFT JOIN task_templates t ON aht.template_id = t.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE te.ad_hoc_task_id IS NOT NULL
          AND te.result_status <> 'cancelled'
          AND te.done_at >= $1
          AND te.done_at < $2
          AND te.done_by_user_id = ANY($3::int[])
          AND ($4::int[] IS NULL OR c.id = ANY($4::int[]))
          AND ($5::int[] IS NULL OR t.id = ANY($5::int[]))
      )
    `;

    const [
      deptAgg,
      byEmployeeAgg,
      byCategoryAgg,
      byTemplateAgg,
      tasksRows,
      tasksTotalRows,
      attendanceAgg,
      coverageAgg,
      settlementsAgg,
      settlementsByBankAgg,
      ctAgg,
      ctRows,
      disbAgg,
      disbRows,
      auditRows,
    ] = await Promise.all([
      // Department aggregates
      pool.query(
        `${baseExecutionsCte}
         SELECT
           COUNT(*)::int as executed_total,
           COUNT(CASE WHEN result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN result_status = 'completed_late' THEN 1 END)::int as late,
           COUNT(CASE WHEN assigned_to_user_id IS NOT NULL AND assigned_to_user_id <> user_id THEN 1 END)::int as coverage,
           AVG(duration_minutes)::float as avg_duration_minutes,
           COALESCE(SUM(duration_minutes), 0)::int as total_duration_minutes,
           COUNT(CASE WHEN task_type = 'scheduled' THEN 1 END)::int as scheduled_executed,
           COUNT(CASE WHEN task_type = 'ad_hoc' THEN 1 END)::int as ad_hoc_executed,
           (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delay_minutes) FILTER (WHERE result_status = 'completed_late'))::float as avg_delay_late_minutes
         FROM base_executions`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds]
      ),
      // Aggregates by employee (متوسط التأخير = الوسيط للمهام المتأخرة فقط — يعطي قيمة أقل من المتوسط الحسابي)
      pool.query(
        `${baseExecutionsCte}
         SELECT
           user_id,
           COUNT(*)::int as executed_total,
           COUNT(CASE WHEN result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN result_status = 'completed_late' THEN 1 END)::int as late,
           COUNT(CASE WHEN assigned_to_user_id IS NOT NULL AND assigned_to_user_id <> user_id THEN 1 END)::int as coverage,
           AVG(duration_minutes)::float as avg_duration_minutes,
           COALESCE(SUM(duration_minutes), 0)::int as total_duration_minutes,
           COUNT(CASE WHEN task_type = 'scheduled' THEN 1 END)::int as scheduled_executed,
           COUNT(CASE WHEN task_type = 'ad_hoc' THEN 1 END)::int as ad_hoc_executed,
           (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delay_minutes) FILTER (WHERE result_status = 'completed_late'))::float as avg_delay_late_minutes
         FROM base_executions
         GROUP BY user_id`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds]
      ),
      // Tasks by category
      pool.query(
        `${baseExecutionsCte}
         SELECT
           COALESCE(category_id, -1) as category_id,
           COALESCE(category_name, 'بدون فئة') as category_name,
           COUNT(*)::int as executed_total,
           COUNT(CASE WHEN result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN result_status = 'completed_late' THEN 1 END)::int as late
         FROM base_executions
         GROUP BY COALESCE(category_id, -1), COALESCE(category_name, 'بدون فئة')
         ORDER BY executed_total DESC`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds]
      ),
      // Tasks by template + category
      pool.query(
        `${baseExecutionsCte}
         SELECT
           COALESCE(template_id, -1) as template_id,
           COALESCE(template_title, 'بدون قالب') as template_title,
           COALESCE(category_id, -1) as category_id,
           COALESCE(category_name, 'بدون فئة') as category_name,
           COUNT(*)::int as executed_total,
           COUNT(CASE WHEN result_status = 'completed' THEN 1 END)::int as on_time,
           COUNT(CASE WHEN result_status = 'completed_late' THEN 1 END)::int as late
         FROM base_executions
         GROUP BY COALESCE(template_id, -1), COALESCE(template_title, 'بدون قالب'),
                  COALESCE(category_id, -1), COALESCE(category_name, 'بدون فئة')
         ORDER BY executed_total DESC`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds]
      ),
      // Tasks list (paged)
      pool.query(
        `${baseExecutionsCte}
         SELECT
           execution_id,
           done_at,
           done_date,
           result_status,
           duration_minutes,
           user_id,
           task_type,
           task_id,
           assigned_to_user_id,
           scheduled_date,
           due_date_time,
           template_id,
           template_title,
           category_id,
           category_name
         FROM base_executions
         ORDER BY done_at DESC
         LIMIT $6 OFFSET $7`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds, tasksLimit, tasksOffset]
      ),
      // Tasks total count (for paging)
      pool.query(
        `${baseExecutionsCte}
         SELECT COUNT(*)::int as total FROM base_executions`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam, categoryIds, templateIds]
      ),
      // Attendance: أيام الحضور + متوسط وقت الحضور (الوقت الأكثر تكراراً للحضور بين 7 صباحاً و12 ظهراً فقط)
      pool.query(
        `SELECT user_id,
                COUNT(*)::int as days_present,
                MIN(first_login_at) as earliest_login_at,
                MAX(first_login_at) as latest_login_at,
                to_char(MODE() WITHIN GROUP (ORDER BY (first_login_at AT TIME ZONE '${BAGHDAD}')::time) FILTER (WHERE (first_login_at AT TIME ZONE '${BAGHDAD}')::time BETWEEN '07:00' AND '12:00'), 'HH24:MI') as mode_login_time
         FROM attendance
         WHERE date >= $1::date AND date <= $2::date
           AND ($3::int[] IS NULL OR user_id = ANY($3::int[]))
         GROUP BY user_id`,
        [dateFrom, dateTo, scopedEmpIds]
      ),
      // Coverage matrix (scheduled only)
      pool.query(
        `SELECT te.done_by_user_id as done_by_user_id,
                dt.assigned_to_user_id as assigned_to_user_id,
                COUNT(*)::int as count
         FROM task_executions te
         JOIN daily_tasks dt ON te.daily_task_id = dt.id
         WHERE te.result_status <> 'cancelled'
           AND te.done_at >= $1
           AND te.done_at < $2
           AND te.done_by_user_id = ANY($3::int[])
           AND dt.assigned_to_user_id IS NOT NULL
           AND dt.assigned_to_user_id <> te.done_by_user_id
         GROUP BY te.done_by_user_id, dt.assigned_to_user_id
         ORDER BY count DESC`,
        [doneAtFromTs, doneAtToTs, scopedEmpIdsParam]
      ),
      // Settlements KPIs (sttl_date-based range; optional bank filter by display name)
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM (SELECT 1 FROM gov_settlement_summaries g
             WHERE g.sttl_date >= $1::date AND g.sttl_date <= $2::date
               AND ($3::text[] IS NULL OR g.bank_display_name = ANY($3::text[]))
             GROUP BY g.sttl_date, g.inst_id2
           ) t)::int as total_settlements,
           COALESCE(SUM(g.movement_count), 0)::bigint as total_movements,
           COALESCE(SUM(g.sum_amount), 0)::float as total_amount,
           COALESCE(SUM(g.sum_fees), 0)::float as total_fees,
           COALESCE(SUM(g.sum_acq), 0)::float as total_acq,
           COALESCE(SUM(g.sum_sttle), 0)::float as total_sttle
         FROM gov_settlement_summaries g
         WHERE g.sttl_date >= $1::date AND g.sttl_date <= $2::date
           AND ($3::text[] IS NULL OR g.bank_display_name = ANY($3::text[]))`,
        [dateFrom, dateTo, bankNames]
      ).catch(() => ({ rows: [{ total_settlements: 0, total_movements: 0, total_amount: 0, total_fees: 0, total_acq: 0, total_sttle: 0 }] })),
      // Settlements by bank (consistent definition)
      pool.query(
        `SELECT COALESCE(bank_display_name, 'غير معرف') as bank_name, COUNT(*)::int as settlement_count,
                COALESCE(SUM(movement_count),0)::bigint as total_movements,
                COALESCE(SUM(sum_amount),0)::float as total_amount,
                COALESCE(SUM(sum_fees),0)::float as total_fees,
                COALESCE(SUM(sum_acq),0)::float as total_acq,
                COALESCE(SUM(sum_sttle),0)::float as total_sttle
         FROM (
           SELECT sttl_date, inst_id2, bank_display_name,
                  SUM(movement_count)::bigint as movement_count,
                  SUM(sum_amount)::float as sum_amount,
                  SUM(sum_fees)::float as sum_fees,
                  SUM(sum_acq)::float as sum_acq,
                  SUM(sum_sttle)::float as sum_sttle
           FROM gov_settlement_summaries
           WHERE sttl_date >= $1::date AND sttl_date <= $2::date
             AND ($3::text[] IS NULL OR bank_display_name = ANY($3::text[]))
           GROUP BY sttl_date, inst_id2, bank_display_name
         ) x
         GROUP BY bank_display_name
         ORDER BY settlement_count DESC`,
        [dateFrom, dateTo, bankNames]
      ).catch(() => ({ rows: [] })),
      // CT aggregate
      pool.query(
        `SELECT COUNT(*)::int as total,
                COUNT(CASE WHEN match_status = 'matched' THEN 1 END)::int as matched,
                COUNT(CASE WHEN COALESCE(match_status, '') != 'matched' THEN 1 END)::int as not_matched
         FROM ct_records
         WHERE sttl_date_from <= $2::date AND sttl_date_to >= $1::date`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ total: 0, matched: 0, not_matched: 0 }] })),
      // CT recent list
      pool.query(
        `SELECT c.id, c.sttl_date_from, c.sttl_date_to, c.ct_value, c.sum_acq, c.sum_fees, c.match_status, c.ct_received_date, u.name as user_name
         FROM ct_records c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.sttl_date_from <= $2::date AND c.sttl_date_to >= $1::date
         ORDER BY c.sttl_date_from DESC
         LIMIT 100`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [] })),
      // Disbursements aggregate
      pool.query(
        `SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::float as total_amount
         FROM merchant_disbursements
         WHERE transfer_date >= $1::date AND transfer_date <= $2::date`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [{ count: 0, total_amount: 0 }] })),
      // Disbursements recent list
      pool.query(
        `SELECT id, merchant_id, iban, amount, transfer_date, status, created_at
         FROM merchant_disbursements
         WHERE transfer_date >= $1::date AND transfer_date <= $2::date
         ORDER BY transfer_date DESC, id DESC
         LIMIT 100`,
        [dateFrom, dateTo]
      ).catch(() => ({ rows: [] })),
      // Audit recent list
      pool.query(
        `SELECT id, user_id, action, entity_type, entity_id, details, created_at
         FROM audit_log
         WHERE ($1::int[] IS NULL OR user_id = ANY($1::int[]))
           AND created_at >= $2
           AND created_at < $3
         ORDER BY created_at DESC
         LIMIT $4`,
        [employeeIds, doneAtFromTs, doneAtToTs, auditLimit]
      ).catch(() => ({ rows: [] })),
    ]);

    const dept = deptAgg.rows[0] || {};
    const settlements = settlementsAgg.rows[0] || {};
    const ct = ctAgg.rows[0] || {};
    const disb = disbAgg.rows[0] || {};

    const byEmp = Object.fromEntries((byEmployeeAgg.rows || []).map((r) => [String(r.user_id), r]));
    const byAtt = Object.fromEntries((attendanceAgg.rows || []).map((r) => [String(r.user_id), r]));

    const capDelay = (v) => {
      if (v == null || isNaN(v)) return null;
      const n = Math.round(parseFloat(v));
      return Math.min(120, Math.max(0, n));
    };

    const employees = employeesList.map((e) => {
      const agg = byEmp[String(e.id)] || {};
      const att = byAtt[String(e.id)] || {};
      return {
        id: e.id,
        name: e.name,
        avatar_url: e.avatar_url || null,
        attendance_days: parseInt(att.days_present || 0, 10),
        avg_attendance_time: att.mode_login_time ? String(att.mode_login_time).trim() : null,
        executed_total: parseInt(agg.executed_total || 0, 10),
        scheduled_executed: parseInt(agg.scheduled_executed || 0, 10),
        ad_hoc_executed: parseInt(agg.ad_hoc_executed || 0, 10),
        on_time: parseInt(agg.on_time || 0, 10),
        late: parseInt(agg.late || 0, 10),
        coverage: parseInt(agg.coverage || 0, 10),
        avg_duration_minutes: agg.avg_duration_minutes != null ? Math.round(parseFloat(agg.avg_duration_minutes)) : null,
        avg_delay_late_minutes: capDelay(agg.avg_delay_late_minutes),
        total_duration_minutes: parseInt(agg.total_duration_minutes || 0, 10),
      };
    });

    const tasks = (tasksRows.rows || []).map((r) => ({
      execution_id: r.execution_id,
      done_at: r.done_at ? toBaghdadTime(r.done_at).format('YYYY-MM-DD HH:mm') : null,
      done_date: r.done_date,
      result_status: r.result_status,
      duration_minutes: r.duration_minutes != null ? parseInt(r.duration_minutes, 10) : null,
      user_id: r.user_id,
      task_type: r.task_type,
      task_id: r.task_id,
      assigned_to_user_id: r.assigned_to_user_id,
      scheduled_date: r.scheduled_date,
      template_id: r.template_id,
      template_title: r.template_title,
      category_id: r.category_id,
      category_name: r.category_name,
    }));

    const tasksTotal = parseInt(tasksTotalRows.rows[0]?.total || 0, 10);

    const payload = {
      period,
      dateFrom,
      dateTo,
      filters: { employeeIds, categoryIds, templateIds, bankNames },
      departmentSummary: {
        executed_total: parseInt(dept.executed_total || 0, 10),
        scheduled_executed: parseInt(dept.scheduled_executed || 0, 10),
        ad_hoc_executed: parseInt(dept.ad_hoc_executed || 0, 10),
        on_time: parseInt(dept.on_time || 0, 10),
        late: parseInt(dept.late || 0, 10),
        coverage: parseInt(dept.coverage || 0, 10),
        avg_duration_minutes: dept.avg_duration_minutes != null ? Math.round(parseFloat(dept.avg_duration_minutes)) : null,
        avg_delay_late_minutes: (() => { const v = dept.avg_delay_late_minutes; if (v == null || isNaN(v)) return null; const n = Math.round(parseFloat(v)); return Math.min(120, Math.max(0, n)); })(),
        total_duration_minutes: parseInt(dept.total_duration_minutes || 0, 10),
        attendance: {
          employees_present: attendanceAgg.rows ? new Set(attendanceAgg.rows.map((r) => String(r.user_id))).size : 0,
          total_days: null,
        },
      },
      tasks: {
        page: tasksPage,
        limit: tasksLimit,
        total: tasksTotal,
        totalPages: tasksLimit > 0 ? Math.ceil(tasksTotal / tasksLimit) : 1,
        rows: tasks,
      },
      tasksByCategory: (byCategoryAgg.rows || []).map((r) => ({
        category_id: parseInt(r.category_id || -1, 10),
        category_name: r.category_name,
        executed_total: parseInt(r.executed_total || 0, 10),
        on_time: parseInt(r.on_time || 0, 10),
        late: parseInt(r.late || 0, 10),
      })),
      tasksByTemplateAndCategory: (byTemplateAgg.rows || []).map((r) => ({
        template_id: parseInt(r.template_id || -1, 10),
        template_title: r.template_title,
        category_id: parseInt(r.category_id || -1, 10),
        category_name: r.category_name,
        executed_total: parseInt(r.executed_total || 0, 10),
        on_time: parseInt(r.on_time || 0, 10),
        late: parseInt(r.late || 0, 10),
      })),
      employees,
      coverage: (coverageAgg.rows || []).map((r) => ({
        done_by_user_id: r.done_by_user_id,
        assigned_to_user_id: r.assigned_to_user_id,
        count: parseInt(r.count || 0, 10),
      })),
      settlements: {
        total_settlements: parseInt(settlements.total_settlements || 0, 10),
        total_movements: parseInt(settlements.total_movements || 0, 10),
        total_amount: parseFloat(settlements.total_amount || 0),
        total_fees: parseFloat(settlements.total_fees || 0),
        total_acq: parseFloat(settlements.total_acq || 0),
        total_sttle: parseFloat(settlements.total_sttle || 0),
        byBank: (settlementsByBankAgg.rows || []).map((r) => ({
          bank_name: r.bank_name,
          settlement_count: parseInt(r.settlement_count || 0, 10),
          total_movements: parseInt(r.total_movements || 0, 10),
          total_amount: parseFloat(r.total_amount || 0),
          total_fees: parseFloat(r.total_fees || 0),
          total_acq: parseFloat(r.total_acq || 0),
          total_sttle: parseFloat(r.total_sttle || 0),
        })),
      },
      ctMatching: {
        total: parseInt(ct.total || 0, 10),
        matched: parseInt(ct.matched || 0, 10),
        notMatched: parseInt(ct.not_matched || 0, 10),
        records: (ctRows.rows || []).map((r) => ({
          id: r.id,
          sttl_date_from: r.sttl_date_from,
          sttl_date_to: r.sttl_date_to,
          ct_value: parseFloat(r.ct_value || 0),
          sum_acq: parseFloat(r.sum_acq || 0),
          sum_fees: parseFloat(r.sum_fees || 0),
          match_status: r.match_status,
          ct_received_date: r.ct_received_date,
          user_name: r.user_name,
        })),
      },
      merchantDisbursements: {
        count: parseInt(disb.count || 0, 10),
        total_amount: parseFloat(disb.total_amount || 0),
        rows: (disbRows.rows || []).map((r) => ({
          id: r.id,
          merchant_id: r.merchant_id,
          iban: r.iban,
          amount: parseFloat(r.amount || 0),
          transfer_date: r.transfer_date,
          status: r.status,
          created_at: r.created_at ? toBaghdadTime(r.created_at).format('YYYY-MM-DD HH:mm') : null,
        })),
      },
      audit: (auditRows.rows || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        details: r.details,
        created_at: r.created_at ? toBaghdadTime(r.created_at).format('YYYY-MM-DD HH:mm') : null,
      })),
    };

    setReportV2Cached(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error('خطأ في تقرير V2:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getCoverageReport,
  getComprehensiveReport,
  getReportFull,
  getReportV2,
  exportToExcel,
  exportToPdf
};