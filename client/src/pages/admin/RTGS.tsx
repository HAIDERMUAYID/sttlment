import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHasPermission } from '@/hooks/useHasPermission';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/Loading';
import {
  Upload,
  FileSpreadsheet,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  History,
  Banknote,
  Hash,
  Calendar,
  Building2,
  FileText,
  Download,
  ChevronDown,
  X,
  Trash2,
  FileStack,
  CheckCircle2,
  Ban,
  Clock,
  Settings,
  FileCheck,
} from 'lucide-react';

interface RtgsRow {
  id: number;
  rrn: string;
  sttl_date: string | null;
  mer: string | null;
  governorate?: string | null;
  directorate_name: string | null;
  ministry: string | null;
  merchant_iban?: string | null;
  merchant_display_name?: string | null;
  bank_display_name: string | null;
  amount: number | null;
  fees: number | null;
  acq: number | null;
  sttle: number | null;
  card_number_masked: string | null;
  mcc: number | null;
  terminal_type: string | null;
  mer_name: string | null;
  message_type: string | null;
  transaction_date: string | null;
  source_filename?: string | null;
  merchant_details?: string | null;
}

interface ImportLog {
  id: number;
  filename: string | null;
  total_rows: number;
  inserted_rows: number;
  skipped_duplicates: number;
  rejected_rows: number;
  created_at: string;
  user_name: string | null;
  duration_ms?: number | null;
}

/** نتيجة مطابقة RRN — قراءة فقط، بدون حقن بيانات */
interface RrnMatchResult {
  rrn: string;
  exists: boolean;
  transaction_date: string | null;
  sttl_date: string | null;
}

/** عنصر رفع ملف — اسم الملف ونسبة التحميل */
interface UploadItem {
  id: string;
  fileName: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  summary?: {
    total_rows: number;
    inserted_rows: number;
    skipped_duplicates: number;
    rejected_rows: number;
  };
}

/** تاريخ التسوية (STTL_DATE) — عرض التاريخ فقط بدون وقت لتجنب اختلاف التوقيت */
const formatDate = (d: string | Date | null | undefined) => {
  if (d == null) return '—';
  if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10) || '—';
  return '—';
};

/** عرض الأرقام مع دقة كافية للعمولة — 6 منازل عشرية لضمان التطابق */
const formatNum = (n: number | null) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

/** عرض RRN كرقم — إزالة الأصفار الأمامية (مثل 0000123456 → 123456) */
const formatRrn = (rrn: string | null | undefined): string => {
  if (rrn == null || rrn === '') return '—';
  const s = String(rrn).trim();
  return s.replace(/^0+/, '') || '0';
};

/** كروت KPI لسجل الاستيراد */
function ImportLogKpiCards({ importLogs }: { importLogs: ImportLog[] }) {
  const kpi = useMemo(() => ({
    totalImports: importLogs.length,
    totalInserted: importLogs.reduce((s, l) => s + (l.inserted_rows || 0), 0),
    totalSkipped: importLogs.reduce((s, l) => s + (l.skipped_duplicates || 0), 0),
    totalRejected: importLogs.reduce((s, l) => s + (l.rejected_rows || 0), 0),
  }), [importLogs]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        { label: 'عدد عمليات الاستيراد', value: kpi.totalImports.toLocaleString('en-US'), Icon: FileStack, primary: true },
        { label: 'إجمالي المدخلة', value: kpi.totalInserted.toLocaleString('en-US'), Icon: CheckCircle2, color: 'emerald' },
        { label: 'إجمالي التخطي', value: kpi.totalSkipped.toLocaleString('en-US'), Icon: Clock, color: 'amber' },
        { label: 'إجمالي المرفوض', value: kpi.totalRejected.toLocaleString('en-US'), Icon: Ban, color: 'red' },
      ].map((item, idx) => {
        const Icon = item.Icon;
        const colorClass = item.color === 'emerald' ? 'text-emerald-600' : item.color === 'amber' ? 'text-amber-600' : item.color === 'red' ? 'text-red-600' : '';
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-xl bg-white p-3 flex items-center gap-3 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_8px_24px_rgba(2,97,116,0.12)] transition-all duration-200"
          >
            <div className={`absolute inset-y-0 start-0 w-1 rounded-s-xl bg-gradient-to-b ${item.primary ? 'from-teal-600 to-teal-500/80' : 'from-slate-400 to-slate-300/80'} opacity-90`} />
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${item.primary ? 'bg-teal-100' : 'bg-slate-100'}`}>
              <Icon className={`w-5 h-5 ${item.primary ? 'text-teal-600' : colorClass || 'text-slate-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 m-0 font-medium">{item.label}</p>
              <p className={`m-0 font-bold tabular-nums text-base ${item.primary ? 'text-[#026174]' : colorClass || 'text-slate-700'}`} dir="ltr">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** تاريخ الحركة (TRANSCATIONDATE) — فصل التاريخ والوقت للعرض في سطرين */
const formatTransactionDateParts = (d: string | Date | null | undefined): { datePart: string; timePart: string } => {
  if (d == null) return { datePart: '—', timePart: '—' };
  let s: string;
  if (d instanceof Date && !isNaN(d.getTime())) {
    s = d.toISOString().slice(0, 19).replace('T', ' ');
  } else if (typeof d === 'string') {
    s = d.slice(0, 19).replace('T', ' ').trim();
  } else {
    return { datePart: '—', timePart: '—' };
  }
  if (!s) return { datePart: '—', timePart: '—' };
  const space = s.indexOf(' ');
  if (space > 0) {
    return { datePart: s.slice(0, space), timePart: s.slice(space + 1) || '—' };
  }
  return { datePart: s, timePart: '—' };
};

function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  placeholder = 'بحث...',
}: {
  label: string;
  options: (string | number)[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const opts = options.map(String);
  const filtered = opts.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(','));
  };
  const clear = () => onChange('');
  return (
    <div className={`relative ${open ? 'rtgs-multiselect-open' : ''}`}>
      <label className="block text-xs font-semibold mb-1 rtgs-multiselect-label" style={{ color: '#0f172a' }}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rtgs-multiselect-trigger w-full px-3 py-2.5 rounded-xl text-sm text-right flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected.length === 0 ? 'الكل' : selected.length === 1 ? selected[0] : `${selected.length} محدد`}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border-2 bg-white shadow-xl py-2 min-w-[200px] max-h-64 flex flex-col" style={{ borderColor: '#b8dce2' }}>
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mx-2 mb-2 px-2 py-1.5 rounded-lg text-sm border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20"
              style={{ borderColor: '#b8dce2' }}
            />
            <div className="overflow-auto flex-1 px-2">
              <button type="button" onClick={clear} className="w-full text-right py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded">
                (الكل)
              </button>
              {filtered.slice(0, 100).map((opt) => (
                <label key={opt} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded" />
                  <span className="truncate">{opt}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="mx-2 mt-2 py-1.5 rounded bg-slate-100 text-sm font-medium">
              إغلاق
            </button>
          </div>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
        </>
      )}
    </div>
  );
}

function ColumnFilterPopover({
  title,
  options,
  value,
  onApply,
  onClose,
}: {
  title: string;
  options: (string | number)[];
  value: string;
  onApply: (v: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const opts = options.map(String);
  const filtered = opts.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const selectedDraft = draft ? draft.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const toggleDraft = (opt: string) => {
    const next = selectedDraft.includes(opt) ? selectedDraft.filter((s) => s !== opt) : [...selectedDraft, opt];
    setDraft(next.join(','));
  };
  return (
    <>
      <div className="rtgs-filter-popover absolute left-0 top-full mt-1 z-30 min-w-[220px] max-w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl py-3">
        <p className="px-3 font-semibold text-sm mb-2" style={{ color: '#0f172a' }}>{title}</p>
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mx-2 mb-2 w-[calc(100%-1rem)] px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
          style={{ color: '#0f172a' }}
        />
        <div className="max-h-48 overflow-auto px-2">
          <button type="button" onClick={() => setDraft('')} className="w-full text-right py-1.5 text-sm hover:bg-slate-100 rounded" style={{ color: '#334155' }}>
            (الكل)
          </button>
          {filtered.slice(0, 80).map((opt) => (
            <label key={opt} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm" style={{ color: '#0f172a' }}>
              <input type="checkbox" checked={selectedDraft.includes(opt)} onChange={() => toggleDraft(opt)} className="rounded border-slate-300" />
              <span className="truncate" style={{ color: '#0f172a' }}>{opt}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 px-2 mt-2">
          <button type="button" onClick={() => onApply(draft)} className="flex-1 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #026174, #068294)', color: '#ffffff' }}>
            تطبيق
          </button>
          <button type="button" onClick={onClose} className="py-1.5 px-3 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200" style={{ color: '#0f172a' }}>
            إلغاء
          </button>
        </div>
      </div>
      <div className="fixed inset-0 z-[20]" onClick={onClose} aria-hidden />
    </>
  );
}

export function RTGS() {
  const [rtgs, setRtgs] = useState<RtgsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    sttl_date_from: '',
    sttl_date_to: '',
    transaction_date_from: '',
    transaction_date_to: '',
    mer: '',
    mcc: '',
    inst_id2: '',
    search: '',
    text_search: '',
    message_type: '',
    ministry: '',
    directorate_name: '',
    bank_display_name: '',
    terminal_type: '',
    import_log_id: '',
    governorate: '',
    details: '',
    iban: '',
  });
  const [filterOptions, setFilterOptions] = useState<{
    merList: string[];
    mccList: (string | number)[];
    instId2List: string[];
    messageTypeList: string[];
    terminalTypeList: string[];
    ministryList: string[];
    directorateNameList: string[];
    bankDisplayNameList: string[];
    governorateList: string[];
  }>({
    merList: [], mccList: [], instId2List: [],
    messageTypeList: [], terminalTypeList: [], ministryList: [], directorateNameList: [], bankDisplayNameList: [], governorateList: [],
  });
  const [columnFilterOpen, setColumnFilterOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<ImportLog | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [logFilters, setLogFilters] = useState({ search: '', dateFrom: '', dateTo: '', user: '' });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressVisible, setImportProgressVisible] = useState(false);
  const [importRowsCount, setImportRowsCount] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [importSummary, setImportSummary] = useState<{
    total_rows: number;
    inserted_rows: number;
    skipped_duplicates: number;
    rejected_rows: number;
  } | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rrnMatchResults, setRrnMatchResults] = useState<RrnMatchResult[] | null>(null);
  const [rrnMatchLoading, setRrnMatchLoading] = useState(false);
  const rrnMatchFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const canImport = useHasPermission('rtgs', 'import');
  const canExport = useHasPermission('rtgs', 'export');
  const canDeleteAll = useHasPermission('rtgs', 'delete_all');
  const canDeleteImport = useHasPermission('rtgs', 'delete_import');
  const canViewImportLogs = useHasPermission('rtgs', 'view_import_logs');
  const canAccessSettings = useHasPermission('rtgs', 'access_settings');

  const buildQueryParams = () => {
    const query: Record<string, string> = {
      page: String(pagination.page),
      limit: String(pagination.limit),
    };
    if (filters.sttl_date_from) query.sttl_date_from = filters.sttl_date_from;
    if (filters.sttl_date_to) query.sttl_date_to = filters.sttl_date_to;
    if (filters.transaction_date_from) query.transaction_date_from = filters.transaction_date_from;
    if (filters.transaction_date_to) query.transaction_date_to = filters.transaction_date_to;
    if (filters.mer) query.mer = filters.mer;
    if (filters.mcc) query.mcc = String(filters.mcc);
    if (filters.inst_id2) query.inst_id2 = filters.inst_id2;
    if (filters.search) query.search = filters.search;
    if (filters.text_search) query.text_search = filters.text_search;
    if (filters.message_type) query.message_type = filters.message_type;
    if (filters.ministry) query.ministry = filters.ministry;
    if (filters.directorate_name) query.directorate_name = filters.directorate_name;
    if (filters.bank_display_name) query.bank_display_name = filters.bank_display_name;
    if (filters.terminal_type) query.terminal_type = filters.terminal_type;
    if (filters.import_log_id) query.import_log_id = filters.import_log_id;
    if (filters.governorate) query.governorate = filters.governorate;
    if (filters.details) query.details = filters.details;
    if (filters.iban) query.iban = filters.iban;
    return query;
  };

  const fetchRtgs = async () => {
    try {
      setLoading(true);
      const query = buildQueryParams();
      const params = new URLSearchParams(query);
      const res = await api.get(`/rtgs?${params.toString()}`);
      setRtgs(res.data?.rtgs ?? []);
      setPagination((prev) => ({
        ...prev,
        ...(res.data?.pagination ?? {}),
      }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ',
        description: err.response?.data?.error ?? 'فشل جلب بيانات RTGS',
        variant: 'destructive',
      });
      setRtgs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/rtgs/filter-options');
      const data = res.data ?? {};
      setFilterOptions({
      merList: data.merList ?? [],
      mccList: data.mccList ?? [],
      instId2List: data.instId2List ?? [],
      messageTypeList: data.messageTypeList ?? [],
      terminalTypeList: data.terminalTypeList ?? [],
      ministryList: data.ministryList ?? [],
      directorateNameList: data.directorateNameList ?? [],
      bankDisplayNameList: data.bankDisplayNameList ?? [],
      governorateList: data.governorateList ?? [],
    });
    } catch {
      // ignore
    }
  };

  const fetchImportLogs = async () => {
    try {
      const res = await api.get('/rtgs/import-logs?limit=30');
      setImportLogs(res.data ?? []);
    } catch {
      setImportLogs([]);
    }
  };

  useEffect(() => {
    fetchRtgs();
  }, [
    pagination.page,
    filters.sttl_date_from,
    filters.sttl_date_to,
    filters.transaction_date_from,
    filters.transaction_date_to,
    filters.mer,
    filters.mcc,
    filters.inst_id2,
    filters.search,
    filters.text_search,
    filters.message_type,
    filters.ministry,
    filters.directorate_name,
    filters.bank_display_name,
    filters.terminal_type,
    filters.import_log_id,
    filters.governorate,
    filters.details,
    filters.iban,
  ]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchImportLogs();
  }, []);

  useEffect(() => {
    if (showLogsModal) fetchImportLogs();
  }, [showLogsModal]);

  const filteredImportLogs = useMemo(() => {
    let list = importLogs;
    const { search, dateFrom, dateTo, user } = logFilters;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          (l.filename ?? '').toLowerCase().includes(q) ||
          (l.user_name ?? '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      list = list.filter((l) => formatDate(l.created_at) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((l) => formatDate(l.created_at) <= dateTo);
    }
    if (user) {
      list = list.filter((l) => (l.user_name ?? '') === user);
    }
    return list;
  }, [importLogs, logFilters]);

  const uniqueUsers = useMemo(
    () => Array.from(new Set(importLogs.map((l) => l.user_name ?? '').filter(Boolean))).sort(),
    [importLogs]
  );

  const clearLogFilters = () => setLogFilters({ search: '', dateFrom: '', dateTo: '', user: '' });

  const handleDeleteImportLogClick = (log: ImportLog) => {
    setDeleteConfirmLog(log);
  };

  const handleClearAllRtgs = async () => {
    setShowClearAllConfirm(false);
    try {
      const res = await api.delete('/rtgs/all');
      const data = res.data as { message?: string; rtgs_deleted?: number } | undefined;
      toast({ title: 'تم الحذف بنجاح', description: data?.message ?? 'تم حذف جميع حركات RTGS', variant: 'default' });
      fetchRtgs();
      fetchImportLogs();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل الحذف', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    const log = deleteConfirmLog;
    if (!log) return;
    setDeleteConfirmLog(null);
    try {
      const res = await api.delete(`/rtgs/import-logs/${log.id}`);
      const data = res.data as { message?: string; rtgs_deleted?: number } | undefined;
      const desc = data?.message ?? `تم حذف سجل الاستيراد و ${data?.rtgs_deleted ?? 0} حركة RTGS المرتبطة به`;
      toast({ title: 'تم الحذف بنجاح', description: desc, variant: 'default' });
      fetchImportLogs();
      fetchRtgs();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ في الحذف', description: err.response?.data?.error ?? 'فشل حذف سجل الاستيراد', variant: 'destructive' });
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      sttl_date_from: '',
      sttl_date_to: '',
      transaction_date_from: '',
      transaction_date_to: '',
      mer: '',
      mcc: '',
      inst_id2: '',
      search: '',
      text_search: '',
      message_type: '',
      ministry: '',
      directorate_name: '',
      bank_display_name: '',
      terminal_type: '',
      import_log_id: '',
      governorate: '',
      details: '',
      iban: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setColumnFilterOpen(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = buildQueryParams();
      delete query.page;
      delete query.limit;
      const params = new URLSearchParams(query);
      const token = localStorage.getItem('token');
      const url = `/api/rtgs/export?${params.toString()}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rtgs_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: 'تم التصدير', description: 'تم تنزيل ملف Excel بنجاح', variant: 'default' });
    } catch (e) {
      toast({ title: 'خطأ', description: 'فشل تصدير Excel', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const updateUploadItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const items: UploadItem[] = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      fileName: file.name,
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadQueue(items);
    setImporting(true);
    setImportSummary(null);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      updateUploadItem(item.id, { status: 'uploading', progress: 0 });

      const formData = new FormData();
      formData.append('file', item.file);

      try {
        const res = await api.post('/rtgs/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => {
            const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
            updateUploadItem(item.id, { progress: Math.min(pct, 99) });
          },
        });
        const summary = res.data?.summary ?? res.data;
        updateUploadItem(item.id, {
          status: 'done',
          progress: 100,
          summary: summary
            ? {
                total_rows: summary.total_rows ?? 0,
                inserted_rows: summary.inserted_rows ?? 0,
                skipped_duplicates: summary.skipped_duplicates ?? 0,
                rejected_rows: summary.rejected_rows ?? 0,
              }
            : undefined,
        });
        if (i === items.length - 1) setImportSummary(summary);
        toast({
          title: 'تم استيراد الملف',
          description: `${item.fileName}: إدخال ${summary?.inserted_rows ?? 0} | تخطي ${summary?.skipped_duplicates ?? 0} | مرفوض ${summary?.rejected_rows ?? 0}`,
          variant: 'default',
        });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { error?: string } } };
        const msg = ax.response?.data?.error ?? 'فشل رفع الملف';
        updateUploadItem(item.id, { status: 'error', progress: 0, error: msg });
        toast({
          title: 'خطأ في الاستيراد',
          description: `${item.fileName}: ${msg}`,
          variant: 'destructive',
        });
      }
    }

    setImporting(false);
    fetchRtgs();
    fetchImportLogs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearUploadQueue = () => {
    setUploadQueue([]);
  };

  const handleMatchRrnExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRrnMatchLoading(true);
    setRrnMatchResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ results: RrnMatchResult[] }>('/rtgs/match-rrn-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRrnMatchResults(res.data?.results ?? []);
      toast({
        title: 'تمت المطابقة',
        description: `تم فحص ${(res.data?.results?.length ?? 0).toLocaleString('en-US')} RRN — موجودة: ${(res.data?.results?.filter((r) => r.exists).length ?? 0).toLocaleString('en-US')}، غير موجودة: ${(res.data?.results?.filter((r) => !r.exists).length ?? 0).toLocaleString('en-US')}`,
        variant: 'default',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ في المطابقة',
        description: ax.response?.data?.error ?? 'فشل رفع الملف أو المعالجة',
        variant: 'destructive',
      });
      setRrnMatchResults(null);
    } finally {
      setRrnMatchLoading(false);
      if (rrnMatchFileRef.current) rrnMatchFileRef.current.value = '';
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
      <div className="mx-auto" style={{ maxWidth: '1800px' }}>
        {/* هيدر — نص وأيقونات أبيض على التيل لقراءة أوضح */}
        <div
          className="page-header-teal rounded-xl flex flex-wrap items-center justify-between gap-4 p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)',
          }}
        >
          <div>
            <h1 className="text-2xl font-bold m-0 text-white">RTGS — التسوية</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              استيراد وعرض حركات RTGS، ربط التجار والمصارف، والتحليلات المالية (amount, fees, acq, STTLE).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/government-settlements"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <Banknote className="w-4 h-4 text-white" />
              التسويات الحكومية
            </Link>
            {canAccessSettings && (
              <Link
                to="/rtgs-settings"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors text-white"
              >
                <Settings className="w-4 h-4 text-white" />
                إعدادات الاحتساب
              </Link>
            )}
            {canViewImportLogs && (
              <button
                type="button"
                onClick={() => setShowLogsModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors text-white"
              >
                <History className="w-4 h-4 text-white" />
                سجل الاستيراد
              </button>
            )}
            {canDeleteAll && (
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={pagination.total === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-500/80 hover:bg-red-500 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 text-white" />
                حذف كل الحركات
              </button>
            )}
            {canExport && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || pagination.total === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 text-white"
              >
                <Download className="w-4 h-4 text-white" />
                {exporting ? 'جاري التصدير...' : 'تصدير إلى Excel'}
              </button>
            )}
            {canImport && (
              <label className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] cursor-pointer hover:bg-white/95 transition-colors shadow">
                <Upload className="w-4 h-4" />
                {importing ? 'جاري الاستيراد...' : 'استيراد ملفات RTGS (CSV)'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  multiple
                  className="hidden"
                  disabled={importing}
                  onChange={handleImportFile}
                />
              </label>
            )}
          </div>
        </div>

        {/* ملخص آخر استيراد */}
        {importSummary && (
          <div
            className="rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{
              background: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              border: '1px solid rgba(6, 130, 148, 0.2)',
            }}
          >
            <div>
              <span className="text-sm text-slate-500">إجمالي الصفوف</span>
              <p className="text-xl font-bold text-slate-800 m-0" dir="ltr">{importSummary.total_rows.toLocaleString('en-US')}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">تم إدخالها</span>
              <p className="text-xl font-bold text-emerald-600 m-0" dir="ltr">{importSummary.inserted_rows.toLocaleString('en-US')}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">تخطي مكرر</span>
              <p className="text-xl font-bold text-amber-600 m-0" dir="ltr">{importSummary.skipped_duplicates.toLocaleString('en-US')}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">مرفوض</span>
              <p className="text-xl font-bold text-red-600 m-0" dir="ltr">{importSummary.rejected_rows.toLocaleString('en-US')}</p>
            </div>
          </div>
        )}

        {/* كروت إحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'إجمالي السجلات (الفلتر)', value: pagination.total.toLocaleString('en-US'), Icon: Hash, primary: true },
            { label: 'تاريخ التسوية', value: `${filters.sttl_date_from || '—'} → ${filters.sttl_date_to || '—'}`, Icon: Calendar, small: true },
            { label: 'التاجر / المصرف', value: filters.mer || filters.inst_id2 || 'الكل', Icon: Building2, small: true, truncate: true },
            { label: 'الصفحة', value: `${pagination.page} / ${pagination.totalPages || 1}`, Icon: Banknote, small: true },
          ].map((item, idx) => {
            const Icon = item.Icon;
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl bg-white p-4 flex items-center gap-3 border border-slate-200/80 shadow-[0_4px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_40px_rgba(2,97,116,0.14)] hover:-translate-y-1 transition-all duration-200 cursor-default"
              >
                <div className={`absolute inset-y-0 start-0 w-1 rounded-s-2xl bg-gradient-to-b ${item.primary ? 'from-teal-600 to-teal-500/80' : 'from-slate-500 to-slate-400/80'} opacity-90 group-hover:w-1.5 transition-all`} />
                <div className="card-shine-hover absolute inset-0 pointer-events-none overflow-hidden" />
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${item.primary ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${item.primary ? 'text-teal-600' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <p className="text-xs text-slate-500 m-0 mb-0.5 font-medium">{item.label}</p>
                  <p className={`m-0 font-extrabold leading-tight tabular-nums ${item.small ? 'text-sm text-slate-700' : 'text-xl text-[#026174]'} ${item.truncate ? 'truncate max-w-[140px]' : ''}`} dir="ltr">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* مطابقة RRN من Excel — قراءة فقط، بدون حقن بيانات */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '2px solid #86C4C4',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 130, 148, 0.15)' }}>
              <FileCheck className="w-5 h-5" style={{ color: '#068294' }} />
            </div>
            <div>
              <h3 className="text-base font-bold m-0" style={{ color: '#026174' }}>مطابقة RRN من Excel</h3>
              <p className="text-sm text-slate-500 m-0 mt-0.5">
                العمود الأول = RRN. يتم البحث عن كل RRN في النظام ويرجع موجودة/غير موجودة مع تاريخ الحركة وتاريخ التسوية. بدون حقن بيانات.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border-2 cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-50" style={{ borderColor: '#86C4C4', color: '#026174' }}>
              <FileSpreadsheet className="w-4 h-4" />
              {rrnMatchLoading ? 'جاري المطابقة...' : 'رفع ملف Excel للمطابقة'}
              <input
                ref={rrnMatchFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={rrnMatchLoading}
                onChange={handleMatchRrnExcel}
              />
            </label>
            {rrnMatchResults && (
              <button
                type="button"
                onClick={() => setRrnMatchResults(null)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                مسح النتائج
              </button>
            )}
          </div>
          {rrnMatchResults && rrnMatchResults.length > 0 && (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(6, 130, 148, 0.2)' }}>
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-sm font-semibold" style={{ background: 'linear-gradient(90deg, #068294 0%, #026174 100%)', color: '#fff' }}>
                    <th className="py-2.5 px-3 border-b border-white/20">RRN</th>
                    <th className="py-2.5 px-3 border-b border-white/20">الحالة</th>
                    <th className="py-2.5 px-3 border-b border-white/20" style={{ minWidth: '7.5rem' }}>تاريخ الحركة</th>
                    <th className="py-2.5 px-3 border-b border-white/20">تاريخ التسوية</th>
                  </tr>
                </thead>
                <tbody>
                  {rrnMatchResults.map((row, idx) => (
                    <tr
                      key={`${row.rrn}-${idx}`}
                      className="text-sm border-b border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="py-2 px-3 font-mono" dir="ltr">{formatRrn(row.rrn)}</td>
                      <td className="py-2 px-3">
                        {row.exists ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> موجودة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                            <X className="w-4 h-4" /> غير موجودة
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top" dir="ltr" style={{ minWidth: '7.5rem' }}>
                      {(() => {
                        const { datePart, timePart } = formatTransactionDateParts(row.transaction_date);
                        return (
                          <span className="inline-block">
                            <span className="block leading-tight text-sm whitespace-nowrap">{datePart}</span>
                            <span className="block text-slate-500 text-xs leading-tight mt-0.5">{timePart}</span>
                          </span>
                        );
                      })()}
                    </td>
                      <td className="py-2 px-3" dir="ltr">{row.sttl_date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* الفلاتر — نفس تصميم الصورة: حدود teal فاتحة، خلفية بيضاء */}
        <div
          className="rounded-2xl p-5 mb-6 rtgs-filter-card"
          style={{
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '2px solid #86C4C4',
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
              >
                <Filter className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold" style={{ color: '#026174' }}>
                الفلاتر — RTGS
              </span>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="merchants-clear-filters-btn flex items-center gap-2"
              disabled={!Object.values(filters).some(Boolean)}
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <div className="merchants-filter-input-wrapper">
              <Search className="w-5 h-5 text-[#0d9488] flex-shrink-0" strokeWidth={2} />
              <input
                type="text"
                placeholder="بحث: RRN / تاجر / وزارة / مصرف / التفاصيل..."
                value={filters.text_search}
                onChange={(e) => handleFilterChange('text_search', e.target.value)}
                className="merchants-filter-input"
              />
            </div>
            <div className="merchants-filter-input-wrapper">
              <Hash className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input
                type="text"
                placeholder="RRN..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="merchants-filter-input"
              />
            </div>
            <div className="merchants-filter-input-wrapper">
              <Calendar className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input
                type="date"
                value={filters.sttl_date_from}
                onChange={(e) => handleFilterChange('sttl_date_from', e.target.value)}
                className="merchants-filter-input"
                title="من تاريخ التسوية"
              />
            </div>
            <div className="merchants-filter-input-wrapper">
              <Calendar className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input
                type="date"
                value={filters.sttl_date_to}
                onChange={(e) => handleFilterChange('sttl_date_to', e.target.value)}
                className="merchants-filter-input"
                title="إلى تاريخ التسوية"
              />
            </div>
            <div className="merchants-filter-input-wrapper">
              <Clock className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input
                type="date"
                value={filters.transaction_date_from}
                onChange={(e) => handleFilterChange('transaction_date_from', e.target.value)}
                className="merchants-filter-input"
                title="من تاريخ الحركة"
              />
            </div>
            <div className="merchants-filter-input-wrapper">
              <Clock className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input
                type="date"
                value={filters.transaction_date_to}
                onChange={(e) => handleFilterChange('transaction_date_to', e.target.value)}
                className="merchants-filter-input"
                title="إلى تاريخ الحركة"
              />
            </div>
            <div className="merchants-filter-select-wrapper">
              <FileText className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <select
                value={filters.import_log_id}
                onChange={(e) => handleFilterChange('import_log_id', e.target.value)}
                className="merchants-filter-select"
              >
                <option value="">كل الملفات</option>
                {importLogs.map((log) => (
                  <option key={log.id} value={String(log.id)}>
                    {log.filename ?? `سجل #${log.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 pt-5" style={{ borderTop: '2px solid #86C4C4' }}>
            <p className="text-sm font-bold mb-4" style={{ color: '#0f172a' }}>
              فلترة حسب الأعمدة (اختيار متعدد)
            </p>
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              <MultiSelectFilter label="Message Type" options={filterOptions.messageTypeList} value={filters.message_type} onChange={(v) => handleFilterChange('message_type', v)} placeholder="بحث..." />
              <MultiSelectFilter label="التاجر (MER)" options={filterOptions.merList} value={filters.mer} onChange={(v) => handleFilterChange('mer', v)} placeholder="بحث..." />
              <MultiSelectFilter label="المحافظة" options={filterOptions.governorateList} value={filters.governorate} onChange={(v) => handleFilterChange('governorate', v)} placeholder="بحث..." />
              <MultiSelectFilter label="اسم المديرية" options={filterOptions.directorateNameList} value={filters.directorate_name} onChange={(v) => handleFilterChange('directorate_name', v)} placeholder="بحث..." />
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>التفاصيل</label>
                <div className="merchants-filter-input-wrapper">
                  <FileText className="w-4 h-4 text-[#0d9488] flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="بحث في التفاصيل."
                    value={filters.details}
                    onChange={(e) => handleFilterChange('details', e.target.value)}
                    className="merchants-filter-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>IBAN</label>
                <div className="merchants-filter-input-wrapper">
                  <Banknote className="w-4 h-4 text-[#0d9488] flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="بحث في IBAN..."
                    value={filters.iban}
                    onChange={(e) => handleFilterChange('iban', e.target.value)}
                    className="merchants-filter-input"
                    dir="ltr"
                  />
                </div>
              </div>
              <MultiSelectFilter label="الوزارة" options={filterOptions.ministryList} value={filters.ministry} onChange={(v) => handleFilterChange('ministry', v)} placeholder="بحث..." />
              <MultiSelectFilter label="المصرف" options={filterOptions.bankDisplayNameList} value={filters.bank_display_name} onChange={(v) => handleFilterChange('bank_display_name', v)} placeholder="بحث..." />
              <MultiSelectFilter label="MCC" options={filterOptions.mccList} value={filters.mcc} onChange={(v) => handleFilterChange('mcc', v)} placeholder="بحث..." />
              <MultiSelectFilter label="نوع الجهاز" options={filterOptions.terminalTypeList} value={filters.terminal_type} onChange={(v) => handleFilterChange('terminal_type', v)} placeholder="بحث..." />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchRtgs()}
              className="rtgs-apply-btn px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-95 transition-opacity"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>

        {/* الجدول */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: '#fff',
            boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {loading && rtgs.length === 0 ? (
            <div className="p-12 flex justify-center">
              <Loading message="جاري تحميل RTGS..." />
            </div>
          ) : rtgs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium m-0">لا توجد حركات RTGS مطابقة للفلاتر</p>
              <p className="text-sm mt-1">قم باستيراد ملف CSV أو تعديل معايير البحث.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
                  <thead>
                    <tr className="rtgs-table-header-teal" style={{ background: 'linear-gradient(90deg, #068294 0%, #026174 100%)', color: '#ffffff' }}>
                      {[
                        { id: 'source_filename', label: 'الملف المصدر' },
                        { id: 'mer', label: 'MER', filterKey: 'mer' as const, optionsKey: 'merList' as const },
                        { id: 'sttl_date', label: 'تاريخ التسوية', title: 'STTL_DATE — تاريخ تسوية المصرف (مثلاً 2026-01-01)' },
                        { id: 'transaction_date', label: 'تاريخ الحركة', title: 'TRANSCATIONDATE — تاريخ ووقت تنفيذ الحركة (مثلاً 2025-12-31)' },
                        { id: 'governorate', label: 'المحافظة', filterKey: 'governorate' as const, optionsKey: 'governorateList' as const },
                        { id: 'directorate', label: 'التفصيل (اسم المديرية)', filterKey: 'directorate_name' as const, optionsKey: 'directorateNameList' as const },
                        { id: 'details', label: 'التفاصيل', title: 'التفاصيل من جدول إدارة التجار (merchant details)' },
                        { id: 'ministry', label: 'الوزارة', filterKey: 'ministry' as const, optionsKey: 'ministryList' as const },
                        { id: 'iban', label: 'IBAN' },
                        { id: 'bank', label: 'المصرف', filterKey: 'bank_display_name' as const, optionsKey: 'bankDisplayNameList' as const },
                        { id: 'message_type', label: 'Message Type', filterKey: 'message_type' as const, optionsKey: 'messageTypeList' as const },
                        { id: 'amount', label: 'amount' },
                        { id: 'fees', label: 'fees', title: 'العمولة المحسوبة (لا تعتمد على fee01 من الملف)' },
                        { id: 'acq', label: 'acq' },
                        { id: 'sttle', label: 'STTLE' },
                        { id: 'card', label: 'البطاقة' },
                        { id: 'mcc', label: 'MCC', filterKey: 'mcc' as const, optionsKey: 'mccList' as const },
                        { id: 'terminal', label: 'نوع الجهاز', filterKey: 'terminal_type' as const, optionsKey: 'terminalTypeList' as const },
                        { id: 'rrn', label: 'RRN' },
                      ].map((col) => (
                        <th key={col.id} className="text-right py-3 px-2 text-sm font-semibold whitespace-nowrap relative text-white" style={{ color: '#ffffff', ...(col.id === 'transaction_date' ? { minWidth: '7.5rem' } : {}) }} title={(col as { title?: string }).title}>
                          <div className="flex items-center justify-end gap-1">
                            <span style={{ color: '#ffffff' }}>{col.label}</span>
                            {col.filterKey && col.optionsKey && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setColumnFilterOpen(columnFilterOpen === col.id ? null : col.id)}
                                  className="p-0.5 rounded hover:bg-white/20 text-white"
                                  style={{ color: '#ffffff' }}
                                  title={`فلتر: ${col.label}`}
                                >
                                  <ChevronDown className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
                                </button>
                                {columnFilterOpen === col.id && (
                                  <ColumnFilterPopover
                                    title={`فلتر: ${col.label}`}
                                    options={(filterOptions[col.optionsKey!] as (string|number)[]) ?? []}
                                    value={filters[col.filterKey!] ?? ''}
                                    onApply={(v) => { handleFilterChange(col.filterKey!, v); setColumnFilterOpen(null); }}
                                    onClose={() => setColumnFilterOpen(null)}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rtgs.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="py-2 px-2 text-sm truncate max-w-[160px]" title={r.source_filename ?? undefined}>{r.source_filename ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.mer ?? '—'}</td>
                        <td className="py-2 px-2 text-sm" dir="ltr" title="تاريخ التسوية (STTL_DATE)">{formatDate(r.sttl_date)}</td>
                        <td className="py-2 px-2 text-sm align-top" dir="ltr" style={{ minWidth: '7.5rem' }} title={`تاريخ الحركة (TRANSCATIONDATE) — RRN: ${r.rrn ?? ''}`}>
                          {(() => {
                            const { datePart, timePart } = formatTransactionDateParts(r.transaction_date);
                            return (
                              <span className="inline-block">
                                <span className="block leading-tight whitespace-nowrap">{datePart}</span>
                                <span className="block text-slate-500 text-xs leading-tight mt-0.5">{timePart}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-2 text-sm">{r.governorate ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.directorate_name ?? '—'}</td>
                        <td className="py-2 px-2 text-sm truncate max-w-[180px]" title={r.merchant_details ?? undefined}>{r.merchant_details ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.ministry ?? '—'}</td>
                        <td className="py-2 px-2 text-sm font-mono" dir="ltr">{r.merchant_iban ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.bank_display_name ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.message_type ?? '—'}</td>
                        <td className="py-2 px-2 text-sm font-medium" style={{ color: (r.amount ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                          {formatNum(r.amount)}
                        </td>
                        <td className="py-2 px-2 text-sm" title="العمولة المحسوبة (المعادلة: MCC، تاريخ التسوية، amount)">{formatNum(r.fees)}</td>
                        <td className="py-2 px-2 text-sm">{formatNum(r.acq)}</td>
                        <td className="py-2 px-2 text-sm font-medium">{formatNum(r.sttle)}</td>
                        <td className="py-2 px-2 text-sm font-mono">{r.card_number_masked ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.mcc ?? '—'}</td>
                        <td className="py-2 px-2 text-sm">{r.terminal_type ?? '—'}</td>
                        <td className="py-2 px-2 text-sm font-mono" dir="ltr">{formatRrn(r.rrn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination — العرض حسب الصفحة لتقليل الاستعلامات */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <div>
                  <p className="text-sm text-slate-600 m-0" dir="ltr">
                    عرض {rtgs.length.toLocaleString('en-US')} من {pagination.total.toLocaleString('en-US')} (حسب الصفحة الحالية)
                  </p>
                  <p className="text-xs text-slate-400 m-0 mt-0.5">العرض حسب الصفحة لتقليل الاستعلامات على قاعدة البيانات</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium px-2" dir="ltr">
                    {pagination.page} / {pagination.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages || 1, p.page + 1) }))}
                    disabled={pagination.page >= (pagination.totalPages || 1)}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* واجهة رفع عدة ملفات — اسم كل ملف ونسبة التحميل */}
      {uploadQueue.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="rounded-2xl w-full max-w-lg overflow-hidden flex flex-col"
            style={{ background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(6, 130, 148, 0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(6, 130, 148, 0.15)' }}>
                  <Upload className="w-6 h-6" style={{ color: '#068294' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold m-0 text-slate-800">رفع ملفات RTGS</h3>
                  <p className="text-sm text-slate-500 m-0 mt-0.5" dir="ltr">
                    {uploadQueue.filter((u) => u.status === 'done' || u.status === 'error').length} / {uploadQueue.length} ملف
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearUploadQueue}
                disabled={importing}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {uploadQueue.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'rgba(6, 130, 148, 0.2)',
                    background: u.status === 'error' ? 'rgba(220, 38, 38, 0.06)' : u.status === 'done' ? 'rgba(34, 197, 94, 0.06)' : 'rgba(248, 250, 252, 0.8)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-slate-800 truncate flex-1 min-w-0" dir="ltr" title={u.fileName}>
                      {u.fileName}
                    </span>
                    <span
                      className="text-sm font-bold tabular-nums shrink-0"
                      style={{
                        color: u.status === 'error' ? '#dc2626' : u.status === 'done' ? '#16a34a' : '#026174',
                      }}
                      dir="ltr"
                    >
                      {u.status === 'pending' && 'في الانتظار'}
                      {u.status === 'uploading' && `${u.progress}%`}
                      {u.status === 'done' && '100% — تم'}
                      {u.status === 'error' && 'فشل'}
                    </span>
                  </div>
                  {(u.status === 'uploading' || u.status === 'pending') && (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${u.status === 'uploading' ? u.progress : 0}%`,
                          background: 'linear-gradient(90deg, #026174, #068294)',
                        }}
                      />
                    </div>
                  )}
                  {u.status === 'done' && u.summary && (
                    <p className="text-xs text-slate-600 m-0 mt-1" dir="ltr">
                      إدخال: {u.summary.inserted_rows.toLocaleString('en-US')} | تخطي: {u.summary.skipped_duplicates.toLocaleString('en-US')} | مرفوض: {u.summary.rejected_rows.toLocaleString('en-US')}
                    </p>
                  )}
                  {u.status === 'error' && u.error && (
                    <p className="text-xs text-red-600 m-0 mt-1">{u.error}</p>
                  )}
                </div>
              ))}
            </div>
            {!importing && (
              <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'rgba(6, 130, 148, 0.2)' }}>
                <button
                  type="button"
                  onClick={clearUploadQueue}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ background: 'linear-gradient(135deg, #026174, #068294)' }}
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة سجل الاستيراد — تصميم محسّن */}
      {/* نافذة تأكيد حذف كل الحركات */}
      {showClearAllConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          style={{ background: 'rgba(2, 97, 116, 0.12)' }}
          onClick={() => setShowClearAllConfirm(false)}
        >
          <div
            className="rounded-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            style={{
              background: '#fff',
              border: '2px solid rgba(6, 130, 148, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(2, 97, 116, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Trash2 className="w-5 h-5 text-white" />
              </span>
              <h3 className="text-lg font-bold m-0 text-white">حذف جميع الحركات</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 m-0 mb-2">
                سيتم حذف <strong dir="ltr">{pagination.total.toLocaleString('en-US')}</strong> حركة RTGS وسجلات الاستيراد بالكامل.
              </p>
              <p className="text-red-600 text-sm font-medium m-0">هذا الإجراء لا يمكن التراجع عنه.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClearAllRtgs}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-colors"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
              >
                حذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف — رسالة من النظام */}
      {deleteConfirmLog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          style={{ background: 'rgba(2, 97, 116, 0.12)' }}
          onClick={() => setDeleteConfirmLog(null)}
        >
          <div
            className="rounded-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            style={{
              background: '#fff',
              border: '2px solid rgba(6, 130, 148, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(2, 97, 116, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Trash2 className="w-5 h-5 text-white" />
              </span>
              <h3 className="text-lg font-bold m-0 text-white">تأكيد الحذف</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 m-0 mb-3">سيتم حذف سجل الاستيراد:</p>
              <p className="font-semibold text-slate-800 m-0 mb-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200" dir="ltr">
                {deleteConfirmLog.filename ?? `سجل #${deleteConfirmLog.id}`}
              </p>
              <p className="text-slate-600 m-0 mb-2">
                وجميع الحركات المرتبطة به ({deleteConfirmLog.inserted_rows.toLocaleString('en-US')} حركة).
              </p>
              <p className="text-amber-600 text-sm font-medium m-0">هذا الإجراء لا يمكن التراجع عنه.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmLog(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-colors"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          style={{ background: 'rgba(2, 97, 116, 0.12)' }}
          onClick={() => setShowLogsModal(false)}
        >
          <div
            className="rounded-2xl w-[min(96vw,1200px)] max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            style={{
              background: '#fff',
              border: '2px solid rgba(6, 130, 148, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(2, 97, 116, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* هيدر بتدرج تيل */}
            <div
              className="flex items-center justify-between px-6 py-5 shrink-0 rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <History className="w-5 h-5 text-white" />
                </span>
                <div>
                  <h3 className="text-xl font-bold m-0 text-white">سجل استيراد RTGS</h3>
                  <p className="text-sm opacity-90 m-0 mt-0.5 text-white/90">
                    عرض الملفات المستوردة، التفاصيل، والوقت المستغرق في الحقن
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-5" style={{ background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)' }}>
              {importLogs.length > 0 && (
                <>
                  <ImportLogKpiCards importLogs={filteredImportLogs} />
                  {/* فلاتر وبحث */}
                  <div
                    className="rounded-xl p-4 mb-4 border border-slate-200/80"
                    style={{ background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-slate-100">
                        <Filter className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">الفلاتر والبحث</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">بحث (الملف / المستخدم)</label>
                        <div className="relative">
                          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="أدخل نص البحث..."
                            value={logFilters.search}
                            onChange={(e) => setLogFilters((f) => ({ ...f, search: e.target.value }))}
                            className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#068294]/30 focus:border-[#068294]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
                        <input
                          type="date"
                          value={logFilters.dateFrom}
                          onChange={(e) => setLogFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
                        <input
                          type="date"
                          value={logFilters.dateTo}
                          onChange={(e) => setLogFilters((f) => ({ ...f, dateTo: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">المستخدم</label>
                        <select
                          value={logFilters.user}
                          onChange={(e) => setLogFilters((f) => ({ ...f, user: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#068294]/30 focus:border-[#068294]"
                        >
                          <option value="">الكل</option>
                          {uniqueUsers.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={clearLogFilters}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        مسح الفلاتر
                      </button>
                    </div>
                  </div>
                </>
              )}
              {importLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(6, 130, 148, 0.1)' }}
                  >
                    <FileSpreadsheet className="w-8 h-8" style={{ color: '#068294' }} />
                  </div>
                  <p className="text-slate-600 font-medium m-0">لا توجد سجلات استيراد بعد</p>
                  <p className="text-sm text-slate-500 mt-1 m-0">قم باستيراد ملف CSV لعرض السجل هنا</p>
                </div>
              ) : filteredImportLogs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-600 font-medium m-0">لا توجد نتائج مطابقة للفلاتر</p>
                  <p className="text-sm text-slate-500 mt-1 m-0">جرب تعديل معايير البحث أو مسح الفلاتر</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200/80" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                  <table className="w-full border-collapse text-sm table-fixed">
                    <thead>
                      <tr style={{ background: 'linear-gradient(90deg, rgba(6,130,148,0.95) 0%, rgba(2,97,116,0.98) 100%)', color: '#fff' }}>
                        <th className="text-right py-3 px-3 font-semibold w-[22%] min-w-[200px]">الملف</th>
                        <th className="text-right py-3 px-3 font-semibold">التاريخ</th>
                        <th className="text-right py-3 px-3 font-semibold">إجمالي</th>
                        <th className="text-right py-3 px-3 font-semibold">إدخال</th>
                        <th className="text-right py-3 px-3 font-semibold">تخطي</th>
                        <th className="text-right py-3 px-3 font-semibold">مرفوض</th>
                        <th className="text-right py-3 px-3 font-semibold">الوقت (ث)</th>
                        <th className="text-right py-3 px-3 font-semibold">المستخدم</th>
                        <th className="text-center py-3 px-3 font-semibold">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredImportLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 truncate" title={log.filename ?? ''} dir="ltr">
                            <span className="text-slate-700 font-medium">{log.filename ?? '—'}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{formatDate(log.created_at)}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{log.total_rows.toLocaleString('en-US')}</td>
                          <td className="py-3 px-3 font-semibold text-emerald-600">{log.inserted_rows.toLocaleString('en-US')}</td>
                          <td className="py-3 px-3 font-semibold text-amber-600">{log.skipped_duplicates.toLocaleString('en-US')}</td>
                          <td className="py-3 px-3 font-semibold text-red-600">{log.rejected_rows.toLocaleString('en-US')}</td>
                          <td className="py-3 px-3" dir="ltr">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: log.duration_ms != null ? 'rgba(6,130,148,0.1)' : 'transparent', color: log.duration_ms != null ? '#026174' : '#94a3b8' }}>
                              {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)} ث` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{log.user_name ?? '—'}</td>
                          <td className="py-3 px-3 text-center">
                            {canDeleteImport && (
                            <button
                              type="button"
                              onClick={() => handleDeleteImportLogClick(log)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-xs font-medium"
                              title="حذف سجل الاستيراد وجميع الحركات المرتبطة به"
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RTGS;
