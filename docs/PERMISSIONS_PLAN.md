# خطة صلاحيات المستخدمين الشاملة
## نظام منح وتصحيح الصلاحيات حسب الصفحة والإجراء

---

## 1. نظرة عامة

النظام الحالي يعتمد على:
- **الأدوار**: admin, supervisor, employee, accountant
- **صلاحيات مخصصة**: can_manage_merchants, can_create_ad_hoc

**الهدف الجديد**: صلاحيات دقيقة لكل صفحة + إجراءات داخل الصفحة، مع إمكانية اختيار:
- أي الصفحات يمكن للمستخدم الوصول إليها
- ما الذي يمكنه فعله داخل كل صفحة (عرض، إضافة، تعديل، حذف، تصدير، إلخ)

---

## 2. الصفحات والإجراءات (تقسيم شامل)

### 2.1 القسم الرئيسي
| الصفحة | المسار | الإجراءات |
|--------|--------|-----------|
| **لوحة التحكم** | /dashboard | view (عرض) |
| **المهام** | /tasks | view, create_ad_hoc, filter_by_assignee, execute (عرض، إنشاء خاص، فلترة بالمسؤول، تنفيذ) |

### 2.2 إدارة المهام
| الصفحة | المسار | الإجراءات |
|--------|--------|-----------|
| **الجداول الزمنية** | /schedules | view, create, edit, delete (عرض، إضافة، تعديل، حذف) |
| **قوالب المهام** | /templates | view, create, edit, delete |
| **الفئات** | /categories | view, create, edit, delete |

### 2.3 التقارير والتحليلات
| الصفحة | المسار | الإجراءات |
|--------|--------|-----------|
| **RTGS** | /rtgs | view, import, export, delete_import, delete_all, view_import_logs, access_settings (عرض، استيراد، تصدير، حذف استيراد، حذف الكل، سجل الاستيراد، إعدادات الاحتساب) |
| **التسويات الحكومية** | /government-settlements | view |
| **مطابقة العمولات (CT)** | /ct-matching | view, create_ct, edit_ct, delete_ct (عرض، إنشاء CT، تعديل، حذف) |
| **صرف مستحقات التجار** | /merchant-disbursements | view, create_disbursement (عرض، إنشاء صرف) |
| **التقارير** | /reports | view, export_excel, export_pdf |
| **الحضور** | /attendance | view, manage_stats (عرض، إدارة إحصائيات) |

### 2.4 الإدارة
| الصفحة | المسار | الإجراءات |
|--------|--------|-----------|
| **إدارة التجار** | /merchants | view, create, edit, delete, import, export (عرض، إضافة، تعديل، حذف، استيراد، تصدير) |
| **المستخدمين** | /users | view, create, edit, delete, manage_permissions, toggle_active (عرض، إضافة، تعديل، حذف، إدارة الصلاحيات، تفعيل/إيقاف) |
| **سجل التدقيق** | /audit-log | view |

### 2.5 الإعدادات
| الصفحة | المسار | الإجراءات |
|--------|--------|-----------|
| **لوحة TV** | /tv-settings | view, edit |
| **إعدادات RTGS** | /rtgs-settings | view, edit |
| **كلمة المرور** | /change-password | self_update (تعديل ذاتي - متاح للجميع) |

---

## 3. هيكلة قاعدة البيانات

### 3.1 جدول تعريف الصفحات والإجراءات (permission_definitions)
```sql
CREATE TABLE permission_definitions (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(100) NOT NULL UNIQUE,   -- dashboard, tasks, rtgs, ...
  page_label_ar VARCHAR(255) NOT NULL,     -- لوحة التحكم
  page_path VARCHAR(255) NOT NULL,         -- /dashboard
  actions JSONB NOT NULL DEFAULT '[]',     -- [{key: "view", label_ar: "عرض"}, ...]
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 جدول صلاحيات المستخدم (user_permissions)
```sql
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(100) NOT NULL,
  action_key VARCHAR(100) NOT NULL,        -- view, create, edit, delete, ...
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_key, action_key)
);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_page ON user_permissions(page_key);
```

### 3.3 الحفاظ على التوافق
- **admin**: يملك كل الصلاحيات تلقائياً (لا يخضع للتحقق من user_permissions)
- **supervisor, employee, accountant**: يخضعون لـ user_permissions
- إذا لم يوجد سجل لصفحة/إجراء → يتم التحقق من role الافتراضي

---

## 4. قائمة الصفحات والإجراءات الكاملة (لتهيئة permission_definitions)

| page_key | page_label_ar | page_path | actions |
|----------|---------------|-----------|---------|
| dashboard | لوحة التحكم | /dashboard | [view] |
| tasks | المهام | /tasks | [view, create_ad_hoc, filter_by_assignee, execute] |
| schedules | الجداول الزمنية | /schedules | [view, create, edit, delete] |
| templates | قوالب المهام | /templates | [view, create, edit, delete] |
| categories | الفئات | /categories | [view, create, edit, delete] |
| rtgs | RTGS | /rtgs | [view, import, export, delete_import, delete_all, view_import_logs, access_settings] |
| government_settlements | التسويات الحكومية | /government-settlements | [view] |
| ct_matching | مطابقة العمولات | /ct-matching | [view, create_ct, edit_ct, delete_ct] |
| merchant_disbursements | صرف مستحقات التجار | /merchant-disbursements | [view, create_disbursement] |
| reports | التقارير | /reports | [view, export_excel, export_pdf] |
| attendance | الحضور | /attendance | [view, manage_stats] |
| merchants | إدارة التجار | /merchants | [view, create, edit, delete, import, export] |
| users | المستخدمين | /users | [view, create, edit, delete, manage_permissions, toggle_active] |
| audit_log | سجل التدقيق | /audit-log | [view] |
| tv_settings | لوحة TV | /tv-settings | [view, edit] |
| rtgs_settings | إعدادات RTGS | /rtgs-settings | [view, edit] |
| change_password | كلمة المرور | /change-password | [self_update] |

---

## 5. خطة التنفيذ (مراحل)

### المرحلة 1: قاعدة البيانات
1. إنشاء migration لـ permission_definitions و user_permissions
2. تهيئة permission_definitions بالبيانات أعلاه
3. تهيئة الصلاحيات الافتراضية للمستخدمين الحاليين حسب role

### المرحلة 2: Backend
1. API: GET /api/permissions/definitions — جلب تعريفات الصفحات والإجراءات
2. API: GET /api/users/:id/permissions — جلب صلاحيات مستخدم
3. API: PUT /api/users/:id/permissions — حفظ صلاحيات مستخدم
4. Middleware: requirePermission(page_key, action_key) — للتحقق من الصلاحية
5. تعديل authenticate لتحميل صلاحيات المستخدم في req.user.permissions

### المرحلة 3: Frontend - صفحة المستخدمين
1. تبويب/قسم "الصلاحيات" في نموذج إضافة/تعديل المستخدم
2. شجرة أو شبكة: كل صفحة + checkboxes للإجراءات
3. "تحديد الكل" و"إلغاء الكل" لكل صفحة
4. إظهار/إخفاء حسب role (مثلاً admin لا يحتاج تعديل صلاحيات فردية)

### المرحلة 4: التكامل
1. RouteGuard: التحقق من page_key + action=view قبل السماح بالوصول
2. Sidebar: إخفاء روابط الصفحات التي لا يملك المستخدم صلاحية view لها
3. المكونات الداخلية: إخفاء أزرار (إضافة، تعديل، حذف، تصدير) حسب الصلاحية
4. API routes: ربط كل endpoint بـ requirePermission المناسب

### المرحلة 5: الترحيل والاختبار
1. ترحيل can_manage_merchants و can_create_ad_hoc إلى الصلاحيات الجديدة
2. ضبط الصلاحيات الافتراضية لـ supervisor, employee, accountant
3. اختبار شامل لكل صفحة وإجراء

---

## 6. ملاحظات

- **admin** لا يخضع للتحقق التفصيلي — يملك كل الصلاحيات دائماً
- **change_password** (self_update): متاح لجميع المستخدمين النشطين لتعديل كلمتهم الخاصة
- الصلاحيات تُخزَّن per-user؛ يمكن لاحقاً إضافة "أدوار قالب" لتسريع الإعداد

---

## 7. حالة التنفيذ (الحالية)

### تم تنفيذه
- ✅ migration 017_user_permissions
- ✅ permission_definitions مهيأة بكل الصفحات والإجراءات
- ✅ API: GET /api/permissions/definitions
- ✅ API: GET /api/permissions/users/:id
- ✅ API: PUT /api/permissions/users/:id
- ✅ واجهة إدارة الصلاحيات في صفحة المستخدمين (زر "الصلاحيات")
- ✅ Auth يعيد permissions في login و verify

### قيد التكامل (المرحلة التالية)
- RouteGuard: التحقق من permissions عند الوصول للصفحات
- Sidebar: إخفاء الروابط حسب permissions
- Fallback: عند عدم وجود صلاحيات مخزنة، الاعتماد على role الحالي
