-- =============================================
-- جدول تفاصيل التسوية الحكومية (كل تسوية + تاجر: IBAN، وزارة/مديرية/محافظة، فرع، أرقام، حركات، عمولة، مبلغ التسوية)
-- يُعبَّأ عند حقن RTGS ويُستخدم في عرض التفاصيل ومطابقة CT
-- =============================================

CREATE TABLE IF NOT EXISTS gov_settlement_details (
  id BIGSERIAL PRIMARY KEY,
  import_log_id INTEGER REFERENCES import_logs(id) ON DELETE CASCADE,
  sttl_date DATE NOT NULL,
  inst_id2 VARCHAR(100) NOT NULL,
  bank_display_name VARCHAR(255) NOT NULL DEFAULT 'غير معرف',
  mer VARCHAR(100) NOT NULL,
  iban VARCHAR(50),
  ministry VARCHAR(255),
  directorate_name VARCHAR(500),
  governorate VARCHAR(100),
  account_number VARCHAR(50),
  branch_name VARCHAR(255),
  branch_number VARCHAR(50),
  movement_count INTEGER NOT NULL DEFAULT 0,
  sum_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_fees NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_acq NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_sttle NUMERIC(18, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gov_settlement_details_import_log_id ON gov_settlement_details(import_log_id);
CREATE INDEX IF NOT EXISTS idx_gov_settlement_details_sttl_inst ON gov_settlement_details(sttl_date, inst_id2);

COMMENT ON TABLE gov_settlement_details IS 'تفاصيل التسوية الحكومية لكل تاجر (مرتبط بالتجار و RTGS) — للعرض ومطابقة CT';
