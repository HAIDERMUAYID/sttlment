# 🚀 دليل البدء السريع - النسخة الجديدة

## الخطوات السريعة

### 1. تثبيت Dependencies

```bash
cd client
npm install
```

### 2. تشغيل النظام

```bash
# من المجلد الرئيسي
npm run dev

# أو من مجلد client
cd client
npm run dev
```

### 3. الوصول

افتح المتصفح على: `http://localhost:3000`

---

## 🔑 تسجيل الدخول

استخدم بيانات الاختبار من `TEST_DATA.md`:
- **Admin**: admin@alsaqi.com / admin123
- **Supervisor**: supervisor@alsaqi.com / supervisor123
- **Employee**: employee1@alsaqi.com / employee123

---

## 📁 الملفات المهمة

### المكونات الجديدة
- `client/src/components/ui/` - مكونات UI أساسية
- `client/src/components/layout/` - Layout components
- `client/src/store/` - State management
- `client/src/lib/` - Utilities و API

### الصفحات
- `client/src/pages/dashboard-v2.tsx` - Dashboard جديد

---

## 🎨 الميزات الجديدة

✅ **Dark Mode** - اضغط على أيقونة الشمس/القمر في Sidebar
✅ **Animations** - جميع الانتقالات سلسة
✅ **Loading States** - Skeleton loaders احترافية
✅ **Responsive** - يعمل على جميع الأجهزة

---

## 🐛 استكشاف الأخطاء

### خطأ في التثبيت
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port مستخدم
```bash
# غيّر Port في vite.config.js
server: {
  port: 3001, // بدلاً من 3000
}
```

### TypeScript errors
```bash
npm run type-check
```

---

## 📚 الخطوات التالية

1. ✅ اكتمل: البنية الأساسية والمكونات
2. 🔄 قيد العمل: إعادة بناء الصفحات
3. 📋 المتبقي: Real-time, PWA, Backend improvements

---

**استمتع بالنظام الجديد! 🎉**
