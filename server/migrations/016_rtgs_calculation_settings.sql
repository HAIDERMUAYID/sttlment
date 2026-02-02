-- إعدادات احتساب RTGS — تُخزَّن في جدول settings
-- يتيح تعديل عوامل الاحتساب (عمولة، ACQ، حدود) من صفحة إعدادات بدون تغيير الكود

INSERT INTO settings (key, value, description) VALUES (
  'rtgs_calculation',
  '{
    "amount": {
      "msg_type_negative": "MSTPFRCB",
      "tran_type_positive": 774
    },
    "fees": {
      "min_amount": 5000,
      "mcc_special": 5542,
      "mcc_special_date_from": "2026-01-01",
      "mcc_special_rate": 0.005,
      "mcc_special_max_fee": 10000,
      "mcc_special_max_amount": 1428571,
      "mcc_5542_rate": 0.007,
      "mcc_5542_max_fee": 10000,
      "mcc_5542_max_amount": 1428571,
      "default_rate": 0.01,
      "default_max_fee": 10000,
      "default_max_amount": 1000000,
      "precision_decimals": 6
    },
    "acq": {
      "pos_rate": 0.7,
      "non_pos_rate": 0.65
    },
    "match_tolerance": 0.0001
  }'::jsonb,
  'عوامل احتساب RTGS: العمولة، ACQ، حدود MCC، نسب التوزيع'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
