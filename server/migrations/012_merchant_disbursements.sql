-- جدول صرف مستحقات التجار (حوالات موظف الحسابات)
CREATE TABLE IF NOT EXISTS merchant_disbursements (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transfer_date DATE NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    iban VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_merchant_disbursements_merchant_id ON merchant_disbursements(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_disbursements_transfer_date ON merchant_disbursements(transfer_date);
CREATE INDEX IF NOT EXISTS idx_merchant_disbursements_created_at ON merchant_disbursements(created_at);

COMMENT ON TABLE merchant_disbursements IS 'صرف مستحقات التجار — حوالات من موظف الحسابات';
COMMENT ON COLUMN merchant_disbursements.transfer_date IS 'تاريخ الحوالة';
COMMENT ON COLUMN merchant_disbursements.bank_name IS 'إلى أي مصرف';
COMMENT ON COLUMN merchant_disbursements.iban IS 'رقم IBAN للتاجر';
COMMENT ON COLUMN merchant_disbursements.amount IS 'قيمة الحوالة';
