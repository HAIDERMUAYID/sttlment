# دليل الإعداد السريع

## المتطلبات الأساسية
- Node.js 16+ 
- PostgreSQL 12+
- npm أو yarn

## الإعداد المحلي

### 1. تثبيت التبعيات

```bash
# تثبيت تبعيات الخادم
npm install

# تثبيت تبعيات العميل
cd client
npm install
cd ..
```

### 2. إعداد قاعدة البيانات

**خيار أ) استخدام Render Postgres (من خارج Render)**

1. أنشئ قاعدة بيانات PostgreSQL على Render كما في الدليل.
2. انسخ **External Database URL** من لوحة Render (للوصول من جهازك المحلي).
3. أنشئ ملف `.env` في المجلد الرئيسي:
```env
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
TIMEZONE=Asia/Baghdad
```
   استبدل `DATABASE_URL` برابط Render الخارجي الذي نسخته.  
   **ملاحظة:** نستخدم 5001 افتراضياً لأن المنفذ 5000 غالباً مستخدم من AirPlay على macOS.

**خيار ب) PostgreSQL محلي**

1. أنشئ قاعدة بيانات: `CREATE DATABASE sttlment;`
2. استخدم في `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sttlment
```

**⚠️ أمان:** لا تضع `.env` في Git أبداً (موجود في `.gitignore`). لا تشارك رابط الاتصال.

### 3. تشغيل الهجرات والبيانات الأولية

```bash
npm run migrate
npm run seed
```

### 4. تشغيل التطبيق

```bash
# تشغيل الخادم والعميل معاً
npm run dev

# أو بشكل منفصل:
# Terminal 1: الخادم
npm run server:dev

# Terminal 2: العميل
npm run client:dev
```

### 5. الوصول للتطبيق

- الواجهة: http://localhost:3000
- API: http://localhost:5000

### بيانات الدخول الافتراضية

- **Admin**: admin@alsaqi.com / admin123
- **Supervisor**: supervisor@alsaqi.com / supervisor123

---

## النشر على Render

### 1. إعداد قاعدة البيانات
- أنشئ قاعدة بيانات PostgreSQL على Render
- احفظ `DATABASE_URL`

### 2. إعداد Web Service
- اربط المستودع من GitHub
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `DATABASE_URL=<your-database-url>`
  - `JWT_SECRET=<strong-secret-key>`
  - `JWT_EXPIRES_IN=7d`
  - `TIMEZONE=Asia/Baghdad`

### 3. إعداد Cron Jobs

#### أ) توليد المهام اليومية
- Schedule: `0 1 * * *` (كل يوم الساعة 1:00 ص UTC)
- Command: `node server/cron/generateDailyTasks.js`
- Environment Variables: نفس متغيرات Web Service

#### ب) فحص المهام المتأخرة
- Schedule: `*/15 * * * *` (كل 15 دقيقة)
- Command: `node server/cron/checkOverdueTasks.js`
- Environment Variables: نفس متغيرات Web Service

### 4. تشغيل الهجرات بعد النشر

استخدم Render Shell لتشغيل:
```bash
npm run migrate
npm run seed
```

---

## ملاحظات مهمة

1. **التوقيت**: جميع الأوقات تُحفظ في UTC وتُعرض بتوقيت بغداد
2. **المهام اليومية**: تُولد تلقائياً كل يوم الساعة 1:00 ص UTC (4:00 ص بتوقيت بغداد)
3. **المهام المتأخرة**: تُفحص كل 15 دقيقة
4. **الحضور**: يُسجل تلقائياً عند أول تسجيل دخول يومي
5. **لوحة التحكم التلفزيونية**: متاحة على `/tv` بدون مصادقة

---

## استكشاف الأخطاء

### `EADDRINUSE: address already in use :::5000` أو `:::5001`
الخادم يحاول استخدام منفذ مستخدم بالفعل (غالباً AirPlay على macOS). الحل:
- تشغيل `npm run kill-port-5000` ثم `npm run dev`
- أو التأكد من `PORT=5001` في `.env` (الافتراضي الآن)

### `client password must be a string` أو فشل الهجرات
- **تنسيق `.env`**: كل متغير في سطر منفصل. لا تضع كل المحتوى في سطر واحد.
- **بدون علامات اقتباس**: `DATABASE_URL=postgresql://...` صحيح. تجنب `DATABASE_URL="..."` إذا سبّب مشاكل.
- تأكد أن الملف اسمه `.env` في جذر المشروع (بجانب `package.json`).
- تأكد أن الرابط من Render هو **External Database URL** (للوصول من جهازك المحلي).

### مشاكل قاعدة البيانات
- تأكد من أن PostgreSQL يعمل
- تحقق من صحة `DATABASE_URL`
- تأكد من تشغيل الهجرات

### مشاكل المصادقة
- تحقق من `JWT_SECRET`
- تأكد من صحة التوكن في localStorage

### مشاكل Cron Jobs
- على Render، تأكد من إعداد Environment Variables بشكل صحيح
- تحقق من السجلات في Render Dashboard

---

## الدعم

للمساعدة، راجع README.md أو تواصل مع فريق التطوير.