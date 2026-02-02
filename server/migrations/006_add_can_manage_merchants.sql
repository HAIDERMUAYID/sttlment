-- صلاحية إدارة التجار للمستخدمين المخولين
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_merchants BOOLEAN DEFAULT false;
