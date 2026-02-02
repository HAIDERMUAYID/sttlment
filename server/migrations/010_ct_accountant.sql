-- =============================================
-- دور موظف الحسابات + جدول سجلات CT للمطابقة مع ACQ و FEES
-- =============================================

-- 1) إضافة دور 'accountant' (موظف حسابات) إلى جدول المستخدمين
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'supervisor', 'employee', 'viewer', 'accountant'));

-- 2) جدول سجلات CT — إدراج قيم CT من البنك المركزي للمطابقة مع عمولات المحصل (ACQ + FEES)
CREATE TABLE IF NOT EXISTS ct_records (
  id SERIAL PRIMARY KEY,
  sttl_date_from DATE NOT NULL,
  sttl_date_to DATE NOT NULL,
  ct_value NUMERIC(18, 2) NOT NULL,
  sum_acq NUMERIC(18, 2),
  sum_fees NUMERIC(18, 2),
  match_status VARCHAR(20) NOT NULL DEFAULT 'not_matched'
    CHECK (match_status IN ('matched', 'not_matched')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ct_records_dates ON ct_records(sttl_date_from, sttl_date_to);
CREATE INDEX IF NOT EXISTS idx_ct_records_created_at ON ct_records(created_at DESC);
