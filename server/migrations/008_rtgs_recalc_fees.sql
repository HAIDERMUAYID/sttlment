-- =============================================
-- تصحيح العمولة (fees) و acq و sttle في جدول RTGS
-- المعادلة تعتمد على amount المحسوب (موجب/سالب) وليس TRANSACTIONAMOUNT: amount < 5000 → 0
-- =============================================

WITH new_fees AS (
  SELECT
    id,
    amount,
    terminal_type,
    (CASE
      WHEN COALESCE(amount, 0) < 5000 THEN 0
      WHEN COALESCE(mcc, 0)::int = 5542 AND sttl_date >= '2026-01-01' THEN
        CASE
          WHEN COALESCE(amount, 0) > 1428571 THEN 10000
          ELSE ROUND((ABS(COALESCE(amount, 0)) * 0.005)::numeric, 2)
        END
      WHEN COALESCE(mcc, 0)::int = 5542 THEN
        CASE
          WHEN COALESCE(amount, 0) > 1428571 THEN 10000
          ELSE ROUND((ABS(COALESCE(amount, 0)) * 0.007)::numeric, 2)
        END
      ELSE
        CASE
          WHEN COALESCE(amount, 0) > 1000000 THEN 10000
          ELSE ROUND((ABS(COALESCE(amount, 0)) * 0.01)::numeric, 2)
        END
    END) AS new_fees
  FROM rtgs
)
UPDATE rtgs r
SET
  fees = n.new_fees,
  acq = CASE WHEN UPPER(TRIM(COALESCE(r.terminal_type, ''))) = 'POS' THEN ROUND((n.new_fees * 0.7)::numeric, 2) ELSE ROUND((n.new_fees * 0.65)::numeric, 2) END,
  sttle = ROUND((COALESCE(r.amount, 0) - n.new_fees)::numeric, 2)
FROM new_fees n
WHERE r.id = n.id;
