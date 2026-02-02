-- إضافة حقل الصورة الشخصية للمستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- تحديث الفهارس إذا لزم الأمر
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
