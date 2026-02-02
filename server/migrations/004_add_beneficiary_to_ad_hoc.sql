-- إضافة عمود "الجهة المستفيدة" للمهام الخاصة
ALTER TABLE ad_hoc_tasks
ADD COLUMN IF NOT EXISTS beneficiary VARCHAR(500);

COMMENT ON COLUMN ad_hoc_tasks.beneficiary IS 'الجهة المستفيدة من المهمة الخاصة';
