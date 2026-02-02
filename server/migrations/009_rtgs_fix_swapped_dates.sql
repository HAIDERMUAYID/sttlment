-- =============================================
-- تصحيح تواريخ RTGS المُخزنة بترتيب خاطئ (شهر-يوم بدل يوم-شهر)
-- يُطبَّق على السجلات التي فيها الشهر > اليوم وكِلاهما ≤ 12
-- =============================================

-- 1) تصحيح sttl_date (عمود DATE)
UPDATE rtgs
SET sttl_date = make_date(
  extract(year from sttl_date)::int,
  extract(day from sttl_date)::int,
  extract(month from sttl_date)::int
)
WHERE sttl_date IS NOT NULL
  AND extract(month from sttl_date) > extract(day from sttl_date)
  AND extract(month from sttl_date) <= 12
  AND extract(day from sttl_date) <= 12;

-- 2) تصحيح transaction_date (عمود TIMESTAMP WITH TIME ZONE)
-- نبدّل يوم/شهر في تاريخ بغداد مع الإبقاء على الوقت
UPDATE rtgs
SET transaction_date = (
  make_date(
    extract(year from (transaction_date AT TIME ZONE 'Asia/Baghdad'))::int,
    extract(day from (transaction_date AT TIME ZONE 'Asia/Baghdad'))::int,
    extract(month from (transaction_date AT TIME ZONE 'Asia/Baghdad'))::int
  ) + (transaction_date AT TIME ZONE 'Asia/Baghdad')::time
) AT TIME ZONE 'Asia/Baghdad'
WHERE transaction_date IS NOT NULL
  AND extract(month from (transaction_date AT TIME ZONE 'Asia/Baghdad')) > extract(day from (transaction_date AT TIME ZONE 'Asia/Baghdad'))
  AND extract(month from (transaction_date AT TIME ZONE 'Asia/Baghdad')) <= 12
  AND extract(day from (transaction_date AT TIME ZONE 'Asia/Baghdad')) <= 12;
