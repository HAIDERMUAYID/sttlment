const pool = require('../config/database');

/** قائمة صرف مستحقات التجار مع فلاتر */
async function getDisbursements(req, res) {
  try {
    const { page = 1, limit = 25, date_from, date_to, merchant_id, bank_name } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = ' WHERE 1=1 ';
    const params = [];
    let paramCount = 0;

    if (date_from) {
      paramCount++;
      where += ` AND d.transfer_date >= $${paramCount}::date `;
      params.push(date_from);
    }
    if (date_to) {
      paramCount++;
      where += ` AND d.transfer_date <= $${paramCount}::date `;
      params.push(date_to);
    }
    if (merchant_id) {
      paramCount++;
      where += ` AND d.merchant_id = $${paramCount} `;
      params.push(merchant_id);
    }
    if (bank_name && bank_name.trim() !== '') {
      paramCount++;
      where += ` AND d.bank_name ILIKE $${paramCount} `;
      params.push(`%${bank_name.trim()}%`);
    }

    const listQuery = `
      SELECT d.id, d.merchant_id, d.transfer_date, d.bank_name, d.iban, d.amount, d.notes, d.created_at,
             m.merchant_id AS merchant_code, m.directorate_name, m.settlement_name, m.governorate,
             u.name AS created_by_name
      FROM merchant_disbursements d
      JOIN merchants m ON m.id = d.merchant_id
      LEFT JOIN users u ON u.id = d.created_by_user_id
      ${where}
      ORDER BY d.transfer_date DESC, d.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(parseInt(limit, 10), offset);

    const countQuery = `
      SELECT COUNT(*) FROM merchant_disbursements d
      ${where}
    `;
    const countParams = params.slice(0, paramCount);

    const [listRes, countRes] = await Promise.all([
      pool.query(listQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countRes.rows[0]?.count || 0, 10);
    const rows = (listRes.rows || []).map((r) => ({
      id: r.id,
      merchant_id: r.merchant_id,
      merchant_code: r.merchant_code,
      directorate_name: r.directorate_name,
      settlement_name: r.settlement_name,
      governorate: r.governorate,
      transfer_date: r.transfer_date ? String(r.transfer_date).slice(0, 10) : null,
      bank_name: r.bank_name,
      iban: r.iban,
      amount: parseFloat(r.amount) || 0,
      notes: r.notes,
      created_at: r.created_at,
      created_by_name: r.created_by_name,
    }));

    res.json({
      disbursements: rows,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول صرف المستحقات غير موجود. يرجى تشغيل migrations.' });
    }
    console.error('خطأ في جلب صرف المستحقات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** مؤشرات KPI لصرف المستحقات (حسب الفلاتر) */
async function getDisbursementsKpi(req, res) {
  try {
    const { date_from, date_to, merchant_id, bank_name } = req.query;

    let where = ' WHERE 1=1 ';
    const params = [];
    let paramCount = 0;

    if (date_from) {
      paramCount++;
      where += ` AND d.transfer_date >= $${paramCount}::date `;
      params.push(date_from);
    }
    if (date_to) {
      paramCount++;
      where += ` AND d.transfer_date <= $${paramCount}::date `;
      params.push(date_to);
    }
    if (merchant_id) {
      paramCount++;
      where += ` AND d.merchant_id = $${paramCount} `;
      params.push(merchant_id);
    }
    if (bank_name && bank_name.trim() !== '') {
      paramCount++;
      where += ` AND d.bank_name ILIKE $${paramCount} `;
      params.push(`%${bank_name.trim()}%`);
    }

    const kpiQuery = `
      SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(d.amount), 0) AS total_amount
      FROM merchant_disbursements d
      ${where}
    `;
    const result = await pool.query(kpiQuery, params);
    const row = result.rows[0] || {};

    res.json({
      total_count: parseInt(row.total_count, 10) || 0,
      total_amount: parseFloat(row.total_amount) || 0,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول صرف المستحقات غير موجود.' });
    }
    console.error('خطأ في KPI صرف المستحقات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** إضافة سجل صرف مستحقات */
async function createDisbursement(req, res) {
  try {
    const { merchant_id, transfer_date, bank_name, iban, amount, notes } = req.body;
    const userId = req.user?.id;

    if (!merchant_id || !transfer_date || !bank_name || iban == null || iban === '' || amount == null) {
      return res.status(400).json({
        error: 'مطلوب: التاجر، تاريخ الحوالة، المصرف، رقم IBAN، وقيمة الحوالة',
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'قيمة الحوالة يجب أن تكون رقماً موجباً' });
    }

    const result = await pool.query(
      `INSERT INTO merchant_disbursements (merchant_id, transfer_date, bank_name, iban, amount, notes, created_by_user_id)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7)
       RETURNING id, merchant_id, transfer_date, bank_name, iban, amount, notes, created_at`,
      [merchant_id, transfer_date.slice(0, 10), String(bank_name).trim(), String(iban).trim(), numAmount, notes || null, userId]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      merchant_id: row.merchant_id,
      transfer_date: row.transfer_date ? String(row.transfer_date).slice(0, 10) : null,
      bank_name: row.bank_name,
      iban: row.iban,
      amount: parseFloat(row.amount),
      notes: row.notes,
      created_at: row.created_at,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول صرف المستحقات أو التجار غير موجود.' });
    }
    if (error?.code === '23503') {
      return res.status(400).json({ error: 'معرف التاجر غير موجود' });
    }
    console.error('خطأ في إضافة صرف المستحقات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** تعديل سجل صرف مستحقات */
async function updateDisbursement(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف الحوالة غير صالح' });
    }
    const { merchant_id, transfer_date, bank_name, iban, amount, notes } = req.body;

    if (!merchant_id || !transfer_date || !bank_name || iban == null || iban === '' || amount == null) {
      return res.status(400).json({
        error: 'مطلوب: التاجر، تاريخ الحوالة، المصرف، رقم IBAN، وقيمة الحوالة',
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'قيمة الحوالة يجب أن تكون رقماً موجباً' });
    }

    const result = await pool.query(
      `UPDATE merchant_disbursements
       SET merchant_id = $1, transfer_date = $2::date, bank_name = $3, iban = $4, amount = $5, notes = $6
       WHERE id = $7
       RETURNING id, merchant_id, transfer_date, bank_name, iban, amount, notes, created_at`,
      [merchant_id, transfer_date.slice(0, 10), String(bank_name).trim(), String(iban).trim(), numAmount, notes || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'سجل الحوالة غير موجود' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      merchant_id: row.merchant_id,
      transfer_date: row.transfer_date ? String(row.transfer_date).slice(0, 10) : null,
      bank_name: row.bank_name,
      iban: row.iban,
      amount: parseFloat(row.amount),
      notes: row.notes,
      created_at: row.created_at,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول صرف المستحقات غير موجود.' });
    }
    if (error?.code === '23503') {
      return res.status(400).json({ error: 'معرف التاجر غير موجود' });
    }
    console.error('خطأ في تعديل صرف المستحقات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** حذف سجل صرف مستحقات */
async function deleteDisbursement(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف الحوالة غير صالح' });
    }

    const result = await pool.query('DELETE FROM merchant_disbursements WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'سجل الحوالة غير موجود' });
    }

    res.json({ success: true, id });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول صرف المستحقات غير موجود.' });
    }
    console.error('خطأ في حذف صرف المستحقات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** قائمة التجار للاختيار (للمنسدلة) */
async function getMerchantsOptions(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, merchant_id, directorate_name, settlement_name, governorate, iban, bank_name
       FROM merchants
       WHERE active = true
       ORDER BY directorate_name NULLS LAST, settlement_name NULLS LAST, merchant_id`
    );
    res.json({
      merchants: (result.rows || []).map((r) => ({
        id: r.id,
        merchant_id: r.merchant_id,
        directorate_name: r.directorate_name,
        settlement_name: r.settlement_name,
        governorate: r.governorate,
        iban: r.iban,
        bank_name: r.bank_name,
      })),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول التجار غير موجود.' });
    }
    console.error('خطأ في جلب قائمة التجار:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

module.exports = {
  getDisbursements,
  getDisbursementsKpi,
  createDisbursement,
  updateDisbursement,
  deleteDisbursement,
  getMerchantsOptions,
};
