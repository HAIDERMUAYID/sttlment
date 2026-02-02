-- نظام إدارة المهام والحضور - مخطط قاعدة البيانات الأولي

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'employee', 'viewer')),
    active BOOLEAN DEFAULT true,
    can_create_ad_hoc BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الفئات
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول قوالب المهام
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    default_points INTEGER,
    required_fields JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الجداول (Schedules)
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL, -- [0=الأحد, 1=الاثنين, ..., 6=السبت]
    due_time TIME NOT NULL, -- وقت الاستحقاق (بتوقيت بغداد)
    grace_minutes INTEGER DEFAULT 0,
    default_assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول المهام اليومية (المولدة من الجداول)
CREATE TABLE IF NOT EXISTS daily_tasks (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    task_date DATE NOT NULL,
    due_date_time TIMESTAMP WITH TIME ZONE NOT NULL, -- UTC
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled', 'skipped')),
    cancelled_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, task_date) -- منع التكرار لنفس الجدول في نفس اليوم
);

-- جدول المهام الخاصة (Ad-hoc)
CREATE TABLE IF NOT EXISTS ad_hoc_tasks (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'skipped')),
    cancelled_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تنفيذ المهام
CREATE TABLE IF NOT EXISTS task_executions (
    id SERIAL PRIMARY KEY,
    daily_task_id INTEGER REFERENCES daily_tasks(id) ON DELETE CASCADE,
    ad_hoc_task_id INTEGER REFERENCES ad_hoc_tasks(id) ON DELETE CASCADE,
    done_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    done_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result_status VARCHAR(50) NOT NULL CHECK (result_status IN ('completed', 'completed_late', 'skipped', 'cancelled')),
    notes TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_task_reference CHECK (
        (daily_task_id IS NOT NULL AND ad_hoc_task_id IS NULL) OR
        (daily_task_id IS NULL AND ad_hoc_task_id IS NOT NULL)
    )
);

-- جدول المرفقات (اختياري)
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    task_execution_id INTEGER REFERENCES task_executions(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الحضور
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    first_login_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date) -- منع التكرار لنفس المستخدم في نفس اليوم
);

-- جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_assigned ON daily_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_done_by ON task_executions(done_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_done_at ON task_executions(done_at);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(active);
CREATE INDEX IF NOT EXISTS idx_ad_hoc_tasks_status ON ad_hoc_tasks(status);