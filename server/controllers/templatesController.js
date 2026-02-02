const pool = require('../config/database');
const { auditLog } = require('../middleware/auth');

const getTemplates = async (req, res) => {
  try {
    const { active, categoryId } = req.query;
    let query = `
      SELECT t.*, c.name as category_name
      FROM task_templates t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (active !== undefined) {
      query += ` AND t.active = $${paramCount++}`;
      params.push(active === 'true');
    }
    
    if (categoryId) {
      query += ` AND t.category_id = $${paramCount++}`;
      params.push(categoryId);
    }
    
    query += ' ORDER BY t.title';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب القوالب:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as category_name
       FROM task_templates t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب القالب:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { title, categoryId, description, defaultPoints, requiredFields, active } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'عنوان القالب مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO task_templates (title, category_id, description, default_points, required_fields, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        categoryId || null,
        description || null,
        defaultPoints || null,
        requiredFields ? JSON.stringify(requiredFields) : null,
        active !== false
      ]
    );
    
    await auditLog(
      req.user.id,
      'create_template',
      'task_template',
      result.rows[0].id,
      { title, categoryId },
      req.ip,
      req.get('user-agent')
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء القالب:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, categoryId, description, defaultPoints, requiredFields, active } = req.body;
    
    const result = await pool.query(
      `UPDATE task_templates
       SET title = COALESCE($1, title),
           category_id = COALESCE($2, category_id),
           description = COALESCE($3, description),
           default_points = COALESCE($4, default_points),
           required_fields = COALESCE($5, required_fields),
           active = COALESCE($6, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        title,
        categoryId,
        description,
        defaultPoints,
        requiredFields ? JSON.stringify(requiredFields) : null,
        active,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    
    await auditLog(
      req.user.id,
      'update_template',
      'task_template',
      id,
      req.body,
      req.ip,
      req.get('user-agent')
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث القالب:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // حذف القالب — السجلات المرتبطة تُحدَّث تلقائياً:
    // - الجداول (schedules): تُحذف تلقائياً (ON DELETE CASCADE)
    // - المهام اليومية و ad_hoc: template_id يصبح NULL (ON DELETE SET NULL)
    const result = await pool.query('DELETE FROM task_templates WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    
    await auditLog(
      req.user.id,
      'delete_template',
      'task_template',
      id,
      {},
      req.ip,
      req.get('user-agent')
    );
    
    res.json({ message: 'تم حذف القالب بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف القالب:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
};