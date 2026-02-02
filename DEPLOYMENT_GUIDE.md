# 🚀 دليل النشر - Deployment Guide

## 📋 المتطلبات

- Node.js 16+
- PostgreSQL 12+
- npm أو yarn

---

## 🌐 النشر على Render

### 1. إعداد قاعدة البيانات

1. أنشئ **PostgreSQL Database** على Render
2. احفظ **Internal Database URL** (للـ Backend)
3. احفظ **External Database URL** (للـ Development)

### 2. إعداد Web Service

1. اربط المستودع من GitHub
2. **Build Command:**
   ```bash
   npm install && cd client && npm install && cd .. && npm run build
   ```
3. **Start Command:**
   ```bash
   npm start
   ```
4. **Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://... (Internal URL)
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d
   TIMEZONE=Asia/Baghdad
   WS_URL=wss://your-app.onrender.com
   ```

### 3. إعداد Frontend Environment

في `client/.env`:
```env
REACT_APP_WS_URL=wss://your-app.onrender.com
```

---

## 🔧 النشر على Vercel (Frontend فقط)

### 1. إعداد Vercel

1. اربط المستودع
2. **Root Directory:** `client`
3. **Build Command:** `npm run build`
4. **Output Directory:** `build`

### 2. Environment Variables

```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_WS_URL=wss://your-backend.onrender.com
```

---

## 🐳 النشر باستخدام Docker

### 1. إنشاء Dockerfile

**Dockerfile (Backend):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001

CMD ["npm", "start"]
```

**Dockerfile (Frontend):**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: sttlment
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: .
    ports:
      - "5001:5001"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/sttlment
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres

  frontend:
    build:
      context: ./client
    ports:
      - "3000:80"
    depends_on:
      - backend
```

---

## 🔐 Security Checklist

### قبل النشر

- [ ] تغيير `JWT_SECRET` إلى قيمة قوية
- [ ] تعطيل Debug mode في Production
- [ ] تفعيل HTTPS
- [ ] إعداد CORS بشكل صحيح
- [ ] تفعيل Rate Limiting
- [ ] إخفاء Environment Variables
- [ ] تحديث Dependencies
- [ ] فحص Security vulnerabilities

### Environment Variables

**لا تضع في Git:**
- `JWT_SECRET`
- `DATABASE_URL`
- أي معلومات حساسة

---

## 📊 Monitoring

### Health Check

```bash
curl https://your-app.onrender.com/api/auth/verify
```

### WebSocket Check

افتح Console في المتصفح:
```javascript
const ws = new WebSocket('wss://your-app.onrender.com/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('Connected');
```

---

## 🐛 Troubleshooting

### Backend لا يعمل
1. تحقق من Logs في Render
2. تحقق من Environment Variables
3. تحقق من Database connection

### Frontend لا يعمل
1. تحقق من Build logs
2. تحقق من Environment Variables
3. تحقق من API URL

### WebSocket لا يتصل
1. تحقق من `WS_URL` في Environment Variables
2. تأكد من استخدام `wss://` في Production
3. تحقق من CORS settings

---

## 📈 Performance

### Optimization Tips

1. **Enable Compression:**
   ```javascript
   app.use(compression());
   ```

2. **Cache Static Files:**
   ```javascript
   app.use(express.static('client/build', { maxAge: '1y' }));
   ```

3. **Database Indexing:**
   - أضف indexes على الأعمدة المستخدمة في WHERE

4. **CDN:**
   - استخدم CDN للـ static files

---

## ✅ Post-Deployment

1. ✅ اختبر جميع الصفحات
2. ✅ اختبر Real-time updates
3. ✅ اختبر Authentication
4. ✅ اختبر PWA install
5. ✅ اختبر على Mobile

---

**النشر جاهز!** 🎉
