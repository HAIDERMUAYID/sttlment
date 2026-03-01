-- تخزين دقائق التأخير للمهام المتأخرة (مقارنة وقت التنفيذ الفعلي مع وقت الاستحقاق + grace)
ALTER TABLE task_executions
ADD COLUMN IF NOT EXISTS delay_minutes INTEGER;

COMMENT ON COLUMN task_executions.delay_minutes IS 'دقائق التأخير عن (وقت الاستحقاق + grace) — للمهام المتأخرة فقط';
