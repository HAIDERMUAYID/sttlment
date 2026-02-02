-- =============================================
-- تاريخ استلام CT من البنك المركزي
-- =============================================

ALTER TABLE ct_records
  ADD COLUMN IF NOT EXISTS ct_received_date DATE;

COMMENT ON COLUMN ct_records.ct_received_date IS 'تاريخ استلام CT من البنك المركزي';
