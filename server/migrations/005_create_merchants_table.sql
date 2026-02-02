-- جدول إدارة التجار وحساباتهم ومصارفهم
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(100) UNIQUE NOT NULL,
    governorate VARCHAR(100),
    ministry VARCHAR(255),
    directorate_name VARCHAR(500),
    details TEXT,
    device_count INTEGER DEFAULT 0,
    iban VARCHAR(50),
    account_key VARCHAR(500), -- key column
    account_number VARCHAR(50),
    branch_name VARCHAR(255),
    branch_number VARCHAR(50),
    bank_code VARCHAR(50), -- المصرف (RAFB, RDBA, SINE)
    bank_name VARCHAR(255), -- المصرف2
    bank_name_alt VARCHAR(255), -- المصرف3
    iban_length_check INTEGER DEFAULT 23,
    notes TEXT,
    settlement_name VARCHAR(500),
    commission_type VARCHAR(100) DEFAULT 'حكومي',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_id ON merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_governorate ON merchants(governorate);
CREATE INDEX IF NOT EXISTS idx_merchants_ministry ON merchants(ministry);
CREATE INDEX IF NOT EXISTS idx_merchants_bank_code ON merchants(bank_code);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(active);
CREATE INDEX IF NOT EXISTS idx_merchants_iban ON merchants(iban);

-- تعليق على الجدول
COMMENT ON TABLE merchants IS 'جدول إدارة التجار وحساباتهم ومصارفهم';
COMMENT ON COLUMN merchants.merchant_id IS 'معرف التاجر الفريد';
COMMENT ON COLUMN merchants.governorate IS 'المحافظة';
COMMENT ON COLUMN merchants.ministry IS 'الوزارة';
COMMENT ON COLUMN merchants.directorate_name IS 'اسم المديرية';
COMMENT ON COLUMN merchants.details IS 'التفاصيل';
COMMENT ON COLUMN merchants.device_count IS 'عدد الأجهزة';
COMMENT ON COLUMN merchants.iban IS 'رقم IBAN';
COMMENT ON COLUMN merchants.account_key IS 'مفتاح الحساب (key)';
COMMENT ON COLUMN merchants.account_number IS 'رقم الحساب';
COMMENT ON COLUMN merchants.branch_name IS 'اسم الفرع';
COMMENT ON COLUMN merchants.branch_number IS 'رقم الفرع';
COMMENT ON COLUMN merchants.bank_code IS 'كود المصرف (RAFB, RDBA, SINE)';
COMMENT ON COLUMN merchants.bank_name IS 'اسم المصرف';
COMMENT ON COLUMN merchants.bank_name_alt IS 'اسم المصرف البديل';
COMMENT ON COLUMN merchants.iban_length_check IS 'التحقق من طول IBAN';
COMMENT ON COLUMN merchants.notes IS 'الملاحظات';
COMMENT ON COLUMN merchants.settlement_name IS 'اسم التسوية';
COMMENT ON COLUMN merchants.commission_type IS 'نوع العمولة';
