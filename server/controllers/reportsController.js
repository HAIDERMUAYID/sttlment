const pool = require('../config/database');
const { toBaghdadTime, getTodayBaghdad } = require('../utils/timezone');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// تقرير يومي
const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || getTodayBaghdad();
    
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
    
    // المهام المنفذة متأخرة
    const lateTasks = await pool.query(
      `SELECT COUNT(*) as count
       FROM task_executions te
       JOIN daily_tasks dt ON te.daily_task_id = dt.id
       WHERE dt.task_date = $1 AND te.result_status = 'completed_late'`,
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
    
    // إحصائيات إضافية: المهام حسب الموظف
    const tasksByUser = await pool.query(
      `SELECT 
         u.id, u.name,
         COUNT(te.id) as tasks_done,
         COUNT(CASE WHEN te.result_status = 'completed' THEN 1 END) as on_time,
         COUNT(CASE WHEN te.result_status = 'completed_late' THEN 1 END) as late
       FROM task_executions te
       LEFT JOIN daily_tasks dt ON te.daily_task_id = dt.id
       LEFT JOIN users u ON te.done_by_user_id = u.id
       WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)
       GROUP BY u.id, u.name
       ORDER BY tasks_done DESC`,
      [date]
    );
    
    // إحصائيات حسب الفئة
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
       WHERE (dt.task_date = $1 OR DATE(te.done_at AT TIME ZONE 'Asia/Baghdad') = $1)
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
    
    res.json({
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
    });
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
         AND EXTRACT(YEAR FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $2
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
         AND dt.task_date BETWEEN $1 AND $2
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
           AND EXTRACT(YEAR FROM te.done_at AT TIME ZONE 'Asia/Baghdad') = $2
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
       WHERE dt.task_date = $1 AND te.result_status = 'completed_late'`,
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

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getCoverageReport,
  exportToExcel,
  exportToPdf
};