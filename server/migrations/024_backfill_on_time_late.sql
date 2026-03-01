-- إعادة حساب "في الوقت" و"متأخرة" و delay_minutes لجميع التنفيذات السابقة حسب done_at مقابل due_date_time + grace
-- المهام المجدولة (daily_tasks)
UPDATE task_executions te
SET
  result_status = CASE
    WHEN (te.done_at AT TIME ZONE 'Asia/Baghdad') <= (dt.due_date_time AT TIME ZONE 'Asia/Baghdad') + (COALESCE(s.grace_minutes, 0) || ' minutes')::interval
    THEN 'completed'
    ELSE 'completed_late'
  END,
  delay_minutes = CASE
    WHEN (te.done_at AT TIME ZONE 'Asia/Baghdad') > (dt.due_date_time AT TIME ZONE 'Asia/Baghdad') + (COALESCE(s.grace_minutes, 0) || ' minutes')::interval
    THEN LEAST(120, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
      (te.done_at AT TIME ZONE 'Asia/Baghdad')
      - ((dt.due_date_time AT TIME ZONE 'Asia/Baghdad') + (COALESCE(s.grace_minutes, 0) || ' minutes')::interval)
    )) / 60)::int))
    ELSE NULL
  END
FROM daily_tasks dt
LEFT JOIN schedules s ON dt.schedule_id = s.id
WHERE te.daily_task_id = dt.id
  AND te.result_status IN ('completed', 'completed_late');

-- المهام الخاصة (ad_hoc_tasks) التي لها due_date_time
UPDATE task_executions te
SET
  result_status = CASE
    WHEN aht.due_date_time IS NULL THEN te.result_status
    WHEN (te.done_at AT TIME ZONE 'Asia/Baghdad') <= (aht.due_date_time AT TIME ZONE 'Asia/Baghdad')
    THEN 'completed'
    ELSE 'completed_late'
  END,
  delay_minutes = CASE
    WHEN aht.due_date_time IS NULL THEN te.delay_minutes
    WHEN (te.done_at AT TIME ZONE 'Asia/Baghdad') > (aht.due_date_time AT TIME ZONE 'Asia/Baghdad')
    THEN LEAST(120, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
      (te.done_at AT TIME ZONE 'Asia/Baghdad') - (aht.due_date_time AT TIME ZONE 'Asia/Baghdad')
    )) / 60)::int))
    ELSE NULL
  END
FROM ad_hoc_tasks aht
WHERE te.ad_hoc_task_id = aht.id
  AND te.result_status IN ('completed', 'completed_late')
  AND aht.due_date_time IS NOT NULL;
