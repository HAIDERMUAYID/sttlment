const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { getTodayBaghdad, getNowBaghdad } = require('../utils/timezone');
const { auditLog } = require('../middleware/auth');
const { loadUserPermissions } = require('../utils/permissions');

// تسجيل الدخول
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    const user = result.rows[0];
    
    if (!user.active) {
      return res.status(403).json({ error: 'حسابك غير نشط. يرجى التواصل مع المدير' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    // تسجيل الحضور (أول تسجيل دخول في اليوم)
    const today = getTodayBaghdad();
    const now = getNowBaghdad();
    
    await pool.query(
      `INSERT INTO attendance (user_id, date, first_login_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO NOTHING`,
      [user.id, today, now.toDate()]
    );
    
    // إنشاء التوكن
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // تسجيل التدقيق
    await auditLog(
      user.id,
      'login',
      'user',
      user.id,
      {},
      req.ip,
      req.get('user-agent')
    );
    
    const permissions = await loadUserPermissions(user.id, user.role);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canCreateAdHoc: user.can_create_ad_hoc,
        canManageMerchants: user.can_manage_merchants === true,
        avatarUrl: user.avatar_url,
        permissions
      }
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// التحقق من التوكن (للتحقق من حالة الجلسة)
const verifyToken = async (req, res) => {
  try {
    // جلب بيانات المستخدم الكاملة من قاعدة البيانات
    const result = await pool.query(
      'SELECT id, name, email, role, can_create_ad_hoc, can_manage_merchants, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    const user = result.rows[0];
    const permissions = await loadUserPermissions(user.id, user.role);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canCreateAdHoc: user.can_create_ad_hoc,
        canManageMerchants: user.can_manage_merchants,
        avatarUrl: user.avatar_url,
        permissions
      }
    });
  } catch (error) {
    console.error('خطأ في التحقق من التوكن:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تغيير كلمة المرور
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }
    const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const valid = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);
    await auditLog(req.user.id, 'change_password', 'user', req.user.id, {}, req.ip, req.get('user-agent'));
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

module.exports = { login, verifyToken, changePassword };