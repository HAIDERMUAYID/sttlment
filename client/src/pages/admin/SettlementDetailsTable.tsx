import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/Loading';
import * as XLSX from 'xlsx';
import {
  LayoutList,
  Printer,
  FileDown,
  RefreshCw,
} from 'lucide-react';

interface DetailRow {
  iban: string;
  ministry_directorate_governorate: string;
  account_number: string;
  branch_name: string;
  branch_number: string;
  movement_count: number;
  sum_amount: number;
  sum_fees: number;
  sum_acq: number;
  sum_sttle: number;
}

interface SettlementOption {
  sttl_date: string;
  bank_display_name: string;
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d.slice(0, 10) : '';
  return s ? s.replace(/-/g, '/') : '—';
};

const formatNum = (n: number | null) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

export function SettlementDetailsTable() {
  const { toast } = useToast();
  const [settlementsList, setSettlementsList] = useState<SettlementOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedSttlDate, setSelectedSttlDate] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [detailsRows, setDetailsRows] = useState<DetailRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const detailsTotals = useMemo(() => {
    if (!detailsRows.length) return { movement_count: 0, sum_amount: 0, sum_fees: 0, sum_acq: 0, sum_sttle: 0 };
    return detailsRows.reduce(
      (acc, r) => ({
        movement_count: acc.movement_count + (r.movement_count || 0),
        sum_amount: acc.sum_amount + (r.sum_amount || 0),
        sum_fees: acc.sum_fees + (r.sum_fees || 0),
        sum_acq: acc.sum_acq + (r.sum_acq || 0),
        sum_sttle: acc.sum_sttle + (r.sum_sttle || 0),
      }),
      { movement_count: 0, sum_amount: 0, sum_fees: 0, sum_acq: 0, sum_sttle: 0 }
    );
  }, [detailsRows]);

  useEffect(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const to = new Date();
    const params = new URLSearchParams({
      sttl_date_from: from.toISOString().slice(0, 10),
      sttl_date_to: to.toISOString().slice(0, 10),
      page: '1',
      per_page: '500',
    });
    setListLoading(true);
    api
      .get(`/rtgs/government-settlements-by-transaction-date?${params.toString()}`)
      .then((res) => {
        const data = res.data?.data ?? [];
        const seen = new Set<string>();
        const options: SettlementOption[] = [];
        for (const r of data) {
          const date = r.sttl_date ? String(r.sttl_date).slice(0, 10) : '';
          const bank = r.bank_name ?? r.inst_id2 ?? '';
          const key = `${date}|${bank}`;
          if (key && !seen.has(key)) {
            seen.add(key);
            options.push({ sttl_date: date, bank_display_name: bank });
          }
        }
        options.sort((a, b) => (b.sttl_date || '').localeCompare(a.sttl_date || ''));
        setSettlementsList(options);
        if (options.length && !selectedSttlDate) {
          setSelectedSttlDate(options[0].sttl_date);
          setSelectedBank(options[0].bank_display_name);
        }
      })
      .catch(() => toast({ title: 'خطأ', description: 'فشل جلب قائمة التسويات', variant: 'destructive' }))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSttlDate || !selectedBank) {
      setDetailsRows([]);
      return;
    }
    setDetailsLoading(true);
    const params = new URLSearchParams({ sttl_date: selectedSttlDate, bank_display_name: selectedBank });
    api
      .get(`/rtgs/government-settlement-details?${params.toString()}`)
      .then((res) => setDetailsRows(res.data?.details ?? []))
      .catch(() => {
        setDetailsRows([]);
        toast({ title: 'خطأ', description: 'فشل جلب تفاصيل التسوية', variant: 'destructive' });
      })
      .finally(() => setDetailsLoading(false));
  }, [selectedSttlDate, selectedBank]);

  const handleBackfill = async () => {
    setBackfillLoading(true);
    try {
      await api.post('/rtgs/backfill-gov-settlements');
      toast({ title: 'تمت التعبئة', description: 'تم تعبئة جدول التفاصيل. جاري تحميل البيانات...' });
      const params = new URLSearchParams({ sttl_date: selectedSttlDate, bank_display_name: selectedBank });
      const res = await api.get(`/rtgs/government-settlement-details?${params.toString()}`);
      setDetailsRows(res.data?.details ?? []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل تعبئة الجدول', variant: 'destructive' });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handlePrint = () => {
    const title = `تفاصيل التسوية — ${formatDate(selectedSttlDate)} / ${selectedBank}`;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    const rowsHtml = detailsRows.map((row) => `
      <tr>
        <td class="py-2 px-3 font-mono text-xs" dir="ltr">${(row.iban || '—').replace(/</g, '&lt;')}</td>
        <td class="py-2 px-3">${(row.ministry_directorate_governorate || '—').replace(/</g, '&lt;')}</td>
        <td class="py-2 px-3" dir="ltr">${(row.account_number || '—').replace(/</g, '&lt;')}</td>
        <td class="py-2 px-3">${(row.branch_name || '—').replace(/</g, '&lt;')}</td>
        <td class="py-2 px-3" dir="ltr">${(row.branch_number || '—').replace(/</g, '&lt;')}</td>
        <td class="py-2 px-3 tabular-nums" dir="ltr">${row.movement_count.toLocaleString('en-US')}</td>
        <td class="py-2 px-3 tabular-nums" dir="ltr">${formatNum(row.sum_amount)}</td>
        <td class="py-2 px-3 tabular-nums" dir="ltr">${formatNum(row.sum_fees)}</td>
        <td class="py-2 px-3 tabular-nums" dir="ltr">${formatNum(row.sum_acq)}</td>
        <td class="py-2 px-3 font-bold tabular-nums" dir="ltr">${formatNum(row.sum_sttle)}</td>
      </tr>`).join('');
    const totalsHtml = `
      <tr style="background: linear-gradient(135deg, #026174 0%, #068294 100%); font-weight: bold; color: #fff;">
        <td colspan="5" class="py-3 px-3 text-end">المجموع</td>
        <td class="py-3 px-3 tabular-nums" dir="ltr">${detailsTotals.movement_count.toLocaleString('en-US')}</td>
        <td class="py-3 px-3 tabular-nums" dir="ltr">${formatNum(detailsTotals.sum_amount)}</td>
        <td class="py-3 px-3 tabular-nums" dir="ltr">${formatNum(detailsTotals.sum_fees)}</td>
        <td class="py-3 px-3 tabular-nums" dir="ltr">${formatNum(detailsTotals.sum_acq)}</td>
        <td class="py-3 px-3 tabular-nums" dir="ltr">${formatNum(detailsTotals.sum_sttle)}</td>
      </tr>`;
    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${title.replace(/</g, '&lt;')}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1e293b; }
    h1 { font-size: 1.25rem; margin: 0 0 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 12px; text-align: right; border: 1px solid #e2e8f0; }
    th { background: linear-gradient(135deg, #026174 0%, #068294 100%); color: #fff; font-weight: bold; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <h1>${title.replace(/</g, '&lt;')}</h1>
  <table>
    <thead>
      <tr>
        <th>IBAN</th>
        <th>الوزارة / المديرية / المحافظة</th>
        <th>رقم الحساب</th>
        <th>اسم الفرع</th>
        <th>رقم الفرع</th>
        <th>عدد الحركات</th>
        <th>قيمة الحركات</th>
        <th>العمولة</th>
        <th>عمولة المحصل</th>
        <th>مبلغ التسوية</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}${totalsHtml}
    </tbody>
  </table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleExportExcel = () => {
    const headers = ['IBAN', 'الوزارة / المديرية / المحافظة', 'رقم الحساب', 'اسم الفرع', 'رقم الفرع', 'عدد الحركات', 'قيمة الحركات', 'العمولة', 'عمولة المحصل', 'مبلغ التسوية'];
    const rows = detailsRows.map((r) => [
      r.iban || '—',
      r.ministry_directorate_governorate || '—',
      r.account_number || '—',
      r.branch_name || '—',
      r.branch_number || '—',
      r.movement_count,
      r.sum_amount,
      r.sum_fees,
      r.sum_acq,
      r.sum_sttle,
    ]);
    rows.push(['المجموع', '', '', '', '', detailsTotals.movement_count, detailsTotals.sum_amount, detailsTotals.sum_fees, detailsTotals.sum_acq, detailsTotals.sum_sttle]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تفاصيل');
    XLSX.writeFile(wb, `settlement_details_${selectedSttlDate?.slice(0, 10) ?? 'export'}.xlsx`);
    toast({ title: 'تم التصدير', description: 'تم تنزيل ملف Excel بنجاح' });
  };

  const filteredOptions = useMemo(() => {
    if (!selectedSttlDate) return settlementsList;
    return settlementsList.filter((s) => s.sttl_date === selectedSttlDate);
  }, [settlementsList, selectedSttlDate]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto" style={{ color: 'var(--text)' }}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
          <LayoutList className="w-7 h-7" style={{ color: 'var(--primary-600)' }} />
          جدول تفاصيل التسويات
        </h1>
      </div>

      <div className="rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>تاريخ التسوية</label>
            <select
              value={selectedSttlDate}
              onChange={(e) => {
                setSelectedSttlDate(e.target.value);
                const opts = settlementsList.filter((s) => s.sttl_date === e.target.value);
                setSelectedBank(opts[0]?.bank_display_name ?? '');
              }}
              className="ds-input w-full py-2.5 px-4 rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <option value="">— اختر التاريخ —</option>
              {Array.from(new Set(settlementsList.map((s) => s.sttl_date))).sort((a, b) => b.localeCompare(a)).map((date) => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>المصرف</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="ds-input w-full py-2.5 px-4 rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <option value="">— اختر المصرف —</option>
              {filteredOptions.map((s) => (
                <option key={`${s.sttl_date}|${s.bank_display_name}`} value={s.bank_display_name}>{s.bank_display_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBackfill}
              disabled={backfillLoading}
              className="ds-btn ds-btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${backfillLoading ? 'animate-spin' : ''}`} />
              تعبئة الجدول
            </button>
            {detailsRows.length > 0 && (
              <>
                <button type="button" onClick={handlePrint} className="ds-btn ds-btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button type="button" onClick={handleExportExcel} className="ds-btn ds-btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
                  <FileDown className="w-4 h-4" />
                  تصدير Excel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
        {listLoading ? (
          <Loading message="جاري جلب قائمة التسويات..." />
        ) : !selectedSttlDate || !selectedBank ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="m-0">اختر تاريخ التسوية والمصرف أعلاه لعرض جدول التفاصيل.</p>
          </div>
        ) : detailsLoading ? (
          <Loading message="جاري جلب التفاصيل..." />
        ) : detailsRows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-slate-600 m-0">لا توجد تفاصيل مخزنة لهذه التسوية.</p>
            <p className="text-sm text-slate-500 mt-2 mb-4">استخدم زر «تعبئة الجدول» لملء جدول التفاصيل من بيانات RTGS.</p>
            <button
              type="button"
              onClick={handleBackfill}
              disabled={backfillLoading}
              className="ds-btn ds-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
            >
              <RefreshCw className={`w-4 h-4 ${backfillLoading ? 'animate-spin' : ''}`} />
              تعبئة الجدول الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table w-full text-sm" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                  <th className="text-end py-3 px-3 font-bold text-white">IBAN</th>
                  <th className="text-end py-3 px-3 font-bold text-white">الوزارة / المديرية / المحافظة</th>
                  <th className="text-end py-3 px-3 font-bold text-white">رقم الحساب</th>
                  <th className="text-end py-3 px-3 font-bold text-white">اسم الفرع</th>
                  <th className="text-end py-3 px-3 font-bold text-white">رقم الفرع</th>
                  <th className="text-end py-3 px-3 font-bold text-white">عدد الحركات</th>
                  <th className="text-end py-3 px-3 font-bold text-white">قيمة الحركات</th>
                  <th className="text-end py-3 px-3 font-bold text-white">العمولة</th>
                  <th className="text-end py-3 px-3 font-bold text-white">عمولة المحصل</th>
                  <th className="text-end py-3 px-3 font-bold text-white">مبلغ التسوية</th>
                </tr>
              </thead>
              <tbody>
                {detailsRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-mono text-xs" dir="ltr">{row.iban || '—'}</td>
                    <td className="py-2 px-3 max-w-[220px]" title={row.ministry_directorate_governorate}>{row.ministry_directorate_governorate || '—'}</td>
                    <td className="py-2 px-3" dir="ltr">{row.account_number || '—'}</td>
                    <td className="py-2 px-3">{row.branch_name || '—'}</td>
                    <td className="py-2 px-3" dir="ltr">{row.branch_number || '—'}</td>
                    <td className="py-2 px-3 tabular-nums" dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                    <td className="py-2 px-3 tabular-nums" dir="ltr">{formatNum(row.sum_amount)}</td>
                    <td className="py-2 px-3 tabular-nums" dir="ltr">{formatNum(row.sum_fees)}</td>
                    <td className="py-2 px-3 tabular-nums" dir="ltr">{formatNum(row.sum_acq)}</td>
                    <td className="py-2 px-3 font-bold tabular-nums" dir="ltr" style={{ color: 'var(--primary-800)' }}>{formatNum(row.sum_sttle)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#fff' }}>
                  <td colSpan={5} className="py-3 px-3 text-end">المجموع</td>
                  <td className="py-3 px-3 tabular-nums" dir="ltr">{detailsTotals.movement_count.toLocaleString('en-US')}</td>
                  <td className="py-3 px-3 tabular-nums" dir="ltr">{formatNum(detailsTotals.sum_amount)}</td>
                  <td className="py-3 px-3 tabular-nums" dir="ltr">{formatNum(detailsTotals.sum_fees)}</td>
                  <td className="py-3 px-3 tabular-nums" dir="ltr">{formatNum(detailsTotals.sum_acq)}</td>
                  <td className="py-3 px-3 tabular-nums" dir="ltr">{formatNum(detailsTotals.sum_sttle)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettlementDetailsTable;
