-- تحسين أداء صفحة RTGS: قائمة الحركات والفلترة
-- لا تغيير في بنية الجداول

-- ترتيب القائمة الافتراضي: ORDER BY sttl_date DESC, id DESC — يسّرع الـ LIMIT/OFFSET
CREATE INDEX IF NOT EXISTS idx_rtgs_sttl_date_id_desc ON rtgs(sttl_date DESC, id DESC);

-- خيارات الفلتر (DISTINCT) والـ WHERE على message_type و terminal_type
CREATE INDEX IF NOT EXISTS idx_rtgs_message_type ON rtgs(message_type) WHERE message_type IS NOT NULL AND message_type != '';
CREATE INDEX IF NOT EXISTS idx_rtgs_terminal_type ON rtgs(terminal_type) WHERE terminal_type IS NOT NULL AND terminal_type != '';
