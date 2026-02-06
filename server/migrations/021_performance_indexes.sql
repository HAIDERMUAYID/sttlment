-- تحسين الأداء: فهارس إضافية فقط — لا تغيير في بنية الجداول
-- تُسرّع التقارير، المهام، ولوحة TV (JOIN والفلترة حسب التاريخ والمستخدم والحالة)

-- task_executions: تسريع JOIN مع daily_tasks و LATERAL
CREATE INDEX IF NOT EXISTS idx_task_executions_daily_task_id ON task_executions(daily_task_id);

-- task_executions: تسريع JOIN مع ad_hoc_tasks
CREATE INDEX IF NOT EXISTS idx_task_executions_ad_hoc_task_id ON task_executions(ad_hoc_task_id);

-- task_executions: عدّ حسب المستخدم والحالة (تقارير ولوحة TV)
CREATE INDEX IF NOT EXISTS idx_task_executions_done_by_result ON task_executions(done_by_user_id, result_status);

-- daily_tasks: تسريع JOIN مع task_templates في التقارير
CREATE INDEX IF NOT EXISTS idx_daily_tasks_template_id ON daily_tasks(template_id);

-- daily_tasks: فلترة شائعة (تاريخ + مسؤول)
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date_assigned ON daily_tasks(task_date, assigned_to_user_id);

-- gov_settlement_summaries: تجميع حسب المصرف ضمن نطاق تاريخي
CREATE INDEX IF NOT EXISTS idx_gov_settlement_summaries_sttl_bank ON gov_settlement_summaries(sttl_date, bank_display_name);
