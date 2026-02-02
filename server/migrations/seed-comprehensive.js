const path = require('path');
const fs = require('fs');
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

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 بدء إنشاء البيانات الشاملة...\n');
    
    // ========== 1. المستخدمين (20 موظف + إداريين) ==========
    console.log('📝 إنشاء المستخدمين...');
    const password = await bcrypt.hash('123456', 10);
    
    const users = [
      // إداريون
      { name: 'أحمد محمد علي', email: 'admin@alsaqi.com', role: 'admin', active: true, canCreateAdHoc: true },
      { name: 'سارة خالد', email: 'supervisor@alsaqi.com', role: 'supervisor', active: true, canCreateAdHoc: true },
      { name: 'محمود عبدالله', email: 'supervisor2@alsaqi.com', role: 'supervisor', active: true, canCreateAdHoc: true },
      
      // موظفون (20 موظف)
      { name: 'محمد حسن', email: 'employee1@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'فاطمة أحمد', email: 'employee2@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'خالد إبراهيم', email: 'employee3@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'نورا سعد', email: 'employee4@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'علي محمود', email: 'employee5@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'ليلى كريم', email: 'employee6@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'يوسف سالم', email: 'employee7@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'ريم عبدالرحمن', email: 'employee8@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'طارق ناصر', email: 'employee9@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'هدى ماجد', email: 'employee10@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'باسم وليد', email: 'employee11@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'سمر رضا', email: 'employee12@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'عمر فاروق', email: 'employee13@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'ميساء حامد', email: 'employee14@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'زياد كمال', email: 'employee15@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'دانا عادل', email: 'employee16@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'رامي شاكر', email: 'employee17@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'لينا طارق', email: 'employee18@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'مروان سامي', email: 'employee19@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'تالا نادر', email: 'employee20@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
    ];
    
    const userIds = {};
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, active, can_create_ad_hoc)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email`,
        [user.name, user.email, password, user.role, user.active, user.canCreateAdHoc]
      );
      if (result.rows.length > 0) {
        userIds[user.email] = result.rows[0].id;
        console.log(`   ✅ ${user.name} (${user.role})`);
      }
    }
    
    // ========== 2. الفئات (موسعة) ==========
    console.log('\n📁 إنشاء الفئات...');
    const categories = [
      { name: 'تسويات البنوك', description: 'مطابقة وتسوية المعاملات البنكية اليومية' },
      { name: 'مطابقة التحصيلات الحكومية', description: 'مطابقة التحصيلات مع الجهات الحكومية المختلفة' },
      { name: 'الرسائل الرسمية / الردود', description: 'معالجة الرسائل الرسمية والرد عليها' },
      { name: 'التقارير', description: 'إعداد وتقديم التقارير الدورية والخاصة' },
      { name: 'معالجة فروقات المطابقة', description: 'حل ومعالجة فروقات المطابقة' },
      { name: 'منصات / دعم Power BI', description: 'دعم وإدارة منصات Power BI' },
      { name: 'متابعة البنوك / الاتصالات', description: 'متابعة الاتصالات والمراسلات مع البنوك' },
      { name: 'تسويات RTGS', description: 'تسويات نظام RTGS' },
      { name: 'مطابقة التحويلات', description: 'مطابقة التحويلات البنكية' },
      { name: 'مراجعة الحسابات', description: 'مراجعة الحسابات اليومية' },
      { name: 'متابعة المطالبات', description: 'متابعة المطالبات المالية' },
      { name: 'تسويات نهاية الشهر', description: 'تسويات نهاية الشهر' },
    ];
    
    const categoryIds = {};
    for (const cat of categories) {
      const result = await client.query(
        `INSERT INTO categories (name, description, active)
         VALUES ($1, $2, $3)
         RETURNING id, name`,
        [cat.name, cat.description, true]
      );
      if (result.rows.length > 0) {
        categoryIds[cat.name] = result.rows[0].id;
        console.log(`   ✅ ${cat.name}`);
      }
    }
    
    // ========== 3. قوالب المهام (موسعة) ==========
    console.log('\n📝 إنشاء قوالب المهام...');
    const templates = [
      // تسويات البنوك
      { title: 'تسويات مصرف الرشيد', category: 'تسويات البنوك', description: 'عمل تسويات مصرف الرشيد اليومية - مطابقة المعاملات والتحقق من الفروقات' },
      { title: 'تسويات البنك الأهلي', category: 'تسويات البنوك', description: 'عمل تسويات البنك الأهلي اليومية - مراجعة المعاملات والمطابقة' },
      { title: 'تسويات البنك المركزي', category: 'تسويات البنوك', description: 'تسويات البنك المركزي - معالجة المعاملات اليومية' },
      { title: 'تسويات البنك العراقي للتجارة', category: 'تسويات البنوك', description: 'تسويات البنك العراقي للتجارة اليومية' },
      { title: 'تسويات بنك الرافدين', category: 'تسويات البنوك', description: 'تسويات بنك الرافدين - مراجعة المعاملات' },
      { title: 'تسويات RTGS - مصرف الرشيد', category: 'تسويات RTGS', description: 'تسويات RTGS لمصرف الرشيد' },
      { title: 'تسويات RTGS - البنك الأهلي', category: 'تسويات RTGS', description: 'تسويات RTGS للبنك الأهلي' },
      
      // مطابقة التحصيلات الحكومية
      { title: 'مطابقة تحصيلات الكهرباء', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات شركة الكهرباء مع السجلات' },
      { title: 'مطابقة تحصيلات المياه', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات شركة المياه' },
      { title: 'عمولة صندوق شهداء الشرطة', category: 'مطابقة التحصيلات الحكومية', description: 'عمولة صندوق شهداء الشرطة الشهرية - معالجة العمولات' },
      { title: 'مطابقة تحصيلات الهاتف', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات شركة الهاتف' },
      { title: 'مطابقة تحصيلات الضرائب', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات الضرائب' },
      
      // الرسائل الرسمية
      { title: 'الرد على الكتب الرسمية', category: 'الرسائل الرسمية / الردود', description: 'الرد على الكتب والرسائل الرسمية الواردة من الجهات المختلفة' },
      { title: 'إعداد كتاب رسمي', category: 'الرسائل الرسمية / الردود', description: 'إعداد كتاب رسمي للجهات الخارجية والبنوك' },
      { title: 'متابعة المراسلات', category: 'الرسائل الرسمية / الردود', description: 'متابعة المراسلات الرسمية' },
      
      // التقارير
      { title: 'تقرير الأداء الأسبوعي', category: 'التقارير', description: 'إعداد تقرير الأداء الأسبوعي - ملخص الإنجازات والمهام' },
      { title: 'تقرير حركات اليوم', category: 'التقارير', description: 'تقرير حركات اليوم - ملخص المعاملات اليومية' },
      { title: 'تقرير المطابقة الشهري', category: 'التقارير', description: 'تقرير المطابقة الشهري - تحليل شامل للمطابقات' },
      { title: 'تقرير نهاية الشهر', category: 'التقارير', description: 'تقرير شامل لنهاية الشهر' },
      
      // معالجة فروقات المطابقة
      { title: 'معالجة فروقات مصرف الرشيد', category: 'معالجة فروقات المطابقة', description: 'معالجة فروقات المطابقة مع مصرف الرشيد' },
      { title: 'معالجة فروقات البنك الأهلي', category: 'معالجة فروقات المطابقة', description: 'معالجة فروقات المطابقة مع البنك الأهلي' },
      
      // متابعة البنوك
      { title: 'متابعة اتصالات مصرف الرشيد', category: 'متابعة البنوك / الاتصالات', description: 'متابعة الاتصالات والمراسلات مع مصرف الرشيد' },
      { title: 'متابعة اتصالات البنك الأهلي', category: 'متابعة البنوك / الاتصالات', description: 'متابعة الاتصالات والمراسلات مع البنك الأهلي' },
      
      // أخرى
      { title: 'مراجعة الحسابات اليومية', category: 'مراجعة الحسابات', description: 'مراجعة الحسابات اليومية' },
      { title: 'متابعة المطالبات المالية', category: 'متابعة المطالبات', description: 'متابعة المطالبات المالية المعلقة' },
      { title: 'تسويات نهاية الشهر - مصرف الرشيد', category: 'تسويات نهاية الشهر', description: 'تسويات نهاية الشهر لمصرف الرشيد' },
      { title: 'تسويات نهاية الشهر - البنك الأهلي', category: 'تسويات نهاية الشهر', description: 'تسويات نهاية الشهر للبنك الأهلي' },
    ];
    
    const templateIds = {};
    for (const tpl of templates) {
      const result = await client.query(
        `INSERT INTO task_templates (title, category_id, description, active)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title`,
        [tpl.title, categoryIds[tpl.category], tpl.description, true]
      );
      if (result.rows.length > 0) {
        templateIds[tpl.title] = result.rows[0].id;
        console.log(`   ✅ ${tpl.title}`);
      }
    }
    
    // ========== 4. الجداول الزمنية (موسعة) ==========
    console.log('\n📅 إنشاء الجداول الزمنية...');
    const schedules = [
      // يومية
      { template: 'تسويات مصرف الرشيد', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '09:00', assignee: 'employee1@alsaqi.com' },
      { template: 'تسويات البنك الأهلي', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '09:30', assignee: 'employee2@alsaqi.com' },
      { template: 'تسويات البنك المركزي', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '10:00', assignee: 'employee3@alsaqi.com' },
      { template: 'تسويات البنك العراقي للتجارة', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '10:30', assignee: 'employee4@alsaqi.com' },
      { template: 'تسويات بنك الرافدين', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '11:00', assignee: 'employee5@alsaqi.com' },
      { template: 'مطابقة تحصيلات الكهرباء', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '12:00', assignee: 'employee6@alsaqi.com' },
      { template: 'مطابقة تحصيلات المياه', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '12:30', assignee: 'employee7@alsaqi.com' },
      { template: 'تسويات RTGS - مصرف الرشيد', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '13:00', assignee: 'employee8@alsaqi.com' },
      { template: 'تسويات RTGS - البنك الأهلي', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '13:30', assignee: 'employee9@alsaqi.com' },
      { template: 'مراجعة الحسابات اليومية', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '14:00', assignee: 'employee10@alsaqi.com' },
      { template: 'تقرير حركات اليوم', frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5], dueTime: '15:00', assignee: 'employee11@alsaqi.com' },
      
      // أسبوعية
      { template: 'تقرير الأداء الأسبوعي', frequency: 'weekly', dayOfWeekSingle: 0, dueTime: '14:00', assignee: 'supervisor@alsaqi.com' },
      { template: 'تقرير المطابقة الشهري', frequency: 'weekly', dayOfWeekSingle: 6, dueTime: '16:00', assignee: 'supervisor2@alsaqi.com' },
      
      // شهرية
      { template: 'عمولة صندوق شهداء الشرطة', frequency: 'monthly', dayOfMonth: 1, dueTime: '08:00', assignee: 'employee12@alsaqi.com' },
      { template: 'تسويات نهاية الشهر - مصرف الرشيد', frequency: 'monthly', dayOfMonth: 28, dueTime: '09:00', assignee: 'employee13@alsaqi.com' },
      { template: 'تسويات نهاية الشهر - البنك الأهلي', frequency: 'monthly', dayOfMonth: 28, dueTime: '10:00', assignee: 'employee14@alsaqi.com' },
      { template: 'تقرير نهاية الشهر', frequency: 'monthly', dayOfMonth: 30, dueTime: '15:00', assignee: 'supervisor@alsaqi.com' },
    ];
    
    const scheduleIds = {};
    for (const sched of schedules) {
      const result = await client.query(
        `INSERT INTO schedules (template_id, frequency_type, days_of_week, day_of_week_single, day_of_month, due_time, default_assignee_user_id, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          templateIds[sched.template],
          sched.frequency,
          sched.frequency === 'daily' ? sched.daysOfWeek : null,
          sched.frequency === 'weekly' ? sched.dayOfWeekSingle : null,
          sched.frequency === 'monthly' ? sched.dayOfMonth : null,
          sched.dueTime,
          userIds[sched.assignee],
          true
        ]
      );
      if (result.rows.length > 0) {
        scheduleIds[sched.template] = result.rows[0].id;
        console.log(`   ✅ ${sched.template} (${sched.frequency})`);
      }
    }
    
    // ========== 5. إنشاء المهام اليومية للشهر الماضي والحالي ==========
    console.log('\n📋 إنشاء المهام اليومية (آخر 30 يوم)...');
    const today = getTodayBaghdad();
    const now = moment.tz('Asia/Baghdad');
    let dailyTasksCreated = 0;
    
    // إنشاء مهام للـ 30 يوم الماضية
    for (let i = 0; i < 30; i++) {
      const taskDate = now.clone().subtract(i, 'days');
      const dayOfWeek = taskDate.day();
      const dayOfMonth = taskDate.date();
      
      // المهام اليومية
      for (const sched of schedules) {
        if (sched.frequency === 'daily' && sched.daysOfWeek.includes(dayOfWeek)) {
          const dueDateTime = combineDateAndTimeBaghdadToUTC(
            taskDate.format('YYYY-MM-DD'),
            sched.dueTime
          );
          
          await client.query(
            `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (schedule_id, task_date) DO NOTHING`,
            [
              scheduleIds[sched.template],
              templateIds[sched.template],
              userIds[sched.assignee],
              taskDate.format('YYYY-MM-DD'),
              dueDateTime,
              i < 5 ? 'completed' : (i < 10 ? 'pending' : 'completed') // بعض مكتملة وبعض معلقة
            ]
          );
          dailyTasksCreated++;
        }
        
        // المهام الأسبوعية
        if (sched.frequency === 'weekly' && sched.dayOfWeekSingle !== undefined && sched.dayOfWeekSingle === dayOfWeek) {
          const dueDateTime = combineDateAndTimeBaghdadToUTC(
            taskDate.format('YYYY-MM-DD'),
            sched.dueTime
          );
          
          await client.query(
            `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (schedule_id, task_date) DO NOTHING`,
            [
              scheduleIds[sched.template],
              templateIds[sched.template],
              userIds[sched.assignee],
              taskDate.format('YYYY-MM-DD'),
              dueDateTime,
              'completed'
            ]
          );
          dailyTasksCreated++;
        }
        
        // المهام الشهرية
        if (sched.frequency === 'monthly' && sched.dayOfMonth !== undefined && sched.dayOfMonth === dayOfMonth) {
          const dueDateTime = combineDateAndTimeBaghdadToUTC(
            taskDate.format('YYYY-MM-DD'),
            sched.dueTime
          );
          
          await client.query(
            `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (schedule_id, task_date) DO NOTHING`,
            [
              scheduleIds[sched.template],
              templateIds[sched.template],
              userIds[sched.assignee],
              taskDate.format('YYYY-MM-DD'),
              dueDateTime,
              'completed'
            ]
          );
          dailyTasksCreated++;
        }
      }
    }
    console.log(`   ✅ تم إنشاء ${dailyTasksCreated} مهمة يومية`);
    
    // ========== 5.5. إضافة مهام منجزة ومعلقة لتاريخ اليوم لكل الموظفين ==========
    console.log('\n📋 إضافة مهام لتاريخ اليوم لكل الموظفين...');
    const todayStr = typeof today === 'string' ? today : today.format('YYYY-MM-DD');
    let todayTasksCreated = 0;
    
    // جلب جميع الموظفين
    const employeesResult = await client.query(
      `SELECT id FROM users WHERE role = 'employee' AND active = true`
    );
    
    // جلب بعض القوالب
    const templatesResult = await client.query(
      `SELECT id, title, category_id FROM task_templates LIMIT 10`
    );
    
    if (templatesResult.rows.length > 0 && employeesResult.rows.length > 0) {
      for (const employee of employeesResult.rows) {
        // إنشاء 2-4 مهام لكل موظف (بعضها منجزة وبعضها معلقة)
        const numTasks = Math.floor(Math.random() * 3) + 2; // 2-4 مهام
        
        for (let i = 0; i < numTasks; i++) {
          const template = templatesResult.rows[Math.floor(Math.random() * templatesResult.rows.length)];
          const dueTime = `${Math.floor(Math.random() * 8) + 9}:${Math.random() > 0.5 ? '00' : '30'}`; // 9:00 - 16:30
          const dueDateTime = combineDateAndTimeBaghdadToUTC(todayStr, dueTime);
          
          // 60% منجزة، 40% معلقة
          const status = Math.random() > 0.4 ? 'completed' : 'pending';
          
          // للمهام الإضافية لتاريخ اليوم، نستخدم schedule_id = null دائماً لتجنب conflict
          // لأن constraint يمنع إدراج مهام متعددة لنفس schedule_id و task_date
          const scheduleId = null;
          
          // التحقق من عدم وجود مهمة مسبقة لنفس الموظف والقالب والتاريخ
          const existingTask = await client.query(
            `SELECT id FROM daily_tasks 
             WHERE assigned_to_user_id = $1 
               AND template_id = $2 
               AND task_date = $3 
               AND schedule_id IS NULL
             LIMIT 1`,
            [employee.id, template.id, todayStr]
          );
          
          let taskId = null;
          if (existingTask.rows.length === 0) {
            const taskResult = await client.query(
              `INSERT INTO daily_tasks (schedule_id, template_id, assigned_to_user_id, task_date, due_date_time, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
              [
                scheduleId,
                template.id,
                employee.id,
                todayStr,
                dueDateTime,
                status
              ]
            );
            if (taskResult.rows.length > 0) {
              taskId = taskResult.rows[0].id;
            }
          } else {
            taskId = existingTask.rows[0].id;
            // تحديث حالة المهمة الموجودة
            await client.query(
              `UPDATE daily_tasks SET status = $1 WHERE id = $2`,
              [status, taskId]
            );
          }
          
          if (taskId && status === 'completed') {
            // إذا كانت منجزة، أضف task execution
            const dueTimeMoment = toBaghdadTime(dueDateTime);
            // وقت التنفيذ: بين الوقت المطلوب وبعد ساعتين
            const doneAt = dueTimeMoment.clone().add(Math.floor(Math.random() * 120), 'minutes');
            const isLate = doneAt.isAfter(dueTimeMoment.clone().add(30, 'minutes'));
            const resultStatus = isLate ? 'completed_late' : 'completed';
            const durationMinutes = Math.floor(Math.random() * 60) + 15; // 15-75 دقيقة
            
            // التحقق من عدم وجود تنفيذ مسبق
            const existingExec = await client.query(
              `SELECT id FROM task_executions WHERE daily_task_id = $1 LIMIT 1`,
              [taskId]
            );
            
            if (existingExec.rows.length === 0) {
              await client.query(
                `INSERT INTO task_executions (daily_task_id, done_by_user_id, done_at, result_status, duration_minutes, notes)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  taskId,
                  employee.id,
                  doneAt.toDate(),
                  resultStatus,
                  durationMinutes,
                  Math.random() > 0.7 ? 'تم التنفيذ بنجاح' : null
                ]
              );
            }
          }
          
          todayTasksCreated++;
        }
      }
    }
    console.log(`   ✅ تم إنشاء ${todayTasksCreated} مهمة لتاريخ اليوم`);
    
    // ========== 6. إنشاء تنفيذ المهام (Task Executions) ==========
    console.log('\n✅ إنشاء تنفيذ المهام...');
    const dailyTasksResult = await client.query(
      `SELECT id, assigned_to_user_id, due_date_time, task_date, status
       FROM daily_tasks
       WHERE status = 'completed'
       ORDER BY task_date DESC
       LIMIT 500`
    );
    
    let executionsCreated = 0;
    for (const task of dailyTasksResult.rows) {
      // بعض المهام نفذها نفس الموظف، وبعضها نفذها موظف آخر (coverage)
      const executorEmail = Math.random() > 0.3 
        ? Object.keys(userIds).find(email => userIds[email] === task.assigned_to_user_id && email.includes('employee'))
        : Object.keys(userIds).find(email => email.includes('employee') && userIds[email] !== task.assigned_to_user_id);
      
      if (!executorEmail) continue;
      
      const dueTime = toBaghdadTime(task.due_date_time);
      const doneAt = dueTime.clone().add(Math.floor(Math.random() * 120), 'minutes'); // 0-120 دقيقة بعد الوقت المطلوب
      const isLate = doneAt.isAfter(dueTime.clone().add(30, 'minutes'));
      const resultStatus = isLate ? 'completed_late' : 'completed';
      const durationMinutes = Math.floor(Math.random() * 60) + 15; // 15-75 دقيقة
      
      // التحقق من عدم وجود تنفيذ مسبق
      const existingExecution = await client.query(
        `SELECT id FROM task_executions WHERE daily_task_id = $1 LIMIT 1`,
        [task.id]
      );
      
      if (existingExecution.rows.length === 0) {
        await client.query(
          `INSERT INTO task_executions (daily_task_id, done_by_user_id, done_at, result_status, duration_minutes, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            task.id,
            userIds[executorEmail],
            doneAt.toDate(),
            resultStatus,
            durationMinutes,
            Math.random() > 0.7 ? 'تم التنفيذ بنجاح' : null
          ]
        );
        executionsCreated++;
      }
    }
    console.log(`   ✅ تم إنشاء ${executionsCreated} تنفيذ مهمة`);
    
    // ========== 7. المهام الإضافية (Ad-hoc Tasks) ==========
    console.log('\n📋 إنشاء المهام الإضافية...');
    const adHocTemplates = [
      'الرد على الكتب الرسمية',
      'إعداد كتاب رسمي',
      'متابعة المراسلات',
      'معالجة فروقات مصرف الرشيد',
      'معالجة فروقات البنك الأهلي',
      'متابعة المطالبات المالية',
      'متابعة اتصالات مصرف الرشيد',
      'متابعة اتصالات البنك الأهلي',
    ];
    
    let adHocCreated = 0;
    // إنشاء مهام إضافية للـ 30 يوم الماضية
    for (let i = 0; i < 30; i++) {
      const taskDate = now.clone().subtract(i, 'days');
      const numTasks = Math.floor(Math.random() * 3) + 1; // 1-3 مهام لكل يوم
      
      for (let j = 0; j < numTasks; j++) {
        const templateTitle = adHocTemplates[Math.floor(Math.random() * adHocTemplates.length)];
        const createdBy = Object.keys(userIds).find(email => 
          (email.includes('supervisor') || email.includes('admin')) && Math.random() > 0.5
        ) || 'supervisor@alsaqi.com';
        const assignedTo = Object.keys(userIds).find(email => 
          email.includes('employee') && Math.random() > 0.5
        ) || 'employee1@alsaqi.com';
        
        const dueDate = taskDate.clone().add(Math.floor(Math.random() * 3), 'days');
        const dueDateTime = combineDateAndTimeBaghdadToUTC(
          dueDate.format('YYYY-MM-DD'),
          `${Math.floor(Math.random() * 8) + 9}:00` // 9:00 - 16:00
        );
        
        const status = Math.random() > 0.4 ? 'completed' : 'pending';
        
        await client.query(
          `INSERT INTO ad_hoc_tasks (template_id, category_id, created_by_user_id, assigned_to_user_id, title, description, due_date_time, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            templateIds[templateTitle] || null,
            categoryIds['الرسائل الرسمية / الردود'] || categoryIds['معالجة فروقات المطابقة'] || categoryIds['متابعة البنوك / الاتصالات'],
            userIds[createdBy],
            userIds[assignedTo],
            `${templateTitle} - ${taskDate.format('YYYY-MM-DD')}`,
            `مهمة إضافية تم إنشاؤها في ${taskDate.format('YYYY-MM-DD')}`,
            dueDateTime,
            status
          ]
        );
        adHocCreated++;
        
        // إذا كانت مكتملة، أضف تنفيذ
        if (status === 'completed') {
          const doneAt = dueDate.clone().add(Math.floor(Math.random() * 60), 'minutes');
          const isLate = doneAt.isAfter(dueDateTime);
          const resultStatus = isLate ? 'completed_late' : 'completed';
          
          const adHocIdResult = await client.query(
            `SELECT id FROM ad_hoc_tasks WHERE title = $1 AND created_by_user_id = $2 ORDER BY id DESC LIMIT 1`,
            [`${templateTitle} - ${taskDate.format('YYYY-MM-DD')}`, userIds[createdBy]]
          );
          
          if (adHocIdResult.rows.length > 0) {
            await client.query(
              `INSERT INTO task_executions (ad_hoc_task_id, done_by_user_id, done_at, result_status, duration_minutes)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                adHocIdResult.rows[0].id,
                userIds[assignedTo],
                doneAt.toDate(),
                resultStatus,
                Math.floor(Math.random() * 60) + 20
              ]
            );
          }
        }
      }
    }
    console.log(`   ✅ تم إنشاء ${adHocCreated} مهمة إضافية`);
    
    // ========== 8. الحضور (آخر 30 يوم) ==========
    console.log('\n👥 تسجيل الحضور (آخر 30 يوم)...');
    const loginTimes = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:05', '09:10', '08:20', '08:35', '08:50'];
    let attendanceCreated = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = now.clone().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let timeIndex = 0;
      
      for (const email of Object.keys(userIds)) {
        if (email.includes('employee') || email.includes('supervisor') || email.includes('admin')) {
          // 95% حضور
          if (Math.random() > 0.05) {
            const loginTime = moment.tz(loginTimes[timeIndex % loginTimes.length], 'HH:mm', 'Asia/Baghdad');
            const loginDateTime = loginTime.clone().set({
              year: date.year(),
              month: date.month(),
              date: date.date()
            });
            
            await client.query(
              `INSERT INTO attendance (user_id, date, first_login_at)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, date) DO NOTHING`,
              [userIds[email], dateStr, loginDateTime.toDate()]
            );
            attendanceCreated++;
          }
          timeIndex++;
        }
      }
    }
    console.log(`   ✅ تم تسجيل ${attendanceCreated} سجل حضور`);
    
    // ========== 9. إعدادات TV Dashboard ==========
    console.log('\n📺 إعدادات لوحة التحكم التلفزيونية...');
    await client.query(
      `INSERT INTO settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [
        'tv_dashboard',
        JSON.stringify({
          slideInterval: 10,
          autoRefresh: true,
          refreshInterval: 30
        }),
        'إعدادات لوحة التحكم التلفزيونية'
      ]
    );
    console.log('   ✅ تم حفظ الإعدادات');
    
    await client.query('COMMIT');
    
    console.log('\n✅ تم إنشاء البيانات الشاملة بنجاح!\n');
    console.log('📊 ملخص البيانات:');
    console.log(`   👥 المستخدمين: ${users.length}`);
    console.log(`   📁 الفئات: ${categories.length}`);
    console.log(`   📝 قوالب المهام: ${templates.length}`);
    console.log(`   📅 الجداول: ${schedules.length}`);
    console.log(`   📋 المهام اليومية: ${dailyTasksCreated}`);
    console.log(`   ✅ تنفيذ المهام: ${executionsCreated}`);
    console.log(`   📋 المهام الإضافية: ${adHocCreated}`);
    console.log(`   👥 سجلات الحضور: ${attendanceCreated}`);
    console.log('\n📧 بيانات تسجيل الدخول (كلمة المرور: 123456):');
    console.log('   👤 المدير: admin@alsaqi.com');
    console.log('   👤 المشرف: supervisor@alsaqi.com');
    console.log('   👤 المشرف 2: supervisor2@alsaqi.com');
    console.log('   👤 موظفين: employee1@alsaqi.com إلى employee20@alsaqi.com');
    console.log('\n💡 يمكنك استخدام صفحة تسجيل الدخول السريع (/quick-login) للاختبار السريع!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء البيانات:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    console.log('✅ اكتمل إنشاء البيانات الشاملة');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل إنشاء البيانات الشاملة:', error);
    process.exit(1);
  });
