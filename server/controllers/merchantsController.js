const pool = require('../config/database');

// الحصول على جميع التجار
const getMerchants = async (req, res) => {
  try {
    // التحقق من وجود الجدول (مع معالجة الأخطاء)
    let tableExists = true;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'merchants'
        );
      `);
      tableExists = tableCheck.rows[0].exists;
    } catch (checkError) {
      console.error('خطأ في التحقق من وجود الجدول:', checkError);
      // نتابع المحاولة - قد يكون الجدول موجودًا لكن هناك مشكلة في الاستعلام
    }
    
    if (!tableExists) {
      return res.status(500).json({ 
        error: 'جدول التجار غير موجود في قاعدة البيانات',
        details: 'يرجى تشغيل migrations لإنشاء الجدول: cd server && node migrations/runMigrations.js'
      });
    }
    
    const { page = 1, limit = 50, search, merchant_id, governorate, ministry, bank_code, commission_type, iban, directorate_name, settlement_name, device_count, account_number, branch_name } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM merchants WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (
        merchant_id ILIKE $${paramCount} OR
        directorate_name ILIKE $${paramCount} OR
        settlement_name ILIKE $${paramCount} OR
        iban ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    /* merchant_id — تطابق دقيق عند الاختيار من القائمة */
    if (merchant_id) {
      const vals = String(merchant_id).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND merchant_id = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    /* فلاتر أعمدة إضافية — دعم متعدد (مفصولة بفاصلة) */
    if (iban) {
      const vals = String(iban).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND iban = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    if (directorate_name) {
      const vals = String(directorate_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND directorate_name = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    if (settlement_name) {
      const vals = String(settlement_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND settlement_name = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    if (device_count) {
      const vals = String(device_count).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND device_count::text = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    if (account_number) {
      const vals = String(account_number).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND account_number = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    if (branch_name) {
      const vals = String(branch_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND branch_name = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    if (governorate) {
      const vals = String(governorate).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND governorate = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    if (ministry) {
      const vals = String(ministry).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND ministry = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    if (bank_code) {
      const vals = String(bank_code).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND bank_code = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    if (commission_type) {
      const vals = String(commission_type).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) {
        paramCount++;
        query += ` AND commission_type = ANY($${paramCount}::text[])`;
        params.push(vals);
      }
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // جلب العدد الإجمالي
    let countQuery = 'SELECT COUNT(*) FROM merchants WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (merchant_id) {
      const vals = String(merchant_id).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND merchant_id = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (search) {
      countParamCount++;
      countQuery += ` AND (
        merchant_id ILIKE $${countParamCount} OR
        directorate_name ILIKE $${countParamCount} OR
        settlement_name ILIKE $${countParamCount} OR
        iban ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }
    
    if (iban) {
      const vals = String(iban).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND iban = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (directorate_name) {
      const vals = String(directorate_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND directorate_name = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (settlement_name) {
      const vals = String(settlement_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND settlement_name = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (device_count) {
      const vals = String(device_count).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND device_count::text = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (account_number) {
      const vals = String(account_number).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND account_number = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (branch_name) {
      const vals = String(branch_name).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND branch_name = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (governorate) {
      const vals = String(governorate).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND governorate = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (ministry) {
      const vals = String(ministry).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND ministry = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (bank_code) {
      const vals = String(bank_code).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND bank_code = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    if (commission_type) {
      const vals = String(commission_type).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) { countParamCount++; countQuery += ` AND commission_type = ANY($${countParamCount}::text[])`; countParams.push(vals); }
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      merchants: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('خطأ في جلب التجار:', error);
    console.error('تفاصيل الخطأ:', error.message, error.stack);
    res.status(500).json({ error: 'خطأ في الخادم', details: error.message });
  }
};

// الحصول على تاجر واحد
const getMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM merchants WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'التاجر غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب التاجر:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// إنشاء تاجر جديد
const createMerchant = async (req, res) => {
  try {
    const {
      merchant_id,
      governorate,
      ministry,
      directorate_name,
      details,
      device_count,
      iban,
      account_key,
      account_number,
      branch_name,
      branch_number,
      bank_code,
      bank_name,
      bank_name_alt,
      iban_length_check,
      notes,
      settlement_name,
      commission_type
    } = req.body;
    
    if (!merchant_id) {
      return res.status(400).json({ error: 'معرف التاجر مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO merchants (
        merchant_id, governorate, ministry, directorate_name, details,
        device_count, iban, account_key, account_number, branch_name,
        branch_number, bank_code, bank_name, bank_name_alt, iban_length_check,
        notes, settlement_name, commission_type, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        merchant_id, governorate || null, ministry || null, directorate_name || null,
        details || null, device_count || 0, iban || null, account_key || null,
        account_number || null, branch_name || null, branch_number || null,
        bank_code || null, bank_name || null, bank_name_alt || null,
        iban_length_check || 23, notes || null, settlement_name || null,
        commission_type || 'حكومي', req.user?.userId || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إنشاء التاجر:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'معرف التاجر موجود بالفعل' });
    }
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// تحديث تاجر
const updateMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      merchant_id,
      governorate,
      ministry,
      directorate_name,
      details,
      device_count,
      iban,
      account_key,
      account_number,
      branch_name,
      branch_number,
      bank_code,
      bank_name,
      bank_name_alt,
      iban_length_check,
      notes,
      settlement_name,
      commission_type,
      active
    } = req.body;
    
    const result = await pool.query(
      `UPDATE merchants SET
        merchant_id = COALESCE($1, merchant_id),
        governorate = COALESCE($2, governorate),
        ministry = COALESCE($3, ministry),
        directorate_name = COALESCE($4, directorate_name),
        details = COALESCE($5, details),
        device_count = COALESCE($6, device_count),
        iban = COALESCE($7, iban),
        account_key = COALESCE($8, account_key),
        account_number = COALESCE($9, account_number),
        branch_name = COALESCE($10, branch_name),
        branch_number = COALESCE($11, branch_number),
        bank_code = COALESCE($12, bank_code),
        bank_name = COALESCE($13, bank_name),
        bank_name_alt = COALESCE($14, bank_name_alt),
        iban_length_check = COALESCE($15, iban_length_check),
        notes = COALESCE($16, notes),
        settlement_name = COALESCE($17, settlement_name),
        commission_type = COALESCE($18, commission_type),
        active = COALESCE($19, active),
        updated_at = CURRENT_TIMESTAMP,
        updated_by_user_id = $20
      WHERE id = $21
      RETURNING *`,
      [
        merchant_id, governorate, ministry, directorate_name, details,
        device_count, iban, account_key, account_number, branch_name,
        branch_number, bank_code, bank_name, bank_name_alt, iban_length_check,
        notes, settlement_name, commission_type, active,
        req.user?.userId || null, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'التاجر غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث التاجر:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'معرف التاجر موجود بالفعل' });
    }
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// حذف تاجر
const deleteMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM merchants WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'التاجر غير موجود' });
    }
    
    res.json({ message: 'تم حذف التاجر بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف التاجر:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// جلب قيم فريدة للفلترة
const getFilterOptions = async (req, res) => {
  try {
    // التحقق من وجود الجدول (مع معالجة الأخطاء)
    let tableExists = true;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'merchants'
        );
      `);
      tableExists = tableCheck.rows[0].exists;
    } catch (checkError) {
      console.error('خطأ في التحقق من وجود الجدول:', checkError);
      // نتابع المحاولة - قد يكون الجدول موجودًا لكن هناك مشكلة في الاستعلام
    }
    
    if (!tableExists) {
      return res.json({
        governorates: [],
        ministries: [],
        bankCodes: [],
        merchantIds: [],
        directorates: [],
        settlements: [],
        deviceCounts: [],
        ibans: [],
        accountNumbers: [],
        branches: []
      });
    }
    
    const [governorates, ministries, bankCodes, merchantIds, directorates, settlements, deviceCounts, ibans, accountNumbers, branches] = await Promise.all([
      pool.query('SELECT DISTINCT governorate FROM merchants WHERE governorate IS NOT NULL AND TRIM(governorate) != \'\' ORDER BY governorate'),
      pool.query('SELECT DISTINCT ministry FROM merchants WHERE ministry IS NOT NULL AND TRIM(ministry) != \'\' ORDER BY ministry'),
      pool.query('SELECT DISTINCT bank_code FROM merchants WHERE bank_code IS NOT NULL AND TRIM(bank_code) != \'\' ORDER BY bank_code'),
      pool.query('SELECT DISTINCT merchant_id FROM merchants WHERE merchant_id IS NOT NULL AND TRIM(merchant_id) != \'\' ORDER BY merchant_id'),
      pool.query('SELECT DISTINCT directorate_name FROM merchants WHERE directorate_name IS NOT NULL AND TRIM(directorate_name) != \'\' ORDER BY directorate_name'),
      pool.query('SELECT DISTINCT settlement_name FROM merchants WHERE settlement_name IS NOT NULL AND TRIM(settlement_name) != \'\' ORDER BY settlement_name'),
      pool.query('SELECT DISTINCT device_count FROM merchants WHERE device_count IS NOT NULL ORDER BY device_count'),
      pool.query('SELECT DISTINCT iban FROM merchants WHERE iban IS NOT NULL AND TRIM(iban) != \'\' ORDER BY iban'),
      pool.query('SELECT DISTINCT account_number FROM merchants WHERE account_number IS NOT NULL AND TRIM(account_number) != \'\' ORDER BY account_number'),
      pool.query('SELECT DISTINCT branch_name FROM merchants WHERE branch_name IS NOT NULL AND TRIM(branch_name) != \'\' ORDER BY branch_name')
    ]);
    
    res.json({
      governorates: governorates.rows.map(r => r.governorate),
      ministries: ministries.rows.map(r => r.ministry),
      bankCodes: bankCodes.rows.map(r => r.bank_code),
      merchantIds: merchantIds.rows.map(r => r.merchant_id),
      directorates: directorates.rows.map(r => r.directorate_name),
      settlements: settlements.rows.map(r => r.settlement_name),
      deviceCounts: deviceCounts.rows.map(r => String(r.device_count)),
      ibans: ibans.rows.map(r => r.iban),
      accountNumbers: accountNumbers.rows.map(r => r.account_number),
      branches: branches.rows.map(r => r.branch_name)
    });
  } catch (error) {
    console.error('خطأ في جلب خيارات الفلترة:', error);
    console.error('تفاصيل الخطأ:', error.message, error.stack);
    res.status(500).json({ error: 'خطأ في الخادم', details: error.message });
  }
};

// استيراد تجار متعددين
const importMerchants = async (req, res) => {
  try {
    // التحقق من وجود الجدول (مع معالجة الأخطاء)
    let tableExists = true;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'merchants'
        );
      `);
      tableExists = tableCheck.rows[0].exists;
    } catch (checkError) {
      console.error('خطأ في التحقق من وجود الجدول:', checkError);
      // نتابع المحاولة - قد يكون الجدول موجودًا لكن هناك مشكلة في الاستعلام
    }
    
    if (!tableExists) {
      return res.status(500).json({ 
        error: 'جدول التجار غير موجود في قاعدة البيانات',
        details: 'يرجى تشغيل migrations لإنشاء الجدول: cd server && node migrations/runMigrations.js'
      });
    }
    
    const { merchants, rejectDuplicates = false } = req.body;
    
    if (!Array.isArray(merchants) || merchants.length === 0) {
      return res.status(400).json({ error: 'يجب إرسال مصفوفة من التجار' });
    }
    
    const results = [];
    const errors = [];
    const duplicateIds = new Set(); // لتتبع التكرارات داخل الملف
    
    // التحقق من التكرارات داخل الملف نفسه أولاً
    const merchantIdsInFile = new Map();
    merchants.forEach((merchant, index) => {
      const merchantId = (merchant.merchant_id || merchant['Merchant ID'] || '').trim();
      if (merchantId) {
        if (merchantIdsInFile.has(merchantId)) {
          duplicateIds.add(merchantId);
          errors.push({
            merchant_id: merchantId,
            error: 'تكرار داخل الملف - Merchant ID موجود أكثر من مرة',
            row: index + 1
          });
        } else {
          merchantIdsInFile.set(merchantId, index);
        }
      }
    });
    
    // جلب جميع Merchant IDs الموجودة في قاعدة البيانات
    const existingMerchants = await pool.query('SELECT merchant_id FROM merchants WHERE merchant_id IS NOT NULL');
    const existingIds = new Set(existingMerchants.rows.map(r => r.merchant_id));
    
    // معالجة كل تاجر
    for (let i = 0; i < merchants.length; i++) {
      const merchant = merchants[i];
      const merchantId = (merchant.merchant_id || merchant['Merchant ID'] || '').trim();
      
      // تخطي التكرارات داخل الملف
      if (duplicateIds.has(merchantId)) {
        continue;
      }
      
      // التحقق من وجود Merchant ID
      if (!merchantId) {
        errors.push({
          merchant_id: merchantId || '(فارغ)',
          error: 'Merchant ID مطلوب',
          row: i + 1
        });
        continue;
      }
      
      // التحقق من التكرار في قاعدة البيانات
      if (existingIds.has(merchantId)) {
        if (rejectDuplicates) {
          errors.push({
            merchant_id: merchantId,
            error: 'Merchant ID موجود بالفعل في قاعدة البيانات',
            row: i + 1
          });
          continue;
        }
        // إذا لم يكن rejectDuplicates، نحدث التاجر الموجود
      }
      
      try {
        if (rejectDuplicates && existingIds.has(merchantId)) {
          // رفض التكرار
          errors.push({
            merchant_id: merchantId,
            error: 'Merchant ID موجود بالفعل - تم الرفض',
            row: i + 1
          });
          continue;
        }
        
        // إدراج أو تحديث التاجر
        const result = await pool.query(
          `INSERT INTO merchants (
            merchant_id, governorate, ministry, directorate_name, details,
            device_count, iban, account_key, account_number, branch_name,
            branch_number, bank_code, bank_name, bank_name_alt, iban_length_check,
            notes, settlement_name, commission_type, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ${rejectDuplicates ? '' : `ON CONFLICT (merchant_id) DO UPDATE SET
            governorate = EXCLUDED.governorate,
            ministry = EXCLUDED.ministry,
            directorate_name = EXCLUDED.directorate_name,
            details = EXCLUDED.details,
            device_count = EXCLUDED.device_count,
            iban = EXCLUDED.iban,
            account_key = EXCLUDED.account_key,
            account_number = EXCLUDED.account_number,
            branch_name = EXCLUDED.branch_name,
            branch_number = EXCLUDED.branch_number,
            bank_code = EXCLUDED.bank_code,
            bank_name = EXCLUDED.bank_name,
            bank_name_alt = EXCLUDED.bank_name_alt,
            iban_length_check = EXCLUDED.iban_length_check,
            notes = EXCLUDED.notes,
            settlement_name = EXCLUDED.settlement_name,
            commission_type = EXCLUDED.commission_type,
            updated_at = CURRENT_TIMESTAMP,
            updated_by_user_id = $19`}
          RETURNING *`,
          [
            merchantId,
            merchant.governorate || null,
            merchant.ministry || null,
            merchant.directorate_name || null,
            merchant.details || null,
            parseInt(merchant.device_count || 0),
            merchant.iban || null,
            merchant.account_key || null,
            merchant.account_number || null,
            merchant.branch_name || null,
            merchant.branch_number || null,
            merchant.bank_code || null,
            merchant.bank_name || null,
            merchant.bank_name_alt || null,
            parseInt(merchant.iban_length_check || 23),
            merchant.notes || null,
            merchant.settlement_name || null,
            merchant.commission_type || 'حكومي',
            req.user?.userId || null
          ]
        );
        
        results.push(result.rows[0]);
        // إضافة إلى existingIds لتجنب التكرار في نفس العملية
        existingIds.add(merchantId);
      } catch (error) {
        if (error.code === '23505') { // Unique violation
          errors.push({
            merchant_id: merchantId,
            error: 'Merchant ID موجود بالفعل في قاعدة البيانات',
            row: i + 1
          });
        } else {
          errors.push({
            merchant_id: merchantId,
            error: error.message || 'خطأ غير معروف',
            row: i + 1
          });
        }
      }
    }
    
    res.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors: errors.slice(0, 100) // إرجاع أول 100 خطأ فقط لتجنب استجابة كبيرة
    });
  } catch (error) {
    console.error('خطأ في استيراد التجار:', error);
    console.error('تفاصيل الخطأ:', error.message, error.stack);
    res.status(500).json({ error: 'خطأ في الخادم', details: error.message });
  }
};

module.exports = {
  getMerchants,
  getMerchant,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getFilterOptions,
  importMerchants
};
