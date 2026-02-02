# 📚 التوثيق الشامل والمفصل - نظام إدارة المهام والحضور

## 📋 جدول المحتويات

1. [نظرة عامة على النظام](#نظرة-عامة-على-النظام)
2. [البنية المعمارية](#البنية-المعمارية)
3. [قاعدة البيانات](#قاعدة-البيانات)
4. [واجهات برمجة التطبيقات (API)](#واجهات-برمجة-التطبيقات-api)
5. [الواجهة الأمامية (Frontend)](#الواجهة-الأمامية-frontend)
6. [الخادم الخلفي (Backend)](#الخادم-الخلفي-backend)
7. [لوحة التحكم التلفزيونية (TV Dashboard)](#لوحة-التحكم-التلفزيونية-tv-dashboard)
8. [الميزات المتقدمة](#الميزات-المتقدمة)
9. [الأمان والحماية](#الأمان-والحماية)
10. [دليل النشر](#دليل-النشر)
11. [دليل التطوير](#دليل-التطوير)
12. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة على النظام

### الوصف
نظام شامل ومتقدم لإدارة المهام المجدولة والخاصة، تتبع الحضور، والتقارير التحليلية مع لوحة تحكم تلفزيونية احترافية. تم تصميمه خصيصاً لقسم التسويات والمطابقة في شركة الصاقي للدفع الإلكتروني.

### الهدف الرئيسي
إدارة فعالة ومنظمة لجميع المهام اليومية والأسبوعية والشهرية، مع تتبع دقيق للأداء والحضور، وعرض احترافي للإحصائيات على شاشات كبيرة.

### التقنيات المستخدمة

#### Frontend
- **React 18.2.0**: مكتبة JavaScript لبناء واجهات المستخدم
- **TypeScript**: للكتابة الآمنة والموثوقة
- **Tailwind CSS 3.4.1**: إطار عمل CSS للتصميم السريع والاحترافي
- **Framer Motion 10.16.16**: مكتبة متقدمة للرسوم المتحركة
- **Zustand 4.4.7**: إدارة الحالة الخفيفة والسريعة
- **TanStack Query 5.17.0**: إدارة حالة الخادم والبيانات
- **React Router 6.20.0**: التوجيه والتنقل بين الصفحات
- **Shadcn/ui + Radix UI**: مكونات واجهة المستخدم الاحترافية
- **Lucide React**: مكتبة الأيقونات الحديثة
- **Moment.js + Moment Timezone**: معالجة التواريخ والأوقات
- **Axios**: طلبات HTTP
- **Recharts**: الرسوم البيانية والإحصائيات

#### Backend
- **Node.js**: بيئة تشغيل JavaScript
- **Express 4.18.2**: إطار عمل الويب
- **PostgreSQL**: قاعدة البيانات العلائقية
- **JWT (jsonwebtoken)**: المصادقة والتفويض
- **Bcryptjs**: تشفير كلمات المرور
- **Multer**: رفع الملفات
- **Node-cron**: المهام المجدولة
- **Moment-timezone**: معالجة التواريخ والأوقات
- **ExcelJS**: تصدير ملفات Excel
- **PDFKit**: تصدير ملفات PDF
- **WebSocket (ws)**: الاتصال الفوري
- **Helmet**: أمان HTTP headers
- **Express-rate-limit**: تحديد معدل الطلبات
- **Zod**: التحقق من صحة البيانات

---

## 🏗️ البنية المعمارية

### الهيكل العام للمشروع

```
sttlment/
├── client/                    # الواجهة الأمامية (React)
│   ├── public/                # الملفات العامة
│   │   ├── index.html
│   │   ├── manifest.json      # PWA manifest
│   │   └── service-worker.js  # Service Worker
│   ├── src/
│   │   ├── components/        # المكونات القابلة لإعادة الاستخدام
│   │   │   ├── ui/            # مكونات واجهة المستخدم الأساسية
│   │   │   │   ├── button.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── ...
│   │   │   └── layout/         # مكونات التخطيط
│   │   │       ├── sidebar.tsx
│   │   │       ├── header.tsx
│   │   │       └── realtime-indicator.tsx
│   │   ├── pages/             # صفحات التطبيق
│   │   │   ├── admin/         # صفحات المدير
│   │   │   ├── supervisor/   # صفحات المشرف
│   │   │   ├── employee/      # صفحات الموظف
│   │   │   ├── dashboard-v2.tsx
│   │   │   ├── tasks-v2.tsx
│   │   │   ├── login-v2.tsx
│   │   │   ├── tv-dashboard-premium.tsx  # لوحة التحكم التلفزيونية
│   │   │   └── ...
│   │   ├── hooks/             # React Hooks مخصصة
│   │   │   ├── use-toast.ts
│   │   │   ├── use-websocket.ts
│   │   │   └── ...
│   │   ├── store/             # Zustand stores
│   │   │   └── useAuthStore.ts
│   │   ├── lib/               # المكتبات والأدوات
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── services/          # خدمات API
│   │   │   └── api.js
│   │   ├── App.tsx            # المكون الرئيسي
│   │   ├── index.tsx          # نقطة الدخول
│   │   └── index.css           # الأنماط العامة
│   ├── package.json
│   └── tsconfig.json
│
├── server/                     # الخادم الخلفي (Node.js/Express)
│   ├── index.js               # نقطة البداية
│   ├── config/
│   │   ├── database.js        # إعدادات قاعدة البيانات
│   │   └── .env               # متغيرات البيئة
│   ├── controllers/           # منطق الأعمال
│   │   ├── authController.js
│   │   ├── usersController.js
│   │   ├── tasksController.js
│   │   ├── tvDashboardController.js
│   │   └── ...
│   ├── routes/                # مسارات API
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── tasks.js
│   │   ├── tvDashboard.js
│   │   └── ...
│   ├── middleware/           # Middleware
│   │   ├── auth.js           # المصادقة والتفويض
│   │   ├── upload.js         # رفع الملفات
│   │   ├── rateLimiter.js    # تحديد معدل الطلبات
│   │   └── validator.js      # التحقق من البيانات
│   ├── migrations/           # هجرات قاعدة البيانات
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_avatar_to_users.sql
│   │   ├── runMigrations.js
│   │   └── seed.js           # البيانات التجريبية
│   ├── cron/                 # المهام المجدولة
│   │   ├── generateDailyTasks.js
│   │   └── checkOverdueTasks.js
│   ├── utils/                # أدوات مساعدة
│   │   ├── timezone.js
│   │   └── logger.js
│   └── uploads/              # الملفات المرفوعة
│       └── avatars/          # الصور الشخصية
│
├── .env                       # متغيرات البيئة الرئيسية
├── package.json
└── README.md
```

### تدفق البيانات

1. **المستخدم** → يفتح التطبيق في المتصفح
2. **Frontend (React)** → يرسل طلبات HTTP إلى Backend
3. **Backend (Express)** → يتعامل مع الطلبات، يتحقق من المصادقة
4. **Database (PostgreSQL)** → يتم استعلام البيانات أو تحديثها
5. **Backend** → يُرجع البيانات إلى Frontend
6. **Frontend** → يعرض البيانات للمستخدم
7. **WebSocket** → يرسل تحديثات فورية عند حدوث تغييرات

---

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

#### 1. `users` - المستخدمون
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'employee', 'viewer')),
    active BOOLEAN DEFAULT true,
    can_create_ad_hoc BOOLEAN DEFAULT false,
    avatar_url VARCHAR(500),  -- الصورة الشخصية
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الأدوار:**
- `admin`: مدير القسم - صلاحيات كاملة
- `supervisor`: مساعد المدير - إدارة الكتالوج والجداول
- `employee`: موظف - تنفيذ المهام
- `viewer`: عارض - عرض فقط

#### 2. `categories` - الفئات
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الاستخدام:** تصنيف المهام (مثل: تسويات البنوك، مطابقة التحصيلات)

#### 3. `task_templates` - قوالب المهام
```sql
CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    default_points INTEGER,
    required_fields JSONB,  -- الحقول المطلوبة (JSON)
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الاستخدام:** قوالب قابلة لإعادة الاستخدام لإنشاء المهام

#### 4. `schedules` - الجداول الزمنية
```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL,  -- [0=الأحد, 1=الاثنين, ..., 6=السبت]
    due_time TIME NOT NULL,  -- وقت الاستحقاق (بتوقيت بغداد)
    grace_minutes INTEGER DEFAULT 0,  -- دقائق السماح
    default_assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الأنواع:**
- **يومية**: أيام أسبوع محددة (مثل: الاثنين-الجمعة)
- **أسبوعية**: يوم واحد من الأسبوع (مثل: كل أحد)
- **شهرية**: يوم محدد من الشهر (مثل: يوم 1 من كل شهر)

#### 5. `daily_tasks` - المهام اليومية
```sql
CREATE TABLE daily_tasks (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
    template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    task_date DATE NOT NULL,
    due_date_time TIMESTAMP WITH TIME ZONE NOT NULL,  -- UTC
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled', 'skipped')),
    cancelled_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, task_date)  -- منع التكرار
);
```

**الحالات:**
- `pending`: قيد الانتظار
- `completed`: مكتملة
- `overdue`: متأخرة
- `cancelled`: ملغاة
- `skipped`: تم تخطيها

#### 6. `ad_hoc_tasks` - المهام الخاصة
```sql
CREATE TABLE ad_hoc_tasks (
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
    beneficiary VARCHAR(255),  -- المستفيد (للمهام غير المخصصة)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الفرق عن المهام المجدولة:**
- لا تُولد تلقائياً
- يمكن إنشاؤها يدوياً من قبل المستخدمين المصرح لهم
- قد لا تكون مخصصة لشخص محدد (`beneficiary` بدلاً من `assigned_to_user_id`)

#### 7. `task_executions` - تنفيذ المهام
```sql
CREATE TABLE task_executions (
    id SERIAL PRIMARY KEY,
    daily_task_id INTEGER REFERENCES daily_tasks(id) ON DELETE CASCADE,
    ad_hoc_task_id INTEGER REFERENCES ad_hoc_tasks(id) ON DELETE CASCADE,
    done_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    on_behalf_of_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- تنفيذ بالنيابة
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
```

**حالات النتيجة:**
- `completed`: مكتملة في الوقت
- `completed_late`: مكتملة متأخرة
- `skipped`: تم تخطيها
- `cancelled`: ملغاة

**ميزة "على النيابة":**
- `on_behalf_of_user_id`: يُستخدم عندما ينفذ موظف مهمة مخصصة لموظف آخر
- يُستخدم فقط للمهام المجدولة (`daily_tasks`)
- لا يُستخدم للمهام الخاصة (`ad_hoc_tasks`)

#### 8. `attachments` - المرفقات
```sql
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    task_execution_id INTEGER REFERENCES task_executions(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 9. `attendance` - الحضور
```sql
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    first_login_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)  -- منع التكرار
);
```

**آلية العمل:**
- يُسجل تلقائياً عند أول تسجيل دخول يومي
- `first_login_at`: وقت أول تسجيل دخول في اليوم

#### 10. `audit_log` - سجل التدقيق
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details JSONB,  -- تفاصيل إضافية (JSON)
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**الاستخدام:** تتبع جميع الإجراءات المهمة في النظام

#### 11. `settings` - الإعدادات
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,  -- القيمة (JSON)
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
```

**مثال:** إعدادات لوحة التحكم التلفزيونية (`tv_dashboard`)

### الفهارس (Indexes)

```sql
-- فهارس للأداء
CREATE INDEX idx_daily_tasks_date ON daily_tasks(task_date);
CREATE INDEX idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX idx_daily_tasks_assigned ON daily_tasks(assigned_to_user_id);
CREATE INDEX idx_task_executions_done_by ON task_executions(done_by_user_id);
CREATE INDEX idx_task_executions_done_at ON task_executions(done_at);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_schedules_active ON schedules(active);
CREATE INDEX idx_ad_hoc_tasks_status ON ad_hoc_tasks(status);
CREATE INDEX idx_users_active ON users(active);
```

---

## 🔌 واجهات برمجة التطبيقات (API)

### Base URL
- **Development**: `http://localhost:5001/api`
- **Production**: `https://your-domain.com/api`

### المصادقة (Authentication)

جميع الطلبات (عدا `/auth/login` و `/tv-dashboard`) تتطلب توكن JWT في Header:
```
Authorization: Bearer <token>
```

### المسارات (Routes)

#### 1. المصادقة (`/api/auth`)

##### `POST /api/auth/login`
تسجيل الدخول

**Request Body:**
```json
{
  "email": "admin@alsaqi.com",
  "password": "123456"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "مدير النظام",
    "email": "admin@alsaqi.com",
    "role": "admin",
    "can_create_ad_hoc": true,
    "avatarUrl": "/uploads/avatars/1_1234567890.jpg"
  }
}
```

**Errors:**
- `400`: بيانات غير صحيحة
- `401`: البريد الإلكتروني أو كلمة المرور غير صحيحة
- `429`: عدد محاولات تسجيل الدخول تجاوز الحد المسموح

##### `GET /api/auth/verify`
التحقق من صحة التوكن

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "مدير النظام",
    "email": "admin@alsaqi.com",
    "role": "admin",
    "avatarUrl": "/uploads/avatars/1_1234567890.jpg"
  }
}
```

##### `POST /api/auth/change-password`
تغيير كلمة المرور

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "123456",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "تم تغيير كلمة المرور بنجاح"
}
```

#### 2. المستخدمون (`/api/users`)

##### `GET /api/users`
جلب قائمة المستخدمين

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optional): تصفية حسب الدور
- `active` (optional): تصفية حسب الحالة (true/false)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "مدير النظام",
    "email": "admin@alsaqi.com",
    "role": "admin",
    "active": true,
    "can_create_ad_hoc": true,
    "avatar_url": "/uploads/avatars/1_1234567890.jpg",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

**الصلاحيات:** `admin`, `supervisor`

##### `GET /api/users/:id`
جلب مستخدم محدد

**الصلاحيات:** `admin`, `supervisor`

##### `POST /api/users`
إنشاء مستخدم جديد

**الصلاحيات:** `admin` فقط

**Request Body:**
```json
{
  "name": "موظف جديد",
  "email": "newemployee@alsaqi.com",
  "password": "123456",
  "role": "employee",
  "can_create_ad_hoc": false
}
```

##### `PUT /api/users/:id`
تحديث مستخدم

**الصلاحيات:** `admin` فقط

##### `PATCH /api/users/:id/toggle-active`
تفعيل/تعطيل مستخدم

**الصلاحيات:** `admin` فقط

##### `POST /api/users/avatar`
رفع الصورة الشخصية

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```
avatar: <file>
```

**Response (200 OK):**
```json
{
  "message": "تم رفع الصورة بنجاح",
  "avatarUrl": "/uploads/avatars/1_1234567890.jpg"
}
```

##### `DELETE /api/users/avatar`
حذف الصورة الشخصية

**Headers:**
```
Authorization: Bearer <token>
```

#### 3. المهام (`/api/tasks`)

##### `GET /api/tasks/daily`
جلب المهام اليومية

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (optional): التاريخ (YYYY-MM-DD)، افتراضي: اليوم
- `status` (optional): الحالة (pending, completed, overdue)
- `assignedTo` (optional): معرف المستخدم المخصص له

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "schedule_id": 1,
    "template_id": 1,
    "assigned_to_user_id": 2,
    "assigned_to_name": "موظف 1",
    "task_date": "2024-01-15",
    "due_date_time": "2024-01-15T10:00:00.000Z",
    "due_time": "10:00",
    "status": "pending",
    "template": {
      "id": 1,
      "title": "تسويات مصرف الرشيد",
      "category": {
        "id": 1,
        "name": "تسويات البنوك"
      }
    }
  }
]
```

##### `GET /api/tasks/ad-hoc`
جلب المهام الخاصة

**Query Parameters:**
- `status` (optional): الحالة
- `assignedTo` (optional): معرف المستخدم
- `createdBy` (optional): معرف منشئ المهمة

##### `GET /api/tasks/search`
البحث في المهام

**Query Parameters:**
- `q` (required): نص البحث
- `type` (optional): نوع المهمة (daily, ad-hoc, all)

##### `POST /api/tasks/ad-hoc`
إنشاء مهمة خاصة

**Request Body:**
```json
{
  "template_id": 1,
  "category_id": 1,
  "assigned_to_user_id": 2,
  "title": "مهمة خاصة",
  "description": "وصف المهمة",
  "due_date_time": "2024-01-20T10:00:00.000Z"
}
```

**الصلاحيات:** `admin`, `supervisor`, `employee` (إذا كان `can_create_ad_hoc = true`)

##### `POST /api/tasks/execute`
تنفيذ مهمة

**Request Body:**
```json
{
  "daily_task_id": 1,
  "result_status": "completed",
  "notes": "تم التنفيذ بنجاح",
  "duration_minutes": 30,
  "on_behalf_of_user_id": null
}
```

**ملاحظات:**
- `on_behalf_of_user_id`: يُستخدم فقط للمهام المجدولة (`daily_task_id`)
- لا يُستخدم للمهام الخاصة (`ad_hoc_task_id`)

##### `GET /api/tasks/executions`
جلب سجل تنفيذ المهام

**Query Parameters:**
- `dateFrom` (optional): تاريخ البداية
- `dateTo` (optional): تاريخ النهاية
- `doneBy` (optional): معرف المستخدم المنفذ

##### `POST /api/tasks/executions/:id/attachments`
إضافة مرفق لتنفيذ مهمة

**Headers:**
```
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```
file: <file>
```

##### `POST /api/tasks/generate-daily`
توليد المهام اليومية يدوياً

**الصلاحيات:** `admin`, `supervisor`

**Query Parameters:**
- `date` (optional): التاريخ (YYYY-MM-DD)، افتراضي: اليوم

#### 4. القوالب (`/api/templates`)

##### `GET /api/templates`
جلب جميع القوالب

##### `GET /api/templates/:id`
جلب قالب محدد

##### `POST /api/templates`
إنشاء قالب جديد

**الصلاحيات:** `admin`, `supervisor`

##### `PUT /api/templates/:id`
تحديث قالب

**الصلاحيات:** `admin`, `supervisor`

##### `DELETE /api/templates/:id`
حذف قالب

**الصلاحيات:** `admin`, `supervisor`

#### 5. الجداول (`/api/schedules`)

##### `GET /api/schedules`
جلب جميع الجداول

##### `GET /api/schedules/:id`
جلب جدول محدد

##### `POST /api/schedules`
إنشاء جدول جديد

**الصلاحيات:** `admin`, `supervisor`

**Request Body:**
```json
{
  "template_id": 1,
  "days_of_week": [1, 2, 3, 4, 5],
  "due_time": "10:00",
  "grace_minutes": 15,
  "default_assignee_user_id": 2
}
```

##### `PUT /api/schedules/:id`
تحديث جدول

**الصلاحيات:** `admin`, `supervisor`

##### `DELETE /api/schedules/:id`
حذف جدول

**الصلاحيات:** `admin`, `supervisor`

#### 6. الفئات (`/api/categories`)

##### `GET /api/categories`
جلب جميع الفئات

##### `POST /api/categories`
إنشاء فئة جديدة

**الصلاحيات:** `admin`, `supervisor`

##### `PUT /api/categories/:id`
تحديث فئة

**الصلاحيات:** `admin`, `supervisor`

##### `DELETE /api/categories/:id`
حذف فئة

**الصلاحيات:** `admin`, `supervisor`

#### 7. التقارير (`/api/reports`)

##### `GET /api/reports/daily`
التقرير اليومي

**Query Parameters:**
- `date` (optional): التاريخ (YYYY-MM-DD)

**الصلاحيات:** `admin`, `supervisor`

##### `GET /api/reports/monthly`
التقرير الشهري

**Query Parameters:**
- `month` (optional): الشهر (YYYY-MM)

**الصلاحيات:** `admin`, `supervisor`

##### `GET /api/reports/coverage`
تقرير التغطية

**Query Parameters:**
- `dateFrom` (required): تاريخ البداية
- `dateTo` (required): تاريخ النهاية

**الصلاحيات:** `admin`, `supervisor`

##### `GET /api/reports/export`
تصدير Excel

**Query Parameters:**
- `type` (required): نوع التقرير (daily, monthly, coverage)
- `date` / `month` / `dateFrom` / `dateTo`: حسب نوع التقرير

**Response:** ملف Excel (`.xlsx`)

##### `GET /api/reports/export-pdf`
تصدير PDF

**نفس معاملات `/export`**

**Response:** ملف PDF (`.pdf`)

#### 8. الحضور (`/api/attendance`)

##### `GET /api/attendance`
جلب سجل الحضور

**Query Parameters:**
- `dateFrom` (optional): تاريخ البداية
- `dateTo` (optional): تاريخ النهاية
- `userId` (optional): معرف المستخدم

##### `GET /api/attendance/stats`
إحصائيات الحضور

**الصلاحيات:** `admin`, `supervisor`

#### 9. لوحة التحكم التلفزيونية (`/api/tv-dashboard`)

##### `GET /api/tv-dashboard`
جلب بيانات لوحة التحكم

**Query Parameters:**
- `visitorMode` (optional): وضع الزائر (true/false)

**Response (200 OK):**
```json
{
  "settings": {
    "slideInterval": 10,
    "autoRefresh": true,
    "refreshInterval": 30,
    "visitorMode": false
  },
  "slides": [
    {
      "type": "opening",
      "title": "قسم التسويات والمطابقة",
      "subtitle": "شركة الصاقي للدفع الإلكتروني",
      "date": "2024-01-15",
      "time": "10:30:00"
    },
    {
      "type": "overview",
      "date": "2024-01-15",
      "scheduled": 25,
      "done": 20,
      "overdue": 2,
      "pending": 3,
      "late": 1
    },
    {
      "type": "employee",
      "employee": {
        "id": 2,
        "name": "موظف 1",
        "avatarUrl": "/uploads/avatars/2_1234567890.jpg",
        "role": "employee"
      },
      "daily": {
        "tasksDone": 5,
        "onTime": 4,
        "late": 1,
        "coverage": 2,
        "attendance": {
          "present": true,
          "loginTime": "08:30"
        }
      },
      "monthly": {
        "tasksDone": 120,
        "onTime": 110,
        "late": 10,
        "coverage": 15,
        "attendance": {
          "daysPresent": 22,
          "month": "يناير 2024"
        }
      }
    },
    {
      "type": "overdue",
      "tasks": [
        {
          "id": 1,
          "title": "تسويات مصرف الرشيد",
          "assignedTo": "موظف 1",
          "dueTime": "10:00"
        }
      ]
    },
    {
      "type": "coverage",
      "coverage": [
        {
          "name": "موظف 1",
          "count": 5
        }
      ]
    },
    {
      "type": "attendance",
      "date": "2024-01-15",
      "present": 4,
      "records": [
        {
          "name": "موظف 1",
          "time": "08:30"
        }
      ]
    },
    {
      "type": "categories",
      "date": "2024-01-15",
      "categories": [
        {
          "name": "تسويات البنوك",
          "count": 10
        }
      ]
    },
    {
      "type": "trends",
      "week": [
        {
          "date": "2024-01-08",
          "total": 20,
          "completed": 18
        }
      ]
    },
    {
      "type": "recognition",
      "topPerformers": [
        {
          "name": "موظف 1",
          "tasks": 25,
          "onTime": 24
        }
      ]
    }
  ]
}
```

**ملاحظات:**
- لا يتطلب مصادقة (يمكن الوصول بدون توكن)
- في وضع الزائر (`visitorMode=true`): يتم إخفاء الأسماء والصور

##### `GET /api/tv-dashboard/settings`
جلب إعدادات لوحة التحكم

**الصلاحيات:** `admin` فقط

##### `PUT /api/tv-dashboard/settings`
تحديث إعدادات لوحة التحكم

**الصلاحيات:** `admin` فقط

**Request Body:**
```json
{
  "slideInterval": 15,
  "autoRefresh": true,
  "refreshInterval": 60,
  "visitorMode": false
}
```

#### 10. سجل التدقيق (`/api/audit-log`)

##### `GET /api/audit-log`
جلب سجل التدقيق

**Query Parameters:**
- `dateFrom` (optional): تاريخ البداية
- `dateTo` (optional): تاريخ النهاية
- `userId` (optional): معرف المستخدم
- `action` (optional): نوع الإجراء

**الصلاحيات:** `admin` فقط

---

## 🎨 الواجهة الأمامية (Frontend)

### البنية

#### المكونات (Components)

##### مكونات UI الأساسية (`/components/ui/`)

**`button.tsx`**
- مكون زر قابل لإعادة الاستخدام
- متغيرات: `default`, `destructive`, `outline`, `ghost`, `link`
- أحجام: `sm`, `md`, `lg`, `xl`

**`badge.tsx`**
- شارات الحالة
- متغيرات: `default`, `success`, `warning`, `info`, `destructive`

**`avatar.tsx`**
- عرض الصور الشخصية أو الأحرف الأولى
- أحجام: `sm`, `md`, `lg`, `xl`
- معالجة أخطاء تحميل الصور

**`toast.tsx`**
- إشعارات منبثقة
- متغيرات: `success`, `error`, `warning`, `info`

##### مكونات التخطيط (`/components/layout/`)

**`sidebar.tsx`**
- القائمة الجانبية الرئيسية
- يعرض الصورة الشخصية للمستخدم الحالي
- تنقل بين الصفحات

**`realtime-indicator.tsx`**
- مؤشر حالة الاتصال WebSocket
- يعرض حالة الاتصال (متصل/غير متصل)

#### الصفحات (Pages)

##### صفحات المدير (`/pages/admin/`)

**`Users.js`**
- إدارة المستخدمين
- إنشاء، تحديث، حذف، تفعيل/تعطيل
- عرض الصور الشخصية

**`Reports.js`**
- عرض التقارير
- تصدير Excel/PDF

**`TVSettings.js`**
- إعدادات لوحة التحكم التلفزيونية
- تكوين فترات الشرائح والتحديث التلقائي

**`AuditLog.js`**
- عرض سجل التدقيق
- تصفية حسب التاريخ، المستخدم، الإجراء

##### صفحات المشرف (`/pages/supervisor/`)

**`Categories.js`**
- إدارة الفئات
- إنشاء، تحديث، حذف

**`Templates.js`**
- إدارة قوالب المهام
- إنشاء، تحديث، حذف

**`Schedules.js`**
- إدارة الجداول الزمنية
- إنشاء، تحديث، حذف

##### صفحات الموظف (`/pages/employee/`)

**`Tasks.js`**
- عرض المهام اليومية والخاصة
- تنفيذ المهام
- البحث والتصفية
- تنفيذ "على النيابة" للمهام المجدولة

##### الصفحات المشتركة

**`dashboard-v2.tsx`**
- لوحة التحكم الرئيسية
- إحصائيات سريعة
- بطاقات الحالة

**`tasks-v2.tsx`**
- عرض جميع المهام
- البحث والتصفية المتقدمة
- تنفيذ المهام

**`schedules-v2.tsx`**
- عرض الجداول الزمنية
- البحث والتصفية

**`templates-v2.tsx`**
- عرض القوالب
- البحث والتصفية

**`categories-v2.tsx`**
- عرض الفئات
- البحث والتصفية

**`reports-v2.tsx`**
- عرض التقارير
- تصدير Excel/PDF

**`attendance-v2.tsx`**
- عرض سجل الحضور
- تقويم الحضور

**`change-password-v2.tsx`**
- تغيير كلمة المرور
- رفع/حذف الصورة الشخصية

**`login-v2.tsx`**
- تسجيل الدخول
- تصميم احترافي

**`tv-dashboard-premium.tsx`** ⭐
- لوحة التحكم التلفزيونية الاحترافية
- عرض الشرائح بشكل "story-style"
- شرائح مخصصة لكل موظف
- إحصائيات يومية وشهرية
- عرض الصور الشخصية
- ألوان رسمية

### إدارة الحالة (State Management)

#### Zustand Store (`/store/useAuthStore.ts`)

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'employee';
  can_create_ad_hoc?: boolean;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

### React Hooks المخصصة

#### `useToast`
إدارة الإشعارات المنبثقة

#### `useWebSocket`
الاتصال WebSocket للتحديثات الفورية

#### `useDebounce`
تأخير البحث والتصفية

### التوجيه (Routing)

**`App.tsx`**
```typescript
<Route path="/" element={<DashboardV2 />} />
<Route path="/login" element={<LoginV2 />} />
<Route path="/tasks" element={<TasksV2 />} />
<Route path="/schedules" element={<SchedulesV2 />} />
<Route path="/templates" element={<TemplatesV2 />} />
<Route path="/categories" element={<CategoriesV2 />} />
<Route path="/reports" element={<ReportsV2 />} />
<Route path="/attendance" element={<AttendanceV2 />} />
<Route path="/change-password" element={<ChangePasswordV2 />} />
<Route path="/users" element={<UsersV2 />} />
<Route path="/audit-log" element={<AuditLogV2 />} />
<Route path="/tv-settings" element={<TVSettingsV2 />} />
<Route path="/tv" element={<TVDashboardPremium />} />
```

### التصميم والألوان

#### نظام الألوان (Dark Professional Theme)

```css
/* الألوان الأساسية */
--background: #0f172a;        /* خلفية داكنة */
--foreground: #f1f5f9;         /* نص فاتح */
--card: #1e293b;               /* بطاقات داكنة */
--card-foreground: #f1f5f9;
--primary: #3b82f6;            /* أزرق رسمي */
--primary-foreground: #ffffff;
--secondary: #475569;
--accent: #3b82f6;
--destructive: #ef4444;        /* أحمر للخطأ */
--success: #10b981;            /* أخضر للنجاح */
--warning: #f59e0b;            /* برتقالي للتحذير */
```

#### Tailwind CSS

- استخدام Tailwind CSS 3.4.1
- مكونات مخصصة باستخدام `@layer`
- تصميم متجاوب (Responsive)

---

## ⚙️ الخادم الخلفي (Backend)

### البنية

#### Controllers (`/controllers/`)

**`authController.js`**
- `login`: تسجيل الدخول
- `verifyToken`: التحقق من التوكن
- `changePassword`: تغيير كلمة المرور

**`usersController.js`**
- `getUsers`: جلب المستخدمين
- `getUser`: جلب مستخدم محدد
- `createUser`: إنشاء مستخدم
- `updateUser`: تحديث مستخدم
- `toggleUserActive`: تفعيل/تعطيل
- `uploadAvatar`: رفع الصورة الشخصية
- `deleteAvatar`: حذف الصورة الشخصية

**`tasksController.js`**
- `getDailyTasks`: جلب المهام اليومية
- `getAdHocTasks`: جلب المهام الخاصة
- `searchTasks`: البحث في المهام
- `createAdHocTask`: إنشاء مهمة خاصة
- `executeTask`: تنفيذ مهمة
- `getExecutions`: جلب سجل التنفيذ
- `addAttachment`: إضافة مرفق
- `generateDailyTasks`: توليد المهام اليومية

**`tvDashboardController.js`**
- `getDashboardData`: جلب بيانات لوحة التحكم
- `getDashboardSettings`: جلب الإعدادات
- `updateDashboardSettings`: تحديث الإعدادات

#### Middleware (`/middleware/`)

**`auth.js`**
- `authenticate`: التحقق من التوكن JWT
- `authorize`: التحقق من الصلاحيات

**`upload.js`**
- إعداد Multer لرفع الملفات
- فلترة الملفات (صور فقط)
- حد الحجم: 5MB

**`rateLimiter.js`**
- `apiLimiter`: تحديد معدل الطلبات العامة
- `authLimiter`: تحديد معدل تسجيل الدخول
- `taskExecutionLimiter`: تحديد معدل تنفيذ المهام

**`validator.js`**
- التحقق من صحة البيانات باستخدام Zod

#### Routes (`/routes/`)

جميع المسارات تستخدم:
- `express.Router()`
- Middleware المصادقة والتفويض
- Rate limiting
- معالجة الأخطاء

#### Cron Jobs (`/cron/`)

**`generateDailyTasks.js`**
- يُشغل تلقائياً كل يوم الساعة 1:00 ص UTC (4:00 ص بتوقيت بغداد)
- يولد المهام اليومية من الجداول النشطة

**`checkOverdueTasks.js`**
- يُشغل كل 15 دقيقة
- يتحقق من المهام المتأخرة ويحدث حالتها

### WebSocket Server

**`server/index.js`**
```javascript
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // إرسال تحديثات فورية عند:
  // - تنفيذ مهمة
  // - إنشاء مهمة
  // - تحديث جدول
});
```

### معالجة الأخطاء

- Global error handler
- Custom logger
- Request logger

---

## 📺 لوحة التحكم التلفزيونية (TV Dashboard)

### الميزات الرئيسية

#### 1. الشريحة الافتتاحية (Opening Slide)
- عنوان القسم
- اسم الشركة
- التاريخ والوقت الحالي (بتوقيت بغداد)
- تصميم احترافي مع رسوم متحركة

#### 2. نظرة عامة (Overview Slide)
- إحصائيات اليوم:
  - المهام المجدولة
  - المهام المكتملة
  - المهام المتأخرة
  - المهام قيد الانتظار
- نسبة الإنجاز (دائرة تقدم)

#### 3. شرائح الموظفين (Employee Slides) ⭐
**شريحة مخصصة لكل موظف نشط:**

**الإحصائيات اليومية:**
- عدد المهام المنجزة
- عدد المهام في الوقت
- عدد المهام المتأخرة
- التغطية (عدد المهام المنفذة بالنيابة)
- حالة الحضور (حاضر/غير حاضر)
- وقت تسجيل الدخول

**الإحصائيات الشهرية:**
- عدد المهام المنجزة في الشهر
- عدد المهام في الوقت
- عدد المهام المتأخرة
- التغطية الشهرية
- عدد أيام الحضور
- اسم الشهر

**العرض:**
- الصورة الشخصية (أو الأحرف الأولى)
- الاسم والدور
- تصميم "story-style" احترافي

#### 4. المهام المتأخرة (Overdue Slide)
- قائمة المهام المتأخرة
- اسم المهمة
- المخصص له
- وقت الاستحقاق

#### 5. التغطية (Coverage Slide)
- من قام بمهام الآخرين
- ترتيب حسب عدد المهام
- عرض احترافي مع رتب

#### 6. الحضور (Attendance Slide)
- عدد الموظفين الحاضرين اليوم
- قائمة الموظفين الحاضرين
- وقت تسجيل الدخول لكل موظف

#### 7. توزيع الفئات (Categories Slide)
- توزيع المهام حسب الفئات
- عدد المهام لكل فئة
- نسبة مئوية
- أشرطة تقدم

#### 8. الاتجاهات الأسبوعية (Trends Slide)
- رسم بياني أسبوعي
- عدد المهام الكلية والمكتملة لكل يوم
- نسبة الإنجاز

#### 9. أفضل الأداء (Recognition Slide)
- أفضل الموظفين أداءً
- عدد المهام المنجزة
- عدد المهام في الوقت
- ميداليات للثلاثة الأوائل

### الميزات التقنية

#### التصميم
- **ألوان رسمية**: أزرق داكن، رمادي داكن، أسود
- **Story-style**: تصميم يشبه القصص على وسائل التواصل
- **Framer Motion**: رسوم متحركة سلسة واحترافية
- **Responsive**: يعمل على جميع أحجام الشاشات

#### التنقل
- **تلقائي**: تغيير الشرائح تلقائياً حسب الإعدادات
- **يدوي**: استخدام الأسهم (← →) أو (↑ ↓)
- **مؤشرات**: نقاط في الأسفل للتنقل المباشر
- **عداد**: عرض رقم الشريحة الحالية

#### التحديث
- **تلقائي**: تحديث البيانات تلقائياً حسب الإعدادات
- **يدوي**: إعادة تحميل عند الضغط على "إعادة المحاولة" في حالة الخطأ

#### وضع الزائر
- **عادي**: عرض جميع البيانات
- **زائر**: إخفاء الأسماء والصور (للحماية)

### الإعدادات

**`/tv-settings`** (للمدير فقط):
- **فترة الشرائح**: عدد الثواني بين كل شريحة (افتراضي: 10 ثواني)
- **التحديث التلقائي**: تفعيل/تعطيل
- **فترة التحديث**: عدد الثواني بين كل تحديث (افتراضي: 30 ثانية)
- **وضع الزائر**: تفعيل/تعطيل

### الوصول

- **URL**: `/tv`
- **بدون مصادقة**: يمكن الوصول بدون تسجيل دخول
- **وضع الزائر**: `/tv?visitor=1`

---

## 🚀 الميزات المتقدمة

### 1. Real-time Updates (WebSocket)

#### الميزات
- تحديثات فورية عند تنفيذ المهام
- تحديثات فورية عند إنشاء المهام
- تحديثات فورية عند تحديث الجداول
- مؤشر حالة الاتصال

#### التطبيق
- **Backend**: WebSocket server في `server/index.js`
- **Frontend**: Hook `useWebSocket` في `client/src/hooks/use-websocket.ts`
- **Provider**: `RealtimeProvider` في `client/src/components/providers/RealtimeProvider.tsx`

### 2. PWA (Progressive Web App)

#### الميزات
- قابل للتثبيت على الأجهزة
- دعم Offline (جزئي)
- Service Worker
- Manifest

#### الملفات
- `client/public/manifest.json`
- `client/public/service-worker.js`

### 3. البحث والتصفية المتقدمة

#### الميزات
- بحث في جميع الحقول
- تصفية متعددة المعايير
- تصفية قابلة للطي
- شارات للفلاتر النشطة
- عدد النتائج

#### التطبيق
- صفحات: `schedules-v2.tsx`, `templates-v2.tsx`, `categories-v2.tsx`
- مكونات: `SearchableSelect`, `Badge`

### 4. الصور الشخصية

#### الميزات
- رفع الصورة الشخصية
- حذف الصورة الشخصية
- عرض الصورة في النظام
- الأحرف الأولى كبديل

#### التطبيق
- **Backend**: `POST /api/users/avatar`, `DELETE /api/users/avatar`
- **Frontend**: `Avatar` component, `change-password-v2.tsx`

### 5. تنفيذ "على النيابة"

#### الميزات
- تنفيذ مهمة مجدولة بالنيابة عن موظف آخر
- عرض واضح للمهمة المنفذة بالنيابة
- تتبع في سجل التنفيذ

#### التطبيق
- **Backend**: `on_behalf_of_user_id` في `task_executions`
- **Frontend**: خيار "تنفيذ بالنيابة" في `tasks-v2.tsx`

### 6. التقارير والتصدير

#### الميزات
- تقارير يومية
- تقارير شهرية
- تقارير التغطية
- تصدير Excel
- تصدير PDF

#### التطبيق
- **Backend**: `reportsController.js`, `ExcelJS`, `PDFKit`
- **Frontend**: `reports-v2.tsx`

---

## 🔒 الأمان والحماية

### 1. المصادقة والتفويض

#### JWT (JSON Web Tokens)
- **مدة الصلاحية**: 7 أيام (قابلة للتعديل)
- **التخزين**: `localStorage` في Frontend
- **التحقق**: Middleware `authenticate` في كل طلب

#### الصلاحيات (Role-Based Access Control)
- **Admin**: صلاحيات كاملة
- **Supervisor**: إدارة الكتالوج والجداول
- **Employee**: تنفيذ المهام فقط
- **Viewer**: عرض فقط

### 2. Rate Limiting

#### الحدود
- **API العامة**: 100 طلب/دقيقة
- **تسجيل الدخول**: 5 محاولات/15 دقيقة
- **تنفيذ المهام**: 50 طلب/دقيقة

#### التطبيق
- `express-rate-limit` في `middleware/rateLimiter.js`

### 3. Security Headers

#### Helmet
- حماية من XSS
- حماية من Clickjacking
- إزالة معلومات الخادم

#### التطبيق
- `helmet` في `server/index.js`

### 4. التحقق من البيانات

#### Zod
- التحقق من صحة البيانات المدخلة
- منع حقن SQL
- منع XSS

#### التطبيق
- `zod` في `middleware/validator.js`

### 5. تشفير كلمات المرور

#### Bcrypt
- تشفير كلمات المرور قبل الحفظ
- مقارنة آمنة عند تسجيل الدخول

#### التطبيق
- `bcryptjs` في `authController.js`

### 6. سجل التدقيق

#### Audit Log
- تتبع جميع الإجراءات المهمة
- حفظ IP address و User Agent
- تفاصيل JSON

#### التطبيق
- جدول `audit_log` في قاعدة البيانات
- Middleware لتسجيل الإجراءات

---

## 📦 دليل النشر

### النشر على Render

#### 1. إعداد قاعدة البيانات
1. أنشئ قاعدة بيانات PostgreSQL على Render
2. احفظ `DATABASE_URL` من إعدادات قاعدة البيانات

#### 2. إعداد Web Service
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  NODE_ENV=production
  PORT=10000
  DATABASE_URL=<your-database-url>
  JWT_SECRET=<strong-secret-key>
  JWT_EXPIRES_IN=7d
  TIMEZONE=Asia/Baghdad
  WS_URL=wss://your-domain.com
  ```

#### 3. إعداد Cron Jobs

##### أ) توليد المهام اليومية
- **Schedule**: `0 1 * * *` (كل يوم الساعة 1:00 ص UTC)
- **Command**: `node server/cron/generateDailyTasks.js`
- **Environment Variables**: نفس متغيرات Web Service

##### ب) فحص المهام المتأخرة
- **Schedule**: `*/15 * * * *` (كل 15 دقيقة)
- **Command**: `node server/cron/checkOverdueTasks.js`
- **Environment Variables**: نفس متغيرات Web Service

#### 4. تشغيل الهجرات
بعد النشر الأول، قم بتشغيل:
```bash
npm run migrate
npm run seed
```

### النشر على VPS

#### 1. إعداد الخادم
```bash
# تثبيت Node.js و PostgreSQL
sudo apt update
sudo apt install nodejs npm postgresql

# إنشاء قاعدة البيانات
sudo -u postgres createdb sttlment
```

#### 2. إعداد المشروع
```bash
# استنساخ المشروع
git clone <repository-url>
cd sttlment

# تثبيت التبعيات
npm install
cd client && npm install && cd ..

# إعداد .env
cp .env.example .env
# عدّل .env بإعدادات قاعدة البيانات

# تشغيل الهجرات
npm run migrate
npm run seed
```

#### 3. إعداد PM2
```bash
# تثبيت PM2
npm install -g pm2

# تشغيل التطبيق
pm2 start npm --name "sttlment" -- start

# حفظ الإعدادات
pm2 save
pm2 startup
```

#### 4. إعداد Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. إعداد SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🛠️ دليل التطوير

### إعداد البيئة المحلية

#### 1. المتطلبات
- Node.js 16+
- PostgreSQL 12+
- npm أو yarn

#### 2. تثبيت التبعيات
```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

#### 3. إعداد قاعدة البيانات
```bash
# إنشاء قاعدة البيانات
createdb sttlment

# إعداد .env
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/sttlment
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
TIMEZONE=Asia/Baghdad
WS_URL=ws://localhost:5001
```

#### 4. تشغيل الهجرات
```bash
npm run migrate
npm run seed
```

#### 5. تشغيل التطبيق
```bash
# تشغيل Backend و Frontend معاً
npm run dev

# أو بشكل منفصل:
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend
npm run client:dev
```

### هيكل الكود

#### Frontend
- **TypeScript**: للكتابة الآمنة
- **Components**: مكونات قابلة لإعادة الاستخدام
- **Hooks**: منطق قابل لإعادة الاستخدام
- **Store**: إدارة الحالة المركزية

#### Backend
- **MVC Pattern**: Controllers, Routes, Models
- **Middleware**: معالجة الطلبات
- **Utils**: أدوات مساعدة

### أفضل الممارسات

#### Frontend
- استخدام TypeScript للأنواع
- مكونات صغيرة وقابلة لإعادة الاستخدام
- معالجة الأخطاء بشكل صحيح
- تحسين الأداء (React.memo, useMemo, useCallback)

#### Backend
- التحقق من البيانات في كل طلب
- معالجة الأخطاء بشكل صحيح
- استخدام Transactions للعمليات المعقدة
- تسجيل الأخطاء

### الاختبار

#### اختبار يدوي
1. تسجيل الدخول كمدير
2. إنشاء مستخدم جديد
3. إنشاء فئة وقالب وجدول
4. التحقق من توليد المهام اليومية
5. تنفيذ مهمة
6. عرض التقارير
7. عرض لوحة التحكم التلفزيونية

---

## 🔧 استكشاف الأخطاء

### مشاكل شائعة

#### 1. `EADDRINUSE: address already in use :::5001`
**السبب**: المنفذ 5001 مستخدم بالفعل

**الحل**:
```bash
npm run kill-port-5000
npm run dev
```

#### 2. `Module not found: Error: Can't resolve '@/components'`
**السبب**: مشكلة في path aliases

**الحل**:
- تأكد من وجود `craco.config.js`
- تأكد من `tsconfig.json` يحتوي على paths
- أعد تشغيل التطبيق

#### 3. `useToast must be used within ToastProvider`
**السبب**: `ToastProvider` غير موجود في الشجرة

**الحل**:
- تأكد من `ToastProvider` في `App.tsx` أو `Providers.tsx`

#### 4. `Proxy error: Could not proxy request`
**السبب**: Backend غير يعمل

**الحل**:
- تأكد من تشغيل Backend على المنفذ 5001
- تحقق من `DATABASE_URL` في `.env`

#### 5. `SyntaxError: "[object Object]" is not valid JSON`
**السبب**: محاولة `JSON.parse()` على object

**الحل**:
- تحقق من نوع البيانات قبل `JSON.parse()`
- استخدم `typeof value === 'string'` قبل التحليل

#### 6. قاعدة البيانات لا تتصل
**السبب**: `DATABASE_URL` غير صحيح

**الحل**:
- تحقق من `DATABASE_URL` في `.env`
- تأكد من أن PostgreSQL يعمل
- تحقق من الصلاحيات

#### 7. WebSocket لا يتصل
**السبب**: `REACT_APP_WS_URL` غير صحيح

**الحل**:
- تحقق من `REACT_APP_WS_URL` في `client/.env`
- تأكد من أن Backend يعمل على المنفذ 5001
- تحقق من Console للأخطاء

#### 8. الصورة الشخصية لا تظهر
**السبب**: مسار الصورة غير صحيح

**الحل**:
- تحقق من `uploads/avatars/` موجود
- تحقق من أن Backend يخدم الملفات الثابتة
- تحقق من `avatar_url` في قاعدة البيانات

---

## 📝 ملاحظات إضافية

### التوقيت
- جميع الأوقات تُحفظ في **UTC** في قاعدة البيانات
- جميع الأوقات تُعرض بتوقيت **بغداد (Asia/Baghdad)** في الواجهة
- استخدام `moment-timezone` للتحويل

### المهام اليومية
- تُولد تلقائياً كل يوم الساعة **1:00 ص UTC** (4:00 ص بتوقيت بغداد)
- يمكن توليدها يدوياً من `/api/tasks/generate-daily`

### المهام المتأخرة
- تُفحص كل **15 دقيقة** تلقائياً
- يتم تحديث الحالة تلقائياً

### الحضور
- يُسجل تلقائياً عند **أول تسجيل دخول** يومي
- لا يمكن تسجيل الحضور يدوياً

### لوحة التحكم التلفزيونية
- **لا تتطلب مصادقة** (يمكن الوصول بدون تسجيل دخول)
- **وضع الزائر**: إخفاء الأسماء والصور للحماية
- **تحديث تلقائي**: حسب الإعدادات

---

## 🎉 الخلاصة

هذا النظام هو نظام شامل ومتقدم لإدارة المهام والحضور، مع:
- ✅ واجهة احترافية وسهلة الاستخدام
- ✅ لوحة تحكم تلفزيونية متقدمة
- ✅ تحديثات فورية
- ✅ أمان وحماية عالية
- ✅ تقارير وتحليلات
- ✅ تصميم متجاوب
- ✅ PWA support

**النظام جاهز للاستخدام والإنتاج!** 🚀

---

**آخر تحديث**: 2024-01-15
**الإصدار**: 1.0.0
