# Design System — نظام التصميم الرسمي

## الاستخدام في Cursor
```
@design-system
```

---

## 1. Semantic Tokens (CSS Variables)

| المتغير | القيمة | الاستخدام |
|---------|--------|-----------|
| --primary-600 | #088395 | أساسي |
| --primary-700 | #09637e | Hover |
| --primary-800 | #026174 | Header/Active |
| --accent-300 | #7ab2b2 | Soft |
| --bg | #f6fafb | خلفية التطبيق |
| --surface | #ffffff | كروت، inputs |
| --surface-2 | #f1f5f9 | سطح ثانوي |
| --text-strong | #0f172a | عناوين |
| --text | #1e293b | نص عادي |
| --text-muted | #475569 | نص ثانوي |
| --placeholder | #94a3b8 | placeholder |
| --border | #e2e8f0 | حدود |
| --success | #16a34a | نجاح |
| --warning | #f59e0b | تحذير |
| --danger | #dc2626 | خطر |
| --info | #0ea5e9 | معلومات |
| --radius-lg | 14px | |
| --radius-md | 12px | |
| --shadow-soft | ... | ظل ناعم |
| --shadow-card | ... | ظل كروت |

---

## 2. Typography
- **Base:** 16px
- **Line-height:** 1.7 للعربي
- **Font:** Cairo, Tajawal
- العناوين: var(--text-strong)
- النص: var(--text)

---

## 3. مكونات DS
- `.ds-input` — حقول إدخال
- `.ds-btn-primary` — زر أساسي
- `.ds-btn-outline` — زر ثانوي
- `.ds-btn-ghost` — زر شفاف
- `.ds-btn-danger` — زر خطر (حذف)
- `.ds-table` — جدول حديث (sticky header، zebra، hover)
- `.ds-popover` — قائمة منسدلة
- `.ds-option` — خيار في القائمة

---

## 4. الملفات
- `client/src/styles/theme-formal.css`
- `client/src/index.css`
