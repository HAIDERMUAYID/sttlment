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
const { getTodayBaghdad, combineDateAndTimeBaghdadToUTC } = require('../utils/timezone');
const moment = require('moment-timezone');

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 بدء إنشاء البيانات التجريبية...\n');
    
    // ========== 1. المستخدمين ==========
    console.log('📝 إنشاء المستخدمين...');
    const password = await bcrypt.hash('123456', 10);
    
    const users = [
      { name: 'أحمد محمد علي', email: 'admin@alsaqi.com', role: 'admin', active: true, canCreateAdHoc: true },
      { name: 'سارة خالد', email: 'supervisor@alsaqi.com', role: 'supervisor', active: true, canCreateAdHoc: true },
      { name: 'محمد حسن', email: 'employee1@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'فاطمة أحمد', email: 'employee2@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'خالد إبراهيم', email: 'employee3@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
      { name: 'نورا سعد', email: 'employee4@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: true },
      { name: 'علي محمود', email: 'employee5@alsaqi.com', role: 'employee', active: true, canCreateAdHoc: false },
    ];
    
    const userIds = {};
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, active, can_create_ad_hoc)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           active = EXCLUDED.active,
           can_create_ad_hoc = EXCLUDED.can_create_ad_hoc,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, email`,
        [user.name, user.email, password, user.role, user.active, user.canCreateAdHoc]
      );
      if (result.rows.length > 0) {
        userIds[user.email] = result.rows[0].id;
        console.log(`   ✅ ${user.name} (${user.role})`);
      }
    }
    
    // ========== 2. الفئات ==========
    console.log('\n📁 إنشاء الفئات...');
    const categories = [
      { name: 'تسويات البنوك', description: 'مطابقة وتسوية المعاملات البنكية اليومية' },
      { name: 'مطابقة التحصيلات الحكومية', description: 'مطابقة التحصيلات مع الجهات الحكومية المختلفة' },
      { name: 'الرسائل الرسمية / الردود', description: 'معالجة الرسائل الرسمية والرد عليها' },
      { name: 'التقارير', description: 'إعداد وتقديم التقارير الدورية والخاصة' },
      { name: 'معالجة فروقات المطابقة', description: 'حل ومعالجة فروقات المطابقة' },
      { name: 'منصات / دعم Power BI', description: 'دعم وإدارة منصات Power BI' },
      { name: 'متابعة البنوك / الاتصالات', description: 'متابعة الاتصالات والمراسلات مع البنوك' },
    ];
    
    const categoryIds = {};
    for (const cat of categories) {
      // التحقق من وجود الفئة أولاً
      const existing = await client.query('SELECT id FROM categories WHERE name = $1', [cat.name]);
      
      if (existing.rows.length > 0) {
        // تحديث الفئة الموجودة
        await client.query(
          `UPDATE categories SET description = $1, active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [cat.description, true, existing.rows[0].id]
        );
        categoryIds[cat.name] = existing.rows[0].id;
        console.log(`   ✅ ${cat.name} (محدث)`);
      } else {
        // إضافة فئة جديدة
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
    }
    
    // ========== 3. قوالب المهام ==========
    console.log('\n📝 إنشاء قوالب المهام...');
    const templates = [
      { title: 'تسويات مصرف الرشيد', category: 'تسويات البنوك', description: 'عمل تسويات مصرف الرشيد اليومية - مطابقة المعاملات والتحقق من الفروقات' },
      { title: 'تسويات البنك الأهلي', category: 'تسويات البنوك', description: 'عمل تسويات البنك الأهلي اليومية - مراجعة المعاملات والمطابقة' },
      { title: 'تسويات البنك المركزي', category: 'تسويات البنوك', description: 'تسويات البنك المركزي - معالجة المعاملات اليومية' },
      { title: 'مطابقة تحصيلات الكهرباء', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات شركة الكهرباء مع السجلات' },
      { title: 'مطابقة تحصيلات المياه', category: 'مطابقة التحصيلات الحكومية', description: 'مطابقة تحصيلات شركة المياه' },
      { title: 'عمولة صندوق شهداء الشرطة', category: 'مطابقة التحصيلات الحكومية', description: 'عمولة صندوق شهداء الشرطة الشهرية - معالجة العمولات' },
      { title: 'الرد على الكتب الرسمية', category: 'الرسائل الرسمية / الردود', description: 'الرد على الكتب والرسائل الرسمية الواردة من الجهات المختلفة' },
      { title: 'إعداد كتاب رسمي', category: 'الرسائل الرسمية / الردود', description: 'إعداد كتاب رسمي للجهات الخارجية والبنوك' },
      { title: 'تقرير الأداء الأسبوعي', category: 'التقارير', description: 'إعداد تقرير الأداء الأسبوعي - ملخص الإنجازات والمهام' },
      { title: 'تقرير حركات اليوم', category: 'التقارير', description: 'تقرير حركات اليوم - ملخص المعاملات اليومية' },
      { title: 'تقرير المطابقة الشهري', category: 'التقارير', description: 'تقرير المطابقة الشهري - تحليل شامل للمطابقات' },
    ];
    
    const templateIds = {};
    for (const tpl of templates) {
      // التحقق من وجود القالب أولاً
      const existing = await client.query(
        'SELECT id FROM task_templates WHERE title = $1',
        [tpl.title]
      );
      
      if (existing.rows.length > 0) {
        // تحديث القالب الموجود
        await client.query(
          `UPDATE task_templates SET category_id = $1, description = $2, active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
          [categoryIds[tpl.category], tpl.description, true, existing.rows[0].id]
        );
        templateIds[tpl.title] = existing.rows[0].id;
        console.log(`   ✅ ${tpl.title} (محدث)`);
      } else {
        // إضافة قالب جديد
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
    }
    
    // ========== 4. الجداول الزمنية ==========
    console.log('\n📅 إنشاء الجداول الزمنية...');
    const schedules = [
      {
        template: 'تسويات مصرف الرشيد',
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5], // الاثنين-الجمعة
        dueTime: '09:00',
        assignee: 'employee1@alsaqi.com',
        description: 'مهمة يومية - كل يوم عمل'
      },
      {
        template: 'تسويات البنك الأهلي',
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5],
        dueTime: '10:00',
        assignee: 'employee2@alsaqi.com',
        description: 'مهمة يومية - كل يوم عمل'
      },
      {
        template: 'تسويات البنك المركزي',
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5],
        dueTime: '11:00',
        assignee: 'employee3@alsaqi.com',
        description: 'مهمة يومية - كل يوم عمل'
      },
      {
        template: 'مطابقة تحصيلات الكهرباء',
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5],
        dueTime: '12:00',
        assignee: 'employee4@alsaqi.com',
        description: 'مهمة يومية - كل يوم عمل'
      },
      {
        template: 'تقرير الأداء الأسبوعي',
        frequency: 'weekly',
        dayOfWeekSingle: 0, // الأحد
        dueTime: '14:00',
        assignee: 'supervisor@alsaqi.com',
        description: 'مهمة أسبوعية - كل يوم أحد'
      },
      {
        template: 'عمولة صندوق شهداء الشرطة',
        frequency: 'monthly',
        dayOfMonth: 1,
        dueTime: '08:00',
        assignee: 'employee5@alsaqi.com',
        description: 'مهمة شهرية - يوم 1 من كل شهر'
      },
    ];
    
    for (const sched of schedules) {
      // التحقق من وجود جدول مشابه أولاً
      const existing = await client.query(
        `SELECT id FROM schedules WHERE template_id = $1 AND frequency_type = $2 AND due_time = $3`,
        [templateIds[sched.template], sched.frequency, sched.dueTime]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO schedules (template_id, frequency_type, days_of_week, day_of_week_single, day_of_month, due_time, default_assignee_user_id, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
        console.log(`   ✅ ${sched.template} (${sched.description})`);
      } else {
        console.log(`   ⏭️  ${sched.template} (موجود مسبقاً)`);
      }
    }
    
    // ========== 5. مهام خاصة (Ad-hoc) ==========
    console.log('\n📋 إنشاء المهام الخاصة...');
    const today = getTodayBaghdad();
    const tomorrow = moment.tz('Asia/Baghdad').add(1, 'day').format('YYYY-MM-DD');
    const yesterday = moment.tz('Asia/Baghdad').subtract(1, 'day').format('YYYY-MM-DD');
    
    const adHocTasks = [
      {
        title: 'تقرير حركات اليوم',
        category: 'التقارير',
        template: 'تقرير حركات اليوم',
        createdBy: 'supervisor@alsaqi.com',
        assignedTo: 'employee1@alsaqi.com',
        dueDate: today,
        status: 'completed',
        description: 'تقرير شامل لحركات اليوم'
      },
      {
        title: 'الرد على كتاب رسمي من وزارة المالية',
        category: 'الرسائل الرسمية / الردود',
        template: 'الرد على الكتب الرسمية',
        createdBy: 'admin@alsaqi.com',
        assignedTo: 'employee2@alsaqi.com',
        dueDate: tomorrow,
        status: 'pending',
        description: 'الرد على كتاب رسمي ورد من وزارة المالية بخصوص المطابقة'
      },
      {
        title: 'إعداد كتاب رسمي للبنك المركزي',
        category: 'الرسائل الرسمية / الردود',
        template: 'إعداد كتاب رسمي',
        createdBy: 'supervisor@alsaqi.com',
        assignedTo: 'employee3@alsaqi.com',
        dueDate: null,
        status: 'pending',
        description: 'إعداد كتاب رسمي للبنك المركزي بخصوص التسويات'
      },
      {
        title: 'متابعة فروقات مطابقة البنك الأهلي',
        category: 'معالجة فروقات المطابقة',
        template: null,
        createdBy: 'supervisor@alsaqi.com',
        assignedTo: 'employee4@alsaqi.com',
        dueDate: today,
        status: 'pending',
        description: 'متابعة وحل فروقات المطابقة مع البنك الأهلي'
      },
    ];
    
    for (const task of adHocTasks) {
      const dueDateTime = task.dueDate 
        ? combineDateAndTimeBaghdadToUTC(task.dueDate, '17:00')
        : null;
      
      // التحقق من وجود المهمة أولاً
      const existing = await client.query(
        `SELECT id FROM ad_hoc_tasks WHERE title = $1 AND created_by_user_id = $2`,
        [task.title, userIds[task.createdBy]]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO ad_hoc_tasks (template_id, category_id, created_by_user_id, assigned_to_user_id, title, description, due_date_time, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            task.template ? templateIds[task.template] : null,
            categoryIds[task.category],
            userIds[task.createdBy],
            userIds[task.assignedTo],
            task.title,
            task.description,
            dueDateTime,
            task.status
          ]
        );
        console.log(`   ✅ ${task.title} (${task.status})`);
      } else {
        console.log(`   ⏭️  ${task.title} (موجود مسبقاً)`);
      }
    }
    
    // ========== 6. الحضور ==========
    console.log('\n👥 تسجيل الحضور...');
    const loginTimes = ['08:30', '08:45', '09:00', '09:15', '08:20', '09:05', '08:50'];
    let timeIndex = 0;
    
    // حضور اليوم
    for (const email of Object.keys(userIds)) {
      if (email.includes('employee') || email.includes('supervisor') || email.includes('admin')) {
        const loginTime = moment.tz(loginTimes[timeIndex % loginTimes.length], 'HH:mm', 'Asia/Baghdad');
        const loginDateTime = loginTime.toDate();
        
        await client.query(
          `INSERT INTO attendance (user_id, date, first_login_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, date) DO NOTHING`,
          [userIds[email], today, loginDateTime]
        );
        timeIndex++;
      }
    }
    
    // حضور الأيام السابقة (آخر 7 أيام)
    for (let i = 1; i <= 7; i++) {
      const date = moment.tz('Asia/Baghdad').subtract(i, 'days').format('YYYY-MM-DD');
      let dayTimeIndex = 0;
      
      for (const email of Object.keys(userIds)) {
        if (email.includes('employee') || email.includes('supervisor')) {
          if (Math.random() > 0.1) { // 90% حضور
            const loginTime = moment.tz(loginTimes[dayTimeIndex % loginTimes.length], 'HH:mm', 'Asia/Baghdad');
            const loginDateTime = loginTime.toDate();
            
            await client.query(
              `INSERT INTO attendance (user_id, date, first_login_at)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, date) DO NOTHING`,
              [userIds[email], date, loginDateTime]
            );
          }
          dayTimeIndex++;
        }
      }
    }
    console.log(`   ✅ تم تسجيل الحضور لليوم وآخر 7 أيام`);
    
    // ========== 7. إعدادات TV Dashboard ==========
    console.log('\n📺 إعدادات لوحة التحكم التلفزيونية...');
    await client.query(
      `INSERT INTO settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [
        'tv_dashboard',
        JSON.stringify({
          slideInterval: 10,
          enabledSlides: ['opening', 'overview', 'overdue', 'coverage', 'attendance', 'categories', 'trends'],
          visitorMode: false,
          autoRefresh: true,
          refreshInterval: 30
        }),
        'إعدادات لوحة التحكم التلفزيونية'
      ]
    );
    console.log('   ✅ تم حفظ الإعدادات');
    
    await client.query('COMMIT');
    
    console.log('\n✅ تم إنشاء البيانات التجريبية بنجاح!\n');
    console.log('📧 بيانات تسجيل الدخول (كلمة المرور: 123456):');
    console.log('   👤 المدير: admin@alsaqi.com');
    console.log('   👤 المشرف: supervisor@alsaqi.com');
    console.log('   👤 موظف 1: employee1@alsaqi.com');
    console.log('   👤 موظف 2: employee2@alsaqi.com');
    console.log('   👤 موظف 3: employee3@alsaqi.com');
    console.log('   👤 موظف 4: employee4@alsaqi.com');
    console.log('   👤 موظف 5: employee5@alsaqi.com');
    console.log('\n💡 يمكنك استخدام صفحة تسجيل الدخول السريع (/quick-login) للاختبار السريع!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء البيانات التجريبية:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    console.log('✅ اكتمل إنشاء البيانات التجريبية');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل إنشاء البيانات التجريبية:', error);
    process.exit(1);
  });
