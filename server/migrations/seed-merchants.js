const pool = require('../config/database');

const merchantsData = [
  {
    merchant_id: 'GOVEDU111111111',
    governorate: 'بغداد',
    ministry: 'التربية',
    directorate_name: 'المديرية العامة للتعليم العام والاهلي والاجنبي',
    details: 'الايرادات',
    device_count: 2,
    iban: 'IQ02RAFB108010000111761',
    account_key: 'المديرية العامة للتعليم العام والاهلي والاجنبي/IQ02RAFB108010000111761',
    account_number: '1761',
    branch_name: 'ساحة النصر',
    branch_number: '108',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'المديرية العامة للتعليم العام والاهلي والاجنبي',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'MOHESRUOKN00551',
    governorate: 'النجف',
    ministry: 'التعليم العالي',
    directorate_name: 'جامعة الكوفة',
    details: 'كلية القانون/ صندوق التعليم العالي',
    device_count: 1,
    iban: 'IQ02RAFB334010000000551',
    account_key: 'جامعة الكوفة/IQ02RAFB334010000000551',
    account_number: '0551',
    branch_name: 'النجف',
    branch_number: '334',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'جامعة الكوفة - كلية القانون/صندوق التعليم العالي',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'WQF1BGD00010023',
    governorate: 'بغداد',
    ministry: 'د . السني',
    directorate_name: 'دائرة التخطيط والمتابعة',
    details: '',
    device_count: 0,
    iban: 'IQ02RAFB389010000010023',
    account_key: 'دائرة التخطيط والمتابعة/IQ02RAFB389010000010023',
    account_number: '0023',
    branch_name: 'د . السني',
    branch_number: '389',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'دائرة التخطيط والمتابعة',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'MOHSERQDS000107',
    governorate: 'الديوانية',
    ministry: 'التعليم العالي',
    directorate_name: 'جامعة القادسية',
    details: 'حساب كلية الاثار / الحساب الجاري',
    device_count: 1,
    iban: 'IQ02RDBA016010000000107',
    account_key: 'جامعة القادسية/IQ02RDBA016010000000107',
    account_number: '0107',
    branch_name: 'الديوانية',
    branch_number: '016',
    bank_code: 'RDBA',
    bank_name: 'الرشيد',
    bank_name_alt: 'الرشيد',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'جامعة القادسية-كلية الاثار',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'MOIBGD015296003',
    governorate: 'بغداد',
    ministry: 'الداخلية',
    directorate_name: 'قيادة فرقة الرد السريع',
    details: 'صندوق مقر الوزارة',
    device_count: 1,
    iban: 'IQ03RAFB057100015296001',
    account_key: 'قيادة فرقة الرد السريع/IQ03RAFB057100015296001',
    account_number: '6001',
    branch_name: 'المنصور',
    branch_number: '057',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'قيادة فرقة الرد السريع',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'WQF1BGD00011099',
    governorate: 'بغداد',
    ministry: 'د . السني',
    directorate_name: 'رئاسة ديوان الوقف السني',
    details: 'حساب مديرية اوقاف بغداد / الكرخ',
    device_count: 0,
    iban: 'IQ03RAFB177010000011099',
    account_key: 'رئاسة ديوان الوقف السني/IQ03RAFB177010000011099',
    account_number: '1099',
    branch_name: 'الخضراء',
    branch_number: '177',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'رئاسة ديوان الوقف السني / مديرية اوقاف بغداد /الكرخ',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'MOEBSR000004006',
    governorate: 'البصرة',
    ministry: 'التربية',
    directorate_name: 'المديرية العامة للتربية',
    details: 'حساب الحوانيت',
    device_count: 1,
    iban: 'IQ03RAFB185010000004006',
    account_key: 'المديرية العامة للتربية/IQ03RAFB185010000004006',
    account_number: '4006',
    branch_name: 'الاستقلال',
    branch_number: '185',
    bank_code: 'RAFB',
    bank_name: 'الرافدين',
    bank_name_alt: 'الرافدين',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'المديرية العامة لتربية محافظة البصرة-حساب الحوانيت',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF01806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / سور النجف - حي العدالة',
    device_count: 24,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF02806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'محطة وقود الكرار الجديدة',
    device_count: 19,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF03806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود الكوفة القديمة',
    device_count: 4,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF04806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود الكوفة الجديدة',
    device_count: 17,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF05806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود النجف الجديدة',
    device_count: 19,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF06806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود الحيدرية',
    device_count: 18,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF07806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود المناذرة',
    device_count: 6,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF08806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود المشخاب',
    device_count: 6,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF09806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود شروق القادسية',
    device_count: 6,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF10806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة وقود الكرار القديمة',
    device_count: 13,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF11806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / فرع النجف',
    device_count: 2,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  },
  {
    merchant_id: 'OPDCNJF12806003',
    governorate: 'النجف',
    ministry: 'وزارة النفط',
    directorate_name: 'شركة توزيع المنتجات النفطية',
    details: 'هيئة توزيع الفرات الاوسط / محطة نفط وغاز الأنصار',
    device_count: 3,
    iban: 'IQ03SINE927100027806003',
    account_key: 'شركة توزيع المنتجات النفطية/IQ03SINE927100027806003',
    account_number: '6003',
    branch_name: 'فرع الكرار',
    branch_number: '927',
    bank_code: 'SINE',
    bank_name: 'الصناعي',
    bank_name_alt: 'الصناعي',
    iban_length_check: 23,
    notes: '',
    settlement_name: 'شركة توزيع المنتجات النفطية/فرع النجف الاشرف',
    commission_type: 'حكومي'
  }
];

async function seedMerchants() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`📦 بدء استيراد ${merchantsData.length} تاجر...`);
    
    for (const merchant of merchantsData) {
      try {
        await client.query(
          `INSERT INTO merchants (
            merchant_id, governorate, ministry, directorate_name, details,
            device_count, iban, account_key, account_number, branch_name,
            branch_number, bank_code, bank_name, bank_name_alt, iban_length_check,
            notes, settlement_name, commission_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (merchant_id) DO NOTHING`,
          [
            merchant.merchant_id,
            merchant.governorate,
            merchant.ministry,
            merchant.directorate_name,
            merchant.details,
            merchant.device_count,
            merchant.iban,
            merchant.account_key,
            merchant.account_number,
            merchant.branch_name,
            merchant.branch_number,
            merchant.bank_code,
            merchant.bank_name,
            merchant.bank_name_alt,
            merchant.iban_length_check,
            merchant.notes,
            merchant.settlement_name,
            merchant.commission_type
          ]
        );
        console.log(`✅ تم إضافة/تحديث: ${merchant.merchant_id}`);
      } catch (error) {
        console.error(`❌ خطأ في إضافة ${merchant.merchant_id}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ تم استيراد ${merchantsData.length} تاجر بنجاح`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في استيراد التجار:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedMerchants()
    .then(() => {
      console.log('✅ اكتمل الاستيراد');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل الاستيراد:', error);
      process.exit(1);
    });
}

module.exports = { seedMerchants };
