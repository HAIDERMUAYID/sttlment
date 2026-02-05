import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/Loading';
import { KpiCards } from '@/components/KpiCards';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Filter,
  Building2,
  RotateCcw,
  Hash,
  Activity,
  DollarSign,
  Percent,
  Coins,
  LayoutList,
  X,
  LayoutGrid,
  Table2,
  Eye,
  Download,
  Printer,
  FileDown,
  RefreshCw,
  FileText,
} from 'lucide-react';

/** صف تفاصيل التسوية (من API تفاصيل التسوية) */
interface SettlementDetailRow {
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
  mer?: string;
}

interface SettlementByTranDateRow {
  sttl_date: string | null;
  inst_id2: string | null;
  bank_name: string | null;
  transaction_date: string | null;
  movement_count: number;
  sum_amount: number;
  sum_fees: number;
  sum_acq: number;
  sum_sttle: number;
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d.slice(0, 10) : '';
  if (!s) return '—';
  return s.replace(/-/g, '/');
};

/** عرض الأرقام مع دقة كافية للعمولة — 6 منازل عشرية لضمان التطابق */
const formatNum = (n: number | null) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

function groupBySettlement(rows: SettlementByTranDateRow[]) {
  const groups: { key: string; sttl_date: string | null; bank_name: string | null; rows: SettlementByTranDateRow[]; totals: { movement_count: number; sum_amount: number; sum_fees: number; sum_acq: number; sum_sttle: number } }[] = [];
  const map = new Map<string, { sttl_date: string | null; bank_name: string | null; rows: SettlementByTranDateRow[] }>();
  for (const row of rows) {
    const key = `${row.sttl_date ?? ''}|${row.inst_id2 ?? ''}`;
    if (!map.has(key)) {
      map.set(key, { sttl_date: row.sttl_date, bank_name: row.bank_name, rows: [] });
    }
    map.get(key)!.rows.push(row);
  }
  Array.from(map.entries()).forEach(([key, val]) => {
    const totals = val.rows.reduce(
      (acc, r) => ({
        movement_count: acc.movement_count + Number(r.movement_count),
        sum_amount: acc.sum_amount + Number(r.sum_amount),
        sum_fees: acc.sum_fees + Number(r.sum_fees),
        sum_acq: acc.sum_acq + Number(r.sum_acq),
        sum_sttle: acc.sum_sttle + Number(r.sum_sttle),
      }),
      { movement_count: 0, sum_amount: 0, sum_fees: 0, sum_acq: 0, sum_sttle: 0 }
    );
    groups.push({ key, sttl_date: val.sttl_date, bank_name: val.bank_name, rows: val.rows, totals });
  });
  return groups;
}

export function GovernmentSettlements() {
  const [data, setData] = useState<SettlementByTranDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    total_settlements: 0,
    total_movements: 0,
    total_amount: 0,
    total_fees: 0,
    total_acq: 0,
    total_sttle: 0,
  });
  const todayStr = useMemo(() => {
    const d = new Date();
    const tz = 'Asia/Baghdad';
    const opts = { timeZone: tz, year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
    return new Intl.DateTimeFormat('en-CA', opts).format(d); // YYYY-MM-DD
  }, []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const tz = 'Asia/Baghdad';
    const opts = { timeZone: tz, year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
    return new Intl.DateTimeFormat('en-CA', opts).format(d); // YYYY-MM-DD
  }, []);

  const [filters, setFilters] = useState({ sttl_date_from: '', sttl_date_to: '', bank_display_name: '' });
  const [initializedFromSettings, setInitializedFromSettings] = useState(false);
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailGroup, setDetailGroup] = useState<ReturnType<typeof groupBySettlement>[number] | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'table' | 'cards'>('table');
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [detailsSettlement, setDetailsSettlement] = useState<{ sttl_date: string | null; bank_display_name: string | null } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsRows, setDetailsRows] = useState<Array<{ iban: string; ministry_directorate_governorate: string; account_number: string; branch_name: string; branch_number: string; movement_count: number; sum_amount: number; sum_fees: number; sum_acq: number; sum_sttle: number }>>([]);
  const detailContentRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!detailsSettlement?.sttl_date) return;
    const sttl = typeof detailsSettlement.sttl_date === 'string' ? detailsSettlement.sttl_date.slice(0, 10) : '';
    const bank = detailsSettlement.bank_display_name || '';
    const params = new URLSearchParams({ sttl_date: sttl });
    if (bank) params.set('bank_display_name', bank);
    api.get(`/rtgs/government-settlement-details?${params.toString()}`)
      .then((res) => {
        setDetailsRows(res.data?.details ?? []);
        if (!(res.data?.details?.length)) {
          toast({ title: 'لا توجد تفاصيل', description: 'لم تُعبَّأ تفاصيل هذه التسوية. شغّل «تعبئة الجدول» ثم أعد تحميل الصفحة.', variant: 'destructive' });
        }
      })
      .catch(() => {
        toast({ title: 'خطأ', description: 'فشل جلب تفاصيل التسوية', variant: 'destructive' });
        setDetailsRows([]);
      })
      .finally(() => setDetailsLoading(false));
  }, [detailsSettlement?.sttl_date, detailsSettlement?.bank_display_name, toast]);

  useEffect(() => {
    api.get('/rtgs/filter-options').then((res) => {
      setBankOptions(res.data?.bankDisplayNameList ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initializedFromSettings) return;
    setInitializedFromSettings(true);
    api.get('/tv-dashboard/settings').then((res) => {
      const s = res.data || {};
      const mode = s.settlementCardsDateMode || 'previous_day';
      const custom = String(s.settlementCardsCustomDate || '').trim().slice(0, 10);
      let from = '', to = '';
      if (mode === 'today') {
        from = todayStr;
        to = todayStr;
      } else if (mode === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(custom)) {
        from = custom;
        to = custom;
      } else {
        from = yesterdayStr;
        to = yesterdayStr;
      }
      setFilters((prev) => (prev.sttl_date_from || prev.sttl_date_to ? prev : { ...prev, sttl_date_from: from, sttl_date_to: to }));
    }).catch(() => {
      setFilters((prev) => (prev.sttl_date_from || prev.sttl_date_to ? prev : { ...prev, sttl_date_from: yesterdayStr, sttl_date_to: yesterdayStr }));
    });
  }, [todayStr, yesterdayStr, initializedFromSettings]);

  const fetchData = async () => {
    const query: Record<string, string> = {
      page: String(pagination.page),
      limit: String(pagination.limit),
    };
    if (filters.sttl_date_from) query.sttl_date_from = filters.sttl_date_from;
    if (filters.sttl_date_to) query.sttl_date_to = filters.sttl_date_to;
    if (filters.bank_display_name) query.bank_display_name = filters.bank_display_name;
    const params = new URLSearchParams(query);
    const url = `/rtgs/government-settlements-by-transaction-date?${params.toString()}`;
    const maxAttempts = 3;
    let lastError: unknown;
    try {
      setLoading(true);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await api.get(url);
          setData(res.data?.data ?? []);
          setSummary(res.data?.summary ?? { total_settlements: 0, total_movements: 0, total_amount: 0, total_fees: 0, total_acq: 0, total_sttle: 0 });
          setPagination((prev) => ({
            ...prev,
            ...(res.data?.pagination ?? {}),
          }));
          return;
        } catch (e) {
          lastError = e;
          if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
      throw lastError;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      const serverError = err.response?.data?.error;
      const detail = err.response?.data?.detail;
      const description = serverError
        ? (detail ? `${serverError}: ${detail}` : serverError)
        : 'فشل جلب التسويات الحكومية. تحقق من الاتصال أو جرّب لاحقاً.';
      toast({
        title: 'خطأ',
        description,
        variant: 'destructive',
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, filters.sttl_date_from, filters.sttl_date_to, filters.bank_display_name]);

  const handleFilterChange = (key: 'sttl_date_from' | 'sttl_date_to' | 'bank_display_name', value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ sttl_date_from: '', sttl_date_to: '', bank_display_name: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = filters.sttl_date_from || filters.sttl_date_to || filters.bank_display_name;

  const groups = useMemo(() => groupBySettlement(data), [data]);

  const handleBackfill = async () => {
    setBackfillLoading(true);
    try {
      const res = await api.post('/rtgs/backfill-gov-settlements');
      toast({
        title: 'تمت التعبئة',
        description: res.data?.message || `تم تعبئة ${res.data?.total_rows ?? 0} صفاً من ${res.data?.sources ?? 0} مصدر`,
      });
      fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ',
        description: err.response?.data?.error ?? 'فشل تعبئة جدول التسويات',
        variant: 'destructive',
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast({ title: 'لا يوجد بيانات', description: 'لا توجد صفوف للتصدير', variant: 'destructive' });
      return;
    }
    const headers = ['تاريخ التسوية', 'المصرف', 'تاريخ الحركة', 'عدد الحركات', 'قيمة الحركات (IQD)', 'قيمة العمولة (IQD)', 'عمولة المحصل (IQD)', 'قيمة التسوية (IQD)'];
    const rows = data.map((r) => [
      formatDate(r.sttl_date),
      r.bank_name ?? r.inst_id2 ?? '—',
      formatDate(r.transaction_date),
      String(r.movement_count),
      formatNum(r.sum_amount),
      formatNum(r.sum_fees),
      formatNum(r.sum_acq),
      formatNum(r.sum_sttle),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تسويات_حكومية_${filters.sttl_date_from || 'كل'}_${filters.sttl_date_to || 'التواريخ'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'تم التصدير', description: 'تم تحميل ملف CSV' });
  };

  const handlePrint = () => {
    if (printAreaRef.current) {
      const printContent = printAreaRef.current.innerHTML;
      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (!win) {
        window.print();
        return;
      }
      win.document.write(`
        <!DOCTYPE html><html dir="rtl" lang="ar"><head>
        <meta charset="utf-8"><title>التسويات الحكومية</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 10px 12px; text-align: right; border: 1px solid #e2e8f0; }
          th { background: linear-gradient(135deg, #026174 0%, #068294 100%); color: #fff; font-weight: 700; }
          tr:nth-child(even) { background: #f8fafc; }
          .print-header { background: linear-gradient(135deg, #026174 0%, #068294 100%); color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
          .print-header h1 { margin: 0 0 8px 0; font-size: 1.5rem; }
          .print-header p { margin: 0; opacity: 0.95; font-size: 0.9rem; }
        </style></head><body>
        <div class="print-header">
          <h1>التسويات الحكومية</h1>
          <p>من ${formatDate(filters.sttl_date_from) || '—'} إلى ${formatDate(filters.sttl_date_to) || '—'} ${filters.bank_display_name ? ` | المصرف: ${filters.bank_display_name}` : ''}</p>
        </div>
        ${printContent}
        </body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.onafterprint = () => win.close(); }, 400);
    } else {
      window.print();
    }
  };

  const openSettlementDetails = (group: ReturnType<typeof groupBySettlement>[number]) => {
    const sttlDate = group.sttl_date ? (typeof group.sttl_date === 'string' ? group.sttl_date.slice(0, 10) : '') : '';
    const bankName = group.bank_name || group.rows[0]?.inst_id2 || '';
    if (!sttlDate || !bankName) {
      toast({ title: 'تنبيه', description: 'لا يمكن جلب التفاصيل بدون تاريخ تسوية ومصرف', variant: 'destructive' });
      return;
    }
    setDetailsRows([]);
    setDetailsLoading(true);
    setDetailsSettlement({ sttl_date: sttlDate, bank_display_name: bankName });
  };

  const handleDownloadAsImage = async () => {
    if (!detailContentRef.current || !detailGroup) return;
    setDownloadingImage(true);
    try {
      const dataUrl = await toPng(detailContentRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      const safeDate = formatDate(detailGroup.sttl_date).replace(/\//g, '-');
      const safeBank = (detailGroup.bank_name || 'bank').replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF_-]/g, '');
      link.download = `settlement_${safeDate}_${safeBank}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'تم التحميل', description: 'تم حفظ الصورة بنجاح' });
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل حفظ الصورة', variant: 'destructive' });
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div
          className="page-header-teal rounded-xl flex flex-wrap items-center justify-between gap-4 p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)',
          }}
        >
          <div>
            <h1 className="text-2xl font-bold m-0 text-white">التسويات الحكومية</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              إجماليات حسب تاريخ التسوية والمصرف — تفصيل حسب تاريخ الحركة. القيمة الافتراضية: اليوم السابق (أو من إعدادات TV)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-full overflow-hidden border border-white/30 bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                كروت
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}
              >
                <Table2 className="w-4 h-4" />
                جدول
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap no-print">
              <button
                type="button"
                onClick={handleBackfill}
                disabled={backfillLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors disabled:opacity-60"
                title="تعبئة جدول المخزون من بيانات RTGS الحالية"
              >
                <RefreshCw className={`w-4 h-4 ${backfillLoading ? 'animate-spin' : ''}`} />
                {backfillLoading ? 'جاري التعبئة...' : 'تعبئة الجدول'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors"
                title="تصدير البيانات الحالية إلى CSV"
              >
                <FileDown className="w-4 h-4" />
                تصدير
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors"
                title="طباعة التقرير"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
            </div>
            <Link
              to="/rtgs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] hover:bg-white/95 transition-colors shadow"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى RTGS
            </Link>
          </div>
        </div>

        <div ref={printAreaRef}>
        <KpiCards
          items={[
            { label: 'عدد التسويات', value: summary.total_settlements, Icon: Hash, color: '#068294', glow: 'rgba(6, 130, 148, 0.4)', gradient: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
            { label: 'عدد الحركات', value: summary.total_movements, Icon: Activity, color: '#0369a1', glow: 'rgba(3, 105, 161, 0.4)', gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' },
            { label: 'قيمة الحركات (IQD)', value: summary.total_amount, Icon: DollarSign, color: '#059669', glow: 'rgba(5, 150, 105, 0.4)', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', formatDisplay: formatNum },
            { label: 'قيمة العمولة (IQD)', value: summary.total_fees, Icon: Percent, color: '#64748b', glow: 'rgba(100, 116, 139, 0.35)', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', formatDisplay: formatNum },
            { label: 'عمولة المحصل (IQD)', value: summary.total_acq, Icon: LayoutList, color: '#0f766e', glow: 'rgba(15, 118, 110, 0.4)', gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', formatDisplay: formatNum },
            { label: 'قيمة التسوية (IQD)', value: summary.total_sttle, Icon: Coins, color: '#026174', glow: 'rgba(2, 97, 116, 0.4)', gradient: 'linear-gradient(135deg, #026174 0%, #0f172a 100%)', formatDisplay: formatNum },
          ]}
        />

        {/* Filters — محسّنة */}
        <div
          className="rounded-2xl p-5 mb-6 border border-slate-200/80 no-print"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100">
                <Filter className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-base font-semibold text-slate-700">الفلاتر</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ds-btn ds-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              إلغاء الفلاتر
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-medium text-slate-500">عرض سريع:</span>
            <button
              type="button"
              onClick={() => { setFilters((p) => ({ ...p, sttl_date_from: yesterdayStr, sttl_date_to: yesterdayStr })); setPagination((p) => ({ ...p, page: 1 })); }}
              className="px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors"
              style={{ borderColor: filters.sttl_date_from === yesterdayStr ? 'var(--primary-600)' : 'var(--border)', background: filters.sttl_date_from === yesterdayStr ? 'rgba(6, 130, 148, 0.1)' : '#fff', color: filters.sttl_date_from === yesterdayStr ? 'var(--primary-700)' : 'var(--text)' }}
            >
              اليوم السابق
            </button>
            <button
              type="button"
              onClick={() => { setFilters((p) => ({ ...p, sttl_date_from: todayStr, sttl_date_to: todayStr })); setPagination((p) => ({ ...p, page: 1 })); }}
              className="px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors"
              style={{ borderColor: filters.sttl_date_from === todayStr ? 'var(--primary-600)' : 'var(--border)', background: filters.sttl_date_from === todayStr ? 'rgba(6, 130, 148, 0.1)' : '#fff', color: filters.sttl_date_from === todayStr ? 'var(--primary-700)' : 'var(--text)' }}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => { setFilters((p) => ({ ...p, sttl_date_from: '', sttl_date_to: '' })); setPagination((p) => ({ ...p, page: 1 })); }}
              className="px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors"
              style={{ borderColor: !filters.sttl_date_from && !filters.sttl_date_to ? 'var(--primary-600)' : 'var(--border)', background: !filters.sttl_date_from && !filters.sttl_date_to ? 'rgba(6, 130, 148, 0.1)' : '#fff', color: !filters.sttl_date_from && !filters.sttl_date_to ? 'var(--primary-700)' : 'var(--text)' }}
            >
              كل التواريخ
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ التسوية</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.sttl_date_from}
                  onChange={(e) => handleFilterChange('sttl_date_from', e.target.value)}
                  className="ds-input w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ التسوية</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.sttl_date_to}
                  onChange={(e) => handleFilterChange('sttl_date_to', e.target.value)}
                  className="ds-input w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">المصرف</label>
              <SearchableSelect
                value={filters.bank_display_name}
                onChange={(v) => handleFilterChange('bank_display_name', v)}
                options={[{ value: '', label: 'كل المصارف' }, ...bankOptions.map((b) => ({ value: b, label: b }))]}
                getOptionLabel={(opt: { value: string; label: string }) => opt.label}
                getOptionValue={(opt: { value: string; label: string }) => opt.value}
                placeholder="كل المصارف"
                searchPlaceholder="ابحث عن مصرف..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => fetchData()} className="ds-btn ds-btn-primary py-2 px-5 rounded-lg flex-1 sm:flex-none">
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '2px solid var(--border-card)',
          }}
        >
          {loading && data.length === 0 ? (
            <div className="p-16 flex justify-center">
              <Loading message="جاري تحميل التسويات..." />
            </div>
          ) : groups.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
                <Banknote className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>لا توجد تسويات مطابقة للفلاتر</p>
              <p className="text-sm mt-2 m-0" style={{ color: 'var(--text-muted)' }}>غيّر الفلاتر أو تأكد من استيراد بيانات RTGS</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {groups.map((group, index) => {
                    const dateStr = formatDate(group.sttl_date);
                    const bankStr = group.bank_name || group.rows[0]?.inst_id2 || '—';
                    const label = `تسوية ${dateStr} — ${bankStr}`;
                    return (
                      <motion.div
                        key={group.key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, delay: index * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={{
                          scale: 1.03,
                          y: -6,
                          zIndex: 20,
                          boxShadow: '0 20px 40px rgba(2, 97, 116, 0.18), 0 0 0 1px rgba(8, 131, 149, 0.2)',
                          transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
                        }}
                        className="group relative flex flex-col rounded-2xl overflow-hidden cursor-default"
                        style={{
                          background: 'var(--surface)',
                          border: '2px solid var(--border-card)',
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                        }}
                      >
                        <div className="card-shine-hover absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl" />
                        <div
                          className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300"
                          style={{ right: 0, background: 'linear-gradient(180deg, var(--primary-800), var(--primary-600), var(--primary-700))' }}
                        />
                        <div className="p-5 flex flex-col gap-4">
                          <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>{label}</h3>
                          {/* تفصيل حسب تاريخ الحركة */}
                          <div className="space-y-3">
                            {group.rows.map((row, rowIdx) => (
                              <div
                                key={`${group.key}-${row.transaction_date}-${rowIdx}`}
                                className="rounded-xl p-3 text-sm"
                                style={{ background: 'rgba(2, 97, 116, 0.04)', border: '1px solid var(--border)' }}
                              >
                                <div className="font-bold mb-2 text-xs" style={{ color: 'var(--primary-800)' }}>
                                  تاريخ الحركة: <span dir="ltr">{formatDate(row.transaction_date)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عدد الحركات</span><span className="tabular-nums font-medium" dir="ltr">{row.movement_count.toLocaleString('en-US')}</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة الحركات</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_amount)}</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة العمولة</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_fees)}</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عمولة المحصل</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_acq)}</span></div>
                                  <div className="col-span-2 flex justify-between pt-1 border-t mt-1" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>قيمة التسوية</span><span className="tabular-nums font-bold" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.sum_sttle)} IQD</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* إجمالي التسوية — نص أبيض للوضوح */}
                          <div className="table-header-dark rounded-xl p-3 mt-1" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                            <div className="font-bold text-xs mb-2">إجمالي التسوية</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <div className="flex justify-between"><span>عدد الحركات</span><span className="tabular-nums font-bold" dir="ltr">{group.totals.movement_count.toLocaleString('en-US')}</span></div>
                              <div className="flex justify-between"><span>قيمة الحركات</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(group.totals.sum_amount)} IQD</span></div>
                              <div className="flex justify-between"><span>قيمة العمولة</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(group.totals.sum_fees)} IQD</span></div>
                              <div className="flex justify-between"><span>عمولة المحصل</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(group.totals.sum_acq)} IQD</span></div>
                              <div className="col-span-2 flex justify-between pt-1 border-t border-white/30 mt-1"><span>قيمة التسوية</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(group.totals.sum_sttle)} IQD</span></div>
                            </div>
                          </div>
                          {/* أزرار عرض التفصيل + تفاصيل التسوية (IBAN، وزارة، فرع، إلخ) */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => setDetailGroup(group)}
                              className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              عرض التفصيل
                            </button>
                            <button
                              type="button"
                              onClick={() => openSettlementDetails(group)}
                              className="ds-btn ds-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                            >
                              <FileText className="w-4 h-4" />
                              تفاصيل التسوية
                            </button>
                            <div className="flex-shrink-0 ms-auto w-full sm:w-auto" style={{ alignSelf: 'flex-end' }}>
                              <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-14 w-auto object-contain opacity-90" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="flex items-center justify-between px-4 py-4 mt-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
                <p className="text-sm font-medium m-0" style={{ color: 'var(--text-muted)' }} dir="ltr">عرض {groups.length} تسوية من {pagination.total}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1} className="ds-btn ds-btn-outline p-2.5 rounded-lg disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold px-3 min-w-[4rem] text-center" style={{ color: 'var(--text-strong)' }} dir="ltr">{pagination.page} / {pagination.totalPages || 1}</span>
                  <button type="button" onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages || 1, p.page + 1) }))} disabled={pagination.page >= (pagination.totalPages || 1)} className="ds-btn ds-btn-outline p-2.5 rounded-lg disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto overflow-y-visible" style={{ isolation: 'isolate' }}>
                <table className="ds-table w-full" style={{ minWidth: '760px', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                      <th className="text-end py-4 px-4 font-bold text-white">تاريخ الحركة</th>
                      <th className="text-end py-4 px-4 font-bold text-white">عدد الحركات</th>
                      <th className="text-end py-4 px-4 font-bold text-white">قيمة الحركات (IQD)</th>
                      <th className="text-end py-4 px-4 font-bold text-white">قيمة العمولة (IQD)</th>
                      <th className="text-end py-4 px-4 font-bold text-white">عمولة المحصل (IQD)</th>
                      <th className="text-end py-4 px-4 font-bold text-white">قيمة التسوية (IQD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const dateStr = formatDate(group.sttl_date);
                      const bankStr = group.bank_name || group.rows[0]?.inst_id2 || '—';
                      const label = `تسوية ${dateStr} — ${bankStr}`;
                      return (
                        <React.Fragment key={group.key}>
                          {/* رأس التسوية + زر تفاصيل التسوية */}
                          <tr style={{ background: 'rgba(2, 97, 116, 0.08)', borderTop: '3px solid var(--primary-600)' }}>
                            <td colSpan={6} className="py-4 px-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>{label}</span>
                                <button
                                  type="button"
                                  onClick={() => openSettlementDetails(group)}
                                  className="ds-btn ds-btn-outline flex items-center gap-2 px-3 py-1.5 text-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  تفاصيل التسوية
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* الحركات */}
                          {group.rows.map((row, idx) => (
                            <motion.tr
                              key={`${group.key}-${row.transaction_date}-${idx}`}
                              className="gov-settlement-data-row"
                              initial={false}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: '0 8px 24px rgba(2, 97, 116, 0.2), 0 0 0 1px rgba(8, 131, 149, 0.25)',
                                transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
                              }}
                              style={{
                                background: '#fff',
                                position: 'relative',
                                cursor: 'default',
                                zIndex: 1,
                              }}
                            >
                              <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(row.transaction_date)}</td>
                              <td className="py-3 px-4 font-medium tabular-nums" style={{ color: 'var(--text-strong)' }} dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                              <td className="py-3 px-4 font-medium tabular-nums break-all" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(row.sum_amount)}</td>
                              <td className="py-3 px-4 tabular-nums break-all" style={{ color: 'var(--text)' }} dir="ltr" title="قيمة العمولة">{formatNum(row.sum_fees)}</td>
                              <td className="py-3 px-4 tabular-nums break-all" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(row.sum_acq)}</td>
                              <td className="py-3 px-4 font-bold tabular-nums break-all" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.sum_sttle)}</td>
                            </motion.tr>
                          ))}
                          {/* إجمالي التسوية — نفس لون رأس الجدول (أبيض) */}
                          <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', borderTop: '2px solid rgba(255,255,255,0.3)' }}>
                            <td className="py-4 px-4 font-bold">إجمالي التسوية</td>
                            <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{group.totals.movement_count.toLocaleString('en-US')}</td>
                            <td className="py-4 px-4 font-bold tabular-nums break-all" dir="ltr">{formatNum(group.totals.sum_amount)}</td>
                            <td className="py-4 px-4 font-bold tabular-nums break-all" dir="ltr" title="قيمة العمولة">{formatNum(group.totals.sum_fees)}</td>
                            <td className="py-4 px-4 font-bold tabular-nums break-all" dir="ltr">{formatNum(group.totals.sum_acq)}</td>
                            <td className="py-4 px-4 font-bold tabular-nums break-all" dir="ltr">{formatNum(group.totals.sum_sttle)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="h-3" style={{ background: 'var(--border)' }} />
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/20" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                <p className="text-sm font-medium m-0" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }} dir="ltr">
                  عرض {groups.length} تسوية من {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="p-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 transition-colors border border-white/30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold px-3 min-w-[4rem] text-center" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }} dir="ltr">
                    {pagination.page} / {pagination.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages || 1, p.page + 1) }))}
                    disabled={pagination.page >= (pagination.totalPages || 1)}
                    className="p-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 transition-colors border border-white/30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </div>

        {/* نافذة تفاصيل التسوية (IBAN، وزارة/مديرية/محافظة، فرع، حركات، عمولة، مبلغ) */}
        <Dialog open={!!detailsSettlement} onOpenChange={(open) => { if (!open) setDetailsSettlement(null); }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-card)' }}>
              <DialogTitle className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
                تفاصيل التسوية — {formatDate(detailsSettlement?.sttl_date ?? null)} {detailsSettlement?.bank_display_name ? ` / ${detailsSettlement.bank_display_name}` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 overflow-auto flex-1 min-h-0">
              {detailsLoading ? (
                <Loading message="جاري جلب التفاصيل..." />
              ) : detailsRows.length === 0 ? (
                <p className="text-center text-slate-500">لا توجد تفاصيل مخزنة لهذه التسوية. قم بتعبئة الجدول أو استيراد ملف RTGS.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-card)' }}>
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
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* نافذة عرض التفصيل — بحجم الشاشة */}
        <Dialog open={!!detailGroup} onOpenChange={(open) => { if (!open) { setDetailGroup(null); setDetailViewMode('table'); } }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-y-auto p-0 gap-0 rounded-2xl">
            {detailGroup && (
              <>
                <DialogHeader className="p-6 pb-4 border-b flex-row justify-between items-center gap-4 flex-wrap" style={{ borderColor: 'var(--border-card)' }}>
                  <DialogTitle className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
                    {`تسوية ${formatDate(detailGroup.sttl_date)} — ${detailGroup.bank_name || detailGroup.rows[0]?.inst_id2 || '—'}`}
                  </DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDetailViewMode('table')}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${detailViewMode === 'table' ? 'bg-[#068294] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Table2 className="w-4 h-4 inline-block ms-1" />
                        جدول
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailViewMode('cards')}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${detailViewMode === 'cards' ? 'bg-[#068294] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <LayoutGrid className="w-4 h-4 inline-block ms-1" />
                        كروت
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAsImage}
                      disabled={downloadingImage}
                      className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-70"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingImage ? 'جاري التحميل...' : 'تحميل كصورة'}
                    </button>
                  </div>
                </DialogHeader>
                <div className="p-6 overflow-auto bg-white flex justify-center">
                  <div
                    ref={detailContentRef}
                    className="bg-white"
                    style={{ width: 'fit-content', maxWidth: '100%', paddingBottom: '4rem' }}
                  >
                  {detailViewMode === 'table' ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="ds-table w-full">
                          <thead>
                            <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                              <th className="text-end py-4 px-4 font-bold text-white">تاريخ الحركة</th>
                              <th className="text-end py-4 px-4 font-bold text-white">عدد الحركات</th>
                              <th className="text-end py-4 px-4 font-bold text-white">قيمة الحركات (IQD)</th>
                              <th className="text-end py-4 px-4 font-bold text-white">قيمة العمولة (IQD)</th>
                              <th className="text-end py-4 px-4 font-bold text-white">عمولة المحصل (IQD)</th>
                              <th className="text-end py-4 px-4 font-bold text-white">قيمة التسوية (IQD)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailGroup.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(row.transaction_date)}</td>
                                <td className="py-3 px-4 font-medium tabular-nums" style={{ color: 'var(--text-strong)' }} dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                                <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(row.sum_amount)}</td>
                                <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(row.sum_fees)}</td>
                                <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(row.sum_acq)}</td>
                                <td className="py-3 px-4 font-bold tabular-nums" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.sum_sttle)}</td>
                              </tr>
                            ))}
                            <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', borderTop: '2px solid rgba(255,255,255,0.3)' }}>
                              <td className="py-4 px-4 font-bold">إجمالي التسوية</td>
                              <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{detailGroup.totals.movement_count.toLocaleString('en-US')}</td>
                              <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{formatNum(detailGroup.totals.sum_amount)}</td>
                              <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{formatNum(detailGroup.totals.sum_fees)}</td>
                              <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{formatNum(detailGroup.totals.sum_acq)}</td>
                              <td className="py-4 px-4 font-bold tabular-nums" dir="ltr">{formatNum(detailGroup.totals.sum_sttle)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-6 mb-6 flex justify-end">
                        <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-24 w-auto object-contain opacity-90" />
                      </div>
                    </>
                  ) : (
                    /* عرض الكارت — الختم خارج الكارت لتجنب قصّه عند التحميل */
                    <div className="flex flex-col gap-4" style={{ maxWidth: '480px' }}>
                      <div
                        className="rounded-2xl overflow-hidden flex flex-col relative"
                        style={{
                          background: 'var(--surface)',
                          border: '2px solid var(--border-card)',
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                        }}
                      >
                        <div className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80" style={{ right: 0, background: 'linear-gradient(180deg, var(--primary-800), var(--primary-600), var(--primary-700))' }} aria-hidden />
                        <div className="p-6 flex flex-col gap-4">
                          <h3 className="text-xl font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>
                            {`تسوية ${formatDate(detailGroup.sttl_date)} — ${detailGroup.bank_name || detailGroup.rows[0]?.inst_id2 || '—'}`}
                          </h3>
                          {/* تفصيل حسب تاريخ الحركة */}
                          <div className="space-y-3">
                            {detailGroup.rows.map((row, rowIdx) => (
                              <div
                                key={rowIdx}
                                className="rounded-xl p-3 text-sm"
                                style={{ background: 'rgba(2, 97, 116, 0.04)', border: '1px solid var(--border)' }}
                              >
                                <div className="font-bold mb-2 text-xs" style={{ color: 'var(--primary-800)' }}>
                                  تاريخ الحركة: <span dir="ltr">{formatDate(row.transaction_date)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عدد الحركات</span><span className="tabular-nums font-medium" dir="ltr">{row.movement_count.toLocaleString('en-US')}</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة الحركات</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_amount)} IQD</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة العمولة</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_fees)} IQD</span></div>
                                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عمولة المحصل</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(row.sum_acq)} IQD</span></div>
                                  <div className="col-span-2 flex justify-between pt-1 border-t mt-1" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>قيمة التسوية</span><span className="tabular-nums font-bold" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.sum_sttle)} IQD</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* إجمالي التسوية */}
                          <div className="table-header-dark rounded-xl p-4 mt-1" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                            <div className="font-bold text-sm mb-2">إجمالي التسوية</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                              <div className="flex justify-between"><span>عدد الحركات</span><span className="tabular-nums font-bold" dir="ltr">{detailGroup.totals.movement_count.toLocaleString('en-US')}</span></div>
                              <div className="flex justify-between"><span>قيمة الحركات</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(detailGroup.totals.sum_amount)} IQD</span></div>
                              <div className="flex justify-between"><span>قيمة العمولة</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(detailGroup.totals.sum_fees)} IQD</span></div>
                              <div className="flex justify-between"><span>عمولة المحصل</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(detailGroup.totals.sum_acq)} IQD</span></div>
                              <div className="col-span-2 flex justify-between pt-1 border-t border-white/30 mt-1"><span>قيمة التسوية</span><span className="tabular-nums font-bold" dir="ltr">{formatNum(detailGroup.totals.sum_sttle)} IQD</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ختم التسويات — خارج overflow-hidden ليكون كاملاً عند التحميل */}
                      <div className="flex items-center justify-end pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-20 w-auto object-contain opacity-90" />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default GovernmentSettlements;
