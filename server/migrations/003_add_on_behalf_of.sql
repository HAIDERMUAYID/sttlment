-- إضافة عمود "بدلاً عن" لسجل التنفيذ
ALTER TABLE task_executions
ADD COLUMN IF NOT EXISTS on_behalf_of_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_executions_on_behalf_of ON task_executions(on_behalf_of_user_id);

COMMENT ON COLUMN task_executions.on_behalf_of_user_id IS 'المستخدم الذي نُفّذت المهمة بدلاً عنه (إن وُجد)';
