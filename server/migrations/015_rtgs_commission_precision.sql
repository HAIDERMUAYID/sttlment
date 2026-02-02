-- تصحيح دقة العمولة (fees, acq, sttle) — استخدام 6 منازل عشرية بدلاً من 2
-- لضمان التطابق الصحيح عند احتساب المجاميع ومقارنتها مع السجلات الحكومية

-- جدول RTGS
ALTER TABLE rtgs ALTER COLUMN fees TYPE NUMERIC(18, 6);
ALTER TABLE rtgs ALTER COLUMN acq TYPE NUMERIC(18, 6);
ALTER TABLE rtgs ALTER COLUMN sttle TYPE NUMERIC(18, 6);

COMMENT ON COLUMN rtgs.fees IS 'العمولة الكلية — 6 منازل عشرية للدقة';
COMMENT ON COLUMN rtgs.acq IS 'عمولة المحصل — 6 منازل عشرية للدقة';
COMMENT ON COLUMN rtgs.sttle IS 'التسوية الصافية = amount - fees — 6 منازل عشرية';

-- جدول ct_records (للمطابقة مع CT)
ALTER TABLE ct_records ALTER COLUMN sum_acq TYPE NUMERIC(18, 6);
ALTER TABLE ct_records ALTER COLUMN sum_fees TYPE NUMERIC(18, 6);
