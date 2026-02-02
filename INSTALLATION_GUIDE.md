# 📦 دليل التثبيت الكامل

## 🚀 التثبيت السريع

### 1. تثبيت Dependencies

```bash
# تثبيت Backend dependencies
npm install

# تثبيت Frontend dependencies
cd client
npm install
cd ..
```

### 2. إعداد Environment Variables

#### Backend (.env في المجلد الرئيسي)
```env
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
TIMEZONE=Asia/Baghdad
WS_URL=ws://localhost:5001
```

#### Frontend (client/.env)
```env
REACT_APP_WS_URL=ws://localhost:5001
```

### 3. إعداد قاعدة البيانات

```bash
# تشغيل الهجرات
npm run migrate

# إضافة البيانات التجريبية
npm run seed
```

### 4. تشغيل التطبيق

```bash
# تشغيل Backend و Frontend معاً
npm run dev

# أو بشكل منفصل:
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend
npm run client:dev
```

---

## 📦 Dependencies المطلوبة

### Backend
- `express` - Web framework
- `pg` - PostgreSQL client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `multer` - File uploads
- `node-cron` - Scheduled tasks
- `moment-timezone` - Date/time handling
- `xlsx` - Excel export
- `pdfkit` - PDF export
- `ws` - WebSocket server
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `zod` - Input validation

### Frontend
- `react` - UI library
- `react-dom` - React DOM
- `react-router-dom` - Routing
- `axios` - HTTP client
- `@tanstack/react-query` - Data fetching
- `zustand` - State management
- `framer-motion` - Animations
- `tailwindcss` - Styling
- `@radix-ui/*` - UI primitives
- `lucide-react` - Icons
- `moment` - Date handling
- `recharts` - Charts

---

## 🔧 Configuration

### WebSocket Configuration

#### Development
```env
REACT_APP_WS_URL=ws://localhost:5001
```

#### Production
```env
REACT_APP_WS_URL=wss://your-domain.com
```

### Database Configuration

#### Local PostgreSQL
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sttlment
```

#### Render PostgreSQL
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

---

## ✅ التحقق من التثبيت

### 1. التحقق من Backend
```bash
curl http://localhost:5001/api/auth/verify
```

### 2. التحقق من Frontend
افتح: http://localhost:3000

### 3. التحقق من WebSocket
افتح Developer Console وابحث عن:
```
WebSocket connected
```

---

## 🐛 حل المشاكل

### مشكلة: WebSocket لا يتصل
**الحل:**
1. تأكد من أن `WS_URL` في `.env` صحيح
2. تأكد من أن Backend يعمل على المنفذ الصحيح
3. تحقق من CORS settings

### مشكلة: Dependencies غير مثبتة
**الحل:**
```bash
rm -rf node_modules package-lock.json
npm install
cd client
rm -rf node_modules package-lock.json
npm install
```

### مشكلة: Database connection error
**الحل:**
1. تحقق من `DATABASE_URL` في `.env`
2. تأكد من أن PostgreSQL يعمل
3. تحقق من الصلاحيات

---

## 📚 الخطوات التالية

بعد التثبيت:
1. ✅ سجل دخول: `admin@alsaqi.com` / `123456`
2. ✅ جرب Real-time updates
3. ✅ جرب PWA install
4. ✅ جرب جميع الصفحات

---

**تم التثبيت بنجاح!** 🎉
