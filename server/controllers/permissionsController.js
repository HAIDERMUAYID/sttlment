const pool = require('../config/database');

/** جلب معرّفات المستخدمين الذين لديهم صلاحية ممنوحة على صفحة معينة (أي إجراء) — يشمل المديرين */
async function getUsersWithPermissionOnPage(req, res) {
  try {
    const { page_key } = req.query;
    if (!page_key || typeof page_key !== 'string') {
      return res.status(400).json({ error: 'معامل page_key مطلوب' });
    }
    const result = await pool.query(
      `SELECT DISTINCT user_id AS id FROM user_permissions WHERE page_key = $1 AND granted = true
       UNION
       SELECT id FROM users WHERE role = 'admin'`,
      [page_key.trim()]
    );
    const user_ids = result.rows.map((r) => r.id);
    res.json({ user_ids });
  } catch (error) {
    console.error('خطأ في جلب المستخدمين حسب الصلاحية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** جلب تعريفات الصفحات والإجراءات */
async function getPermissionDefinitions(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, page_key, page_label_ar, page_path, actions, sort_order FROM permission_definitions ORDER BY sort_order, id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب تعريفات الصلاحيات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** جلب صلاحيات مستخدم معين */
async function getUserPermissions(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
    }
    const result = await pool.query(
      'SELECT page_key, action_key, granted FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    const perms = {};
    result.rows.forEach((r) => {
      if (!perms[r.page_key]) perms[r.page_key] = {};
      perms[r.page_key][r.action_key] = r.granted;
    });
    res.json(perms);
  } catch (error) {
    console.error('خطأ في جلب صلاحيات المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** حفظ صلاحيات مستخدم */
async function updateUserPermissions(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    const { permissions } = req.body || {};
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
    }
    if (typeof permissions !== 'object') {
      return res.status(400).json({ error: 'يجب إرسال permissions ككائن' });
    }
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
      const entries = [];
      for (const [pageKey, actions] of Object.entries(permissions)) {
        if (typeof actions !== 'object') continue;
        for (const [actionKey, granted] of Object.entries(actions)) {
          if (granted === true || granted === false) {
            entries.push({ user_id: userId, page_key: pageKey, action_key: actionKey, granted });
          }
        }
      }
      for (const e of entries) {
        await client.query(
          'INSERT INTO user_permissions (user_id, page_key, action_key, granted) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, page_key, action_key) DO UPDATE SET granted = EXCLUDED.granted, updated_at = CURRENT_TIMESTAMP',
          [e.user_id, e.page_key, e.action_key, e.granted]
        );
      }
      const r = await client.query('SELECT page_key, action_key, granted FROM user_permissions WHERE user_id = $1', [userId]);
      const perms = {};
      r.rows.forEach((row) => {
        if (!perms[row.page_key]) perms[row.page_key] = {};
        perms[row.page_key][row.action_key] = row.granted;
      });
      res.json({ message: 'تم حفظ الصلاحيات بنجاح', permissions: perms });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('خطأ في حفظ صلاحيات المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

module.exports = {
  getPermissionDefinitions,
  getUserPermissions,
  updateUserPermissions,
  getUsersWithPermissionOnPage,
};
