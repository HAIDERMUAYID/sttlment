import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useHasPermission } from '@/hooks/useHasPermission';
import {
  Building2,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

type SettlementMapRow = {
  id: number;
  inst_id: string;
  system_key: string | null;
  display_name_ar: string;
  created_at?: string;
};

export function RtgsBankMaps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canImport = useHasPermission('rtgs', 'import');

  const [instId, setInstId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [systemKey, setSystemKey] = useState('');
  const [editing, setEditing] = useState<SettlementMapRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettlementMapRow | null>(null);

  const mapsQuery = useQuery({
    queryKey: ['rtgs-settlement-maps'],
    queryFn: async () => {
      const res = await api.get<SettlementMapRow[]>('/rtgs/settlement-maps');
      return res.data ?? [];
    },
  });

  const unmappedQuery = useQuery({
    queryKey: ['rtgs-unmapped-inst-codes'],
    queryFn: async () => {
      const res = await api.get<string[]>('/rtgs/unmapped-inst-codes');
      return res.data ?? [];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['rtgs-settlement-maps'] });
    queryClient.invalidateQueries({ queryKey: ['rtgs-unmapped-inst-codes'] });
    queryClient.invalidateQueries({ queryKey: ['rtgs'] });
    queryClient.invalidateQueries({ queryKey: ['rtgs-filter-options'] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<SettlementMapRow>('/rtgs/settlement-maps', {
        inst_id: instId.trim(),
        display_name_ar: displayName.trim(),
        system_key: systemKey.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      setInstId('');
      setDisplayName('');
      setSystemKey('');
      invalidateAll();
      toast({ title: 'تم الحفظ', description: 'تمت إضافة أو تحديث تعريف المصرف' });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ',
        description: ax.response?.data?.error ?? 'فشل الحفظ',
        variant: 'destructive',
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editing) return null;
      const res = await api.put<SettlementMapRow>(`/rtgs/settlement-maps/${editing.id}`, {
        display_name_ar: displayName.trim(),
        system_key: systemKey.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      setEditing(null);
      setInstId('');
      setDisplayName('');
      setSystemKey('');
      invalidateAll();
      toast({ title: 'تم التحديث', description: 'تم حفظ التعديلات' });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ',
        description: ax.response?.data?.error ?? 'فشل التحديث',
        variant: 'destructive',
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/rtgs/settlement-maps/${id}`);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      invalidateAll();
      toast({ title: 'تم الحذف', description: 'تم حذف تعريف المصرف' });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: 'خطأ',
        description: ax.response?.data?.error ?? 'فشل الحذف',
        variant: 'destructive',
      });
    },
  });

  const startEdit = (row: SettlementMapRow) => {
    setEditing(row);
    setInstId(row.inst_id);
    setDisplayName(row.display_name_ar);
    setSystemKey(row.system_key ?? '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setInstId('');
    setDisplayName('');
    setSystemKey('');
  };

  const maps = mapsQuery.data ?? [];
  const unmapped = unmappedQuery.data ?? [];

  return (
    <div
      className="min-h-screen"
      style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(180deg, var(--bg, #f6fafb) 0%, #e2e8f0 100%)',
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div
          className="page-header-teal rounded-xl flex flex-wrap items-center justify-between gap-4 p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, var(--primary-800, #026174) 0%, var(--primary-600, #068294) 100%)',
            color: '#ffffff',
            boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(2, 97, 116, 0.35))',
          }}
        >
          <div>
            <h1 className="text-2xl font-bold m-0 text-white">تعريف مصارف RTGS</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              ربط عمود <span dir="ltr">INST_ID2</span> في ملف CSV باسم المصرف المعروض في النظام والتقارير.
            </p>
          </div>
          <Link
            to="/rtgs"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            العودة إلى RTGS
          </Link>
        </div>

        <div
          className="rounded-xl border p-5 mb-6 bg-white"
          style={{ borderColor: 'var(--border-card, #cbd5e1)', boxShadow: 'var(--shadow-card, 0 6px 18px rgba(15,23,42,0.08))' }}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--info, #0ea5e9)' }} />
            <p className="text-sm m-0 leading-relaxed" style={{ color: 'var(--text, #1e293b)' }}>
              الاستيراد لا يفشل بسبب مصرف غير معروف؛ الحركات تُخزَّن لكن اسم المصرف يظهر فارغاً حتى تُعرّف الكود هنا.
              أضف سطراً لكل قيمة جديدة في <span dir="ltr">INST_ID2</span> تظهر في ملفاتكم.
            </p>
          </div>

          {!unmappedQuery.isLoading && unmapped.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold m-0 mb-2" style={{ color: 'var(--text-muted, #475569)' }}>
                أكواد وردت في جدول RTGS بلا تعريف (انقر لنسخ الكود في النموذج):
              </p>
              <div className="flex flex-wrap gap-2">
                {unmapped.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={!canImport}
                    onClick={() => {
                      setInstId(code);
                      if (editing) cancelEdit();
                    }}
                    className="px-2.5 py-1 rounded-lg text-sm font-mono border transition-colors disabled:opacity-50"
                    style={{
                      borderColor: 'var(--border, #e2e8f0)',
                      background: 'var(--surface-2, #f1f5f9)',
                      color: 'var(--text-strong, #0f172a)',
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
              <Building2 className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              {editing ? 'تعديل تعريف' : 'إضافة تعريف جديد'}
            </h2>
            <button
              type="button"
              className="ds-btn-outline inline-flex items-center gap-1.5 text-sm py-1.5 px-3"
              onClick={() => {
                mapsQuery.refetch();
                unmappedQuery.refetch();
              }}
              disabled={mapsQuery.isFetching || unmappedQuery.isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${mapsQuery.isFetching || unmappedQuery.isFetching ? 'animate-spin' : ''}`} />
              تحديث القوائم
            </button>
          </div>

          {editing && (
            <p className="text-xs m-0 mb-2" style={{ color: 'var(--text-muted)' }}>
              الكود: <span className="font-mono font-semibold" dir="ltr">{editing.inst_id}</span> (لا يمكن تغييره من هنا؛ احذف السجل وأعد الإضافة إن لزم)
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className={editing ? 'md:col-span-1 opacity-60 pointer-events-none' : 'md:col-span-1'}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-strong)' }}>
                رمز المؤسسة (INST_ID2)
              </label>
              <input
                className="ds-input w-full font-mono text-sm"
                dir="ltr"
                value={instId}
                onChange={(e) => setInstId(e.target.value)}
                placeholder="مثال: 1664"
                disabled={!!editing || !canImport}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-strong)' }}>
                اسم المصرف (عربي)
              </label>
              <input
                className="ds-input w-full text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: المصرف العراقي للتجارة"
                disabled={!canImport}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                مفتاح النظام (اختياري)
              </label>
              <input
                className="ds-input w-full text-sm font-mono"
                dir="ltr"
                value={systemKey}
                onChange={(e) => setSystemKey(e.target.value)}
                placeholder="معرّف داخلي"
                disabled={!canImport}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="ds-btn-primary inline-flex items-center gap-2 text-sm"
                  disabled={!canImport || updateMut.isPending}
                  onClick={() => updateMut.mutate()}
                >
                  حفظ التعديل
                </button>
                <button type="button" className="ds-btn-ghost text-sm" onClick={cancelEdit} disabled={updateMut.isPending}>
                  إلغاء
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ds-btn-primary inline-flex items-center gap-2 text-sm"
                disabled={!canImport || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                <Plus className="w-4 h-4" />
                إضافة أو تحديث بالكود
              </button>
            )}
          </div>

          {!canImport && (
            <p className="text-xs m-0 mt-3" style={{ color: 'var(--warning, #f59e0b)' }}>
              لديك صلاحية عرض فقط. اطلب صلاحية «استيراد RTGS» لتعديل التعاريف.
            </p>
          )}
        </div>

        <div
          className="rounded-xl border overflow-hidden bg-white"
          style={{ borderColor: 'var(--border-card, #cbd5e1)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>
              التعاريف الحالية ({maps.length})
            </h2>
          </div>
          {mapsQuery.isLoading ? (
            <p className="p-6 m-0 text-sm" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</p>
          ) : maps.length === 0 ? (
            <p className="p-6 m-0 text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد تعاريف بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table w-full text-sm">
                <thead className="rtgs-table-header-teal">
                  <tr>
                    <th className="text-right px-3 py-2">الكود</th>
                    <th className="text-right px-3 py-2">اسم المصرف</th>
                    <th className="text-right px-3 py-2">مفتاح النظام</th>
                    <th className="text-right px-3 py-2 w-32">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {maps.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-mono" dir="ltr">{row.inst_id}</td>
                      <td className="px-3 py-2">{row.display_name_ar}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground" dir="ltr">{row.system_key ?? '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            className="ds-btn-ghost p-1.5 rounded-md"
                            title="تعديل"
                            disabled={!canImport}
                            onClick={() => startEdit(row)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="ds-btn-ghost p-1.5 rounded-md text-red-600"
                            title="حذف"
                            disabled={!canImport}
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-bold m-0 mb-2" style={{ color: 'var(--text-strong)' }}>تأكيد الحذف</h3>
            <p className="text-sm m-0 mb-4" style={{ color: 'var(--text)' }}>
              حذف التعريف للكود <span className="font-mono font-semibold" dir="ltr">{deleteTarget.inst_id}</span>؟ لن يُحذف أي سجل RTGS، لكن الاسم لن يظهر للحركات بهذا الكود.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="ds-btn-outline text-sm" onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>
                إلغاء
              </button>
              <button
                type="button"
                className="ds-btn-danger text-sm"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
