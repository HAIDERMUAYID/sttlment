const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { auditLog } = require('../middleware/auth');

// الحصول على جميع المستخدمين
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, active, can_create_ad_hoc, can_manage_merchants, avatar_url, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// الحصول على مستخدم واحد
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, email, role, active, can_create_ad_hoc, can_manage_merchants, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// إنشاء مستخدم جديد
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, active, canCreateAdHoc, canManageMerchants, can_manage_merchants } = req.body;
    const canManage = canManageMerchants === true || can_manage_merchants === true;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'الاسم، البريد الإلكتروني، كلمة المرور، والدور مطلوبة' });
    }
    
    if (!['admin', 'supervisor', 'employee', 'viewer', 'accountant'].includes(role)) {
      return res.status(400).json({ error: 'دور غير صالح' });
    }
    
    // التحقق من عدم وجود البريد الإلكتروني
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, active, can_create_ad_hoc, can_manage_merchants)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, active, can_create_ad_hoc, can_manage_merchants, avatar_url, created_at`,
      [name, email.toLowerCase(), passwordHash, role, active !== false, canCreateAdHoc || false, canManage]
    );
    
    await auditLog(
      req.user.id,
      'create_user',
      'user',
      result.rows[0].id,
      { name, email, role },
      req.ip,
      req.get('user-agent')
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تحديث مستخدم
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, active, canCreateAdHoc, canManageMerchants, can_manage_merchants } = req.body;
    
    // التحقق من وجود المستخدم
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (email) {
      // التحقق من عدم تكرار البريد الإلكتروني
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email.toLowerCase());
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    
    if (role) {
      if (!['admin', 'supervisor', 'employee', 'viewer', 'accountant'].includes(role)) {
        return res.status(400).json({ error: 'دور غير صالح' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    
    if (canCreateAdHoc !== undefined) {
      updates.push(`can_create_ad_hoc = $${paramCount++}`);
      values.push(canCreateAdHoc);
    }
    
    if (canManageMerchants !== undefined || can_manage_merchants !== undefined) {
      const canManage = canManageMerchants === true || can_manage_merchants === true;
      updates.push(`can_manage_merchants = $${paramCount++}`);
      values.push(canManage);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'لا توجد تحديثات' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, email, role, active, can_create_ad_hoc, can_manage_merchants, avatar_url, created_at, updated_at`,
      values
    );
    
    await auditLog(
      req.user.id,
      'update_user',
      'user',
      id,
      req.body,
      req.ip,
      req.get('user-agent')
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تعطيل/تفعيل مستخدم
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE users SET active = NOT active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, role, active, avatar_url`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    await auditLog(
      req.user.id,
      result.rows[0].active ? 'activate_user' : 'deactivate_user',
      'user',
      id,
      {},
      req.ip,
      req.get('user-agent')
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تغيير حالة المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// رفع الصورة الشخصية
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'لم يتم رفع ملف' });
    }

    // بناء URL الصورة
    const avatarUrl = `/api/uploads/avatars/${file.filename}`;

    // حذف الصورة القديمة إن وجدت
    const userResult = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.avatar_url) {
      const fs = require('fs');
      const path = require('path');
      const oldFilename = userResult.rows[0].avatar_url.split('/').pop();
      const oldFilePath = path.join(process.cwd(), 'uploads', 'avatars', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // تحديث الصورة في قاعدة البيانات
    const result = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role, active, avatar_url, created_at, updated_at`,
      [avatarUrl, userId]
    );

    await auditLog(
      userId,
      'update_user_avatar',
      'user',
      userId,
      { avatar_url: avatarUrl },
      req.ip,
      req.get('user-agent')
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في رفع الصورة الشخصية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف الصورة الشخصية
const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // الحصول على الصورة الحالية
    const userResult = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    const avatarUrl = userResult.rows[0]?.avatar_url;

    if (avatarUrl) {
      // حذف الملف من النظام
      const fs = require('fs');
      const path = require('path');
      const filename = avatarUrl.split('/').pop();
      const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // تحديث قاعدة البيانات
    const result = await pool.query(
      `UPDATE users SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, role, active, avatar_url, created_at, updated_at`,
      [userId]
    );

    await auditLog(
      userId,
      'delete_user_avatar',
      'user',
      userId,
      {},
      req.ip,
      req.get('user-agent')
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في حذف الصورة الشخصية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف مستخدم
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    if (String(id) === String(currentUserId)) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك الشخصي' });
    }

    const existing = await pool.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const user = existing.rows[0];

    // حذف أو تحويل كل ما يرتبط بالمستخدم قبل حذفه (حذف متسلسل)
    // 1) task_executions.done_by_user_id = NOT NULL RESTRICT → ننقل "منفذ بواسطة" إلى المدير الذي ينفذ الحذف
    await pool.query(
      'UPDATE task_executions SET done_by_user_id = $1 WHERE done_by_user_id = $2',
      [currentUserId, id]
    );
    // 2) attendance و user_permissions عليها CASCADE فتُحذف تلقائياً عند حذف المستخدم
    // 3) بقية الجداول (daily_tasks.assigned_to_user_id، إلخ) عليها SET NULL فتُحدَّث تلقائياً

    try {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (dbError) {
      const isFkViolation = dbError.code === '23503' ||
        (dbError.message && (
          dbError.message.includes('foreign key') ||
          dbError.message.includes('task_executions') ||
          dbError.message.includes('violates')
        ));
      if (isFkViolation) {
        return res.status(400).json({
          error: 'لا يمكن حذف المستخدم لأنه مرتبط بسجلات أخرى (مهام منفذة، حضور، إلخ). يمكنك تعطيل الحساب من زر «تعطيل» بدلاً من الحذف.'
        });
      }
      throw dbError;
    }

    if (user.avatar_url) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filename = user.avatar_url.split('/').pop();
        const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn('تحذير: لم يتم حذف ملف الصورة الشخصية:', fileErr.message);
      }
    }

    await auditLog(
      currentUserId,
      'delete_user',
      'user',
      id,
      { deleted_name: user.name },
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error);
    const isFk = error.code === '23503' || (error.message && (error.message.includes('foreign key') || error.message.includes('task_executions')));
    res.status(isFk ? 400 : 500).json({
      error: isFk ? 'لا يمكن حذف المستخدم لأنه مرتبط بسجلات أخرى (مهام منفذة، حضور، إلخ). يمكنك تعطيل الحساب من زر «تعطيل» بدلاً من الحذف.' : 'خطأ في الخادم'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserActive,
  deleteUser,
  uploadAvatar,
  deleteAvatar
};