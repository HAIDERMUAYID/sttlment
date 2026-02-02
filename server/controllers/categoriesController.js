const pool = require('../config/database');
const { auditLog } = require('../middleware/auth');

const getCategories = async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM categories';
    const params = [];
    
    if (active !== undefined) {
      query += ' WHERE active = $1';
      params.push(active === 'true');
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب الفئات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, active } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'اسم الفئة مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO categories (name, description, active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, active !== false]
    );
    
    await auditLog(
      req.user.id,
      'create_category',
      'category',
      result.rows[0].id,
      { name },
      req.ip,
      req.get('user-agent')
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء الفئة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;
    
    const result = await pool.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           active = COALESCE($3, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الفئة غير موجودة' });
    }
    
    await auditLog(
      req.user.id,
      'update_category',
      'category',
      id,
      req.body,
      req.ip,
      req.get('user-agent')
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث الفئة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // حذف الفئة — السجلات المرتبطة (قوالب المهام، المهام الخاصة) تُحدَّث تلقائياً
    // عبر ON DELETE SET NULL في قاعدة البيانات (category_id يصبح NULL)
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الفئة غير موجودة' });
    }
    
    await auditLog(
      req.user.id,
      'delete_category',
      'category',
      id,
      {},
      req.ip,
      req.get('user-agent')
    );
    
    res.json({ message: 'تم حذف الفئة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الفئة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };