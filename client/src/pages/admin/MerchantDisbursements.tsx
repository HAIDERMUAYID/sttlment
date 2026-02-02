import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useHasPermission } from '@/hooks/useHasPermission';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/Loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Hash,
  Plus,
  Filter,
  Search,
  Banknote,
  Printer,
  X,
  Calendar,
  ArrowRight,
  LayoutGrid,
  Table2,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MerchantOption {
  id: number;
  merchant_id: string;
  directorate_name: string | null;
  settlement_name: string | null;
  governorate: string | null;
  iban: string | null;
  bank_name: string | null;
}

interface Disbursement {
  id: number;
  merchant_id: number;
  merchant_code: string;
  directorate_name: string | null;
  settlement_name: string | null;
  governorate: string | null;
  transfer_date: string;
  bank_name: string;
  iban: string;
  amount: number;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
}

/** عرض التاريخ بصيغة yyyy-mm-dd */
const formatDate = (d: string | null) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  return s || '—';
};

const formatNum = (n: number) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** صنف موحد لحقل التاريخ — متناسق مع التصميم */
const dateInputClass = 'ds-input w-full py-2.5 pl-4 pr-11 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer';
const dateInputWrapperClass = 'relative flex items-center rounded-xl overflow-hidden border border-slate-200 focus-within:border-[var(--primary-600)] focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:outline-none transition-all';

/** تنسيق قيمة الحوالة مع الفواصل للعرض أثناء الكتابة */
function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  const intPart = parts[0] || '0';
  const decPart = parts[1] != null ? parts[1].slice(0, 2) : '';
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

/** تحويل النص المعروض (مع الفواصل) إلى رقم */
function parseAmountDisplay(display: string): number {
  const cleaned = (display || '').replace(/,/g, '').trim();
  return cleaned === '' ? NaN : parseFloat(cleaned);
}

export function MerchantDisbursements() {
  const { toast } = useToast();
  const canCreateDisbursement = useHasPermission('merchant_disbursements', 'create_disbursement');
  const canUpdateDisbursement = useHasPermission('merchant_disbursements', 'update_disbursement');
  const canDeleteDisbursement = useHasPermission('merchant_disbursements', 'delete_disbursement');
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ total_count: 0, total_amount: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    merchant_id: '',
    bank_name: '',
  });
  const [form, setForm] = useState({
    merchant_id: '',
    transfer_date: '',
    bank_name: '',
    iban: '',
    amount: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Disbursement | null>(null);
  const [editForm, setEditForm] = useState({ transfer_date: '', bank_name: '', iban: '', amount: '', notes: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const fetchMerchants = useCallback(async () => {
    try {
      setMerchantsLoading(true);
      const res = await api.get<{ merchants: MerchantOption[] }>('/merchant-disbursements/merchants-options');
      setMerchants(res.data?.merchants ?? []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل جلب قائمة التجار', variant: 'destructive' });
    } finally {
      setMerchantsLoading(false);
    }
  }, [toast]);

  const fetchList = useCallback(async (opts?: { page?: number }) => {
    try {
      setLoading(true);
      const page = opts?.page ?? pagination.page;
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pagination.limit));
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.merchant_id) params.set('merchant_id', filters.merchant_id);
      if (filters.bank_name.trim()) params.set('bank_name', filters.bank_name.trim());
      const res = await api.get<{ disbursements: Disbursement[]; pagination: { page: number; limit: number; total: number } }>(
        `/merchant-disbursements?${params.toString()}`
      );
      setDisbursements(res.data?.disbursements ?? []);
      if (res.data?.pagination) setPagination((p) => ({ ...p, ...res.data!.pagination }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل جلب السجلات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, toast]);

  const fetchKpi = useCallback(async () => {
    try {
      setKpiLoading(true);
      const params = new URLSearchParams();
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.merchant_id) params.set('merchant_id', filters.merchant_id);
      if (filters.bank_name.trim()) params.set('bank_name', filters.bank_name.trim());
      const res = await api.get<{ total_count: number; total_amount: number }>(`/merchant-disbursements/kpi?${params.toString()}`);
      setKpi({ total_count: res.data?.total_count ?? 0, total_amount: res.data?.total_amount ?? 0 });
    } catch {
      setKpi({ total_count: 0, total_amount: 0 });
    } finally {
      setKpiLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  useEffect(() => {
    fetchList();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchKpi();
  }, []);

  const applyFilters = () => {
    setPagination((p) => ({ ...p, page: 1 }));
    fetchList({ page: 1 });
    fetchKpi();
  };

  const clearFilters = useCallback(async () => {
    setFilters({ date_from: '', date_to: '', merchant_id: '', bank_name: '' });
    setPagination((p) => ({ ...p, page: 1 }));
    try {
      setLoading(true);
      setKpiLoading(true);
      const params = new URLSearchParams({ page: '1', limit: String(pagination.limit) });
      const [listRes, kpiRes] = await Promise.all([
        api.get<{ disbursements: Disbursement[]; pagination: { page: number; limit: number; total: number } }>(
          `/merchant-disbursements?${params.toString()}`
        ),
        api.get<{ total_count: number; total_amount: number }>('/merchant-disbursements/kpi'),
      ]);
      setDisbursements(listRes.data?.disbursements ?? []);
      if (listRes.data?.pagination) setPagination((p) => ({ ...p, ...listRes.data!.pagination }));
      setKpi({ total_count: kpiRes.data?.total_count ?? 0, total_amount: kpiRes.data?.total_amount ?? 0 });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل جلب السجلات', variant: 'destructive' });
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }, [pagination.limit, toast]);

  const hasActiveFilters =
    !!filters.date_from || !!filters.date_to || !!filters.merchant_id || !!filters.bank_name.trim();

  const handlePrint = () => setReportOpen(true);
  const closeReport = () => setReportOpen(false);

  const printReportWindow = () => {
    const el = reportContentRef.current ?? document.querySelector<HTMLDivElement>('#disbursements-report-print .disbursements-report-content');
    if (!el) {
      window.print();
      return;
    }
    const origin = window.location.origin;
    let html = el.innerHTML.trim();
    if (!html || html.length < 100) {
      window.print();
      return;
    }
    html = html.replace(/src="\//g, `src="${origin}/`);
    const printWin = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWin) {
      window.print();
      return;
    }
    const styles = `
      @page { size: A4; margin: 15mm 0; }
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 16px 0; font-family: 'Cairo', 'Segoe UI', sans-serif; direction: rtl; font-size: 14px; color: #0f172a; background: #fff; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .disbursements-report-content { max-width: 100%; padding: 0; margin: 0; }
      article { padding: 0; margin: 0; overflow: visible; }
      .report-print-header { background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; padding: 20px 24px; margin-bottom: 24px; border-radius: 12px; }
      .report-print-header h1, .report-print-header p, .report-print-header span { color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
      .report-print-period { background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.4); padding: 12px 20px; font-weight: 600; color: #ffffff !important; font-size: 0.9rem; border-radius: 6px; margin-top: 12px; }
      section { margin-bottom: 28px; page-break-inside: avoid; overflow: visible; }
      section h2 { page-break-after: avoid; font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #0d9488; }
      table { width: 100%; border-collapse: collapse; direction: rtl; table-layout: fixed; font-size: 0.8rem; page-break-inside: auto; }
      th, td { min-width: 0; box-sizing: border-box; }
      table.print-cols-8 th:nth-child(1), table.print-cols-8 td:nth-child(1) { width: 14%; }
      table.print-cols-8 th:nth-child(2), table.print-cols-8 td:nth-child(2) { width: 10%; }
      table.print-cols-8 th:nth-child(3), table.print-cols-8 td:nth-child(3) { width: 12%; }
      table.print-cols-8 th:nth-child(4), table.print-cols-8 td:nth-child(4) { width: 18%; }
      table.print-cols-8 th:nth-child(5), table.print-cols-8 td:nth-child(5) { width: 12%; }
      table.print-cols-8 th:nth-child(6), table.print-cols-8 td:nth-child(6) { width: 12%; }
      table.print-cols-8 th:nth-child(7), table.print-cols-8 td:nth-child(7) { width: 12%; }
      table.print-cols-8 th:nth-child(8), table.print-cols-8 td:nth-child(8) { width: 10%; }
      thead { display: table-header-group; }
      thead tr, .report-table-head, .table-header-dark { display: table-row; background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; }
      thead th, .report-table-head th, .table-header-dark th { display: table-cell; padding: 10px; text-align: right; vertical-align: middle; font-weight: 700; color: #ffffff !important; background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; border: 1px solid rgba(255,255,255,0.2); font-size: 0.85rem; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
      tbody td { display: table-cell; }
      tbody tr { page-break-inside: avoid; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      tbody td { padding: 10px; text-align: right; vertical-align: middle; border: 1px solid #e2e8f0; color: #334155; }
      tbody td[dir="ltr"] { direction: ltr; text-align: right; }
      footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #cbd5e1; page-break-inside: avoid; display: flex; justify-content: flex-end; direction: rtl; }
      footer p { display: none !important; }
      footer img { margin-right: auto; margin-left: 0; }
      img { max-width: 100%; height: auto; }
    `;
    printWin.document.open();
    printWin.document.write(
      `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><base href="${origin}/"><title> </title><style>${styles}</style></head><body></body></html>`
    );
    printWin.document.close();
    printWin.document.body.innerHTML = html;
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.onafterprint = () => printWin.close();
    }, 500);
  };

  const onSelectMerchant = (merchantId: string) => {
    const m = merchants.find((x) => String(x.id) === merchantId);
    setForm((f) => ({
      ...f,
      merchant_id: merchantId,
      iban: m?.iban ?? f.iban,
      bank_name: m?.bank_name ?? f.bank_name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.merchant_id || !form.transfer_date || !form.bank_name.trim() || !form.iban.trim() || !form.amount.trim()) {
      toast({ title: 'تنبيه', description: 'مطلوب: التاجر، تاريخ الحوالة، المصرف، رقم IBAN، وقيمة الحوالة', variant: 'destructive' });
      return;
    }
    const num = parseAmountDisplay(form.amount);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'تنبيه', description: 'قيمة الحوالة يجب أن تكون رقماً موجباً', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/merchant-disbursements', {
        merchant_id: parseInt(form.merchant_id, 10),
        transfer_date: form.transfer_date,
        bank_name: form.bank_name.trim(),
        iban: form.iban.trim(),
        amount: num,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: 'تم', description: 'تم تسجيل الحوالة بنجاح' });
      setForm({ merchant_id: '', transfer_date: '', bank_name: '', iban: '', amount: '', notes: '' });
      fetchList();
      fetchKpi();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل تسجيل الحوالة', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  /** مفتاح تفرد التاجر: الاسم فقط (نفس التاجر قد يكون له أكثر من merchant_id) */
  const nameKey = (m: MerchantOption) =>
    `${(m.directorate_name || m.settlement_name || '').trim()}|${m.governorate || ''}`;

  const merchantLabel = (m: MerchantOption) => {
    if (m.id === 0 && (m as MerchantOption & { _all?: boolean })._all) return 'الكل';
    const name = (m.directorate_name || m.settlement_name || '—').trim();
    const gov = m.governorate ? ` (${m.governorate})` : '';
    return `${name}${gov}`;
  };

  const getMerchantOptionValue = (m: MerchantOption & { _all?: boolean }) =>
    (m as MerchantOption & { _all?: boolean })._all ? '' : String(m.id);

  const openEdit = (row: Disbursement) => {
    setEditingRow(row);
    setEditForm({
      transfer_date: row.transfer_date || '',
      bank_name: row.bank_name || '',
      iban: row.iban || '',
      amount: formatNum(row.amount),
      notes: row.notes || '',
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingRow(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    if (!editForm.transfer_date || !editForm.bank_name.trim() || !editForm.iban.trim() || !editForm.amount.trim()) {
      toast({ title: 'تنبيه', description: 'مطلوب: تاريخ الحوالة، المصرف، رقم IBAN، وقيمة الحوالة', variant: 'destructive' });
      return;
    }
    const num = parseAmountDisplay(editForm.amount);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'تنبيه', description: 'قيمة الحوالة يجب أن تكون رقماً موجباً', variant: 'destructive' });
      return;
    }
    try {
      setEditSubmitting(true);
      await api.put(`/merchant-disbursements/${editingRow.id}`, {
        merchant_id: editingRow.merchant_id,
        transfer_date: editForm.transfer_date,
        bank_name: editForm.bank_name.trim(),
        iban: editForm.iban.trim(),
        amount: num,
        notes: editForm.notes.trim() || undefined,
      });
      toast({ title: 'تم', description: 'تم تعديل الحوالة بنجاح' });
      closeEdit();
      fetchList();
      fetchKpi();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل تعديل الحوالة', variant: 'destructive' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);

  const handleDeleteConfirm = async () => {
    if (deleteId == null) return;
    try {
      setDeleteSubmitting(true);
      await api.delete(`/merchant-disbursements/${deleteId}`);
      toast({ title: 'تم', description: 'تم حذف الحوالة' });
      setDeleteId(null);
      fetchList();
      fetchKpi();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل حذف الحوالة', variant: 'destructive' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /** تجار فريدون بالاسم فقط — حوالة واحدة لتاجر واحد */
  const uniqueMerchants = useMemo(() => {
    const byName = new Map<string, MerchantOption>();
    (merchants || []).forEach((m) => {
      const k = nameKey(m);
      if (!byName.has(k)) byName.set(k, m);
    });
    return Array.from(byName.values()).sort((a, b) =>
      merchantLabel(a).localeCompare(merchantLabel(b), 'ar')
    );
  }, [merchants]);

  const filterMerchantOptions = useMemo(() => {
    const allOption: MerchantOption & { _all?: boolean } = {
      id: 0,
      merchant_id: '',
      directorate_name: null,
      settlement_name: null,
      governorate: null,
      iban: null,
      bank_name: null,
      _all: true,
    };
    return [allOption, ...uniqueMerchants];
  }, [uniqueMerchants]);

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      }}
    >
      <div className="mx-auto print:max-w-none" style={{ maxWidth: '1400px' }}>
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
            <h1 className="text-2xl font-bold m-0 text-white">صرف مستحقات التجار</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              تسجيل حوالات مستحقات التجار — اختيار التاجر، تاريخ الحوالة، المصرف، IBAN، وقيمة الحوالة
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
            <Link
              to="/rtgs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] hover:bg-white/95 transition-colors shadow"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى RTGS
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'عدد الحوالات', value: kpiLoading ? '—' : kpi.total_count.toLocaleString('ar-EG') },
            { label: 'إجمالي قيمة الحوالات (IQD)', value: kpiLoading ? '—' : formatNum(kpi.total_amount) },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl p-5 border-2 relative overflow-hidden" style={{ borderColor: 'var(--border-card)', background: 'var(--surface)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
              <div className="absolute inset-y-0 start-0 w-1 rounded-s-2xl opacity-80" style={{ background: i === 0 ? 'linear-gradient(180deg, #068294 0%, #026174 100%)' : 'linear-gradient(180deg, #059669 0%, #047857 100%)' }} />
              <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
              <p className="text-xl font-extrabold m-0 tabular-nums" style={{ color: 'var(--text-strong)' }} dir="ltr">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className="rounded-2xl p-5 mb-6 overflow-hidden print:break-inside-avoid"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '2px solid var(--border-card)',
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100">
                <Filter className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-base font-semibold text-slate-700">الفلاتر — سجل الحوالات</span>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ds-btn ds-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              إلغاء الفلاتر
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="ds-input w-full pl-3 pr-10 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="ds-input w-full pl-3 pr-10 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">التاجر</label>
              <SearchableSelect<MerchantOption & { _all?: boolean }>
                value={filters.merchant_id}
                onChange={(v) => setFilters((f) => ({ ...f, merchant_id: v }))}
                options={filterMerchantOptions}
                getOptionValue={getMerchantOptionValue}
                getOptionLabel={merchantLabel}
                placeholder="الكل"
                searchPlaceholder="ابحث باسم التاجر..."
                className="rounded-xl border border-slate-200 transition-shadow focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:border-[var(--primary-600)]"
                disabled={merchantsLoading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">المصرف</label>
              <input
                type="text"
                placeholder="بحث بالمصرف"
                value={filters.bank_name}
                onChange={(e) => setFilters((f) => ({ ...f, bank_name: e.target.value }))}
                className="ds-input w-full py-2 px-3"
              />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={applyFilters} className="ds-btn ds-btn-primary w-full py-2 px-5">
                <Search className="w-4 h-4 inline-block ms-1" />
                تطبيق الفلتر
              </button>
            </div>
          </div>
        </div>

        {canCreateDisbursement && (
        <div
          className="rounded-2xl mb-6 overflow-hidden print:break-inside-avoid"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '2px solid var(--border-card)',
          }}
        >
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <Plus className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
            <span className="font-bold text-base" style={{ color: 'var(--text-strong)' }}>تسجيل حوالة جديدة</span>
          </div>
          <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">التاجر <span className="text-red-500">*</span></label>
              <SearchableSelect<MerchantOption>
                value={form.merchant_id}
                onChange={onSelectMerchant}
                options={uniqueMerchants}
                getOptionValue={(m) => String(m.id)}
                getOptionLabel={merchantLabel}
                placeholder="اختر التاجر"
                searchPlaceholder="ابحث باسم التاجر..."
                className="rounded-xl border border-slate-200 transition-shadow focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:border-[var(--primary-600)]"
                disabled={merchantsLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ الحوالة <span className="text-red-500">*</span></label>
              <div className={dateInputWrapperClass}>
                <input type="date" required value={form.transfer_date} onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))} className={dateInputClass} />
                <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl"><Calendar className="w-5 h-5" strokeWidth={2} /></span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">إلى أي مصرف <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="اسم المصرف" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} className="ds-input w-full py-2.5 px-4" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">رقم IBAN <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="IQ..." value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="ds-input w-full py-2.5 px-4 font-mono" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">قيمة الحوالة <span className="text-red-500">*</span></label>
              <input type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: formatAmountDisplay(e.target.value) }))} className="ds-input w-full py-2.5 px-4 font-medium tabular-nums" dir="ltr" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">ملاحظات</label>
              <input type="text" placeholder="اختياري" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="ds-input w-full py-2.5 px-4" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={submitting} className="ds-btn ds-btn-primary px-6 py-2.5 disabled:opacity-50">{submitting ? 'جاري الحفظ...' : 'تسجيل الحوالة'}</button>
            </div>
          </form>
        </div>
        )}

        {/* Table / Cards */}
        <div
          className="rounded-2xl overflow-hidden print:break-inside-avoid"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '2px solid var(--border-card)' }}
        >
          <div className="rounded-t-2xl p-5 border-b flex flex-wrap items-center justify-between gap-3" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderColor: 'var(--border-card)' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>سجلات الحوالات</h2>
            <button type="button" onClick={handlePrint} className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2 print:hidden"><Printer className="w-4 h-4" /> طباعة</button>
          </div>
          {loading ? (
            <div className="p-16 flex justify-center"><Loading message="جاري تحميل السجلات..." /></div>
          ) : disbursements.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
                <Wallet className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>لا توجد سجلات حوالات</p>
              <p className="text-sm mt-2 m-0" style={{ color: 'var(--text-muted)' }}>استخدم الفلتر أو سجّل حوالة جديدة</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {disbursements.map((row, index) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.03, y: -6, zIndex: 20, boxShadow: '0 20px 40px rgba(2, 97, 116, 0.18), 0 0 0 1px rgba(8, 131, 149, 0.2)', transition: { duration: 0.3 } }}
                      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-default"
                      style={{ background: 'var(--surface)', border: '2px solid var(--border-card)', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                    >
                      <div className="card-shine-hover absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl" />
                      <div className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300" style={{ right: 0, background: 'linear-gradient(180deg, #068294 0%, #026174 100%)' }} />
                      <div className="p-5 flex flex-col gap-3">
                        <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>{row.directorate_name || row.settlement_name || row.merchant_code}{row.governorate ? ` (${row.governorate})` : ''}</h3>
                        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(2, 97, 116, 0.04)', border: '1px solid var(--border)' }}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>تاريخ الحوالة</span><span className="tabular-nums" dir="ltr">{formatDate(row.transfer_date)}</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>المصرف</span><span>{row.bank_name}</span></div>
                            <div className="flex justify-between col-span-2"><span style={{ color: 'var(--text-muted)' }}>IBAN</span><span className="font-mono tabular-nums" dir="ltr">{row.iban}</span></div>
                            <div className="flex justify-between col-span-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>القيمة</span><span className="tabular-nums font-bold" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.amount)} IQD</span></div>
                          </div>
                        </div>
                        {row.notes && <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>{row.notes}</p>}
                        {(canUpdateDisbursement || canDeleteDisbursement) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            {canUpdateDisbursement && (
                              <button type="button" onClick={() => openEdit(row)} className="ds-btn ds-btn-outline flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm">
                                <Pencil className="w-3.5 h-3.5" /> تعديل
                              </button>
                            )}
                            {canDeleteDisbursement && (
                              <button type="button" onClick={() => handleDeleteClick(row.id)} className="ds-btn ds-btn-outline flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.created_by_name || '—'}</span>
                          <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-12 w-auto object-contain opacity-90" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between px-4 py-4 mt-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
                  <p className="text-sm font-medium m-0" style={{ color: 'var(--text-muted)' }} dir="ltr">عرض {disbursements.length} من {pagination.total}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="ds-btn ds-btn-outline p-2.5 rounded-lg disabled:opacity-40">السابق</button>
                    <button type="button" disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="ds-btn ds-btn-outline p-2.5 rounded-lg disabled:opacity-40">التالي</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto overflow-y-visible" style={{ isolation: 'isolate' }}>
                <table className="ds-table w-full" style={{ minWidth: '760px', borderCollapse: 'separate', borderSpacing: 0 }} dir="rtl">
                  <thead>
                    <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                      <th className="text-end py-4 px-4 font-bold text-white">التاجر</th>
                      <th className="text-end py-4 px-4 font-bold text-white">تاريخ الحوالة</th>
                      <th className="text-end py-4 px-4 font-bold text-white">المصرف</th>
                      <th className="text-end py-4 px-4 font-bold text-white">IBAN</th>
                      <th className="text-end py-4 px-4 font-bold text-white">القيمة</th>
                      <th className="text-end py-4 px-4 font-bold text-white">ملاحظات</th>
                      <th className="text-end py-4 px-4 font-bold text-white">تاريخ الإدخال</th>
                      <th className="text-end py-4 px-4 font-bold text-white">المستخدم</th>
                      {(canUpdateDisbursement || canDeleteDisbursement) && <th className="text-end py-4 px-4 font-bold text-white">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {disbursements.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-shadow duration-200">
                        <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{row.directorate_name || row.settlement_name || row.merchant_code}{row.governorate ? ` (${row.governorate})` : ''}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(row.transfer_date)}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{row.bank_name}</td>
                        <td className="py-3 px-4 font-mono" style={{ color: 'var(--text)' }} dir="ltr">{row.iban}</td>
                        <td className="py-3 px-4 font-semibold tabular-nums" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(row.amount)}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }}>{row.notes || '—'}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }} dir="ltr">{formatDate(row.created_at)}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }}>{row.created_by_name || '—'}</td>
                        {(canUpdateDisbursement || canDeleteDisbursement) && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {canUpdateDisbursement && (
                                <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-slate-200 transition-colors" title="تعديل" aria-label="تعديل">
                                  <Pencil className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
                                </button>
                              )}
                              {canDeleteDisbursement && (
                                <button type="button" onClick={() => handleDeleteClick(row.id)} className="p-2 rounded-lg hover:bg-red-100 transition-colors" title="حذف" aria-label="حذف">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.total > pagination.limit && (
                <div className="px-4 py-3 border-t flex justify-between items-center text-sm" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                  <span style={{ color: 'var(--text-muted)' }} dir="ltr">عرض {disbursements.length} من {pagination.total}</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="ds-btn ds-btn-outline px-3 py-2 rounded-lg disabled:opacity-50">السابق</button>
                    <button type="button" disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="ds-btn ds-btn-outline px-3 py-2 rounded-lg disabled:opacity-50">التالي</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* نافذة تعديل الحوالة */}
        <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
          <DialogContent className="max-w-lg rounded-2xl p-6 sm:p-8" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>تعديل الحوالة</DialogTitle>
            </DialogHeader>
            {editingRow && (
              <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">التاجر</label>
                  <p className="text-sm py-2 px-3 rounded-xl bg-slate-100" style={{ color: 'var(--text)' }}>
                    {editingRow.directorate_name || editingRow.settlement_name || editingRow.merchant_code}
                    {editingRow.governorate ? ` (${editingRow.governorate})` : ''}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">تاريخ الحوالة *</label>
                  <div className={dateInputWrapperClass}>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none opacity-60" />
                    <input type="date" value={editForm.transfer_date} onChange={(e) => setEditForm((f) => ({ ...f, transfer_date: e.target.value }))} className={dateInputClass} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">اسم المصرف *</label>
                  <input type="text" value={editForm.bank_name} onChange={(e) => setEditForm((f) => ({ ...f, bank_name: e.target.value }))} className="ds-input w-full py-2.5 px-4" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">رقم IBAN *</label>
                  <input type="text" value={editForm.iban} onChange={(e) => setEditForm((f) => ({ ...f, iban: e.target.value }))} className="ds-input w-full py-2.5 px-4 font-mono" dir="ltr" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">قيمة الحوالة *</label>
                  <input type="text" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: formatAmountDisplay(e.target.value) }))} placeholder="0" className="ds-input w-full py-2.5 px-4" dir="ltr" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ملاحظات</label>
                  <input type="text" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="اختياري" className="ds-input w-full py-2.5 px-4" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={closeEdit} className="ds-btn ds-btn-outline px-4 py-2.5 rounded-xl">إلغاء</button>
                  <button type="submit" disabled={editSubmitting} className="ds-btn ds-btn-primary px-4 py-2.5 rounded-xl disabled:opacity-50">{editSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* تأكيد حذف الحوالة */}
        <Dialog open={deleteId != null} onOpenChange={(open) => !open && cancelDelete()}>
          <DialogContent className="max-w-sm rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>حذف الحوالة</DialogTitle>
            </DialogHeader>
            <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>هل أنت متأكد من حذف هذه الحوالة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={cancelDelete} className="ds-btn ds-btn-outline px-4 py-2.5 rounded-xl">إلغاء</button>
              <button type="button" onClick={handleDeleteConfirm} disabled={deleteSubmitting} className="ds-btn px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{deleteSubmitting ? 'جاري الحذف...' : 'حذف'}</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* نافذة تقرير صرف مستحقات التجار — للطباعة (شعار + تفاصيل + ختم) */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 print:bg-white print:p-0 backdrop-blur-sm" onClick={closeReport}>
            <div className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none" style={{ background: 'var(--surface)', border: '2px solid var(--border-card)' }} onClick={(e) => e.stopPropagation()} id="disbursements-report-print">
              <div ref={reportContentRef} className="disbursements-report-content p-6 print:p-0 max-w-4xl mx-auto">
                <article className="bg-white rounded-2xl shadow-xl print:shadow-none print:rounded-none overflow-hidden print:overflow-visible min-h-[50vh] print:min-h-0">
                  <div className="p-8 print:py-8 print:px-0" style={{ background: 'var(--bg, #f6fafb)' }}>
                    {/* رأس التقرير — شعار + عنوان + شريط معلومات */}
                    <header className="report-print-header text-center mb-10 pt-6 pb-6 px-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/40 shadow-md flex items-center justify-center p-2">
                          <img src="/logo.png" alt="شعار الشركة" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold m-0 tracking-tight text-white">تقرير صرف مستحقات التجار</h1>
                          <p className="text-white/95 mt-2 m-0 text-base font-semibold">شركة الساقي لخدمات الدفع الإلكتروني</p>
                          <p className="text-white/90 font-bold mt-0.5 m-0 text-sm">قسم التسويات والمطابقات</p>
                        </div>
                      </div>
                      <div className="report-print-period inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3 px-6 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}>
                        <span className="text-white">الفترة: <span className="font-bold" dir="ltr">{filters.date_from ? formatDate(filters.date_from) : '—'} — {filters.date_to ? formatDate(filters.date_to) : '—'}</span></span>
                        <span className="text-white/95" dir="ltr">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </header>

                    <section className="mb-10">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>
                        <Hash className="w-5 h-5" style={{ color: 'var(--primary-600)' }} /> مؤشرات الأداء
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'عدد الحوالات', value: kpi.total_count.toLocaleString('ar-EG'), accent: 'linear-gradient(135deg, #068294 0%, #026174 100%)', primary: false },
                          { label: 'إجمالي قيمة الحوالات (IQD)', value: formatNum(kpi.total_amount), accent: 'linear-gradient(135deg, #059669 0%, #047857 100%)', primary: true },
                        ].map((k, i) => (
                          <div key={i} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                            <div className="absolute inset-y-0 start-0 w-1 rounded-s-2xl opacity-80" style={{ background: k.accent }} />
                            <p className="text-xs font-semibold uppercase tracking-wider m-0 mb-2" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
                            <p className="text-2xl font-bold m-0 tabular-nums" dir="ltr" style={{ color: k.primary ? 'var(--primary-800)' : 'var(--text-strong)' }}>{k.value}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="mb-10 print:break-inside-avoid" dir="rtl">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>سجلات الحوالات</h2>
                      <div className="overflow-x-auto rounded-2xl print:shadow-none" style={{ border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                        <table className="w-full border-collapse text-sm print-cols-8 ds-table" dir="rtl" role="grid">
                          <thead>
                            <tr className="table-header-dark report-table-head" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">التاجر</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">تاريخ الحوالة</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">المصرف</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">IBAN</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">القيمة</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">ملاحظات</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">تاريخ الإدخال</th>
                              <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">المستخدم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disbursements.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-slate-500 bg-slate-50">لا توجد سجلات حوالات للفترة المحددة.</td>
                              </tr>
                            ) : (
                              disbursements.map((row) => (
                                <tr key={row.id} className="bg-white even:bg-slate-50/50">
                                  <td className="text-right py-3 px-3 border-b border-slate-100">{row.directorate_name || row.settlement_name || row.merchant_code}{row.governorate ? ` (${row.governorate})` : ''}</td>
                                  <td className="text-right py-3 px-3 border-b border-slate-100" dir="ltr">{formatDate(row.transfer_date)}</td>
                                  <td className="text-right py-3 px-3 border-b border-slate-100">{row.bank_name}</td>
                                  <td className="text-right py-3 px-3 font-mono border-b border-slate-100" dir="ltr">{row.iban}</td>
                                  <td className="text-right py-3 px-3 tabular-nums font-semibold text-teal-700 border-b border-slate-100" dir="ltr">{formatNum(row.amount)}</td>
                                  <td className="text-right py-3 px-3 border-b border-slate-100">{row.notes || '—'}</td>
                                  <td className="text-right py-3 px-3 border-b border-slate-100" dir="ltr">{formatDate(row.created_at)}</td>
                                  <td className="text-right py-3 px-3 border-b border-slate-100">{row.created_by_name || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <footer className="mt-12 pt-8 pb-4 rounded-2xl px-8 -mx-8 print:mx-0 print:px-0 print:rounded-none print:flex print:justify-end print:items-end" dir="rtl" style={{ borderTop: '2px solid var(--border-card)' }}>
                      <p className="text-sm font-bold mb-4 print:hidden" style={{ color: 'var(--text-strong)' }}>ختم قسم التسويات والمطابقات</p>
                      <img src="/stamp-settlement-reconciliation.png" alt="ختم قسم التسويات والمطابقات" className="h-32 w-auto object-contain mx-auto print:h-36 print:mx-0 print:mr-auto print:ml-0 opacity-90" />
                    </footer>
                  </div>
                </article>
              </div>
              <div className="sticky bottom-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 print:hidden">
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
                  <p className="text-sm font-medium text-amber-900 m-0">لطباعة التقرير بدون ترويسة أو تذييل المتصفح:</p>
                  <p className="text-sm text-amber-800 m-0 mt-1">في نافذة الطباعة اضغط «المزيد من الإعدادات» ثم أزل تحديد «الترويسات والتذييلات».</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={closeReport} className="ds-btn ds-btn-outline px-4 py-2">إغلاق</button>
                  <button type="button" onClick={printReportWindow} className="ds-btn ds-btn-primary px-4 py-2 inline-flex items-center gap-2">
                    <Printer className="w-4 h-4" /> طباعة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
