-- =============================================
-- جدول مخزون التسويات الحكومية (يُحدَّث عند الاستيراد/الحذف بدل الاحتساب في كل طلب)
-- =============================================

CREATE TABLE IF NOT EXISTS gov_settlement_summaries (
  id BIGSERIAL PRIMARY KEY,
  import_log_id INTEGER REFERENCES import_logs(id) ON DELETE CASCADE,  /* NULL = بيانات قديمة قبل ربط الاستيراد */
  sttl_date DATE NOT NULL,
  inst_id2 VARCHAR(100) NOT NULL,
  bank_display_name VARCHAR(255) NOT NULL DEFAULT 'غير معرف',
  transaction_date DATE NOT NULL,
  movement_count INTEGER NOT NULL DEFAULT 0,
  sum_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_fees NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_acq NUMERIC(18, 6) NOT NULL DEFAULT 0,
  sum_sttle NUMERIC(18, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gov_settlement_summaries_import_log_id ON gov_settlement_summaries(import_log_id);
CREATE INDEX IF NOT EXISTS idx_gov_settlement_summaries_sttl_date ON gov_settlement_summaries(sttl_date);
CREATE INDEX IF NOT EXISTS idx_gov_settlement_summaries_dates_bank ON gov_settlement_summaries(sttl_date, inst_id2, transaction_date);

COMMENT ON TABLE gov_settlement_summaries IS 'ملخص التسويات الحكومية حسب ملف RTGS وتاريخ التسوية وتاريخ الحركة - يُعبَّأ عند الاستيراد ويُحذف عند حذف الملف';
