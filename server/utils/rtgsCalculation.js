/**
 * عوامل احتساب RTGS — تُحمَّل من الإعدادات (settings.rtgs_calculation)
 * تُستخدم في: استيراد RTGS، عرض البيانات، التسويات الحكومية، مطابقة CT
 */

const pool = require('../config/database');

/** القيم الافتراضية — تطابق المنطق الأصلي */
const DEFAULT_CONFIG = {
  amount: {
    msg_type_negative: 'MSTPFRCB',
    tran_type_positive: 774,
  },
  fees: {
    min_amount: 5000,
    mcc_special: 5542,
    mcc_special_date_from: '2026-01-01',
    mcc_special_rate: 0.005,
    mcc_special_max_fee: 10000,
    mcc_special_max_amount: 1428571,
    mcc_5542_rate: 0.007,
    mcc_5542_max_fee: 10000,
    mcc_5542_max_amount: 1428571,
    /** من تاريخ تسوية 2-2-2025 يصبح حد المبلغ لـ MCC 5542 = 2000000؛ قبله يبقى 1428572 */
    mcc_5542_max_amount_date_from: '2025-02-02',
    mcc_5542_max_amount_after_date: 2000000,
    /** قواعد متعددة التواريخ لـ MCC 5542 — إن وُجدت تُستخدم بدل الحقلين أعلاه؛ كل قاعدة: date_from, max_amount, max_fee, rate */
    mcc_5542_rules: [],
    default_rate: 0.01,
    default_max_fee: 10000,
    default_max_amount: 1000000,
    precision_decimals: 6,
  },
  acq: {
    pos_rate: 0.7,
    non_pos_rate: 0.65,
  },
  match_tolerance: 0.0001,
};

/**
 * جلب إعدادات احتساب RTGS من قاعدة البيانات
 */
async function getRtgsConfig() {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'rtgs_calculation'");
    if (result.rows.length === 0) return { ...deepClone(DEFAULT_CONFIG) };
    const value = result.rows[0].value;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return mergeDeep(deepClone(DEFAULT_CONFIG), parsed || {});
  } catch {
    return { ...deepClone(DEFAULT_CONFIG) };
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeDeep(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = mergeDeep(out[key] || {}, source[key]);
    } else if (source[key] !== undefined && source[key] !== null) {
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * بناء تعبير SQL لاحتساب العمولة (fees) — يُستخدم في الاستعلامات
 */
function buildFeeExpr(config) {
  const f = config?.fees || DEFAULT_CONFIG.fees;
  const prec = Number(f.precision_decimals) || 6;
  const minAmt = Number(f.min_amount) ?? 5000;
  const mcc = Number(f.mcc_special) ?? 5542;
  const dateFrom = (f.mcc_special_date_from || '2026-01-01').toString().slice(0, 10);
  const rate1 = Number(f.mcc_special_rate) ?? 0.005;
  const maxFee1 = Number(f.mcc_special_max_fee) ?? 10000;
  const maxAmt1 = Number(f.mcc_special_max_amount) ?? 1428571;
  const rate2 = Number(f.mcc_5542_rate) ?? 0.007;
  const maxFee2 = Number(f.mcc_5542_max_fee) ?? 10000;
  const maxAmt2 = Number(f.mcc_5542_max_amount) ?? 1428571;
  const date5542From = (f.mcc_5542_max_amount_date_from || '2025-02-02').toString().slice(0, 10);
  const maxAmt2After = Number(f.mcc_5542_max_amount_after_date) ?? 2000000;
  const rateDef = Number(f.default_rate) ?? 0.01;
  const maxFeeDef = Number(f.default_max_fee) ?? 10000;
  const maxAmtDef = Number(f.default_max_amount) ?? 1000000;

  const rules = Array.isArray(f.mcc_5542_rules) ? f.mcc_5542_rules.filter((r) => r && r.date_from) : [];
  const sortedRules = [...rules].sort((a, b) => (b.date_from || '').localeCompare(a.date_from || ''));

  let mcc5542Branch;
  if (sortedRules.length > 0) {
    const whens = sortedRules.map((r) => {
      const d = (r.date_from || '').toString().slice(0, 10);
      const amt = Number(r.max_amount) ?? 1428571;
      const fee = Number(r.max_fee) ?? 10000;
      const rate = Number(r.rate) ?? 0.007;
      return `WHEN r.sttl_date >= '${d}' THEN (CASE WHEN COALESCE(r.amount, 0) > ${amt} THEN ${fee} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rate})::numeric, ${prec}) END)`;
    });
    mcc5542Branch = `CASE ${whens.join(' ')} ELSE (CASE WHEN COALESCE(r.amount, 0) > ${maxAmt2} THEN ${maxFee2} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rate2})::numeric, ${prec}) END) END`;
  } else {
    mcc5542Branch = `CASE WHEN r.sttl_date >= '${date5542From}' THEN (CASE WHEN COALESCE(r.amount, 0) > ${maxAmt2After} THEN ${maxFee2} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rate2})::numeric, ${prec}) END)
           ELSE (CASE WHEN COALESCE(r.amount, 0) > ${maxAmt2} THEN ${maxFee2} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rate2})::numeric, ${prec}) END) END`;
  }

  return `(CASE
    WHEN COALESCE(r.amount, 0) < ${minAmt} THEN 0
    WHEN COALESCE(r.mcc, 0)::int = ${mcc} AND r.sttl_date >= '${dateFrom}' THEN
      CASE WHEN COALESCE(r.amount, 0) > ${maxAmt1} THEN ${maxFee1} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rate1})::numeric, ${prec}) END
    WHEN COALESCE(r.mcc, 0)::int = ${mcc} THEN ${mcc5542Branch}
    ELSE
      CASE WHEN COALESCE(r.amount, 0) > ${maxAmtDef} THEN ${maxFeeDef} ELSE ROUND((ABS(COALESCE(r.amount, 0)) * ${rateDef})::numeric, ${prec}) END
  END)`;
}

/**
 * احتساب العمولة (fees) — لاستخدام JavaScript
 */
function computeFees(row, amount, config) {
  const f = config?.fees || DEFAULT_CONFIG.fees;
  const parseDate = config._parseDate;
  const mcc = parseInt(row.MCC || row.mcc || 0, 10);
  const sttlDate = row.sttl_date ?? row.STTL_DATE;
  const sttlDateObj = sttlDate instanceof Date ? sttlDate : (parseDate ? parseDate(sttlDate) : null);
  const dateFrom = new Date((f.mcc_special_date_from || '2026-01-01').toString().slice(0, 10));
  const afterSpecialDate = sttlDateObj && sttlDateObj >= dateFrom;
  const amountNum = Number(amount);
  const absAmount = Math.abs(amountNum);

  const minAmt = Number(f.min_amount) ?? 5000;
  if (amountNum < minAmt) return 0;

  let fee = 0;
  const mccSpecial = Number(f.mcc_special) ?? 5542;
  if (mcc === mccSpecial && afterSpecialDate) {
    const maxAmt = Number(f.mcc_special_max_amount) ?? 1428571;
    const maxFee = Number(f.mcc_special_max_fee) ?? 10000;
    const rate = Number(f.mcc_special_rate) ?? 0.005;
    if (amountNum > maxAmt) fee = maxFee;
    else fee = absAmount * rate;
  } else if (mcc === mccSpecial) {
    const rules = Array.isArray(f.mcc_5542_rules) ? f.mcc_5542_rules.filter((r) => r && r.date_from) : [];
    const sortedRules = [...rules].sort((a, b) => new Date(b.date_from || 0) - new Date(a.date_from || 0));
    let maxAmt = Number(f.mcc_5542_max_amount) ?? 1428571;
    let maxFee = Number(f.mcc_5542_max_fee) ?? 10000;
    let rate = Number(f.mcc_5542_rate) ?? 0.007;
    if (sortedRules.length > 0 && sttlDateObj) {
      const applied = sortedRules.find((r) => sttlDateObj >= new Date((r.date_from || '').toString().slice(0, 10)));
      if (applied) {
        maxAmt = Number(applied.max_amount) ?? maxAmt;
        maxFee = Number(applied.max_fee) ?? maxFee;
        rate = Number(applied.rate) ?? rate;
      }
    } else {
      const date5542From = new Date((f.mcc_5542_max_amount_date_from || '2025-02-02').toString().slice(0, 10));
      const useHigherMax = sttlDateObj && sttlDateObj >= date5542From;
      if (useHigherMax) maxAmt = Number(f.mcc_5542_max_amount_after_date) ?? 2000000;
    }
    if (amountNum > maxAmt) fee = maxFee;
    else fee = absAmount * rate;
  } else {
    const maxAmt = Number(f.default_max_amount) ?? 1000000;
    const maxFee = Number(f.default_max_fee) ?? 10000;
    const rate = Number(f.default_rate) ?? 0.01;
    if (amountNum > maxAmt) fee = maxFee;
    else fee = absAmount * rate;
  }
  const prec = Number(f.precision_decimals) || 6;
  const factor = Math.pow(10, prec);
  return Math.round(fee * factor) / factor;
}

/**
 * احتساب عمولة المحصل (ACQ)
 */
function computeAcq(fees, terminalType, config) {
  const acq = config?.acq || DEFAULT_CONFIG.acq;
  const t = (terminalType || '').toString().toUpperCase();
  const posRate = Number(acq.pos_rate) ?? 0.7;
  const nonPosRate = Number(acq.non_pos_rate) ?? 0.65;
  return t === 'POS' ? fees * posRate : fees * nonPosRate;
}

function _parseDecimal(val) {
  if (val == null || val === '') return 0;
  const s = String(val).trim().replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * احتساب المبلغ (amount) من صف الخام — يعتمد على MESSAGETYPE و TRANTYPE
 */
function computeAmount(row, config) {
  const amtCfg = config?.amount || DEFAULT_CONFIG.amount;
  const msgType = (row.MESSAGETYPE || row.message_type || '').toString().trim();
  const tranType = parseInt(row.TRANTYPE || row.tran_type || 0, 10);
  const parseDecimal = config._parseDecimal || _parseDecimal;
  const amt = parseDecimal(row.TRANSACTIONAMOUNT || row.transaction_amount) || 0;
  const msgNegative = (amtCfg.msg_type_negative || 'MSTPFRCB').toString().trim();
  const tranPositive = parseInt(amtCfg.tran_type_positive ?? 774, 10);
  if (msgType === msgNegative) return -amt;
  if (tranType === tranPositive) return amt;
  return -amt;
}

/**
 * بناء تعبير SQL لمضاعف ACQ (نسبة المحصل) حسب نوع الجهاز
 */
function buildAcqMultiplierExpr(config) {
  const acq = config?.acq || DEFAULT_CONFIG.acq;
  const posRate = Number(acq.pos_rate) ?? 0.7;
  const nonPosRate = Number(acq.non_pos_rate) ?? 0.65;
  return `CASE WHEN UPPER(TRIM(COALESCE(r.terminal_type, ''))) = 'POS' THEN ${posRate} ELSE ${nonPosRate} END`;
}

/**
 * هامش التطابق لمطابقة CT
 */
function getMatchTolerance(config) {
  return Number(config?.match_tolerance) ?? 0.0001;
}

module.exports = {
  DEFAULT_CONFIG,
  getRtgsConfig,
  buildFeeExpr,
  buildAcqMultiplierExpr,
  computeFees,
  computeAcq,
  computeAmount,
  getMatchTolerance,
};
