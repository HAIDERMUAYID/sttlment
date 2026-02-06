-- إضافة إجراءات صلاحيات ناقصة لتغطية كل الأزرار والخصائص

-- المهام: حذف مهمة / حذف الكل
UPDATE permission_definitions
SET actions = actions || '[{"key":"delete_task","label_ar":"حذف مهمة"}]'::jsonb
WHERE page_key = 'tasks'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(actions) AS elem WHERE elem->>'key' = 'delete_task');

-- صرف مستحقات التجار: تعديل صرف، حذف صرف
UPDATE permission_definitions
SET actions = actions || '[{"key":"update_disbursement","label_ar":"تعديل صرف"},{"key":"delete_disbursement","label_ar":"حذف صرف"}]'::jsonb
WHERE page_key = 'merchant_disbursements'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(actions) AS elem WHERE elem->>'key' = 'update_disbursement');
