# خطة موسعة — لوحة التحكم التلفزيونية TV Dashboard

## 1. تحليل النظام الحالي

### الوحدات والبيانات المتاحة

| الوحدة | الجداول | الوصف | الملاحظات |
|--------|---------|-------|-----------|
| **المهام** | daily_tasks, ad_hoc_tasks, task_executions | مهام مجدولة وإضافية وتنفيذها | target_settlement_date للمهام الحكومية |
| **الحضور** | attendance | تسجيل دخول الموظفين | first_login_at |
| **RTGS** | rtgs, import_logs | حركات التسوية وسجل الاستيراد | sttl_date = تاريخ التسوية، import_logs.created_at = تاريخ التحميل |
| **CT Matching** | ct_records | سجلات CT للمطابقة | sttl_date_from/to, ct_received_date |
| **التجار** | merchants | بيانات التجار | مرتبط بـ rtgs.mer |
| **صرف المستحقات** | merchant_disbursements | صرف مستحقات التجار | |
| **التسوية الحكومية** | daily_tasks.target_settlement_date, task_executions.settlement_date, settlement_value | مهام مطابقة التسوية | |
| **التقارير** | reportsController | تقرير يومي، أسبوعي، تغطية | |
| **الفئات والقوالب** | categories, task_templates, schedules | تنظيم المهام | |

### منطق التسويات وتاريخ التحميل

> **"التسوية بالعادة تنزل بعد يوم"** — تسوية اليوم تنزل غداً

- `rtgs.sttl_date` = تاريخ التسوية (من الملف)
- `import_logs.created_at` = تاريخ تحميل الملف في النظام
- **التسويات المعروضة** = حسب تاريخ التحميل: أي RTGS تم استيراده اليوم (أو في نافذة زمنية محددة) — لأن هذا يعكس "ما تم استلامه اليوم"
- **بديل**: عرض التسويات حسب `sttl_date` مع إشارة إلى "آخر تحميل" لليوم المعروض

---

## 2. المحتوى المقترح للـ TV

### أ. شرائح الموظفين والعمل

| الشريحة | النوع | المحتوى | مصدر البيانات |
|---------|-------|---------|---------------|
| افتتاحية | opening | عنوان + شعار + تاريخ | ثابت |
| نظرة عامة | overview | KPIs اليوم (مجدولة، مكتملة، متأخرة، حضور) | daily_tasks, attendance, reports |
| المهام المجدولة | scheduled-tasks | كل المهام اليومية بأسمائها وموظفها | daily_tasks + templates |
| المهام الإضافية | additional-tasks | كل ad-hoc بأسمائها | ad_hoc_tasks |
| موظف (يومي) | employee | مهام الموظف اليومية + الإضافية + الحضور | لكل موظف |
| موظف (شهري) | employee-monthly | إنجازات الشهر + الفئات | لكل موظف |
| الحضور | attendance | من حضر + وقت الدخول | attendance |
| التغطية | coverage | من قام بمهام الآخرين | task_executions |
| الفئات | categories | توزيع المهام حسب الفئة | reports.tasksByCategory |
| أفضل الأداء | recognition | ترتيب الموظفين | reports.tasksByUser |

### ب. شرائح التسويات والـ RTGS

| الشريحة | النوع | المحتوى | مصدر البيانات |
|---------|-------|---------|---------------|
| **استيراد RTGS اليوم** | rtgs-imports-today | ملفات تم تحميلها اليوم + ملخص sttl_date لكل ملف | import_logs (created_at = today) + rtgs |
| **كروت التسويات (حسب تاريخ التحميل)** | rtgs-settlements-by-import | لكل استيراد: اسم الملف، تاريخ التحميل، تواريخ التسوية (sttl_date)، عدد الحركات، إجمالي STTLE | import_logs + rtgs GROUP BY import_log_id |
| **كروت التسويات (حسب sttl_date)** | rtgs-settlements-by-date | ملخص لكل تاريخ تسوية: حركات، مبلغ، عمولة | rtgs GROUP BY sttl_date |
| **مطابقة CT** | ct-matching | سجلات CT مع حالة المطابقة | ct_records + matching |
| **التسوية الحكومية** | government-settlements | مهام target_settlement_date وحالة المطابقة | daily_tasks + task_executions |
| **صرف المستحقات** | merchant-disbursements | ملخص صرف التجار | merchant_disbursements |

### ج. شرائح إضافية

| الشريحة | النوع | المحتوى |
|---------|-------|---------|
| اتجاهات أسبوعية | trends | رسم بياني الأسبوع |
| المهام المتأخرة | overdue | قائمة المهام المتأخرة فقط |
| إحصائيات RTGS | rtgs-summary | إجمالي الحركات، المبالغ، العمولات |

---

## 3. إعدادات TV الشاملة

### جدول إعدادات مقترح (settings.tv_dashboard)

```json
{
  "slideInterval": 10,
  "refreshInterval": 30,
  "autoRefresh": true,
  "visitorMode": false,

  "enabledSlides": {
    "opening": true,
    "overview": true,
    "scheduledTasks": true,
    "additionalTasks": true,
    "employee": true,
    "employeeMonthly": true,
    "attendance": true,
    "coverage": true,
    "categories": true,
    "recognition": true,
    "overdue": true,
    "trends": true,

    "rtgsImportsToday": true,
    "rtgsSettlementsByImport": true,
    "rtgsSettlementsByDate": true,
    "ctMatching": true,
    "governmentSettlements": true,
    "merchantDisbursements": true,
    "rtgsSummary": true
  },

  "rtgsDisplayMode": "by_import_date",
  "rtgsImportDateRange": 3,
  "dateContext": "today",

  "employeeFilter": "all",
  "employeeIds": [],
  "categoryFilter": "all",
  "categoryIds": []
}
```

### شروحات الإعدادات

| الإعداد | الوصف | القيم |
|---------|-------|-------|
| `rtgsDisplayMode` | طريقة عرض التسويات | `by_import_date` (حسب تاريخ التحميل) أو `by_sttl_date` (حسب تاريخ التسوية) |
| `rtgsImportDateRange` | عرض استيرادات آخر X أيام | 1–7 |
| `dateContext` | السياق الزمني للعرض | `today`, `yesterday`, `selectable` |
| `employeeFilter` | تصفية الموظفين | `all`, `selected` |
| `visitorMode` | إخفاء الأسماء والبيانات الحساسة | true/false |

---

## 4. مراحل التنفيذ

### المرحلة 1 — البنية الأساسية (أولوية عالية)

1. **توسيع إعدادات TV** في `settings.tv_dashboard`:
   - `enabledSlides` لكل نوع شريحة
   - `rtgsDisplayMode`, `rtgsImportDateRange`
   - `dateContext`, `visitorMode`

2. **تحديث tvDashboardController**:
   - قراءة `enabledSlides` وبناء قائمة الشرائح ديناميكياً
   - دعم `visitorMode` لتخفية الأسماء
   - تمرير `dateContext` أو `date` اختياري في الاستعلام

3. **إكمال شرائح الموظفين** (موجودة جزئياً):
   - التأكد من عرض كل المهام بأسمائها (من templates)
   - دمج المهام الإضافية في شريحة الموظف
   - إظهار الحضور ووقت الدخول

### المرحلة 2 — شرائح التسويات والـ RTGS

4. **شريحة استيراد RTGS اليوم**:
   - استعلام: `import_logs` حيث `DATE(created_at AT TIME ZONE 'Asia/Baghdad') = today`
   - لكل سجل: filename, created_at, inserted_rows
   - ملحق: تواريخ sttl_date الفريدة في هذا الاستيراد (من rtgs WHERE import_log_id = X)
   - عرض: "تم تحميل 3 ملفات اليوم: ملف1 (X حركة)، ملف2 (Y حركة)..."

5. **كروت التسويات حسب تاريخ التحميل**:
   - استعلام: `import_logs` + تجميع `rtgs` حسب `import_log_id`
   - لكل استيراد: sttl_date_from, sttl_date_to, count, sum(amount), sum(fees), sum(acq), sum(sttle)
   - العرض: بطاقات لكل "تسوية تم تحميلها" مع التفاصيل

6. **كروت التسويات حسب sttl_date**:
   - استعلام: `rtgs` GROUP BY sttl_date
   - ملخص: count, sum(amount), sum(fees), sum(acq), sum(sttle)
   - العرض: قائمة أو شبكة تواريخ التسوية مع الأرقام

7. **شريحة CT Matching**:
   - استعلام: `ct_records` مع حالة المطابقة
   - عرض: من-إلى، قيمة CT، sum_acq، sum_fees، مطابق/غير مطابق
   - ترتيب حسب ct_received_date أو sttl_date_from

8. **شريحة التسوية الحكومية**:
   - استعلام: `daily_tasks` مع `target_settlement_date` + `task_executions.settlement_value`, verification_status
   - ربط مع templates لأسماء المهام
   - عرض: المهمة، تاريخ التسوية المستهدف، القيمة المدخلة، حالة المطابقة

9. **شريحة صرف المستحقات**:
   - استعلام: `merchant_disbursements` (حسب الهيكل الفعلي)
   - عرض ملخص حسب التاريخ أو التاجر

### المرحلة 3 — واجهة إعدادات TV

10. **صفحة tv-settings-v2**:
    - قسم "الشرائح المفعلة": checkboxes لكل نوع شريحة (موظفين، تسويات، تقارير)
    - قسم "RTGS": اختيار العرض حسب تاريخ التحميل أو تاريخ التسوية، نطاق الأيام
    - قسم "التصفية": موظفين محددين، فئات محددة (اختياري)
    - قسم "العرض": visitorMode، فاصل الشرائح، فترة التحديث

11. **API تحديث الإعدادات**:
    - توسيع `updateDashboardSettings` لقبول الكائن الكامل
    - حفظ `enabledSlides`, `rtgsDisplayMode`, إلخ في settings

### المرحلة 4 — تحسينات العرض

12. **تصميم الشرائح**:
    - تصميم موحد لكل الشرايج (ألوان، خطوط، تخطيط)
    - دعم RTL كامل
    - تحميل سريع وعدم إعادة رسم غير ضرورية

13. **التوافق مع الشاشات الكبيرة**:
    - خطوط أكبر، تباعد أوضح
    - وضع ملء الشاشة
    - إخفاء عناصر التحكم في وضع العرض التلقائي

14. **التنبيهات**:
    - تنبيه عند وجود مهام متأخرة
    - تنبيه عند عدم مطابقة CT
    - تنبيه عند وجود تسويات جديدة تم تحميلها

---

## 5. نموذج بيانات شرائح التسويات

### rtgs-imports-today (استيراد RTGS اليوم)

```json
{
  "type": "rtgs-imports-today",
  "date": "2026-01-15",
  "imports": [
    {
      "id": 1,
      "filename": "RTGS_20260114.csv",
      "createdAt": "2026-01-15T08:30:00",
      "insertedRows": 1250,
      "sttlDates": ["2026-01-13", "2026-01-14"],
      "summary": {
        "totalAmount": 5000000,
        "totalFees": 125000,
        "totalAcq": 87500
      }
    }
  ]
}
```

### rtgs-settlements-by-import (كروت حسب التحميل)

```json
{
  "type": "rtgs-settlements-by-import",
  "cards": [
    {
      "importLogId": 1,
      "filename": "RTGS_20260114.csv",
      "importedAt": "2026-01-15T08:30:00",
      "sttlDateFrom": "2026-01-13",
      "sttlDateTo": "2026-01-14",
      "rowCount": 1250,
      "totalAmount": 5000000,
      "totalFees": 125000,
      "totalAcq": 87500,
      "totalSttle": 4791250
    }
  ]
}
```

### rtgs-settlements-by-date (كروت حسب تاريخ التسوية)

```json
{
  "type": "rtgs-settlements-by-date",
  "settlements": [
    {
      "sttlDate": "2026-01-14",
      "rowCount": 800,
      "totalAmount": 3200000,
      "totalFees": 80000,
      "totalAcq": 56000
    }
  ]
}
```

---

## 6. ملخص الأولويات

| الأولوية | المهمة | الجهد التقريبي |
|----------|--------|-----------------|
| 1 | توسيع إعدادات TV + enabledSlides | صغير |
| 2 | شرائح RTGS (استيراد اليوم + كروت حسب التحميل) | متوسط |
| 3 | شريحة CT Matching | صغير |
| 4 | شريحة التسوية الحكومية | صغير |
| 5 | واجهة إعدادات TV الشاملة | متوسط |
| 6 | شرائح إضافية (صرف المستحقات، ملخص RTGS) | صغير |
| 7 | تحسينات العرض والتنبيهات | متوسط |

---

## 7. الاعتماد على تاريخ تحميل RTGS

المنطق المقترح:

1. **"تسويات تم تحميلها اليوم"** = كل سجل في `import_logs` حيث `DATE(created_at) = اليوم`
2. لكل سجل: جلب `rtgs` المرتبطة بـ `import_log_id`
3. تجميع حسب `sttl_date` داخل كل استيراد: لأن الملف قد يحتوي أكثر من يوم تسوية
4. العرض: بطاقة لكل استيراد تعرض:
   - اسم الملف + وقت التحميل
   - تواريخ التسوية (sttl_date) في الملف
   - عدد الحركات، إجمالي المبلغ، العمولة، ACQ

بهذا الشكل، الشاشة تعكس "ما تم استلامه اليوم" وليس فقط "تسوية اليوم" التي قد لا تكون موجودة بعد.
