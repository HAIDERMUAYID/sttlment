import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { LucideIcon } from 'lucide-react';
import {
  Shield,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ListTodo,
  Calendar,
  FileText,
  FolderTree,
  Landmark,
  Banknote,
  FileStack,
  BarChart3,
  Users,
  ClipboardList,
  Tv,
  Settings,
  Key,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';

export interface PermissionDef {
  id: number;
  page_key: string;
  page_label_ar: string;
  page_path: string;
  actions: { key: string; label_ar: string }[];
  sort_order: number;
}

export interface UserPermissionsEditorProps {
  userId: number;
  userName: string;
  userRole: string;
  open: boolean;
  onClose: () => void;
}

const PAGE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  schedules: Calendar,
  templates: FileText,
  categories: FolderTree,
  rtgs: Landmark,
  government_settlements: Banknote,
  ct_matching: FileStack,
  merchant_disbursements: Banknote,
  reports: BarChart3,
  attendance: ClipboardList,
  merchants: Landmark,
  users: Users,
  audit_log: FileText,
  tv_settings: Tv,
  rtgs_settings: Settings,
  change_password: Key,
};

const GROUP_LABELS: Record<string, string> = {
  main: 'القسم الرئيسي وإدارة المهام',
  reports: 'التقارير والتحليلات',
  admin: 'الإدارة والإعدادات',
};

function getGroup(pageKey: string): string {
  if (['dashboard', 'tasks', 'schedules', 'templates', 'categories'].includes(pageKey)) return 'main';
  if (['rtgs', 'government_settlements', 'ct_matching', 'merchant_disbursements', 'reports'].includes(pageKey)) return 'reports';
  return 'admin';
}

export function UserPermissionsEditor({ userId, userName, userRole, open, onClose }: UserPermissionsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const { data: definitions = [], isLoading: loadingDefs } = useQuery({
    queryKey: ['permission-definitions'],
    queryFn: async () => {
      const res = await api.get('/permissions/definitions');
      return res.data as PermissionDef[];
    },
    enabled: open,
  });

  const { data: userPerms = {}, isLoading: loadingPerms } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const res = await api.get(`/permissions/users/${userId}`);
      return res.data as Record<string, Record<string, boolean>>;
    },
    enabled: open && !!userId && userRole !== 'admin',
  });

  const updatePermissions = useMutation({
    mutationFn: async (perms: Record<string, Record<string, boolean>>) => {
      const res = await api.put(`/permissions/users/${userId}`, { permissions: perms });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast({ title: 'نجح', description: 'تم حفظ الصلاحيات بنجاح' });
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ',
        description: err.response?.data?.error || 'فشل حفظ الصلاحيات',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (userPerms && typeof userPerms === 'object') {
      setLocalPermissions(userPerms);
    }
  }, [userPerms]);

  // توسيع الكل / طي الكل
  const setAllExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    definitions.forEach((d) => { next[d.page_key] = expanded; });
    setExpandedPages(next);
  };

  const togglePage = (pageKey: string) => {
    setExpandedPages((p) => ({ ...p, [pageKey]: !p[pageKey] }));
  };

  const toggleAction = (pageKey: string, actionKey: string, checked: boolean) => {
    setLocalPermissions((prev) => {
      const page = prev[pageKey] || {};
      return { ...prev, [pageKey]: { ...page, [actionKey]: checked } };
    });
  };

  const selectAllPage = (pageKey: string, checked: boolean) => {
    const def = definitions.find((d) => d.page_key === pageKey);
    if (!def) return;
    const updates: Record<string, boolean> = {};
    def.actions.forEach((a) => { updates[a.key] = checked; });
    setLocalPermissions((prev) => ({
      ...prev,
      [pageKey]: { ...(prev[pageKey] || {}), ...updates },
    }));
  };

  const handleSave = () => {
    updatePermissions.mutate(localPermissions);
  };

  if (!open) return null;

  if (userRole === 'admin') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-[1100] p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <div
          className="rounded-2xl shadow-xl w-full max-w-md p-8"
          style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6, 130, 148, 0.12)' }}>
              <Shield className="w-6 h-6" style={{ color: '#068294' }} />
            </div>
            <h3 className="text-xl font-bold m-0" style={{ color: 'var(--text-strong)' }}>
              صلاحيات المدير
            </h3>
          </div>
          <p className="text-slate-600 leading-relaxed m-0">
            المستخدم بصلاحية <strong>مدير</strong> يملك جميع الصلاحيات تلقائياً ولا يحتاج إلى تعديل.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loading = loadingDefs || loadingPerms;
  const sortedDefs = [...definitions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const byGroup = sortedDefs.reduce<Record<string, PermissionDef[]>>((acc, def) => {
    const g = getGroup(def.page_key);
    if (!acc[g]) acc[g] = [];
    acc[g].push(def);
    return acc;
  }, {});
  const groupOrder = ['main', 'reports', 'admin'];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1100] p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="rounded-2xl w-full flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: '#fff',
          maxWidth: '900px',
          maxHeight: '92vh',
          boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
        }}
      >
        {/* هيدر بتدرج teal */}
        <div
          className="flex items-center justify-between gap-4 p-5 flex-wrap"
          style={{
            background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(2, 97, 116, 0.3)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold m-0 text-white">
                صلاحيات المستخدم: {userName}
              </h2>
              <p className="text-sm opacity-95 mt-1 m-0 text-white/90">
                اختر الصفحات والإجراءات المسموح بها — جميع أقسام النظام
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white border-0 cursor-pointer"
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>
        </div>

        {/* أزرار توسيع/طي الكل */}
        {!loading && sortedDefs.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <button
              type="button"
              onClick={() => setAllExpanded(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: '#cbd5e1', color: '#475569', background: '#fff' }}
            >
              <ChevronsUpDown size={16} />
              توسيع الكل
            </button>
            <button
              type="button"
              onClick={() => setAllExpanded(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: '#cbd5e1', color: '#475569', background: '#fff' }}
            >
              <ChevronsDownUp size={16} />
              طي الكل
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="py-16 text-center text-slate-500 font-medium">
              جاري تحميل الصلاحيات...
            </div>
          ) : (
            <div className="space-y-8">
              {groupOrder.map((groupKey) => {
                const defs = byGroup[groupKey];
                if (!defs?.length) return null;
                const label = GROUP_LABELS[groupKey] || groupKey;
                return (
                  <div key={groupKey}>
                    <h3
                      className="text-sm font-bold uppercase tracking-wide mb-3 px-2"
                      style={{ color: '#64748b' }}
                    >
                      {label}
                    </h3>
                    <div className="space-y-2">
                      {defs.map((def) => {
                        const expanded = expandedPages[def.page_key] !== false;
                        const pagePerms = localPermissions[def.page_key] || {};
                        const actions = Array.isArray(def.actions) ? def.actions : [];
                        const allChecked = actions.length > 0 && actions.every((a) => pagePerms[a.key] === true);
                        const someChecked = actions.some((a) => pagePerms[a.key] === true);
                        const Icon = PAGE_ICONS[def.page_key];
                        return (
                          <div
                            key={def.page_key}
                            className="rounded-xl overflow-hidden border-2 transition-colors"
                            style={{
                              borderColor: someChecked ? 'rgba(6, 130, 148, 0.35)' : '#e2e8f0',
                              background: expanded ? '#fff' : (someChecked ? 'rgba(6, 130, 148, 0.04)' : '#fafbfc'),
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => togglePage(def.page_key)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-right border-0 cursor-pointer transition-colors hover:opacity-90"
                              style={{
                                background: someChecked ? 'linear-gradient(90deg, rgba(6, 130, 148, 0.08) 0%, transparent 100%)' : 'transparent',
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {Icon && (
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(6, 130, 148, 0.1)', color: '#026174' }}
                                  >
                                    <Icon size={20} />
                                  </div>
                                )}
                                <span className="font-bold text-base" style={{ color: 'var(--text-strong)' }}>
                                  {def.page_label_ar}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {someChecked && (
                                  <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(6, 130, 148, 0.15)', color: '#0d9488' }}
                                  >
                                    {actions.filter((a) => pagePerms[a.key]).length} / {actions.length}
                                  </span>
                                )}
                                {expanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                              </div>
                            </button>
                            {expanded && (
                              <div
                                className="px-4 pb-4 pt-1 border-t"
                                style={{ borderColor: '#f1f5f9', background: '#fff' }}
                              >
                                <label
                                  className="flex items-center gap-3 mb-4 py-2 cursor-pointer select-none"
                                  style={{ borderBottom: '1px solid #f1f5f9' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={allChecked}
                                    ref={(el) => {
                                      if (el) (el as HTMLInputElement).indeterminate = someChecked && !allChecked;
                                    }}
                                    onChange={(e) => selectAllPage(def.page_key, e.target.checked)}
                                    className="w-4 h-4 rounded border-2 cursor-pointer accent-[#026174]"
                                    style={{ borderColor: '#94a3b8' }}
                                  />
                                  <span className="text-sm font-bold" style={{ color: '#475569' }}>
                                    تحديد كل إجراءات هذه الصفحة
                                  </span>
                                </label>
                                <div className="grid gap-x-6 gap-y-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                  {actions.map((action) => (
                                    <label
                                      key={action.key}
                                      className="flex items-center gap-3 cursor-pointer select-none py-1"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={pagePerms[action.key] === true}
                                        onChange={(e) => toggleAction(def.page_key, action.key, e.target.checked)}
                                        className="w-4 h-4 rounded border-2 cursor-pointer accent-[#026174]"
                                        style={{ borderColor: '#94a3b8' }}
                                      />
                                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                        {action.label_ar}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* تذييل مع أزرار الحفظ والإلغاء */}
        <div
          className="flex items-center gap-3 justify-end p-5 border-t-2 flex-wrap"
          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold border-2 cursor-pointer transition-colors"
            style={{ borderColor: '#cbd5e1', color: '#475569', background: '#fff' }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updatePermissions.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', boxShadow: '0 4px 14px rgba(6, 130, 148, 0.4)' }}
          >
            {updatePermissions.isPending ? (
              'جاري الحفظ...'
            ) : (
              <>
                <Check size={20} />
                حفظ الصلاحيات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
