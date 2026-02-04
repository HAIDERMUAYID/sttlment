const pool = require('../config/database');
const crypto = require('crypto');
const rtgsCalc = require('../utils/rtgsCalculation');

const BATCH_SIZE = 2000;
/** حد أقصى لصفوف الاستيراد في طلب واحد — لتجنب انتهاء المهلة أو استهلاك الذاكرة */
const MAX_IMPORT_ROWS = 150000;
/** مهلة طلب الاستيراد (بالمللي ثانية) — لملفات كبيرة */
const IMPORT_REQUEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 دقائق

/** هل الخطأ بسبب عدم وجود الجدول (لم تُنفَّذ الهجرة بعد) */
function isTableMissingError(err) {
  const code = err?.code;
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('column') && msg.includes('does not exist')) return false;
  return code === '42P01' || msg.includes('does not exist') || msg.includes('relation "rtgs"') || msg.includes('relation "settlement_maps"') || msg.includes('relation "import_logs"');
}


function parseDecimal(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim().replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** تحويل تاريخ إلى YYYY-MM-DD فقط (بدون وقت) لتجنب تغيّر اليوم بسبب UTC عند الحفظ في عمود DATE */
function toDateOnlyString(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const part = d.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * تحويل تاريخ الحركة للحفظ في DB — الحفاظ على الوقت الفعلي من الملف.
 * إذا كان التاريخ يحتوي وقتاً (غير منتصف الليل محلياً) نستخدم toISOString؛
 * وإلا نستخدم تاريخ فقط + T00:00:00.000Z لتجنب تغيّر اليوم بسبب UTC.
 */
function toTransactionDateISO(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const part = d.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part + 'T00:00:00.000Z';
    if (d.length >= 19) {
      const iso = d.slice(0, 19).replace(' ', 'T');
      return iso.endsWith('Z') ? iso : iso + '.000Z';
    }
    return part + 'T00:00:00.000Z';
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  if (h === 0 && m === 0 && s === 0) return toDateOnlyString(d) + 'T00:00:00.000Z';
  return d.toISOString();
}

/**
 * تحليل التاريخ من الملفات — صيغة المنطقة: يوم ثم شهر (DMY).
 * ⚠️ لا تُغيّر هذا المنطق — بيانات RTGS حساسة والتواريخ يجب أن تبقى صحيحة عند كل استيراد.
 *
 * قواعد ثابتة للاستيراد المستقبلي:
 * - YYYY-MM-DD أو YYYY-M-D: إذا الرقم الأول > الثاني وكِلاهما ≤12 → يوم-شهر (مثلاً 2026-10-01 → 10 يناير).
 * - D/M/YYYY: الرقم الأول = اليوم، الثاني = الشهر (مثلاً 10/1/2026 = 10 يناير).
 * - الحفظ: sttl_date كـ YYYY-MM-DD عبر toDateOnlyString؛ transaction_date كـ YYYY-MM-DDTHH:mm:ss.000Z.
 */
function parseDate(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  if (!s) return null;

  const timePart = s.match(/\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  const timeArr = timePart ? [+timePart[1] || 0, +timePart[2] || 0, +timePart[3] || 0] : [0, 0, 0];

  const isoOrHyphen = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoOrHyphen) {
    const y = +isoOrHyphen[1];
    const p1 = +isoOrHyphen[2];
    const p2 = +isoOrHyphen[3];
    let month, day;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    } else if (p1 <= 12 && p2 <= 12) {
      if (p1 > p2) {
        month = p2;
        day = p1;
      } else {
        month = p1;
        day = p2;
      }
    } else {
      month = p1;
      day = p2;
    }
    const d = new Date(y, month - 1, day, ...timeArr);
    return isNaN(d.getTime()) ? null : d;
  }

  const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmySlash) {
    const day = +dmySlash[1];
    const month = +dmySlash[2];
    const year = +dmySlash[3];
    if (month < 1 || month > 12) {
      let d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(year, month - 1, day, ...timeArr);
    return isNaN(d.getTime()) ? null : d;
  }

  let d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function maskCardNumber(cardNumber) {
  if (cardNumber == null || cardNumber === '') return null;
  const s = String(cardNumber).trim().replace(/\s/g, '');
  if (s.length <= 4) return s;
  return '****' + s.slice(-4);
}

function buildRowHash(row) {
  const str = [
    row.RRN, row.ISSUER, row.ACQUIRER, row.MESSAGETYPE, row.TRANTYPE,
    row.TRANSCATIONDATE, row.STTL_DATE, row.CARDNUMBER, row.CURR,
    row.TRANSACTIONAMOUNT, row.VAL, row.FEE01, row.FEE0075, row.FEE0025,
    row.MER, row.TERMINALTYPE, row.AUTHCODE, row.INST_ID, row.INST_ID2,
    row.MCC, row.INCOMING, row.TYPEOFTRAN, row.MERNAME
  ].map(v => v == null ? '' : String(v).trim()).join('|');
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function normalizeRow(raw, headers, cfg) {
  const row = {};
  headers.forEach((h, i) => {
    let key = (h != null ? String(h).trim() : '');
    if (key.charCodeAt(0) === 0xfeff) key = key.slice(1);
    key = key.replace(/\s+/g, '_').replace(/"/g, '');
    if (!key) key = `col_${i}`;
    let val = raw[i] != null ? String(raw[i]).trim() : '';
    if (val.charCodeAt(0) === 0xfeff) val = val.slice(1);
    row[key] = val;
  });
  const get = (a, b) => (row[a] != null && String(row[a]).trim() !== '' ? String(row[a]).trim() : (row[b] != null && String(row[b]).trim() !== '' ? String(row[b]).trim() : ''));
  const rrnCandidates = ['RRN', 'rrn', 'Reference', 'REF_NUM', 'رقم_المرجع', 'مرجع'];
  let rrn = '';
  for (const k of rrnCandidates) {
    if (row[k] != null && String(row[k]).trim() !== '') {
      rrn = String(row[k]).trim();
      break;
    }
  }
  if (!rrn && headers.length > 0) {
    const firstKey = Object.keys(row)[0];
    const firstVal = row[firstKey] ? String(row[firstKey]).trim() : '';
    if (firstVal.length >= 6 && /[\dA-Za-z]/.test(firstVal)) rrn = firstVal;
  }
  const transactionDate = parseDate(get('TRANSCATIONDATE', 'transactiondate') || get('TRANSACTIONDATE', 'transaction_date'));
  const sttlDate = parseDate(get('STTL_DATE', 'sttl_date'));
  const transactionAmount = parseDecimal(get('TRANSACTIONAMOUNT', 'transactionamount'));
  const cardNumber = get('CARDNUMBER', 'cardnumber');
  const rowForCalc = { ...row, sttl_date: sttlDate, STTL_DATE: sttlDate };
  const config = cfg ? { ...cfg, _parseDate: parseDate, _parseDecimal: parseDecimal } : null;
  const amount = rtgsCalc.computeAmount(rowForCalc, config);
  const fees = rtgsCalc.computeFees(rowForCalc, amount, config);
  const terminalType = get('TERMINALTYPE', 'terminaltype');
  const acq = rtgsCalc.computeAcq(fees, terminalType, config);
  const sttle = amount - fees;

  // fee01 من الملف يُخزَّن للمرجع فقط؛ احتساب fees يعتمد على computeFees فقط
  return {
    rrn,
    issuer: get('ISSUER', 'issuer'),
    acquirer: get('ACQUIRER', 'acquirer'),
    message_type: get('MESSAGETYPE', 'messagetype'),
    tran_type: parseDecimal(get('TRANTYPE', 'trantype')) || null,
    transaction_date: transactionDate,
    sttl_date: sttlDate,
    card_number_masked: maskCardNumber(cardNumber),
    curr: get('CURR', 'curr'),
    transaction_amount: transactionAmount,
    val: get('VAL', 'val'),
    fee01: parseDecimal(get('FEE01', 'fee01')),
    fee0075: parseDecimal(get('FEE0075', 'fee0075')),
    fee0025: parseDecimal(get('FEE0025', 'fee0025')),
    mer: get('MER', 'mer'),
    terminal_type: get('TERMINALTYPE', 'terminaltype'),
    auth_code: get('AUTHCODE', 'authcode'),
    inst_id: get('INST_ID', 'inst_id'),
    inst_id2: get('INST_ID2', 'inst_id2'),
    mcc: parseDecimal(get('MCC', 'mcc')) || null,
    incoming: get('INCOMING', 'incoming'),
    type_of_tran: get('TYPEOFTRAN', 'typeoftran'),
    mer_name: get('MERNAME', 'mername'),
    amount,
    fees,
    acq,
    sttle,
    row_hash: buildRowHash(row),
    _reject: !rrn,
  };
}

async function getRtgs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      sttl_date_from,
      sttl_date_to,
      transaction_date_from,
      transaction_date_to,
      mer,
      mcc,
      inst_id2,
      search,
      text_search,
      message_type,
      ministry,
      directorate_name,
      bank_display_name,
      terminal_type,
      import_log_id,
      governorate,
      details,
      iban,
    } = req.query;

    const params = [];
    let paramCount = 1;
    let where = ' WHERE 1=1 ';

    if (sttl_date_from) {
      where += ` AND r.sttl_date >= $${paramCount++}`;
      params.push(sttl_date_from);
    }
    if (sttl_date_to) {
      where += ` AND r.sttl_date <= $${paramCount++}`;
      params.push(sttl_date_to);
    }
    if (transaction_date_from) {
      where += ` AND (r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date >= $${paramCount++}::date`;
      params.push(transaction_date_from);
    }
    if (transaction_date_to) {
      where += ` AND (r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date <= $${paramCount++}::date`;
      params.push(transaction_date_to);
    }
    const toArray = (v) => (v == null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
    const merArr = toArray(mer);
    const mccArr = toArray(mcc);
    const instId2Arr = toArray(inst_id2);
    const messageTypeArr = toArray(message_type);
    const ministryArr = toArray(ministry);
    const directorateArr = toArray(directorate_name);
    const bankArr = toArray(bank_display_name);
    const governorateArr = toArray(governorate);
    const terminalArr = toArray(terminal_type);

    if (merArr.length > 0) {
      where += ` AND r.mer = ANY($${paramCount++}::text[])`;
      params.push(merArr);
    }
    if (mccArr.length > 0) {
      where += ` AND r.mcc::text = ANY($${paramCount++}::text[])`;
      params.push(mccArr.map(String));
    }
    if (instId2Arr.length > 0) {
      where += ` AND r.inst_id2 = ANY($${paramCount++}::text[])`;
      params.push(instId2Arr);
    }
    if (search) {
      where += ` AND r.rrn ILIKE $${paramCount++}`;
      params.push('%' + search + '%');
    }
    if (text_search && String(text_search).trim()) {
      const term = '%' + String(text_search).trim() + '%';
      where += ` AND ( r.rrn ILIKE $${paramCount++} OR r.mer ILIKE $${paramCount++} OR r.mer_name ILIKE $${paramCount++} OR m.directorate_name ILIKE $${paramCount++} OR m.ministry ILIKE $${paramCount++} OR sm.display_name_ar ILIKE $${paramCount++} OR m.details ILIKE $${paramCount++} )`;
      params.push(term, term, term, term, term, term, term);
    }
    if (messageTypeArr.length > 0) {
      where += ` AND r.message_type = ANY($${paramCount++}::text[])`;
      params.push(messageTypeArr);
    }
    if (ministryArr.length > 0) {
      where += ` AND m.ministry = ANY($${paramCount++}::text[])`;
      params.push(ministryArr);
    }
    if (directorateArr.length > 0) {
      where += ` AND m.directorate_name = ANY($${paramCount++}::text[])`;
      params.push(directorateArr);
    }
    if (governorateArr.length > 0) {
      where += ` AND m.governorate = ANY($${paramCount++}::text[])`;
      params.push(governorateArr);
    }
    if (bankArr.length > 0) {
      where += ` AND sm.display_name_ar = ANY($${paramCount++}::text[])`;
      params.push(bankArr);
    }
    if (terminalArr.length > 0) {
      where += ` AND r.terminal_type = ANY($${paramCount++}::text[])`;
      params.push(terminalArr);
    }
    const hasImportLogId = import_log_id ? true : false;
    if (import_log_id) {
      where += ` AND r.import_log_id = $${paramCount++}`;
      params.push(parseInt(import_log_id, 10));
    }
    if (details && String(details).trim()) {
      where += ` AND m.details ILIKE $${paramCount++}`;
      params.push('%' + String(details).trim() + '%');
    }
    if (iban && String(iban).trim()) {
      where += ` AND m.iban ILIKE $${paramCount++}`;
      params.push('%' + String(iban).trim() + '%');
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const limitVal = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const fromJoinWithIl = ' FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 LEFT JOIN import_logs il ON il.id = r.import_log_id ';
    const fromJoinLegacy = ' FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 ';

    const selectWithIl = `r.*, m.governorate, m.directorate_name, m.ministry, m.details AS merchant_details, m.iban AS merchant_iban, COALESCE(NULLIF(TRIM(m.directorate_name), ''), NULLIF(TRIM(r.mer_name), ''), 'غير معرف') AS merchant_display_name, sm.display_name_ar AS bank_display_name, il.filename AS source_filename`;
    const selectLegacy = `r.*, m.governorate, m.directorate_name, m.ministry, m.details AS merchant_details, m.iban AS merchant_iban, COALESCE(NULLIF(TRIM(m.directorate_name), ''), NULLIF(TRIM(r.mer_name), ''), 'غير معرف') AS merchant_display_name, sm.display_name_ar AS bank_display_name`;

    let total = 0;
    let listResult;
    const paramsWithLimit = [...params, limitVal, offset];

    const runWithImportLogs = async () => {
      const countResult = await pool.query(`SELECT COUNT(*) AS total ${fromJoinWithIl} ${where}`, params);
      total = parseInt(countResult.rows[0].total, 10);
      const listQuery = `SELECT ${selectWithIl} FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 LEFT JOIN import_logs il ON il.id = r.import_log_id ${where} ORDER BY r.sttl_date DESC, r.id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      listResult = await pool.query(listQuery, paramsWithLimit);
    };

    const runLegacy = async () => {
      const countResult = await pool.query(`SELECT COUNT(*) AS total ${fromJoinLegacy} ${where}`, params);
      total = parseInt(countResult.rows[0].total, 10);
      const listQuery = `SELECT ${selectLegacy} FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 ${where} ORDER BY r.sttl_date DESC, r.id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      listResult = await pool.query(listQuery, paramsWithLimit);
    };

    try {
      await runWithImportLogs();
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('import_log_id') || (msg.includes('column') && msg.includes('does not exist'))) {
        if (hasImportLogId) {
          return res.status(400).json({ error: 'فلتر الملف المصدر يتطلب تنفيذ الهجرة. نفّذ: node server/migrations/runMigrations.js' });
        }
        await runLegacy();
      } else {
        throw err;
      }
    }
    const rtgsConfig = await rtgsCalc.getRtgsConfig();
    const cfg = { ...rtgsConfig, _parseDate: parseDate };
    const prec = Math.pow(10, Number(rtgsConfig.fees?.precision_decimals) || 6);
    const rows = listResult.rows.map((r) => {
      const sttlDateStr = toDateOnlyString(r.sttl_date) || (typeof r.sttl_date === 'string' ? r.sttl_date.slice(0, 10) : null);
      const sttlDateObj = r.sttl_date;
      const feesComputed = rtgsCalc.computeFees({ mcc: r.mcc, sttl_date: sttlDateObj, STTL_DATE: sttlDateObj }, r.amount, cfg);
      const acqComputed = rtgsCalc.computeAcq(feesComputed, r.terminal_type, cfg);
      const sttleComputed = (Number(r.amount) || 0) - feesComputed;
      return {
        ...r,
        source_filename: r.source_filename ?? null,
        sttl_date: sttlDateStr,
        fees: Math.round(feesComputed * prec) / prec,
        acq: Math.round(acqComputed * prec) / prec,
        sttle: Math.round(sttleComputed * prec) / prec,
      };
    });

    res.json({
      rtgs: rows,
      pagination: {
        page: Math.floor(offset / limitVal) + 1,
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal),
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      const limitVal = Math.min(100, Math.max(1, parseInt(req.query.limit || 50, 10)));
      return res.json({
        rtgs: [],
        pagination: { page: 1, limit: limitVal, total: 0, totalPages: 0 },
      });
    }
    console.error('خطأ في جلب RTGS:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

async function getRtgsFilterOptions(req, res) {
  try {
    const [merResult, mccResult, instResult, msgResult, termResult, ministryResult, directorateResult, bankResult, governorateResult] = await Promise.all([
      pool.query('SELECT DISTINCT mer FROM rtgs WHERE mer IS NOT NULL AND mer != \'\' ORDER BY mer'),
      pool.query('SELECT DISTINCT mcc FROM rtgs WHERE mcc IS NOT NULL ORDER BY mcc'),
      pool.query('SELECT DISTINCT inst_id2 FROM rtgs WHERE inst_id2 IS NOT NULL AND inst_id2 != \'\' ORDER BY inst_id2'),
      pool.query('SELECT DISTINCT message_type FROM rtgs WHERE message_type IS NOT NULL AND message_type != \'\' ORDER BY message_type'),
      pool.query('SELECT DISTINCT terminal_type FROM rtgs WHERE terminal_type IS NOT NULL AND terminal_type != \'\' ORDER BY terminal_type'),
      pool.query(`SELECT DISTINCT m.ministry FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer WHERE m.ministry IS NOT NULL AND TRIM(m.ministry) != '' ORDER BY m.ministry`),
      pool.query(`SELECT DISTINCT m.directorate_name FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer WHERE m.directorate_name IS NOT NULL AND TRIM(m.directorate_name) != '' ORDER BY m.directorate_name`),
      pool.query(`SELECT DISTINCT sm.display_name_ar FROM rtgs r LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 WHERE sm.display_name_ar IS NOT NULL AND TRIM(sm.display_name_ar) != '' ORDER BY sm.display_name_ar`),
      pool.query(`SELECT DISTINCT m.governorate FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer WHERE m.governorate IS NOT NULL AND TRIM(m.governorate) != '' ORDER BY m.governorate`),
    ]);
    res.json({
      merList: merResult.rows.map((r) => r.mer),
      mccList: mccResult.rows.map((r) => r.mcc),
      instId2List: instResult.rows.map((r) => r.inst_id2),
      messageTypeList: msgResult.rows.map((r) => r.message_type),
      terminalTypeList: termResult.rows.map((r) => r.terminal_type),
      ministryList: ministryResult.rows.map((r) => r.ministry),
      directorateNameList: directorateResult.rows.map((r) => r.directorate_name),
      bankDisplayNameList: bankResult.rows.map((r) => r.display_name_ar),
      governorateList: governorateResult.rows.map((r) => r.governorate),
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.json({
        merList: [], mccList: [], instId2List: [],
        messageTypeList: [], terminalTypeList: [], ministryList: [], directorateNameList: [], bankDisplayNameList: [], governorateList: [],
      });
    }
    console.error('خطأ في خيارات الفلتر:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

async function getSettlementMaps(req, res) {
  try {
    const result = await pool.query('SELECT * FROM settlement_maps ORDER BY inst_id');
    res.json(result.rows);
  } catch (error) {
    if (isTableMissingError(error)) return res.json([]);
    console.error('خطأ في جلب Settlement Maps:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

async function getImportLogs(req, res) {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT il.*, u.name AS user_name
       FROM import_logs il
       LEFT JOIN users u ON u.id = il.user_id
       ORDER BY il.created_at DESC
       LIMIT $1`,
      [Math.min(100, Math.max(1, parseInt(limit, 10)))]
    );
    res.json(result.rows);
  } catch (error) {
    if (isTableMissingError(error)) return res.json([]);
    console.error('خطأ في جلب سجل الاستيراد:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

async function deleteImportLog(req, res) {
  try {
    const { id } = req.params;
    const logId = parseInt(id, 10);
    if (isNaN(logId)) {
      return res.status(400).json({ error: 'معرف سجل الاستيراد غير صالح' });
    }
    const client = await pool.connect();
    try {
      const countResult = await client.query('SELECT COUNT(*) FROM rtgs WHERE import_log_id = $1', [logId]);
      const rtgsCount = parseInt(countResult.rows[0].count, 10);
      await client.query('DELETE FROM rtgs WHERE import_log_id = $1', [logId]);
      const delLog = await client.query('DELETE FROM import_logs WHERE id = $1 RETURNING id', [logId]);
      if (delLog.rowCount === 0) {
        return res.status(404).json({ error: 'سجل الاستيراد غير موجود' });
      }
      res.json({
        deleted: true,
        import_log_id: logId,
        rtgs_deleted: rtgsCount,
        message: `تم حذف سجل الاستيراد و ${rtgsCount} حركة RTGS المرتبطة به`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.status(503).json({ error: 'جداول RTGS غير مهيأة' });
    }
    console.error('خطأ في حذف سجل الاستيراد:', error);
    res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}

async function deleteAllRtgs(req, res) {
  try {
    const client = await pool.connect();
    try {
      const countResult = await client.query('SELECT COUNT(*) FROM rtgs');
      const rtgsCount = parseInt(countResult.rows[0]?.count || '0', 10);
      await client.query('DELETE FROM rtgs');
      await client.query('DELETE FROM import_logs');
      res.json({
        deleted: true,
        rtgs_deleted: rtgsCount,
        message: `تم حذف ${rtgsCount} حركة RTGS وسجلات الاستيراد المرتبطة بها`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.status(503).json({ error: 'جداول RTGS غير مهيأة' });
    }
    console.error('خطأ في حذف حركات RTGS:', error);
    res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}

async function importRtgs(req, res) {
  try {
    req.setTimeout(IMPORT_REQUEST_TIMEOUT_MS);
    res.setTimeout(IMPORT_REQUEST_TIMEOUT_MS);

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'لم يتم رفع ملف CSV' });
    }
    const rtgsConfig = await rtgsCalc.getRtgsConfig();

    const csv = require('csv-parse/sync');
    const buffer = req.file.buffer;
    let content = buffer.toString('utf8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    let rows = csv.parse(content, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
    if (rows.length >= 1 && rows[0].length === 1 && String(rows[0][0] || '').includes(';')) {
      rows = csv.parse(content, {
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter: ';',
      });
    }

    if (rows.length < 2) {
      return res.status(400).json({
        error: 'الملف فارغ أو لا يحتوي على رؤوس وبيانات',
        summary: { total_rows: rows.length, inserted_rows: 0, skipped_duplicates: 0, rejected_rows: rows.length },
      });
    }

    const headers = rows[0].map((h) => (h || '').trim());
    const dataRows = rows.slice(1);

    if (dataRows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        error: `الملف كبير جداً (${dataRows.length} صف). الحد الأقصى ${MAX_IMPORT_ROWS.toLocaleString('ar-EG')} صف في طلب واحد. قسّم الملف إلى أجزاء أصغر أو استورد على دفعات.`,
        max_rows: MAX_IMPORT_ROWS,
        received_rows: dataRows.length,
      });
    }
    let inserted = 0;
    let skipped = 0;
    let rejected = 0;
    const rejectedReasons = [];
    const startTime = Date.now();

    const client = await pool.connect();
    let importLogId = null;
    try {
      /* إدراج سجل الاستيراد أولاً للحصول على id وربط الحركات به */
      const logInsert = await client.query(
        `INSERT INTO import_logs (user_id, filename, total_rows, inserted_rows, skipped_duplicates, rejected_rows, details)
         VALUES ($1, $2, $3, 0, 0, 0, $4) RETURNING id`,
        [req.user?.id || null, req.file.originalname || 'upload.csv', dataRows.length, JSON.stringify({})]
      );
      importLogId = logInsert.rows[0]?.id;

      for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = [];
        let paramCount = 1;

        for (let j = 0; j < batch.length; j++) {
          const raw = batch[j];
          const row = {};
          headers.forEach((h, k) => {
            const key = h.replace(/\s+/g, '_').replace(/"/g, '');
            row[key] = raw[k] != null ? String(raw[k]).trim() : '';
          });
          const norm = normalizeRow(raw, headers, rtgsConfig);
          if (norm._reject) {
            rejected++;
            if (rejectedReasons.length < 50) rejectedReasons.push({ row: i + j + 2, reason: 'RRN فارغ' });
            continue;
          }

          const cols = [
            'rrn', 'issuer', 'acquirer', 'message_type', 'tran_type', 'transaction_date', 'sttl_date',
            'card_number_masked', 'curr', 'transaction_amount', 'val', 'fee01', 'fee0075', 'fee0025',
            'mer', 'terminal_type', 'auth_code', 'inst_id', 'inst_id2', 'mcc', 'incoming', 'type_of_tran', 'mer_name',
            'amount', 'fees', 'acq', 'sttle', 'row_hash',
          ];
          const vals = [
            norm.rrn, norm.issuer, norm.acquirer, norm.message_type, norm.tran_type,
            norm.transaction_date, norm.sttl_date, norm.card_number_masked, norm.curr, norm.transaction_amount,
            norm.val, norm.fee01, norm.fee0075, norm.fee0025, norm.mer, norm.terminal_type, norm.auth_code,
            norm.inst_id, norm.inst_id2, norm.mcc, norm.incoming, norm.type_of_tran, norm.mer_name,
            norm.amount, norm.fees, norm.acq, norm.sttle, norm.row_hash,
          ];
          cols.forEach((c, k) => {
            placeholders.push(
              vals[k] == null
                ? 'NULL'
                : (typeof vals[k] === 'object' && vals[k] instanceof Date
                  ? `$${paramCount++}::timestamptz`
                  : `$${paramCount++}`)
            );
            if (vals[k] != null && !(vals[k] instanceof Date)) values.push(vals[k]);
            else if (vals[k] instanceof Date) values.push(vals[k].toISOString());
          });
        }

        if (values.length === 0) continue;

        const insertSql = `
          INSERT INTO rtgs (
            rrn, issuer, acquirer, message_type, tran_type, transaction_date, sttl_date,
            card_number_masked, curr, transaction_amount, val, fee01, fee0075, fee0025,
            mer, terminal_type, auth_code, inst_id, inst_id2, mcc, incoming, type_of_tran, mer_name,
            amount, fees, acq, sttle, row_hash
          ) VALUES ${placeholders
            .reduce((acc, _, j) => {
              const start = j * 28;
              acc.push('(' + placeholders.slice(start, start + 28).map((p, i) => (p === 'NULL' ? 'NULL' : `$${start + i + 1}`)).join(', ') + ')');
              return acc;
            }, [])
            .join(', ')}
          ON CONFLICT (row_hash) DO NOTHING
        `;

        const flatValues = [];
        for (const r of batch) {
          const row = {};
          headers.forEach((h, k) => {
            const key = h.replace(/\s+/g, '_').replace(/"/g, '');
            row[key] = r[k] != null ? String(r[k]).trim() : '';
          });
          const norm = normalizeRow(r, headers, rtgsConfig);
          if (norm._reject) continue;
          flatValues.push(
            norm.rrn, norm.issuer, norm.acquirer, norm.message_type, norm.tran_type,
            norm.transaction_date ? toTransactionDateISO(norm.transaction_date) : null, toDateOnlyString(norm.sttl_date),
            norm.card_number_masked, norm.curr, norm.transaction_amount, norm.val, norm.fee01, norm.fee0075, norm.fee0025,
            norm.mer, norm.terminal_type, norm.auth_code, norm.inst_id, norm.inst_id2, norm.mcc, norm.incoming, norm.type_of_tran, norm.mer_name,
            norm.amount, norm.fees, norm.acq, norm.sttle, norm.row_hash
          );
        }

        if (flatValues.length > 0) {
          const ph = [];
          let pc = 1;
          const expandedValues = [];
          for (let j = 0; j < flatValues.length / 28; j++) {
            expandedValues.push(...flatValues.slice(j * 28, j * 28 + 28), importLogId);
            ph.push('(' + Array.from({ length: 29 }, () => `$${pc++}`).join(', ') + ')');
          }
          const sql = `
            INSERT INTO rtgs (
              rrn, issuer, acquirer, message_type, tran_type, transaction_date, sttl_date,
              card_number_masked, curr, transaction_amount, val, fee01, fee0075, fee0025,
              mer, terminal_type, auth_code, inst_id, inst_id2, mcc, incoming, type_of_tran, mer_name,
              amount, fees, acq, sttle, row_hash, import_log_id
            ) VALUES ${ph.join(', ')}
            ON CONFLICT (row_hash) DO NOTHING
          `;
          const insertResult = await client.query(sql, expandedValues);
          const batchInserted = insertResult.rowCount || 0;
          inserted += batchInserted;
          skipped += batch.length - (rejectedInBatch(batch, headers) || 0) - batchInserted;
        }
      }

      function rejectedInBatch(batch, hdrs) {
        let r = 0;
        for (const raw of batch) {
          const row = {};
          hdrs.forEach((h, k) => {
            row[h.replace(/\s+/g, '_').replace(/"/g, '')] = raw[k] != null ? String(raw[k]).trim() : '';
          });
          const rr = (row.RRN || row.rrn || '').trim();
          if (!rr) r++;
        }
        return r;
      }

      const durationMs = Date.now() - startTime;
      if (importLogId) {
        await client.query(
          `UPDATE import_logs SET inserted_rows = $1, skipped_duplicates = $2, rejected_rows = $3, details = $4, duration_ms = $5 WHERE id = $6`,
          [inserted, skipped, rejected, JSON.stringify({ rejected_sample: rejectedReasons.slice(0, 20) }), durationMs, importLogId]
        );
      }
    } finally {
      client.release();
    }

    res.json({
      summary: {
        total_rows: dataRows.length,
        inserted_rows: inserted,
        skipped_duplicates: skipped,
        rejected_rows: rejected,
      },
      rejected_sample: rejectedReasons.slice(0, 20),
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.status(503).json({
        error: 'جداول RTGS غير مهيأة. يرجى تشغيل هجرة قاعدة البيانات أولاً: server/migrations/007_rtgs_module.sql',
      });
    }
    console.error('خطأ في استيراد RTGS:', error);
    res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}

async function getGovernmentSettlements(req, res) {
  try {
    const { sttl_date_from, sttl_date_to, page = 1, limit = 100 } = req.query;
    const params = [];
    let paramCount = 1;
    let where = ' WHERE 1=1 ';
    if (sttl_date_from) {
      where += ` AND r.sttl_date >= $${paramCount++}`;
      params.push(sttl_date_from);
    }
    if (sttl_date_to) {
      where += ` AND r.sttl_date <= $${paramCount++}`;
      params.push(sttl_date_to);
    }
    const limitVal = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitVal;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM (
        SELECT 1
        FROM rtgs r
        LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
        ${where}
        GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar
      ) t`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const listQuery = `
      SELECT
        r.sttl_date,
        r.inst_id2,
        COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف') AS bank_name,
        COUNT(*) AS movement_count,
        COALESCE(SUM(r.amount), 0) AS sum_amount,
        COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
        COALESCE(SUM(${feeExpr} * ${acqMult}), 0) AS sum_acq,
        COALESCE(SUM(r.amount - ${feeExpr}), 0) AS sum_sttle
      FROM rtgs r
      LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
      ${where}
      GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar
      ORDER BY r.sttl_date DESC, bank_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limitVal, offset);
    const listResult = await pool.query(listQuery, params);

    const data = (listResult.rows || []).map((row) => {
      const sttl = toDateOnlyString(row.sttl_date) || (typeof row.sttl_date === 'string' ? row.sttl_date.slice(0, 10) : null);
      return {
        ...row,
        sttl_date: sttl || null,
      };
    });

    res.json({
      data,
      pagination: {
        page: Math.floor(offset / limitVal) + 1,
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal),
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.json({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    }
    console.error('خطأ في جلب التسويات الحكومية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** مساعد: جلب بيانات التسويات الحكومية لتاريخ معيّن (للاستخدام من TV dashboard — نفس مصدر صفحة التسويات الحكومية) */
async function getGovernmentSettlementsDataForDate(sttlDate, bankFilter = []) {
  const params = [];
  let paramCount = 1;
  let where = ' WHERE 1=1 ';
  if (sttlDate) {
    where += ` AND r.sttl_date >= $${paramCount++}`;
    params.push(sttlDate);
    where += ` AND r.sttl_date <= $${paramCount++}`;
    params.push(sttlDate);
  }
  if (Array.isArray(bankFilter) && bankFilter.length > 0) {
    where += ` AND sm.display_name_ar = ANY($${paramCount++}::text[])`;
    params.push(bankFilter.map((s) => String(s).trim()).filter(Boolean));
  }
  const limitVal = 500; // كل التسويات لهذا التاريخ
  const offset = 0;

  const rtgsCfgList = await rtgsCalc.getRtgsConfig();
  const feeExprCte = rtgsCalc.buildFeeExpr(rtgsCfgList);
  const posRate = Number(rtgsCfgList.acq?.pos_rate) ?? 0.7;
  const nonPosRate = Number(rtgsCfgList.acq?.non_pos_rate) ?? 0.65;

  const listQuery = `
    WITH settlements AS (
      SELECT r.sttl_date, r.inst_id2, COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف') AS bank_name,
             ROW_NUMBER() OVER (ORDER BY r.sttl_date DESC, COALESCE(sm.display_name_ar, r.inst_id2)) AS rn
      FROM rtgs r
      LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
      ${where}
      GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar
    ),
    page_settlements AS (
      SELECT sttl_date, inst_id2, bank_name FROM settlements
      WHERE rn > $${paramCount} AND rn <= $${paramCount + 1}
    ),
    fee_per_row AS (
      SELECT r.sttl_date, r.inst_id2, p.bank_name,
             ((r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date) AS transaction_date,
             r.amount,
             UPPER(TRIM(COALESCE(r.terminal_type, ''))) = 'POS' AS is_pos,
             ${feeExprCte} AS fee_computed
      FROM rtgs r
      INNER JOIN page_settlements p ON r.sttl_date = p.sttl_date AND r.inst_id2 = p.inst_id2
      LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
    )
    SELECT sttl_date, inst_id2, bank_name, transaction_date,
           COUNT(*) AS movement_count,
           COALESCE(SUM(amount), 0) AS sum_amount,
           COALESCE(SUM(fee_computed), 0) AS sum_fees,
           COALESCE(SUM(fee_computed * CASE WHEN is_pos THEN ${posRate} ELSE ${nonPosRate} END), 0) AS sum_acq,
           COALESCE(SUM(amount - fee_computed), 0) AS sum_sttle
    FROM fee_per_row
    GROUP BY sttl_date, inst_id2, bank_name, transaction_date
    ORDER BY sttl_date DESC, bank_name, transaction_date
  `;
  params.push(offset, offset + limitVal);
  const listResult = await pool.query(listQuery, params);
  const rows = (listResult.rows || []).map((row) => {
    const sttl = toDateOnlyString(row.sttl_date) || (typeof row.sttl_date === 'string' ? row.sttl_date.slice(0, 10) : null);
    const tran = toDateOnlyString(row.transaction_date) || (typeof row.transaction_date === 'string' ? row.transaction_date.slice(0, 10) : null);
    return {
      ...row,
      sttl_date: sttl || null,
      transaction_date: tran || null,
    };
  });
  return { rows };
}

/** التسويات الحكومية مفصّلة حسب تاريخ الحركة: كل تسوية (تاريخ تسوية + مصرف) تحتوي على صفوف حسب تاريخ الحركة لمعرفة الحركات المتأخرة */
async function getGovernmentSettlementsByTransactionDate(req, res) {
  try {
    const { sttl_date_from, sttl_date_to, bank_display_name, page = 1, limit = 20 } = req.query;
    const params = [];
    let paramCount = 1;
    let where = ' WHERE 1=1 ';
    if (sttl_date_from) {
      where += ` AND r.sttl_date >= $${paramCount++}`;
      params.push(sttl_date_from);
    }
    if (sttl_date_to) {
      where += ` AND r.sttl_date <= $${paramCount++}`;
      params.push(sttl_date_to);
    }
    const bankArr = bank_display_name == null || bank_display_name === '' ? [] : String(bank_display_name).split(',').map((s) => s.trim()).filter(Boolean);
    if (bankArr.length > 0) {
      where += ` AND sm.display_name_ar = ANY($${paramCount++}::text[])`;
      params.push(bankArr);
    }
    const limitVal = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitVal;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM (
        SELECT 1
        FROM rtgs r
        LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
        ${where}
        GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar
      ) t`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const rtgsCfgList = await rtgsCalc.getRtgsConfig();
    const feeExprCte = rtgsCalc.buildFeeExpr(rtgsCfgList);
    const posRate = Number(rtgsCfgList.acq?.pos_rate) ?? 0.7;
    const nonPosRate = Number(rtgsCfgList.acq?.non_pos_rate) ?? 0.65;

    const listQuery = `
      WITH settlements AS (
        SELECT r.sttl_date, r.inst_id2, COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف') AS bank_name,
               ROW_NUMBER() OVER (ORDER BY r.sttl_date DESC, COALESCE(sm.display_name_ar, r.inst_id2)) AS rn
        FROM rtgs r
        LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
        ${where}
        GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar
      ),
      page_settlements AS (
        SELECT sttl_date, inst_id2, bank_name FROM settlements
        WHERE rn > $${paramCount} AND rn <= $${paramCount + 1}
      ),
      fee_per_row AS (
        SELECT r.sttl_date, r.inst_id2, p.bank_name,
               ((r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date) AS transaction_date,
               r.amount,
               UPPER(TRIM(COALESCE(r.terminal_type, ''))) = 'POS' AS is_pos,
               ${feeExprCte} AS fee_computed
        FROM rtgs r
        INNER JOIN page_settlements p ON r.sttl_date = p.sttl_date AND r.inst_id2 = p.inst_id2
        LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
      )
      SELECT sttl_date, inst_id2, bank_name, transaction_date,
             COUNT(*) AS movement_count,
             COALESCE(SUM(amount), 0) AS sum_amount,
             COALESCE(SUM(fee_computed), 0) AS sum_fees,
             COALESCE(SUM(fee_computed * CASE WHEN is_pos THEN ${posRate} ELSE ${nonPosRate} END), 0) AS sum_acq,
             COALESCE(SUM(amount - fee_computed), 0) AS sum_sttle
      FROM fee_per_row
      GROUP BY sttl_date, inst_id2, bank_name, transaction_date
      ORDER BY sttl_date DESC, bank_name, transaction_date
    `;
    params.push(offset, offset + limitVal);
    const listResult = await pool.query(listQuery, params);

    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExprSummary = rtgsCalc.buildFeeExpr(rtgsCfg);
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const summaryQuery = `
      SELECT
        (SELECT COUNT(*) FROM (SELECT 1 FROM rtgs r LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 ${where} GROUP BY r.sttl_date, r.inst_id2, sm.display_name_ar) t) AS total_settlements,
        COALESCE(SUM(1), 0) AS total_movements,
        COALESCE(SUM(r.amount), 0) AS total_amount,
        COALESCE(SUM(${feeExprSummary}), 0) AS total_fees,
        COALESCE(SUM(${feeExprSummary} * ${acqMult}), 0) AS total_acq,
        COALESCE(SUM(r.amount - ${feeExprSummary}), 0) AS total_sttle
      FROM rtgs r
      LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
      ${where}
    `;
    let summary = { total_settlements: 0, total_movements: 0, total_amount: 0, total_fees: 0, total_acq: 0, total_sttle: 0 };
    try {
      const summaryResult = await pool.query(summaryQuery, params.slice(0, params.length - 2));
      const row = summaryResult.rows[0];
      if (row) {
        summary = {
          total_settlements: parseInt(row.total_settlements, 10) || 0,
          total_movements: parseInt(row.total_movements, 10) || 0,
          total_amount: parseFloat(row.total_amount) || 0,
          total_fees: parseFloat(row.total_fees) || 0,
          total_acq: parseFloat(row.total_acq) || 0,
          total_sttle: parseFloat(row.total_sttle) || 0,
        };
      }
    } catch (_) {}

    const data = (listResult.rows || []).map((row) => {
      const sttl = toDateOnlyString(row.sttl_date) || (typeof row.sttl_date === 'string' ? row.sttl_date.slice(0, 10) : null);
      const tran = toDateOnlyString(row.transaction_date) || (typeof row.transaction_date === 'string' ? row.transaction_date.slice(0, 10) : null);
      return {
        ...row,
        sttl_date: sttl || null,
        transaction_date: tran || null,
      };
    });

    res.json({
      data,
      summary,
      pagination: {
        page: Math.floor(offset / limitVal) + 1,
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal),
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.json({ data: [], summary: { total_settlements: 0, total_movements: 0, total_amount: 0, total_fees: 0, total_acq: 0, total_sttle: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    console.error('خطأ في جلب التسويات الحكومية حسب تاريخ الحركة:', error);
    const msg = (error?.message || String(error)).slice(0, 200);
    res.status(500).json({ error: 'فشل جلب التسويات الحكومية', detail: process.env.NODE_ENV === 'development' ? msg : undefined });
  }
}

async function exportRtgs(req, res) {
  try {
    const {
      sttl_date_from,
      sttl_date_to,
      transaction_date_from,
      transaction_date_to,
      mer,
      mcc,
      inst_id2,
      search,
      text_search,
      message_type,
      ministry,
      directorate_name,
      bank_display_name,
      terminal_type,
      import_log_id,
      governorate,
      details,
      iban,
    } = req.query;

    const params = [];
    let paramCount = 1;
    let where = ' WHERE 1=1 ';
    const fromJoin = ' FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 LEFT JOIN import_logs il ON il.id = r.import_log_id ';

    const toArray = (v) => (v == null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
    if (sttl_date_from) { where += ` AND r.sttl_date >= $${paramCount++}`; params.push(sttl_date_from); }
    if (sttl_date_to) { where += ` AND r.sttl_date <= $${paramCount++}`; params.push(sttl_date_to); }
    if (transaction_date_from) { where += ` AND (r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date >= $${paramCount++}::date`; params.push(transaction_date_from); }
    if (transaction_date_to) { where += ` AND (r.transaction_date AT TIME ZONE 'Asia/Baghdad')::date <= $${paramCount++}::date`; params.push(transaction_date_to); }
    const merArr = toArray(mer);
    const mccArr = toArray(mcc);
    const instId2Arr = toArray(inst_id2);
    const messageTypeArr = toArray(message_type);
    const ministryArr = toArray(ministry);
    const directorateArr = toArray(directorate_name);
    const bankArr = toArray(bank_display_name);
    const governorateArr = toArray(governorate);
    const terminalArr = toArray(terminal_type);
    if (merArr.length > 0) { where += ` AND r.mer = ANY($${paramCount++}::text[])`; params.push(merArr); }
    if (mccArr.length > 0) { where += ` AND r.mcc::text = ANY($${paramCount++}::text[])`; params.push(mccArr.map(String)); }
    if (instId2Arr.length > 0) { where += ` AND r.inst_id2 = ANY($${paramCount++}::text[])`; params.push(instId2Arr); }
    if (search) { where += ` AND r.rrn ILIKE $${paramCount++}`; params.push('%' + search + '%'); }
    if (text_search && String(text_search).trim()) {
      const term = '%' + String(text_search).trim() + '%';
      where += ` AND ( r.rrn ILIKE $${paramCount++} OR r.mer ILIKE $${paramCount++} OR r.mer_name ILIKE $${paramCount++} OR m.directorate_name ILIKE $${paramCount++} OR m.ministry ILIKE $${paramCount++} OR sm.display_name_ar ILIKE $${paramCount++} OR m.details ILIKE $${paramCount++} )`;
      params.push(term, term, term, term, term, term, term);
    }
    if (messageTypeArr.length > 0) { where += ` AND r.message_type = ANY($${paramCount++}::text[])`; params.push(messageTypeArr); }
    if (ministryArr.length > 0) { where += ` AND m.ministry = ANY($${paramCount++}::text[])`; params.push(ministryArr); }
    if (directorateArr.length > 0) { where += ` AND m.directorate_name = ANY($${paramCount++}::text[])`; params.push(directorateArr); }
    if (governorateArr.length > 0) { where += ` AND m.governorate = ANY($${paramCount++}::text[])`; params.push(governorateArr); }
    if (bankArr.length > 0) { where += ` AND sm.display_name_ar = ANY($${paramCount++}::text[])`; params.push(bankArr); }
    if (terminalArr.length > 0) { where += ` AND r.terminal_type = ANY($${paramCount++}::text[])`; params.push(terminalArr); }
    const hasImportLogIdFilter = !!import_log_id;
    if (import_log_id) { where += ` AND r.import_log_id = $${paramCount++}`; params.push(parseInt(import_log_id, 10)); }
    if (details && String(details).trim()) { where += ` AND m.details ILIKE $${paramCount++}`; params.push('%' + String(details).trim() + '%'); }
    if (iban && String(iban).trim()) { where += ` AND m.iban ILIKE $${paramCount++}`; params.push('%' + String(iban).trim() + '%'); }

    const maxExport = 50000;
    params.push(maxExport);

    const fromJoinWithIl = ' FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 LEFT JOIN import_logs il ON il.id = r.import_log_id ';
    const fromJoinLegacy = ' FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2 ';
    const selectWithIl = `r.*, m.governorate, m.directorate_name, m.ministry, m.details AS merchant_details, m.iban AS merchant_iban, COALESCE(NULLIF(TRIM(m.directorate_name), ''), NULLIF(TRIM(r.mer_name), ''), 'غير معرف') AS merchant_display_name, sm.display_name_ar AS bank_display_name, il.filename AS source_filename`;
    const selectLegacy = `r.*, m.governorate, m.directorate_name, m.ministry, m.details AS merchant_details, m.iban AS merchant_iban, COALESCE(NULLIF(TRIM(m.directorate_name), ''), NULLIF(TRIM(r.mer_name), ''), 'غير معرف') AS merchant_display_name, sm.display_name_ar AS bank_display_name`;

    let rows;
    try {
      const listQuery = `SELECT ${selectWithIl} ${fromJoinWithIl} ${where} ORDER BY r.sttl_date DESC, r.id DESC LIMIT $${paramCount}`;
      const listResult = await pool.query(listQuery, params);
      rows = listResult.rows;
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('import_log_id') || (msg.includes('column') && msg.includes('does not exist'))) {
        if (hasImportLogIdFilter) {
          return res.status(400).json({ error: 'فلتر الملف المصدر يتطلب تنفيذ الهجرة. نفّذ: node server/migrations/runMigrations.js' });
        }
        const whereLegacy = where;
        const listQuery = `SELECT ${selectLegacy} ${fromJoinLegacy} ${whereLegacy} ORDER BY r.sttl_date DESC, r.id DESC LIMIT $${paramCount}`;
        const listResult = await pool.query(listQuery, params);
        rows = listResult.rows;
      } else {
        throw err;
      }
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RTGS', { views: [{ rightToLeft: true }] });
    const headers = [
      'الملف المصدر', 'RRN', 'تاريخ التسوية (STTL_DATE)', 'تاريخ الحركة (TRANSCATIONDATE)', 'MER', 'المحافظة', 'اسم المديرية', 'التفاصيل', 'الوزارة', 'IBAN', 'المصرف',
      'amount', 'fees', 'acq', 'STTLE', 'البطاقة', 'MCC', 'نوع الجهاز', 'Message Type',
    ];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    const rtgsCfgExport = await rtgsCalc.getRtgsConfig();
    const cfgExport = { ...rtgsCfgExport, _parseDate: parseDate, _parseDecimal: parseDecimal };
    for (const r of rows) {
      const sttlStr = r.sttl_date ? (r.sttl_date instanceof Date ? r.sttl_date.toISOString().slice(0, 10) : String(r.sttl_date).slice(0, 10)) : '';
      const tranStr = r.transaction_date
        ? (r.transaction_date instanceof Date ? r.transaction_date.toISOString().replace('T', ' ').slice(0, 19) : String(r.transaction_date).slice(0, 19))
        : '';
      const feesComputed = rtgsCalc.computeFees({ mcc: r.mcc, sttl_date: r.sttl_date, STTL_DATE: r.sttl_date }, r.amount, cfgExport);
      const acqComputed = rtgsCalc.computeAcq(feesComputed, r.terminal_type, cfgExport);
      const sttleComputed = (Number(r.amount) || 0) - feesComputed;
      sheet.addRow([
        r.source_filename ?? '',
        r.rrn,
        sttlStr,
        tranStr,
        r.mer,
        r.governorate ?? '',
        r.directorate_name ?? '',
        r.merchant_details ?? '',
        r.ministry,
        r.merchant_iban ?? '',
        r.bank_display_name,
        r.amount,
        Math.round(feesComputed * 1000000) / 1000000,
        Math.round(acqComputed * 1000000) / 1000000,
        Math.round(sttleComputed * 1000000) / 1000000,
        r.card_number_masked,
        r.mcc,
        r.terminal_type,
        r.message_type,
      ]);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rtgs_export.xlsx');
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.status(503).json({ error: 'جداول RTGS غير مهيأة' });
    }
    console.error('خطأ في تصدير RTGS:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/**
 * مطابقة RRN من ملف Excel — قراءة فقط، بدون حقن بيانات.
 * يقرأ العمود الأول كـ RRN، يبحث عن كل RRN في جدول rtgs، ويرجع موجودة/غير موجودة مع تاريخ الحركة وتاريخ التسوية.
 */
async function matchRrnExcel(req, res) {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'مطلوب ملف Excel' });
  }
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: 'الملف لا يحتوي على أوراق' });
    }
    const rrns = [];
    const seen = new Set();
    const firstCol = 1;
    const maxRow = Math.max(sheet.rowCount || 0, sheet.actualRowCount || 0) || 10000;
    let startRow = 1;
    const headerCell = sheet.getCell(1, firstCol);
    let headerVal = headerCell.value;
    if (headerVal != null && typeof headerVal === 'object' && headerVal.text != null) headerVal = headerVal.text;
    if (headerVal != null && String(headerVal).trim().toLowerCase() === 'rrn') startRow = 2;
    for (let rowNum = startRow; rowNum <= maxRow; rowNum++) {
      const cell = sheet.getCell(rowNum, firstCol);
      let val = cell.value;
      if (val == null) continue;
      if (typeof val === 'object' && val.text != null) val = val.text;
      const rrn = String(val).trim();
      if (!rrn || seen.has(rrn.toLowerCase())) continue;
      seen.add(rrn.toLowerCase());
      rrns.push(rrn);
    }
    if (rrns.length === 0) {
      return res.status(400).json({ error: 'لم يُعثر على أي RRN في العمود الأول' });
    }
    if (rrns.length > 10000) {
      return res.status(400).json({ error: 'الحد الأقصى 10000 RRN في الملف' });
    }

    const results = [];
    for (const rrn of rrns) {
      const rrnTrim = String(rrn).trim();
      if (!rrnTrim) continue;
      const rrnNormalized = rrnTrim.replace(/^0+/, '') || '0';
      const q = `SELECT rrn, transaction_date, sttl_date FROM rtgs WHERE COALESCE(NULLIF(REGEXP_REPLACE(TRIM(rrn), '^0+', ''), ''), '0') = $1 LIMIT 1`;
      const { rows } = await pool.query(q, [rrnNormalized]);
      const row = rows[0];
      const exists = !!row;
      const sttlStr = row?.sttl_date
        ? (row.sttl_date instanceof Date ? row.sttl_date.toISOString().slice(0, 10) : String(row.sttl_date).slice(0, 10))
        : null;
      const tranStr = row?.transaction_date
        ? (row.transaction_date instanceof Date ? row.transaction_date.toISOString().replace('T', ' ').slice(0, 19) : String(row.transaction_date).slice(0, 19))
        : null;
      const displayRrn = exists && row.rrn ? (String(row.rrn).replace(/^0+/, '') || '0') : rrnNormalized;
      results.push({
        rrn: displayRrn,
        exists,
        transaction_date: exists ? tranStr : null,
        sttl_date: exists ? sttlStr : null,
      });
    }
    res.json({ results });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.status(503).json({ error: 'جداول RTGS غير مهيأة' });
    }
    console.error('خطأ في مطابقة RRN من Excel:', error);
    res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}

/** ملخص ACQ و FEES لفترة تسوية — لصفحة موظف الحسابات / مطابقة CT */
async function getAcqFeesSummary(req, res) {
  try {
    const { sttl_date_from, sttl_date_to } = req.query;
    if (!sttl_date_from || !sttl_date_to) {
      return res.status(400).json({ error: 'من تاريخ التسوية وإلى تاريخ التسوية مطلوبان' });
    }
    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const q = `
      SELECT
        COUNT(*) AS total_movements,
        COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
        COALESCE(SUM(${feeExpr} * ${acqMult}), 0) AS sum_acq
      FROM rtgs r
      WHERE r.sttl_date >= $1 AND r.sttl_date <= $2
    `;
    const result = await pool.query(q, [sttl_date_from, sttl_date_to]);
    const row = result.rows[0] || {};
    const sum_fees = parseFloat(row.sum_fees) || 0;
    const sum_acq = parseFloat(row.sum_acq) || 0;
    res.json({
      sttl_date_from,
      sttl_date_to,
      total_movements: parseInt(row.total_movements, 10) || 0,
      sum_fees: Math.round(sum_fees * 1000000) / 1000000,
      sum_acq: Math.round(sum_acq * 1000000) / 1000000,
      sum_acq_plus_fees: Math.round((sum_acq + sum_fees) * 1000000) / 1000000,
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return res.json({
        sttl_date_from: req.query.sttl_date_from,
        sttl_date_to: req.query.sttl_date_to,
        total_movements: 0,
        sum_fees: 0,
        sum_acq: 0,
        sum_acq_plus_fees: 0,
      });
    }
    console.error('خطأ في ملخص ACQ/FEES:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** إدراج سجل CT للمطابقة — موظف الحسابات. الحالة (مطابق/غير مطابق) تُحسب عند كل عرض من بيانات RTGS الحالية. */
function normalizeDateInput(v) {
  if (v == null || v === '') return '';
  const s = typeof v === 'string' ? v.slice(0, 10) : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
  return s.match(/^\d{4}-\d{2}-\d{2}$/) ? s : v;
}

/** تحويل Date من node-pg إلى YYYY-MM-DD باستخدام تاريخ الخادم المحلي (تفادي نقص يوم بسبب UTC) */
function dateToLocalYYYYMMDD(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear(), m = v.getMonth() + 1, d = v.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(v).slice(0, 10);
}

async function createCtRecord(req, res) {
  try {
    const { sttl_date_from, sttl_date_to, ct_value, ct_received_date, notes } = req.body;
    if (!sttl_date_from || !sttl_date_to || !ct_received_date || ct_value == null || ct_value === '') {
      return res.status(400).json({ error: 'من تاريخ التسوية، إلى تاريخ التسوية، تاريخ استلام CT من البنك المركزي، وقيمة CT مطلوبة' });
    }
    const fromNorm = normalizeDateInput(sttl_date_from);
    const toNorm = normalizeDateInput(sttl_date_to);
    const receivedNorm = normalizeDateInput(ct_received_date);
    if (!fromNorm || !toNorm || fromNorm.length < 10) {
      return res.status(400).json({ error: 'صيغة التاريخ غير صحيحة (استخدم YYYY-MM-DD)' });
    }
    if (!receivedNorm || receivedNorm.length < 10) {
      return res.status(400).json({ error: 'تاريخ استلام CT من البنك المركزي مطلوب بصيغة YYYY-MM-DD' });
    }
    const ctVal = parseFloat(ct_value);
    if (isNaN(ctVal)) {
      return res.status(400).json({ error: 'قيمة CT يجب أن تكون رقماً' });
    }
    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const summaryResult = await pool.query(
      `SELECT
        COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
        COALESCE(SUM(${feeExpr} * ${acqMult}), 0) AS sum_acq
       FROM rtgs r WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date`,
      [fromNorm, toNorm]
    );
    const row = summaryResult.rows[0] || {};
    const sum_fees = Math.round((parseFloat(row.sum_fees) || 0) * 1000000) / 1000000;
    const sum_acq = Math.round((parseFloat(row.sum_acq) || 0) * 1000000) / 1000000;
    const ctReceived = receivedNorm;
    const insertResult = await pool.query(
      `INSERT INTO ct_records (sttl_date_from, sttl_date_to, ct_value, sum_acq, sum_fees, ct_received_date, user_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, sttl_date_from, sttl_date_to, ct_value, sum_acq, sum_fees, ct_received_date, user_id, notes, created_at`,
      [fromNorm, toNorm, ctVal, sum_acq, sum_fees, ctReceived, req.user?.id || null, notes || null]
    );
    const record = insertResult.rows[0];
    const ctRounded = Math.round(ctVal * 1000000) / 1000000;
    const acqRounded = Math.round(sum_acq * 1000000) / 1000000;
    const diff = Math.abs(ctRounded - acqRounded);
    const tolerance = rtgsCalc.getMatchTolerance(rtgsCfg);
    const match_status = diff < tolerance ? 'matched' : 'not_matched';
    res.status(201).json({
      ...record,
      sttl_date_from: fromNorm,
      sttl_date_to: toNorm,
      ct_received_date: record.ct_received_date != null ? dateToLocalYYYYMMDD(record.ct_received_date) : null,
      created_at: record.created_at != null ? dateToLocalYYYYMMDD(record.created_at) : record.created_at,
      match_status,
      difference: Math.round(diff * 1000000) / 1000000,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول سجلات CT غير موجود. شغّل الهجرات (npm run migrate).' });
    }
    console.error('خطأ في إدراج CT:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** قائمة سجلات CT — للتقرير والطباعة. الحالة (مطابق/غير مطابق) تُحسب عند كل طلب من بيانات RTGS الحالية. */
async function getCtRecords(req, res) {
  try {
    const { limit = 50, date_from: filterDateFrom, date_to: filterDateTo } = req.query;
    const limitVal = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const hasDateFilter = filterDateFrom && filterDateTo && String(filterDateFrom).slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/) && String(filterDateTo).slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/);
    const fromNorm = hasDateFilter ? String(filterDateFrom).slice(0, 10) : null;
    const toNorm = hasDateFilter ? String(filterDateTo).slice(0, 10) : null;
    let result;
    if (hasDateFilter) {
      result = await pool.query(
        `SELECT c.id,
                to_char(c.sttl_date_from, 'YYYY-MM-DD') AS sttl_date_from,
                to_char(c.sttl_date_to, 'YYYY-MM-DD') AS sttl_date_to,
                c.ct_value, c.sum_acq, c.sum_fees,
                to_char(c.ct_received_date, 'YYYY-MM-DD') AS ct_received_date,
                c.notes,
                to_char(c.created_at, 'YYYY-MM-DD') AS created_at,
                u.name AS user_name
         FROM ct_records c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.sttl_date_from >= $1::date AND c.sttl_date_to <= $2::date
         ORDER BY c.created_at DESC
         LIMIT $3`,
        [fromNorm, toNorm, limitVal]
      );
    } else {
      result = await pool.query(
        `SELECT c.id,
                to_char(c.sttl_date_from, 'YYYY-MM-DD') AS sttl_date_from,
                to_char(c.sttl_date_to, 'YYYY-MM-DD') AS sttl_date_to,
                c.ct_value, c.sum_acq, c.sum_fees,
                to_char(c.ct_received_date, 'YYYY-MM-DD') AS ct_received_date,
                c.notes,
                to_char(c.created_at, 'YYYY-MM-DD') AS created_at,
                u.name AS user_name
         FROM ct_records c
         LEFT JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC
         LIMIT $1`,
        [limitVal]
      );
    }
    const rows = result.rows || [];
    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    /** استخراج تاريخ بصيغة YYYY-MM-DD — الصفوف تأتي الآن كنص من to_char فلا تحويل توقيت */
    const toDateOnly = (v) => {
      if (v == null) return '';
      if (typeof v === 'string') return v.slice(0, 10);
      if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    };
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const acqExpr = `COALESCE(SUM(${feeExpr} * ${acqMult}), 0)`;
    const uniqueRanges = [...new Set(rows.map((r) => {
      const from = toDateOnly(r.sttl_date_from);
      const to = toDateOnly(r.sttl_date_to);
      return `${from}|${to}`;
    }))];
    const acqByRange = {};
    for (const key of uniqueRanges) {
      const [from, to] = key.split('|');
      if (!from || !to) { acqByRange[key] = 0; continue; }
      try {
        const q = await pool.query(
          `SELECT ${acqExpr} AS sum_acq FROM rtgs r WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date`,
          [from, to]
        );
        const val = parseFloat(q.rows[0]?.sum_acq) || 0;
        acqByRange[key] = Math.round(val * 1000000) / 1000000;
      } catch {
        acqByRange[key] = 0;
      }
    }
    const rtgsCfgForMatch = await rtgsCalc.getRtgsConfig();
    const matchTol = rtgsCalc.getMatchTolerance(rtgsCfgForMatch);
    const out = rows.map((r) => {
      const from = toDateOnly(r.sttl_date_from);
      const to = toDateOnly(r.sttl_date_to);
      const key = `${from}|${to}`;
      const currentAcq = (acqByRange[key] !== undefined && acqByRange[key] !== null) ? acqByRange[key] : (parseFloat(r.sum_acq) || 0);
      const ctVal = parseFloat(r.ct_value) || 0;
      const ctRounded = Math.round(ctVal * 1000000) / 1000000;
      const acqRounded = Math.round(currentAcq * 1000000) / 1000000;
      const match_status = Math.abs(ctRounded - acqRounded) < matchTol ? 'matched' : 'not_matched';
      return {
        ...r,
        sttl_date_from: from,
        sttl_date_to: to,
        ct_received_date: (r.ct_received_date != null && String(r.ct_received_date).trim() !== '') ? toDateOnly(r.ct_received_date) : null,
        created_at: r.created_at != null ? toDateOnly(r.created_at) : r.created_at,
        current_sum_acq: currentAcq,
        sum_acq: currentAcq,
        match_status,
      };
    });
    res.json({ data: out });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.json({ data: [] });
    }
    console.error('خطأ في جلب سجلات CT:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** تعديل سجل CT */
async function updateCtRecord(req, res) {
  try {
    const { id } = req.params;
    const { sttl_date_from, sttl_date_to, ct_value, ct_received_date, notes } = req.body;
    const check = await pool.query('SELECT id FROM ct_records WHERE id = $1', [id]);
    if (!check.rows.length) {
      return res.status(404).json({ error: 'سجل CT غير موجود' });
    }
    const updates = [];
    const values = [];
    let pos = 1;
    if (sttl_date_from != null) { const n = normalizeDateInput(sttl_date_from); if (n && n.length >= 10) { updates.push(`sttl_date_from = $${pos++}`); values.push(n); } }
    if (sttl_date_to != null) { const n = normalizeDateInput(sttl_date_to); if (n && n.length >= 10) { updates.push(`sttl_date_to = $${pos++}`); values.push(n); } }
    if (ct_value != null && ct_value !== '') { const v = parseFloat(ct_value); if (!isNaN(v)) { updates.push(`ct_value = $${pos++}`); values.push(v); } }
    if (ct_received_date !== undefined) {
      const n = ct_received_date ? normalizeDateInput(ct_received_date) : null;
      if (!n || n.length < 10) {
        return res.status(400).json({ error: 'تاريخ استلام CT من البنك المركزي مطلوب بصيغة YYYY-MM-DD' });
      }
      updates.push(`ct_received_date = $${pos++}`);
      values.push(n);
    }
    if (notes !== undefined) { updates.push(`notes = $${pos++}`); values.push(notes || null); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    }
    values.push(id);
    await pool.query(
      `UPDATE ct_records SET ${updates.join(', ')} WHERE id = $${pos}`,
      values
    );
    const updated = await pool.query(
      `SELECT c.id,
              to_char(c.sttl_date_from, 'YYYY-MM-DD') AS sttl_date_from,
              to_char(c.sttl_date_to, 'YYYY-MM-DD') AS sttl_date_to,
              c.ct_value, c.sum_acq, c.sum_fees,
              to_char(c.ct_received_date, 'YYYY-MM-DD') AS ct_received_date,
              c.notes,
              to_char(c.created_at, 'YYYY-MM-DD') AS created_at,
              u.name AS user_name
       FROM ct_records c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [id]
    );
    res.json(updated.rows[0] || {});
  } catch (error) {
    if (error?.code === '42P01') return res.status(404).json({ error: 'سجل CT غير موجود' });
    console.error('خطأ في تعديل سجل CT:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** حذف سجل CT */
async function deleteCtRecord(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ct_records WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'سجل CT غير موجود' });
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    if (error?.code === '42P01') return res.status(404).json({ error: 'سجل CT غير موجود' });
    console.error('خطأ في حذف سجل CT:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** تقرير مطابقة CT الشامل — ملخص RTGS، بالمصارف، باليوم، وسجلات CT للفترة (لطباعة تقرير احترافي). */
async function getCtMatchingReport(req, res) {
  try {
    let sttl_date_from = req.query.sttl_date_from || req.query.date_from;
    let sttl_date_to = req.query.sttl_date_to || req.query.date_to;
    const ct_record_id = req.query.ct_record_id;

    if (ct_record_id) {
      const cr = await pool.query(
        'SELECT sttl_date_from, sttl_date_to FROM ct_records WHERE id = $1',
        [ct_record_id]
      );
      if (!cr.rows.length) {
        return res.status(404).json({ error: 'سجل CT غير موجود' });
      }
      sttl_date_from = toDateOnlyString(cr.rows[0].sttl_date_from) || String(cr.rows[0].sttl_date_from).slice(0, 10);
      sttl_date_to = toDateOnlyString(cr.rows[0].sttl_date_to) || String(cr.rows[0].sttl_date_to).slice(0, 10);
    }

    if (!sttl_date_from || !sttl_date_to) {
      return res.status(400).json({ error: 'من تاريخ التسوية وإلى تاريخ التسوية مطلوبان (أو ct_record_id)' });
    }

    const fromNorm = String(sttl_date_from).slice(0, 10);
    const toNorm = String(sttl_date_to).slice(0, 10);

    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    const acqMult = rtgsCalc.buildAcqMultiplierExpr(rtgsCfg);
    const acqExpr = `${feeExpr} * ${acqMult}`;

    const fromJoinMerchant = ` FROM rtgs r LEFT JOIN merchants m ON m.merchant_id = r.mer `;
    const govCol = `COALESCE(NULLIF(TRIM(m.governorate), ''), 'غير معرف')`;
    const dirCol = `COALESCE(NULLIF(TRIM(m.directorate_name), ''), 'غير معرف')`;

    const [summaryRes, byBankRes, byDayRes, byDirectorateGovRes, ctRecordsRes] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) AS total_movements,
          COALESCE(SUM(r.amount), 0) AS total_amount,
          COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
          COALESCE(SUM(${acqExpr}), 0) AS sum_acq
         FROM rtgs r WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date`,
        [fromNorm, toNorm]
      ),
      pool.query(
        `SELECT
          COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف') AS bank_name,
          COUNT(*) AS movement_count,
          COALESCE(SUM(r.amount), 0) AS sum_amount,
          COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
          COALESCE(SUM(${acqExpr}), 0) AS sum_acq
         FROM rtgs r
         LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
         WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date
         GROUP BY COALESCE(sm.display_name_ar, r.inst_id2, 'غير معرف')
         ORDER BY bank_name`,
        [fromNorm, toNorm]
      ),
      pool.query(
        `SELECT
          to_char(r.sttl_date, 'YYYY-MM-DD') AS sttl_date,
          COUNT(*) AS movement_count,
          COALESCE(SUM(r.amount), 0) AS sum_amount,
          COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
          COALESCE(SUM(${acqExpr}), 0) AS sum_acq
         FROM rtgs r
         WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date
         GROUP BY r.sttl_date
         ORDER BY r.sttl_date`,
        [fromNorm, toNorm]
      ),
      pool.query(
        `SELECT
          ${govCol} AS governorate,
          ${dirCol} AS directorate_name,
          COUNT(*) AS movement_count,
          COALESCE(SUM(r.amount), 0) AS sum_amount,
          COALESCE(SUM(${feeExpr}), 0) AS sum_fees,
          COALESCE(SUM(${acqExpr}), 0) AS sum_acq
         ${fromJoinMerchant}
         WHERE r.sttl_date >= $1::date AND r.sttl_date <= $2::date
         GROUP BY ${govCol}, ${dirCol}
         ORDER BY sum_acq DESC NULLS LAST`,
        [fromNorm, toNorm]
      ),
      pool.query(
        `SELECT c.id, to_char(c.sttl_date_from, 'YYYY-MM-DD') AS sttl_date_from, to_char(c.sttl_date_to, 'YYYY-MM-DD') AS sttl_date_to,
                c.ct_value, c.sum_acq, c.sum_fees, to_char(c.ct_received_date, 'YYYY-MM-DD') AS ct_received_date,
                c.notes, to_char(c.created_at, 'YYYY-MM-DD') AS created_at, u.name AS user_name
         FROM ct_records c LEFT JOIN users u ON u.id = c.user_id
         WHERE c.sttl_date_from >= $1::date AND c.sttl_date_to <= $2::date
         ORDER BY c.created_at DESC`,
        [fromNorm, toNorm]
      ),
    ]);

    const s = summaryRes.rows[0] || {};
    const round6 = (n) => Math.round((parseFloat(n) || 0) * 1000000) / 1000000;
    const summary = {
      total_movements: parseInt(s.total_movements, 10) || 0,
      total_amount: round6(s.total_amount),
      sum_fees: round6(s.sum_fees),
      sum_acq: round6(s.sum_acq),
    };

    const by_bank = (byBankRes.rows || []).map((row) => ({
      bank_name: row.bank_name,
      movement_count: parseInt(row.movement_count, 10) || 0,
      sum_amount: round6(row.sum_amount),
      sum_fees: round6(row.sum_fees),
      sum_acq: round6(row.sum_acq),
    }));

    const by_day = (byDayRes.rows || []).map((row) => ({
      sttl_date: row.sttl_date,
      movement_count: parseInt(row.movement_count, 10) || 0,
      sum_amount: round6(row.sum_amount),
      sum_fees: round6(row.sum_fees),
      sum_acq: round6(row.sum_acq),
    }));

    const by_directorate_governorate = (byDirectorateGovRes.rows || []).map((row) => ({
      governorate: row.governorate || 'غير معرف',
      directorate_name: row.directorate_name || 'غير معرف',
      movement_count: parseInt(row.movement_count, 10) || 0,
      sum_amount: round6(row.sum_amount),
      sum_fees: round6(row.sum_fees),
      sum_acq: round6(row.sum_acq),
    }));

    const matchTol = rtgsCalc.getMatchTolerance(rtgsCfg);
    const ct_records = (ctRecordsRes.rows || []).map((r) => {
      const acq = round6(r.sum_acq);
      const ctVal = round6(r.ct_value);
      const match_status = Math.abs(ctVal - acq) < matchTol ? 'matched' : 'not_matched';
      return {
        id: r.id,
        sttl_date_from: r.sttl_date_from,
        sttl_date_to: r.sttl_date_to,
        ct_value: ctVal,
        sum_acq: acq,
        sum_fees: round6(r.sum_fees),
        ct_received_date: r.ct_received_date,
        notes: r.notes,
        created_at: r.created_at,
        user_name: r.user_name,
        match_status,
      };
    });

    res.json({
      period: { sttl_date_from: fromNorm, sttl_date_to: toNorm },
      summary,
      by_bank,
      by_day,
      by_directorate_governorate,
      ct_records,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'جدول RTGS أو ct_records غير موجود' });
    }
    console.error('خطأ في تقرير مطابقة CT:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** جلب إعدادات احتساب RTGS */
async function getRtgsSettings(req, res) {
  try {
    const config = await rtgsCalc.getRtgsConfig();
    res.json(config);
  } catch (error) {
    console.error('خطأ في جلب إعدادات RTGS:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** تحديث إعدادات احتساب RTGS */
async function updateRtgsSettings(req, res) {
  try {
    const body = req.body || {};
    const current = await rtgsCalc.getRtgsConfig();

    const merged = {
      amount: { ...(current.amount || {}), ...(body.amount || {}) },
      fees: { ...(current.fees || {}), ...(body.fees || {}) },
      acq: { ...(current.acq || {}), ...(body.acq || {}) },
      match_tolerance: body.match_tolerance !== undefined ? body.match_tolerance : current.match_tolerance,
    };

    await pool.query(
      `INSERT INTO settings (key, value, description, updated_by_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = CURRENT_TIMESTAMP,
           updated_by_user_id = EXCLUDED.updated_by_user_id`,
      ['rtgs_calculation', JSON.stringify(merged), 'عوامل احتساب RTGS: العمولة، ACQ، حدود MCC، نسب التوزيع', req.user?.id || null]
    );

    res.json({ message: 'تم حفظ إعدادات احتساب RTGS بنجاح', settings: merged });
  } catch (error) {
    console.error('خطأ في تحديث إعدادات RTGS:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/** مجموع STTLE لتسوية واحدة (تاريخ + مصرف) — للمطابقة مع قيمة الموظف في مهام التسوية الحكومية */
async function getGovernmentSettlementSum(req, res) {
  try {
    const { sttl_date, bank_display_name } = req.query;
    if (!sttl_date || !bank_display_name) {
      return res.status(400).json({ error: 'مطلوب: sttl_date و bank_display_name' });
    }
    const dateStr = String(sttl_date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'تنسيق تاريخ غير صالح (yyyy-mm-dd)' });
    }
    const rtgsCfg = await rtgsCalc.getRtgsConfig();
    const feeExpr = rtgsCalc.buildFeeExpr(rtgsCfg);
    const result = await pool.query(
      `SELECT COALESCE(SUM(r.amount - ${feeExpr}), 0) AS sum_sttle
       FROM rtgs r
       LEFT JOIN settlement_maps sm ON sm.inst_id = r.inst_id2
       WHERE r.sttl_date = $1 AND COALESCE(sm.display_name_ar, r.inst_id2, '') = $2`,
      [dateStr, String(bank_display_name).trim()]
    );
    const sumSttle = result.rows[0] ? parseFloat(result.rows[0].sum_sttle) : 0;
    res.json({ sum_sttle: sumSttle, sttl_date: dateStr, bank_display_name: String(bank_display_name).trim() });
  } catch (error) {
    if (isTableMissingError(error)) return res.json({ sum_sttle: 0, sttl_date: req.query.sttl_date?.slice(0, 10), bank_display_name: req.query.bank_display_name });
    console.error('خطأ في جلب مجموع التسوية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

module.exports = {
  getRtgs,
  getRtgsFilterOptions,
  getSettlementMaps,
  getImportLogs,
  deleteImportLog,
  deleteAllRtgs,
  importRtgs,
  getGovernmentSettlements,
  getGovernmentSettlementsDataForDate,
  getGovernmentSettlementsByTransactionDate,
  getGovernmentSettlementSum,
  exportRtgs,
  matchRrnExcel,
  getAcqFeesSummary,
  createCtRecord,
  getCtRecords,
  updateCtRecord,
  deleteCtRecord,
  getCtMatchingReport,
  getRtgsSettings,
  updateRtgsSettings,
};
