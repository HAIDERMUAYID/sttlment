const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { loadUserPermissions, hasPermission } = require('../utils/permissions');
const { getTodayBaghdad, getNowBaghdad } = require('../utils/timezone');

// التحقق من التوكن
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // التحقق من وجود المستخدم ونشاطه
    const result = await pool.query(
      'SELECT id, name, email, role, active, avatar_url, can_manage_merchants FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({ error: 'المستخدم غير موجود أو غير نشط' });
    }
    
    req.user = result.rows[0];
    req.user.permissions = await loadUserPermissions(req.user.id, req.user.role);

    // تسجيل الحضور عند أول طلب مصادق في اليوم (حتى لو لم يعيد المستخدم تسجيل الدخول)
    try {
      const today = getTodayBaghdad();
      const now = getNowBaghdad();
      await pool.query(
        `INSERT INTO attendance (user_id, date, first_login_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date) DO NOTHING`,
        [req.user.id, today, now.toDate()]
      );
    } catch (attendanceErr) {
      // لا نُفشّل الطلب إذا فشل تسجيل الحضور
      if (process.env.NODE_ENV === 'development') {
        console.warn('[attendance] فشل تسجيل الحضور في middleware:', attendanceErr.message);
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }
};

// التحقق من الصلاحيات
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('❌ authorize: req.user غير موجود');
      return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
    }
    
    // تحويل roles إلى مصفوفة مسطحة (للتعامل مع كل من authorize(['admin']) و authorize('admin', 'supervisor'))
    const allowedRoles = roles.flat();
    
    console.log(`🔍 authorize check: user=${req.user.email}, role=${req.user.role}, allowed=${allowedRoles.join(', ')}`);
    
    if (!allowedRoles.includes(req.user.role)) {
      console.error(`❌ صلاحية مرفوضة: المستخدم ${req.user.email} (${req.user.role}) حاول الوصول إلى مورد يتطلب: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        error: 'ليس لديك صلاحية للوصول إلى هذا المورد',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    console.log(`✅ صلاحية مقبولة: ${req.user.email} (${req.user.role})`);
    next();
  };
};

// السماح بالوصول لإدارة التجار: admin أو supervisor أو من لديه can_manage_merchants أو صلاحية merchants.view
const canManageMerchants = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }
  const allowed =
    req.user.role === 'admin' ||
    req.user.role === 'supervisor' ||
    req.user.can_manage_merchants === true ||
    hasPermission(req.user.permissions, 'merchants', 'view');
  if (!allowed) {
    return res.status(403).json({
      error: 'ليس لديك صلاحية للوصول إلى إدارة التجار',
    });
  }
  next();
};

/** التحقق من صلاحية صفحة + إجراء */
const requirePermission = (pageKey, actionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
    }
    if (hasPermission(req.user.permissions, pageKey, actionKey)) {
      return next();
    }
    return res.status(403).json({
      error: 'ليس لديك صلاحية لهذا الإجراء',
      required: { page: pageKey, action: actionKey },
    });
  };
};

// تسجيل التدقيق
const auditLog = async (userId, action, entityType, entityId, details = {}, ipAddress, userAgent) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('خطأ في تسجيل التدقيق:', error);
  }
};

module.exports = { authenticate, authorize, canManageMerchants, requirePermission, auditLog };