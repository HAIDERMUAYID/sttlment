# رفع النظام على Render

## الطريقة 1: استخدام Blueprint (الأسهل)

المشروع يحتوي على ملف `render.yaml` جاهز للنشر التلقائي.

### الخطوات:

1. ادخل إلى [render.com](https://render.com) وسجّل الدخول
2. اضغط **New +** → **Blueprint**
3. اربط حساب GitHub واختر المستودع **HAIDERMUAYID/sttlment**
4. Render سيكتشف `render.yaml` تلقائياً وينشئ:
   - **Web Service** (sttlment-api) — واجهة API وواجهة المستخدم
   - **PostgreSQL Database** (sttlment-db)
   - **Cron Jobs** — توليد المهام اليومية وفحص المتأخرة
5. اضغط **Apply**

### بعد النشر:

1. انتظر حتى يكتمل البناء (~5–10 دقائق)
2. احصل على رابط التطبيق مثل: `https://sttlment-api.onrender.com`
3. شغّل الهجرات والبيانات الأولية عبر **Shell** في Render:
   ```bash
   npm run migrate
   npm run seed
   ```
4. سجّل الدخول بالمستخدم الافتراضي (راجع `TEST_DATA.md`)

---

## الطريقة 2: النشر اليدوي

### 1. إنشاء قاعدة البيانات

1. **New +** → **PostgreSQL**
2. اختر الخطة (Free للاختبار)
3. احفظ **Internal Database URL**

### 2. إنشاء Web Service

1. **New +** → **Web Service**
2. اربط المستودع **HAIDERMUAYID/sttlment**
3. الإعدادات:
   - **Name:** sttlment-api
   - **Environment:** Node
   - **Build Command:** `npm install && cd client && npm install && npm run build && cd ..`
   - **Start Command:** `npm start`

4. **Environment Variables:**
   | المفتاح | القيمة |
   |---------|--------|
   | NODE_ENV | production |
   | PORT | 10000 |
   | DATABASE_URL | (Internal URL من قاعدة البيانات) |
   | JWT_SECRET | (سلسلة عشوائية 32+ حرفاً) |
   | JWT_EXPIRES_IN | 7d |
   | TIMEZONE | Asia/Baghdad |
   | POOL_MAX | 5 |

5. اضغط **Create Web Service**

### 3. Cron Jobs (اختياري)

- **توليد المهام اليومية:** `0 1 * * *` → `node server/cron/generateDailyTasks.js`
- **فحص المتأخرة:** `*/30 * * * *` → `node server/cron/checkOverdueTasks.js`

---

## ملاحظات

- **Free Tier:** الخدمة قد تسبت بعد 15 دقيقة من عدم النشاط (قد يستغرق الإقلاع 30–60 ثانية)
- **WebSocket:** يعمل تلقائياً على نفس الدومين (wss://your-app.onrender.com/ws)
- **HTTPS:** Render يوفّر شهادة SSL تلقائياً
