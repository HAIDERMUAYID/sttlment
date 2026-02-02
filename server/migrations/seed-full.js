/**
 * seed-full.js — بيانات تجريبية شاملة لاختبار النظام كاملاً
 * يشمل: المستخدمين، الفئات، المهام، الحضور، RTGS، CT، التجار، TV Dashboard
 *
 * الاستخدام:
 *   npm run seed:full
 *   أو بعد إعادة التعيين: npm run reset && npm run seed:full
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '..', '..');
const envPaths = [
  path.join(root, '.env'),
  path.join(root, 'server', 'config', '.env'),
  path.join(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) require('dotenv').config({ path: envPath, override: true });

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { getTodayBaghdad, combineDateAndTimeBaghdadToUTC, toBaghdadTime } = require('../utils/timezone');
const moment = require('moment-timezone');
const { seedMerchants } = require('./seed-merchants');

// inst_id من settlement_maps (الرشيد، الرافدين، الزراعي، العراقي للتجارة، إلخ)
const BANK_INST_IDS = ['1647', '1627', '1667', '1664', '1681', '1611', '1607'];

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function seedFull() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 بدء إنشاء البيانات التجريبية الشاملة...\n');

    // ========== 1. المستخدمين ==========
    console.log('📝 إنشاء المستخدمين...');
    const password = await bcrypt.hash('123456', 10);
    const users = [
      { name: 'أحمد محمد علي', email: 'admin@alsaqi.com', role: 'admin', active: true, canCreateAdHoc: true },
      { name: 'سارة خالد', email: 'supervisor@alsaqi.com', role: 'supervisor', active: true, canCreateAdHoc: true },
      { name: 'محمود عبدالله', email: 'supervisor2@alsaqi.com', role: 'supervisor', active: true, canCreateAdHoc: true },
      { name: 'محمد حسن', email: 'employee1@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'فاطمة أحمد', email: 'employee2@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'خالد إبراهيم', email: 'employee3@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'نورا سعد', email: 'employee4@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'علي محمود', email: 'employee5@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'ليلى كريم', email: 'employee6@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'يوسف سالم', email: 'employee7@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'ريم عبدالرحمن', email: 'employee8@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'طارق ناصر', email: 'employee9@alsaqi.com', role: 'accountant', active: true, canCreateAdHoc: false },
    ];

    const userIds = {};
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, active, can_create_ad_hoc)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role, active = EXCLUDED.active, can_create_ad_hoc = EXCLUDED.can_create_ad_hoc,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, email`,
        [user.name, user.email, password, user.role, user.active, user.canCreateAdHoc]
      );
      if (result.rows.length > 0) {
        userIds[user.email] = result.rows[0].id;
        console.log(`   ✅ ${user.name} (${user.role})`);
      }
    }
    const adminId = userIds['admin@alsaqi.com'];

    // ========== 2. الفئات ==========
    console.log('\n📁 إنشاء الفئات...');
    const categories = [
      { name: 'تسويات البنوك', description: 'مطابقة وتسوية المعاملات البنكية اليومية' },
      { name: 'مطابقة التحصيلات الحكومية', description: 'مطابقة التحصيلات مع الجهات الحكومية' },
      { name: 'الرسائل الرسمية / الردود', description: 'معالجة الرسائل الرسمية والرد عليها' },
      { name: 'التقارير', description: 'إعداد وتقديم التقارير الدورية' },
      { name: 'معالجة فروقات المطابقة', description: 'حل ومعالجة فروقات المطابقة' },
      { name: 'منصات / دعم Power BI', description: 'دعم وإدارة منصات Power BI' },
      { name: 'متابعة البنوك / الاتصالات', description: 'متابعة الاتصالات مع البنوك' },
      { name: 'تسويات RTGS', description: 'تسويات نظام RTGS' },
      { name: 'التسوية الحكومية مع المصارف', description: 'مهام يومية لمطابقة التسوية الحكومية مع مصارف RTGS' },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const existing = await client.query('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (existing.rows.length > 0) {
        categoryIds[cat.name] = existing.rows[0].id;
        console.log(`   ✅ ${cat.name} (موجود)`);
      } else {
        const result = await client.query(
          `INSERT INTO categories (name, description, active) VALUES ($1, $2, true) RETURNING id`,
          [cat.name, cat.description]
        );
        if (result.rows.length > 0) {
          categoryIds[cat.name] = result.rows[0].id;
          console.log(`   ✅ ${cat.name}`);
        }
      }
    }

    // ========== 3. قوالب المهام ==========
    console.log('\n📝 إنشاء قوالب المهام...');
    const templates = [
      { title: 'تسويات مصرف الرشيد', category: 'تسويات البنوك' },
      { title: 'تسويات البنك الأهلي', category: 'تسويات البنوك' },
      { title: 'تسويات بنك الرافدين', category: 'تسويات البنوك' },
      { title: 'تسويات البنك الزراعي', category: 'تسويات البنوك' },
      { title: 'مطابقة تحصيلات الكهرباء', category: 'مطابقة التحصيلات الحكومية' },
      { title: 'عمولة صندوق شهداء الشرطة', category: 'مطابقة التحصيلات الحكومية' },
      { title: 'الرد على الكتب الرسمية', category: 'الرسائل الرسمية / الردود' },
      { title: 'إعداد كتاب رسمي', category: 'الرسائل الرسمية / الردود' },
      { title: 'تقرير الأداء الأسبوعي', category: 'التقارير' },
      { title: 'تقرير حركات اليوم', category: 'التقارير' },
      { title: 'تسويات RTGS - الرشيد', category: 'تسويات RTGS' },
      { title: 'تسوية حكومية - الرشيد', category: 'التسوية الحكومية مع المصارف' },
      { title: 'تسوية حكومية - الرافدين', category: 'التسوية الحكومية مع المصارف' },
      { title: 'تسوية حكومية - الزراعي', category: 'التسوية الحكومية مع المصارف' },
    ];

    const templateIds = {};
    for (const t of templates) {
      const existing = await client.query('SELECT id FROM task_templates WHERE title = $1', [t.title]);
      if (existing.rows.length > 0) {
        templateIds[t.title] = existing.rows[0].id;
      } else {
        const result = await client.query(
          `INSERT INTO task_templates (title, category_id, description, active) VALUES ($1, $2, $3, true) RETURNING id`,
          [t.title, categoryIds[t.category], `قالب: ${t.title}`]
        );
        if (result.rows.length > 0) templateIds[t.title] = result.rows[0].id;
      }
    }
    console.log(`   ✅ ${Object.keys(templateIds).length} قالب`);

    // ========== 4. الجداول الزمنية ==========
    console.log('\n📅 إنشاء الجداول الزمنية...');
    const schedules = [
      { template: 'تسويات مصرف الرشيد', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '09:00', assignee: 'employee1@alsaqi.com' },
      { template: 'تسويات بنك الرافدين', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '09:30', assignee: 'employee2@alsaqi.com' },
      { template: 'تسويات البنك الزراعي', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '10:00', assignee: 'employee3@alsaqi.com' },
      { template: 'مطابقة تحصيلات الكهرباء', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '12:00', assignee: 'employee4@alsaqi.com' },
      { template: 'تقرير حركات اليوم', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '15:00', assignee: 'employee5@alsaqi.com' },
      { template: 'تقرير الأداء الأسبوعي', frequency: 'weekly', dayOfWeekSingle: 0, dueTime: '14:00', assignee: 'supervisor@alsaqi.com' },
      { template: 'عمولة صندوق شهداء الشرطة', frequency: 'monthly', dayOfMonth: 1, dueTime: '08:00', assignee: 'employee6@alsaqi.com' },
      { template: 'تسوية حكومية - الرشيد', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '11:00', assignee: 'employee7@alsaqi.com', settlementOffset: -1 },
      { template: 'تسوية حكومية - الرافدين', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '11:30', assignee: 'employee8@alsaqi.com', settlementOffset: -1 },
    ];

    const scheduleIds = {};
    for (const s of schedules) {
      const tid = templateIds[s.template];
      if (!tid) continue;
      const existing = await client.query(
        'SELECT id FROM schedules WHERE template_id = $1 AND due_time = $2::time LIMIT 1',
        [tid, s.dueTime]
      );
      if (existing.rows.length > 0) {
        scheduleIds[s.template] = existing.rows[0].id;
      } else {
        const settlementOffset = s.settlementOffset ?? 0;
        const result = await client.query(
          `INSERT INTO schedules (template_id, frequency_type, days_of_week, day_of_week_single, day_of_month, due_time, default_assignee_user_id, active, settlement_offset_days)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8) RETURNING id`,
          [
            tid,
            s.frequency,
            s.frequency === 'daily' ? s.daysOfWeek : null,
            s.frequency === 'weekly' ? s.dayOfWeekSingle : null,
            s.frequency === 'monthly' ? s.dayOfMonth : null,
            s.dueTime,
            userIds[s.assignee],
            settlementOffset,
          ]
        );
        if (result.rows.length > 0) scheduleIds[s.template] = result.rows[0].id;
      }
    }
    console.log(`   ✅ ${Object.keys(scheduleIds).length} جدول`);

    // ========== 5. المهام اليومية + تنفيذ ==========
    console.log('\n📋 إنشاء المهام اليومية وتنفيذها...');
    const today = getTodayBaghdad();
    const todayStr = typeof today === 'string' ? today : moment.tz('Asia/Baghdad').format('YYYY-MM-DD');
    const now = moment.tz('Asia/Baghdad');
    let dailyCount = 0;

    for (let i = 0; i < 21; i++) {
      const taskDate = now.clone().subtract(i, 'days');
      const dateStr = taskDate.format('YYYY-MM-DD');
      const dayOfWeek = taskDate.day();
      const dayOfMonth = taskDate.date();

      for (const s of schedules) {
        let match = false;
        if (s.frequency === 'daily' && s.daysOfWeek && s.daysOfWeek.includes(dayOfWeek)) match = true;
        if (s.frequency === 'weekly' && s.dayOfWeekSingle === dayOfWeek) match = true;
        if (s.frequency === 'monthly' && s.dayOfMonth === dayOfMonth) match = true;
        if (!match) continue;

        const tid = templateIds[s.template];
        const sid = scheduleIds[s.template];
        if (!tid || !sid) continue;

        const dueDateTime = combineDateAndTimeBaghdadToUTC(dateStr, s.dueTime);
        const status = i < 3 ? 'pending' : i < 10 ? (Math.random() > 0.3 ? 'completed' : 'pending') : 'completed';

        const insertResult = await client.query(
          `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status, target_settlement_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (schedule_id, task_date) DO UPDATE SET status = EXCLUDED.status
           RETURNING id`,
          [
            sid,
            tid,
            userIds[s.assignee],
            dateStr,
            dueDateTime,
            status,
            s.settlementOffset != null && s.settlementOffset !== 0
              ? taskDate.clone().add(s.settlementOffset, 'days').format('YYYY-MM-DD')
              : null,
          ]
        );

        const dtId = insertResult.rows[0]?.id;
        if (dtId && status === 'completed') {
          const doneAt = toBaghdadTime(dueDateTime).add(Math.floor(Math.random() * 90), 'minutes');
          const isLate = doneAt.isAfter(toBaghdadTime(dueDateTime).add(30, 'minutes'));
          const resultStatus = isLate ? 'completed_late' : 'completed';
          const catName = templates.find((t) => t.title === s.template)?.category;
          const isGovSettlement = catName === 'التسوية الحكومية مع المصارف';

          const existingTe = await client.query('SELECT id FROM task_executions WHERE daily_task_id = $1 LIMIT 1', [dtId]);
          if (existingTe.rows.length === 0) {
            const settlementDate = isGovSettlement ? (s.settlementOffset ? taskDate.clone().add(s.settlementOffset, 'days').format('YYYY-MM-DD') : dateStr) : null;
            const settlementValue = isGovSettlement ? Math.round((Math.random() * 500000 + 100000) * 100) / 100 : null;
            const verificationStatus = isGovSettlement ? 'matched' : null;
            await client.query(
              `INSERT INTO task_executions (daily_task_id, done_by_user_id, done_at, result_status, duration_minutes, settlement_date, settlement_value, verification_status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                dtId,
                userIds[s.assignee],
                doneAt.toDate(),
                resultStatus,
                Math.floor(Math.random() * 50) + 15,
                settlementDate,
                settlementValue,
                verificationStatus,
              ]
            );
          }
        }
        dailyCount++;
      }
    }
    console.log(`   ✅ ${dailyCount} مهمة يومية`);

    // ========== 6. المهام الإضافية + تنفيذ ==========
    console.log('\n📋 إنشاء المهام الإضافية...');
    const adHocTitles = ['الرد على كتاب رسمي', 'إعداد كتاب رسمي', 'متابعة فروقات المطابقة'];
    let adHocCount = 0;
    for (let i = 0; i < 25; i++) {
      const taskDate = now.clone().subtract(i, 'days');
      const assignedEmail = `employee${(i % 8) + 1}@alsaqi.com`;
      const status = Math.random() > 0.35 ? 'completed' : 'pending';
      const dueDateTime = combineDateAndTimeBaghdadToUTC(taskDate.format('YYYY-MM-DD'), '14:00');

      await client.query(
        `INSERT INTO ad_hoc_tasks (template_id, category_id, created_by_user_id, assigned_to_user_id, title, description, due_date_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          templateIds['الرد على الكتب الرسمية'],
          categoryIds['الرسائل الرسمية / الردود'],
          adminId,
          userIds[assignedEmail],
          `${adHocTitles[i % 3]} - ${taskDate.format('YYYY-MM-DD')}`,
          'مهمة تجريبية',
          dueDateTime,
          status,
        ]
      );

      const ahResult = await client.query(
        'SELECT id FROM ad_hoc_tasks WHERE title = $1 ORDER BY id DESC LIMIT 1',
        [`${adHocTitles[i % 3]} - ${taskDate.format('YYYY-MM-DD')}`]
      );
      if (ahResult.rows.length > 0 && status === 'completed') {
        const doneAt = taskDate.clone().add(10, 'hours').toDate();
        await client.query(
          `INSERT INTO task_executions (ad_hoc_task_id, done_by_user_id, done_at, result_status, duration_minutes)
           VALUES ($1, $2, $3, 'completed', $4)`,
          [ahResult.rows[0].id, userIds[assignedEmail], doneAt, Math.floor(Math.random() * 45) + 20]
        );
      }
      adHocCount++;
    }
    console.log(`   ✅ ${adHocCount} مهمة إضافية`);

    // ========== 7. الحضور ==========
    console.log('\n👥 تسجيل الحضور...');
    const loginTimes = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:05', '08:20', '08:50'];
    for (let i = 0; i < 30; i++) {
      const date = now.clone().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let idx = 0;
      for (const email of Object.keys(userIds)) {
        if (Math.random() > 0.08) {
          const lt = moment.tz(loginTimes[idx % loginTimes.length], 'HH:mm', 'Asia/Baghdad');
          const loginDt = lt.clone().set({ year: date.year(), month: date.month(), date: date.date() });
          await client.query(
            `INSERT INTO attendance (user_id, date, first_login_at) VALUES ($1, $2, $3)
             ON CONFLICT (user_id, date) DO NOTHING`,
            [userIds[email], dateStr, loginDt.toDate()]
          );
        }
        idx++;
      }
    }
    console.log(`   ✅ حضور آخر 30 يوم`);

    // ========== 8. RTGS + Import Logs ==========
    console.log('\n📊 إنشاء بيانات RTGS...');
    let rtgsCount = 0;
    try {
      const ilResult = await client.query(
        `INSERT INTO import_logs (user_id, filename, total_rows, inserted_rows, created_at)
         VALUES ($1, $2, 0, 0, $3) RETURNING id`,
        [adminId, 'seed_rtgs_full.csv', new Date()]
      );
      const importLogId = ilResult.rows[0]?.id;
      if (importLogId) {
        for (let d = 0; d < 7; d++) {
          const sttlDate = now.clone().subtract(d, 'days').format('YYYY-MM-DD');
          const txDate = moment.tz(sttlDate, 'Asia/Baghdad').add(10, 'hours').toDate();
          for (let r = 0; r < 15; r++) {
            const instId2 = BANK_INST_IDS[r % BANK_INST_IDS.length];
            const amount = Math.round((Math.random() * 800000 + 50000) * 100) / 100;
            const fees = Math.round(amount * 0.0025 * 100) / 100;
            const acq = Math.round(fees * 0.6 * 100) / 100;
            const sttle = Math.round((amount - fees) * 100) / 100;
            const rrn = `SEED${sttlDate.replace(/-/g, '')}${d}${r}${Date.now()}`;
            const rowHash = sha256(rrn + sttlDate + instId2 + amount);

            await client.query(
              `INSERT INTO rtgs (rrn, transaction_date, sttl_date, inst_id2, transaction_amount, amount, fees, acq, sttle, row_hash, import_log_id, curr)
               VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, 'IQD')
               ON CONFLICT (row_hash) DO NOTHING`,
              [rrn, txDate, sttlDate, instId2, amount, amount, fees, acq, sttle, rowHash, importLogId]
            );
            rtgsCount++;
          }
        }
        await client.query(
          'UPDATE import_logs SET total_rows = $1, inserted_rows = $2 WHERE id = $3',
          [rtgsCount, rtgsCount, importLogId]
        );
      }
      console.log(`   ✅ ${rtgsCount} سجل RTGS (14 يوم × 25 حركة/يوم)`);
    } catch (e) {
      console.log(`   ⚠️ RTGS: ${e.message} (قد يكون الجدول غير موجود)`);
    }

    // ========== 9. CT Records ==========
    console.log('\n📊 إنشاء سجلات CT...');
    try {
      for (let d = 0; d < 7; d++) {
        const fromDate = now.clone().subtract(d + 1, 'days').format('YYYY-MM-DD');
        const toDate = now.clone().subtract(d, 'days').format('YYYY-MM-DD');
        const ctValue = Math.round((Math.random() * 2000000 + 500000) * 100) / 100;
        const sumAcq = Math.round(ctValue * 0.6 * 100) / 100;
        const sumFees = Math.round(ctValue * 100) / 100;
        const matchStatus = Math.random() > 0.3 ? 'matched' : 'not_matched';
        await client.query(
          `INSERT INTO ct_records (sttl_date_from, sttl_date_to, ct_value, sum_acq, sum_fees, match_status, user_id)
           VALUES ($1::date, $2::date, $3, $4, $5, $6, $7)`,
          [fromDate, toDate, ctValue, sumAcq, sumFees, matchStatus, userIds['employee9@alsaqi.com']]
        );
      }
      console.log(`   ✅ 7 سجلات CT للمطابقة`);
    } catch (e) {
      if (!e.message.includes('unique') && !e.message.includes('duplicate')) {
        console.log(`   ⚠️ CT: ${e.message}`);
      }
    }

    // ========== 10. إعدادات TV Dashboard ==========
    console.log('\n📺 إعدادات لوحة التحكم التلفزيونية...');
    const tvSettings = {
      slideInterval: 10,
      autoRefresh: true,
      refreshInterval: 30,
      visitorMode: false,
      visibleEmployeeIds: [],
      visibleBankNames: [],
      enabledSlides: {
        opening: true,
        overview: true,
        scheduledTasks: true,
        additionalTasks: true,
        employee: true,
        employeeMonthly: true,
        overdue: true,
        attendance: true,
        coverage: true,
        categories: true,
        recognition: true,
        rtgsImportsToday: true,
        rtgsSettlementsByImport: true,
        ctMatching: true,
        governmentSettlements: true,
        governmentSettlementCards: true,
        monthlyScheduledByCategory: true,
        monthlyAdditionalByEmployee: true,
      },
    };
    await client.query(
      `INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['tv_dashboard', JSON.stringify(tvSettings), 'إعدادات لوحة التحكم التلفزيونية']
    );
    console.log(`   ✅ تم حفظ الإعدادات`);

    await client.query('COMMIT');

    // التجار (يستخدم اتصاله الخاص)
    console.log('\n📦 استيراد التجار...');
    try {
      await seedMerchants();
    } catch (e) {
      console.log(`   ⚠️ التجار: ${e.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ تم إنشاء البيانات التجريبية الشاملة بنجاح!');
    console.log('='.repeat(50));
    console.log('\n📧 بيانات تسجيل الدخول (كلمة المرور: 123456):');
    console.log('   👤 المدير: admin@alsaqi.com');
    console.log('   👤 المشرف: supervisor@alsaqi.com | supervisor2@alsaqi.com');
    console.log('   👤 موظف حسابات: employee9@alsaqi.com');
    console.log('   👤 موظفين: employee1@alsaqi.com — employee8@alsaqi.com');
    console.log('\n📌 تشغيل التطبيق: npm run dev');
    console.log('   TV Dashboard: /tv');
    console.log('   تسجيل دخول سريع: /quick-login\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    client.release();
  }
}

seedFull()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
