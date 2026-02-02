-- صلاحيات المستخدمين الشاملة — حسب الصفحة والإجراء
-- يتيح منح وتصحيح صلاحيات لكل مستخدم على مستوى الصفحة + الإجراء

-- جدول تعريف الصفحات والإجراءات (مرجع ثابت)
CREATE TABLE IF NOT EXISTS permission_definitions (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(100) NOT NULL UNIQUE,
  page_label_ar VARCHAR(255) NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- جدول صلاحيات المستخدم (per-user)
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(100) NOT NULL,
  action_key VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_key, action_key)
);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_page ON user_permissions(page_key);

COMMENT ON TABLE permission_definitions IS 'تعريف الصفحات والإجراءات المتاحة في النظام';
COMMENT ON TABLE user_permissions IS 'صلاحيات كل مستخدم — صفحة + إجراء';

-- تهيئة تعريفات الصفحات والإجراءات
INSERT INTO permission_definitions (page_key, page_label_ar, page_path, actions, sort_order) VALUES
  ('dashboard', 'لوحة التحكم', '/dashboard', '[{"key":"view","label_ar":"عرض"}]', 1),
  ('tasks', 'المهام', '/tasks', '[{"key":"view","label_ar":"عرض"},{"key":"create_ad_hoc","label_ar":"إنشاء مهام خاصة"},{"key":"filter_by_assignee","label_ar":"فلترة بالمسؤول"},{"key":"execute","label_ar":"تنفيذ"}]', 2),
  ('schedules', 'الجداول الزمنية', '/schedules', '[{"key":"view","label_ar":"عرض"},{"key":"create","label_ar":"إضافة"},{"key":"edit","label_ar":"تعديل"},{"key":"delete","label_ar":"حذف"}]', 3),
  ('templates', 'قوالب المهام', '/templates', '[{"key":"view","label_ar":"عرض"},{"key":"create","label_ar":"إضافة"},{"key":"edit","label_ar":"تعديل"},{"key":"delete","label_ar":"حذف"}]', 4),
  ('categories', 'الفئات', '/categories', '[{"key":"view","label_ar":"عرض"},{"key":"create","label_ar":"إضافة"},{"key":"edit","label_ar":"تعديل"},{"key":"delete","label_ar":"حذف"}]', 5),
  ('rtgs', 'RTGS', '/rtgs', '[{"key":"view","label_ar":"عرض"},{"key":"import","label_ar":"استيراد"},{"key":"export","label_ar":"تصدير"},{"key":"delete_import","label_ar":"حذف استيراد"},{"key":"delete_all","label_ar":"حذف الكل"},{"key":"view_import_logs","label_ar":"سجل الاستيراد"},{"key":"access_settings","label_ar":"إعدادات الاحتساب"}]', 6),
  ('government_settlements', 'التسويات الحكومية', '/government-settlements', '[{"key":"view","label_ar":"عرض"}]', 7),
  ('ct_matching', 'مطابقة العمولات (CT)', '/ct-matching', '[{"key":"view","label_ar":"عرض"},{"key":"create_ct","label_ar":"إنشاء CT"},{"key":"edit_ct","label_ar":"تعديل CT"},{"key":"delete_ct","label_ar":"حذف CT"}]', 8),
  ('merchant_disbursements', 'صرف مستحقات التجار', '/merchant-disbursements', '[{"key":"view","label_ar":"عرض"},{"key":"create_disbursement","label_ar":"إنشاء صرف"}]', 9),
  ('reports', 'التقارير', '/reports', '[{"key":"view","label_ar":"عرض"},{"key":"export_excel","label_ar":"تصدير Excel"},{"key":"export_pdf","label_ar":"تصدير PDF"}]', 10),
  ('attendance', 'الحضور', '/attendance', '[{"key":"view","label_ar":"عرض"},{"key":"manage_stats","label_ar":"إدارة الإحصائيات"}]', 11),
  ('merchants', 'إدارة التجار', '/merchants', '[{"key":"view","label_ar":"عرض"},{"key":"create","label_ar":"إضافة"},{"key":"edit","label_ar":"تعديل"},{"key":"delete","label_ar":"حذف"},{"key":"import","label_ar":"استيراد"},{"key":"export","label_ar":"تصدير"}]', 12),
  ('users', 'المستخدمين', '/users', '[{"key":"view","label_ar":"عرض"},{"key":"create","label_ar":"إضافة"},{"key":"edit","label_ar":"تعديل"},{"key":"delete","label_ar":"حذف"},{"key":"manage_permissions","label_ar":"إدارة الصلاحيات"},{"key":"toggle_active","label_ar":"تفعيل/إيقاف"}]', 13),
  ('audit_log', 'سجل التدقيق', '/audit-log', '[{"key":"view","label_ar":"عرض"}]', 14),
  ('tv_settings', 'لوحة TV', '/tv-settings', '[{"key":"view","label_ar":"عرض"},{"key":"edit","label_ar":"تعديل"}]', 15),
  ('rtgs_settings', 'إعدادات RTGS', '/rtgs-settings', '[{"key":"view","label_ar":"عرض"},{"key":"edit","label_ar":"تعديل"}]', 16),
  ('change_password', 'كلمة المرور', '/change-password', '[{"key":"self_update","label_ar":"تعديل ذاتي"}]', 17)
ON CONFLICT (page_key) DO UPDATE SET
  page_label_ar = EXCLUDED.page_label_ar,
  page_path = EXCLUDED.page_path,
  actions = EXCLUDED.actions,
  sort_order = EXCLUDED.sort_order;
