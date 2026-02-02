-- ربط حركات RTGS بسجل الاستيراد + وقت الحقن
-- =============================================

-- 1) إضافة عمود import_log_id إلى جدول rtgs
ALTER TABLE rtgs ADD COLUMN IF NOT EXISTS import_log_id INTEGER REFERENCES import_logs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rtgs_import_log_id ON rtgs(import_log_id);

-- 2) إضافة عمود duration_ms إلى import_logs (الوقت المستغرق في الحقن بالميلي ثانية)
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

COMMENT ON COLUMN rtgs.import_log_id IS 'سجل الاستيراد الذي أنشأ هذه الحركة';
COMMENT ON COLUMN import_logs.duration_ms IS 'الوقت المستغرق في الحقن بالميلي ثانية';
