const path = require('path');
const fs = require('fs');

/**
 * المسار الأساسي لملفات الرفع (للتخزين الدائم يمكن استخدام UPLOAD_PATH،
 * مثلاً قرص مستمر في Render أو مسار ثابت على السيرفر).
 */
function getUploadsBase() {
  return process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
}

/**
 * مجلد الصور الشخصية داخل المسار الأساسي.
 */
function getAvatarsDir() {
  const dir = path.join(getUploadsBase(), 'avatars');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

module.exports = { getUploadsBase, getAvatarsDir };
