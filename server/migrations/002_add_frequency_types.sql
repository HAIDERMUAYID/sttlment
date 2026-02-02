-- Migration: إضافة أنواع التكرار للمهام (يومية، أسبوعية، شهرية)
-- تاريخ: 2024

-- إضافة الحقول الجديدة
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(20) DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
ADD COLUMN IF NOT EXISTS day_of_week_single INTEGER CHECK (day_of_week_single IS NULL OR (day_of_week_single >= 0 AND day_of_week_single <= 6));

-- جعل days_of_week اختياري (للسماح بالأنواع الجديدة)
ALTER TABLE schedules ALTER COLUMN days_of_week DROP NOT NULL;

-- تحديث الجداول الموجودة لتكون من نوع daily
UPDATE schedules SET frequency_type = 'daily' WHERE frequency_type IS NULL;

-- تعليق: 
-- frequency_type = 'daily' -> يستخدم days_of_week (أيام متعددة)
-- frequency_type = 'weekly' -> يستخدم day_of_week_single (يوم واحد)
-- frequency_type = 'monthly' -> يستخدم day_of_month (يوم من الشهر)
