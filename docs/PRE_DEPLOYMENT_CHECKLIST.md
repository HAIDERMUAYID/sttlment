# خطة التحقق الشاملة قبل رفع النظام — Pre-Deployment Checklist

## الهدف
التحقق من جاهزية النظام للنشر مع تقليل استهلاك الموارد والتكاليف.

---

## 1. الأمان (Security)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| JWT_SECRET | ✅ | يُولَّد تلقائياً في Render — لا يُخزَّن في الكود |
| كلمات المرور | ✅ | مُشفَّرة بـ bcrypt |
| Rate limiting | ✅ | مفعّل (100 طلب/15 دقيقة، 5 محاولات login) |
| Helmet | ✅ | مفعّل لحماية Headers |
| CORS | ⚠️ | حالياً مفتوح لكل المصادر — يُفضَّل تحديد النطاقات في الإنتاج |
| TV Dashboard بدون rate limit | ⚠️ | مقصود للعرض العام — إضافة حد خفيف عند الحاجة |
| .env في .gitignore | ✅ | محمي |
| صلاحيات API | ✅ | `authenticate` middleware على المسارات المحمية |

**إجراء موصى به:** إضافة `allowedOrigins` في CORS للإنتاج إن كان النطاق معروفاً.

---

## 2. قاعدة البيانات (Database)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| DATABASE_URL | ✅ | من متغيرات البيئة |
| SSL للإنتاج | ✅ | مفعّل عند `render.com` أو `NODE_ENV=production` |
| Pool max connections | ⚠️ | غير محدد — افتراضي pg = 10. إن DB مجاني محدود، يُفضَّل `max: 5` |
| Migrations | ✅ | `npm run migrate` قبل التشغيل |
| Connection leak | ✅ | استخدام `client.release()` في `try/finally` |
| Indexes | ✅ | موجودة في migrations |

**إجراء موصى به:** إضافة `max: 5` (أو أقل) لـ pool إن استخدمت Render free DB.

---

## 3. الأداء واستهلاك الموارد (Performance & Cost)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| TV Dashboard | ✅ | استعلامات مجمعة (تم التحسين سابقاً) |
| Cron: generateDailyTasks | ✅ | مرة يومياً (1 صباحاً) |
| Cron: checkOverdueTasks | ⚠️ | كل 15 دقيقة = 96 تشغيل/يوم — ممكن تخفيفه إلى كل 30 دقيقة أو ساعة |
| Express body limit | ⚠️ | 10MB — مراجعة إن كانت كبيرة |
| Multer file limit | ✅ | 10MB |
| Console.log في الإنتاج | ⚠️ | ~280+ في السيرفر — تقليل أو إيقاف غير الضروري |
| WebSocket | ✅ | يعمل مع الخادم نفسه — بدون تكلفة إضافية |
| Lazy loading (React) | ✅ | الصفحات مُحمَّلة بشكل كسول |

**إجراء موصى به:** تخفيف تكرار `check-overdue-tasks` و/أو تقليل `console` في الإنتاج.

---

## 4. البيئة والإعدادات (Environment)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| NODE_ENV | ✅ | production في Render |
| PORT | ✅ | 10000 في Render |
| JWT_EXPIRES_IN | ✅ | 7d |
| TIMEZONE | ✅ | Asia/Baghdad |
| REACT_APP_WS_URL | ⚠️ | غير مضبوط في render.yaml — عند فصل Frontend/Backend يُضاف |
| .env.example | ⚠️ | موجود في client فقط — يُفضَّل إضافة واحد في الجذر |

**ملاحظة:** عند نشر Frontend و Backend على نفس النطاق، لا حاجة لـ `REACT_APP_API_URL` أو `REACT_APP_WS_URL` منفصلين.

---

## 5. البناء والنشر (Build & Deploy)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| buildCommand | ✅ | `npm install && npm run build` |
| startCommand | ✅ | `npm start` |
| Client build | ✅ | يُنفَّذ من `npm run build` (cd client && npm run build) |
| Static files | ✅ | يُقدَّم من `client/build` في الإنتاج |
| SPA fallback | ✅ | `app.get('*', ...)` يرد بـ `index.html` |
| uploads مجلد | ✅ | يُنشأ تلقائياً عبر multer |

---

## 6. Cron Jobs (Render)

| البند | الحالة | الإجراء |
|-------|--------|---------|
| generate-daily-tasks | ✅ | 0 1 * * * (1 صباحاً) |
| check-overdue-tasks | ⚠️ | */15 * * * * — تقليل التكرار يقلل استهلاك الموارد |

---

## 7. ما قد ينقص أو يُحسَّن

| البند | الأولوية | الوصف |
|-------|----------|-------|
| Database pool max | متوسطة | تحديد `max` للاتصالات لتقليل استهلاك DB |
| CORS في الإنتاج | منخفضة | تحديد النطاقات المسموحة |
| تقليل console.log | منخفضة | إزالة أو استبدال بـ logger شرطي |
| تكرار checkOverdueTasks | متوسطة | من 15 دقيقة إلى 30 أو 60 |
| .env.example شامل | منخفضة | توثيق المتغيرات المطلوبة |
| Health check endpoint | منخفضة | `/health` للتحقق من عمل الخادم |
| نسخ احتياطي DB | عالية | إعداد backup دوري إن لم يكن تلقائياً من Render |

---

## 8. خطوات التحقق قبل الرفع

```bash
# 1. تثبيت التبعيات
npm install
cd client && npm install && cd ..

# 2. بناء Frontend
npm run build

# 3. التحقق من migrations
npm run migrate

# 4. (اختياري) seed بيانات تجريبية
npm run seed:full

# 5. تشغيل محلي في وضع production
NODE_ENV=production npm start
```

---

## 9. تقدير التكلفة (Render Free Tier)

| المورد | التقدير |
|--------|---------|
| Web Service | مجاني (يُوقَف بعد خمول) |
| PostgreSQL | مجاني (محدود) |
| Cron Jobs | مجاني (عدد محدود من التشغيلات) |
| ملاحظة | الخدمة المجانية تتوقف بعد فترة خمول — للاستخدام المستمر مطلوب خطة مدفوعة |

---

## 10. ملخص الإجراءات الموصى بها فوراً

1. ~~**إضافة `max` لاتصالات قاعدة البيانات**~~ — ✅ تم: إضافة `POOL_MAX=5` في render.yaml.
2. ~~**تخفيف تكرار check-overdue-tasks**~~ — ✅ تم: من كل 15 إلى كل 30 دقيقة.
3. **التحقق من وجود جميع متغيرات البيئة** في Render قبل التشغيل.
4. **اختبار النشر** على بيئة staging أو اختبار إن أمكن.

---

## 11. التعديلات المطبقة تلقائياً

- `server/config/database.js`: إضافة `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` — مع دعم `POOL_MAX`.
- `render.yaml`: `POOL_MAX=5`، وتكرار check-overdue-tasks = كل 30 دقيقة.
- `.env.example`: إنشاء ملف توثيق للمتغيرات المطلوبة.

---

*آخر تحديث: وفقاً لفحص الكود الحالي*
