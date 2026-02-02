-- فئة وقوالب وجداول لتسوية حكومية مع المصارف (مهام يومية مع تاريخ تسوية مستهدف ومطابقة STTLE)
-- 1) فئة "التسوية الحكومية مع المصارف"
INSERT INTO categories (name, description, active)
SELECT 'التسوية الحكومية مع المصارف', 'مهام يومية لمطابقة تسوية حكومية مع مصارف RTGS (تاريخ تسوية + قيمة STTLE)', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'التسوية الحكومية مع المصارف');

-- 2) الجداول: إزاحة يوم التسوية (0 = نفس اليوم، -1 = اليوم السابق، -2 = يومين قبله، -3 = 3 أيام)
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS settlement_offset_days INTEGER DEFAULT 0;

COMMENT ON COLUMN schedules.settlement_offset_days IS 'للقوالب من فئة التسوية الحكومية مع المصارف: 0=نفس اليوم، -1=اليوم السابق، -2=يومين قبله، -3=3 أيام قبله';

-- 3) المهام اليومية: تاريخ التسوية المستهدف (اليوم المطلوب تسويته)
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS target_settlement_date DATE;

COMMENT ON COLUMN daily_tasks.target_settlement_date IS 'تاريخ التسوية المطلوب (للمهام من فئة التسوية الحكومية مع المصارف)';

-- 4) تنفيذ المهمة: تاريخ وقيمة التسوية المدخلة ونتيجة المطابقة
ALTER TABLE task_executions
ADD COLUMN IF NOT EXISTS settlement_date DATE,
ADD COLUMN IF NOT EXISTS settlement_value NUMERIC(18,2),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30);

COMMENT ON COLUMN task_executions.settlement_date IS 'تاريخ التسوية الذي أدخله الموظف (للمهام من فئة التسوية الحكومية مع المصارف)';
COMMENT ON COLUMN task_executions.settlement_value IS 'قيمة التسوية التي أدخلها الموظف للمطابقة مع STTLE';
COMMENT ON COLUMN task_executions.verification_status IS 'نتيجة المطابقة: matched = تسوية مطابقة، mismatch = غير مطابقة';
