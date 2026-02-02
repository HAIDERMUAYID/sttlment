/**
 * سكربت مستقل لتوليد المهام اليومية — يُشغّل يدوياً أو من جدولة النظام (مثلاً crontab).
 * يستخدم الخدمة المشتركة نفسها التي يستخدمها الخادم والـ API.
 */
require('dotenv').config();
const { runGenerateDailyTasks } = require('../services/dailyTaskGenerator');

async function main() {
  try {
    const result = await runGenerateDailyTasks();
    console.log(`✅ اكتمل توليد المهام: ${result.generated} تم إنشاؤها، ${result.skipped} تم تخطيها`);
  } catch (error) {
    console.error('❌ خطأ في توليد المهام:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
