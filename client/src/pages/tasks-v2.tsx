import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useDailyTasks,
  useAdHocTasks,
  useExecuteTask,
  useCreateAdHocTask,
  useGenerateDailyTasks,
} from '@/hooks/use-tasks';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { useHasPermission } from '@/hooks/useHasPermission';
import api from '@/lib/api';
import { formatTime12h } from '@/lib/format';
import {
  Search,
  Plus,
  FileText,
  CheckSquare,
  Clock,
  AlertCircle,
  Filter,
  RefreshCw,
  Calendar,
  Eye,
  LayoutGrid,
  Table2,
  Trash2,
} from 'lucide-react';
import moment from 'moment-timezone';
import { CompanyLogo } from '@/components/CompanyLogo';
import { KpiCards } from '@/components/KpiCards';
import { SettlementStamp } from '@/components/SettlementStamp';

const todayBaghdad = () => moment().tz('Asia/Baghdad').format('YYYY-MM-DD');
const BRAND_PRIMARY = '#068294';

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 p-3 rounded-xl border bg-white" style={{ borderColor: 'rgba(6, 130, 148, 0.2)', background: 'rgba(255,255,255,0.95)' }}>
      <span className="font-medium shrink-0" style={{ color: '#068294' }}>{label}:</span>
      <span className={multiline ? 'text-end whitespace-pre-wrap break-words flex-1' : 'font-semibold'} style={{ color: BRAND_PRIMARY }}>{value}</span>
    </div>
  );
}

function EmptyTasksCard({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-16 text-center"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}
    >
      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
        <FileText className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
      </div>
      <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>{message}</p>
    </div>
  );
}

function TaskCard({
  task,
  index,
  type,
  getStatusBadge,
  onDetails,
  onExecute,
  onDelete,
  canExecute,
  canDelete,
}: {
  task: any;
  index: number;
  type: 'daily' | 'ad-hoc';
  getStatusBadge: (s: string) => JSX.Element;
  onDetails: () => void;
  onExecute: () => void;
  onDelete?: () => void;
  canExecute?: boolean;
  canDelete?: boolean;
}) {
  const statusColors: Record<string, { bg: string; bar: string }> = {
    completed: { bg: 'rgba(22, 163, 74, 0.12)', bar: 'linear-gradient(180deg, #16a34a, #22c55e)' },
    pending: { bg: 'rgba(245, 158, 11, 0.12)', bar: 'linear-gradient(180deg, #d97706, #f59e0b)' },
    overdue: { bg: 'rgba(220, 38, 38, 0.12)', bar: 'linear-gradient(180deg, #b91c1c, #dc2626)' },
  };
  const sc = statusColors[task.status] || { bg: 'rgba(100, 116, 139, 0.12)', bar: 'linear-gradient(180deg, var(--primary-800), var(--primary-600))' };
  const title = task.template_title || task.title || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{
        scale: 1.15,
        y: -8,
        zIndex: 20,
        boxShadow: '0 28px 56px rgba(2, 97, 116, 0.2), 0 0 0 1px rgba(8, 131, 149, 0.3)',
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: 'var(--surface)',
        border: '2px solid var(--border-card)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl card-shine-hover" />
      <div
        className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300"
        style={{ right: 0, background: sc.bar, boxShadow: '0 0 12px rgba(8, 131, 149, 0.3)' }}
      />
      <div
        className="absolute top-0 right-0 left-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(90deg, var(--primary-600), var(--primary-800))' }}
      />
      <div className="p-5 pl-5 pr-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-bold leading-snug line-clamp-2 flex-1 min-w-0" style={{ color: 'var(--text-strong)' }}>
            {title}
          </h3>
          {getStatusBadge(task.status)}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {task.category_name && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(8, 131, 149, 0.08)', color: 'var(--primary-800)' }}
            >
              <FileText className="w-3.5 h-3.5" />
              {task.category_name}
            </span>
          )}
          {task.target_settlement_date && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 text-slate-600" dir="ltr">
              تسوية {String(task.target_settlement_date).slice(0, 10)}
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: sc.bg, color: type === 'daily' ? 'var(--primary-800)' : '#7c3aed' }}>
            {type === 'daily' ? 'يومية' : 'خاصة'}
          </span>
        </div>
        <div className="space-y-2 text-sm flex-1 mb-4">
          {task.assigned_to_name && (
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(6, 130, 148, 0.06)' }}>
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>المسؤول:</span>
              <span className="font-semibold" style={{ color: 'var(--primary-800)' }}>{task.assigned_to_name}</span>
            </div>
          )}
          {task.created_by_name && type === 'ad-hoc' && (
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(6, 130, 148, 0.06)' }}>
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>أنشأها:</span>
              <span className="font-semibold" style={{ color: 'var(--primary-800)' }}>{task.created_by_name}</span>
            </div>
          )}
          {task.task_date && (
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(6, 130, 148, 0.06)' }}>
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>التاريخ:</span>
              <span className="font-semibold" dir="ltr">{moment(task.task_date).format('YYYY-MM-DD')}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-4 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDetails(); }}
            className="ds-btn ds-btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye className="w-4 h-4" />
            تفاصيل
          </motion.button>
          {task.status !== 'completed' && canExecute && (
            <motion.button
              type="button"
              onClick={(e) => { e.stopPropagation(); onExecute(); }}
              className="ds-btn ds-btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckSquare className="w-4 h-4" />
              تنفيذ
            </motion.button>
          )}
          {canDelete && onDelete && (
            <motion.button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="ds-btn flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg text-white hover:opacity-90"
              style={{ background: 'var(--color-danger, #dc2626)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              title="حذف المهمة"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TasksV2() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState('');
  const [dateMode, setDateMode] = useState<'all' | 'single' | 'range'>('single');
  const [filterDate, setFilterDate] = useState(todayBaghdad());
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterTaskType, setFilterTaskType] = useState<'all' | 'daily_only' | 'ad_hoc_only'>('all');
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTask, setDetailsTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [executionData, setExecutionData] = useState({
    resultStatus: 'completed',
    notes: '',
    durationMinutes: '',
    settlement_date: '',
    settlement_value: '',
  });
  const [executionError, setExecutionError] = useState('');
  const [showSettlementStamp, setShowSettlementStamp] = useState(false);

  const canFilterByAssignee = useHasPermission('tasks', 'filter_by_assignee');
  const canExecute = useHasPermission('tasks', 'execute');
  const canCreateAdHoc = useHasPermission('tasks', 'create_ad_hoc');
  const canGenerateDaily = useHasPermission('tasks', 'view');
  const canDeleteTask = useHasPermission('tasks', 'delete_task');

  const [taskToDelete, setTaskToDelete] = useState<{ id: number; type: 'daily' | 'ad-hoc' } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllSubmitting, setDeleteAllSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Build filters
  const dailyFilters = {
    ...(dateMode === 'single' && filterDate ? { date: filterDate } : {}),
    ...(dateMode === 'range' && filterDateFrom && filterDateTo
      ? { dateFrom: filterDateFrom, dateTo: filterDateTo }
      : {}),
    ...(filterView ? { view: filterView } : {}),
    ...(canFilterByAssignee && filterAssignee ? { assignedTo: filterAssignee } : {}),
  };

  const adHocFilters = {
    ...(dateMode === 'range' && filterDateFrom && filterDateTo
      ? { dateFrom: filterDateFrom, dateTo: filterDateTo }
      : {}),
    ...(filterView ? { view: filterView } : {}),
    ...(canFilterByAssignee && filterAssignee ? { assignedTo: filterAssignee } : {}),
  };

  const { data: dailyTasks = [], isLoading: dailyLoading, refetch: refetchDaily } = useDailyTasks(dailyFilters);
  const { data: adHocTasks = [], isLoading: adHocLoading } = useAdHocTasks(adHocFilters);
  const executeTask = useExecuteTask();
  const createTask = useCreateAdHocTask();
  const generateTasks = useGenerateDailyTasks();

  // جلب المهام تلقائياً عند فتح الصفحة — التأكد من توليد مهام اليوم إن لم تُولَّد بعد (مثلاً لو الخادم كان متوقفاً عند 00:10)
  useEffect(() => {
    api.get('/tasks/ensure-daily')
      .then((res) => {
        const data = res.data;
        if (data?.generated > 0) {
          queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
        }
      })
      .catch(() => {});
  }, [queryClient]);

  // Fetch users and templates
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.get('/templates?active=true');
      return response.data;
    },
  });

  const isLoading = dailyLoading || adHocLoading;

  // فرز: غير مكتملة أولاً (pending, overdue) ثم المكتملة
  const sortByIncompleteFirst = (tasks: any[]) =>
    [...tasks].sort((a, b) => {
      const aIncomplete = a.status !== 'completed';
      const bIncomplete = b.status !== 'completed';
      if (aIncomplete && !bIncomplete) return -1;
      if (!aIncomplete && bIncomplete) return 1;
      return 0;
    });

  // فلترة بالبحث النصي
  const filterBySearch = (tasks: any[]) => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter((t: any) => {
      const title = (t.template_title || t.title || '').toLowerCase();
      const category = (t.category_name || '').toLowerCase();
      const assignee = (t.assigned_to_name || '').toLowerCase();
      const creator = (t.created_by_name || '').toLowerCase();
      return title.includes(q) || category.includes(q) || assignee.includes(q) || creator.includes(q);
    });
  };

  const sortedDailyTasks = useMemo(
    () => filterBySearch(sortByIncompleteFirst(dailyTasks)),
    [dailyTasks, searchQuery]
  );
  const sortedAdHocTasks = useMemo(
    () => filterBySearch(sortByIncompleteFirst(adHocTasks)),
    [adHocTasks, searchQuery]
  );

  const showDailySection = filterTaskType === 'all' || filterTaskType === 'daily_only';
  const showAdHocSection = filterTaskType === 'all' || filterTaskType === 'ad_hoc_only';

  const stats = {
    total: dailyTasks.length + adHocTasks.length,
    pending: [...dailyTasks, ...adHocTasks].filter((t) => t.status === 'pending' || t.status === 'overdue').length,
    completed: [...dailyTasks, ...adHocTasks].filter((t) => t.status === 'completed').length,
    overdue: dailyTasks.filter((t) => t.status === 'overdue').length,
  };

  const isGovSettlementTask =
    selectedTask?.type === 'daily' &&
    selectedTask?.template_required_fields?.category_type === 'government_settlement_bank';

  const openExecuteModal = (task: any) => {
    setSelectedTask({ ...task, type: task.type || 'daily' });
    setExecutionError('');
    if (task.template_required_fields?.category_type === 'government_settlement_bank') {
      setExecutionData((prev) => ({
        ...prev,
        settlement_date: task.target_settlement_date ? String(task.target_settlement_date).slice(0, 10) : '',
        settlement_value: '',
      }));
    }
    setShowExecuteModal(true);
  };

  const handleDeleteClick = (task: any, type: 'daily' | 'ad-hoc') => setTaskToDelete({ id: task.id, type });
  const cancelDelete = () => setTaskToDelete(null);
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setDeleteSubmitting(true);
      const path = taskToDelete.type === 'daily' ? 'daily' : 'ad-hoc';
      await api.delete(`/tasks/${path}/${taskToDelete.id}`);
      toast({ title: 'تم', description: 'تم حذف المهمة' });
      setTaskToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] }),
      ]);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.response?.data?.error || 'فشل حذف المهمة', variant: 'destructive' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      setDeleteAllSubmitting(true);
      const res = await api.delete('/tasks/all');
      toast({ title: 'تم', description: (res.data as any)?.message || 'تم حذف جميع المهام' });
      setDeleteAllConfirm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] }),
      ]);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.response?.data?.error || 'فشل حذف المهام', variant: 'destructive' });
    } finally {
      setDeleteAllSubmitting(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedTask) return;
    if (isGovSettlementTask && (executionData.resultStatus === 'completed' || executionData.resultStatus === 'completed_late')) {
      if (!executionData.settlement_date?.trim() || !executionData.settlement_value?.trim()) {
        toast({
          title: 'تنبيه',
          description: 'مهام التسوية الحكومية تتطلب تاريخ التسوية وقيمة التسوية',
          variant: 'destructive',
        });
        return;
      }
    }

    setExecutionError('');
    try {
      const dailyId = selectedTask.type === 'daily' ? Number(selectedTask.id) : undefined;
      const adHocId = selectedTask.type === 'ad-hoc' ? Number(selectedTask.id) : undefined;
      if ((selectedTask.type === 'daily' && (dailyId == null || Number.isNaN(dailyId))) ||
          (selectedTask.type === 'ad-hoc' && (adHocId == null || Number.isNaN(adHocId)))) {
        setExecutionError('معرف المهمة غير صالح. أعد فتح الصفحة وحاول مرة أخرى.');
        return;
      }
      const payload: any = {
        dailyTaskId: selectedTask.type === 'daily' ? dailyId : undefined,
        adHocTaskId: selectedTask.type === 'ad-hoc' ? adHocId : undefined,
        resultStatus: executionData.resultStatus,
        notes: executionData.notes,
        durationMinutes: executionData.durationMinutes
          ? parseInt(executionData.durationMinutes, 10)
          : undefined,
      };
      if (isGovSettlementTask && (executionData.resultStatus === 'completed' || executionData.resultStatus === 'completed_late')) {
        const raw = executionData.settlement_date?.trim().slice(0, 10) || '';
        payload.settlement_date = raw.includes('/') ? raw.replace(/\//g, '-') : raw;
        const val = executionData.settlement_value?.replace?.(/,/g, '') ?? executionData.settlement_value;
        payload.settlement_value = val === '' ? undefined : val;
      }
      await executeTask.mutateAsync(payload);
      setShowSettlementStamp(true);
    } catch (err: any) {
      const data = err?.response?.data;
      const code = data?.code;
      const msg =
        data?.error ??
        data?.message ??
        (typeof data === 'string' ? data : null) ??
        (err?.message && err.message !== 'Network Error' ? err.message : 'حدث خطأ. تحقق من الاتصال ثم أعد المحاولة.');
      setExecutionError(msg + (data?.expected_sum_sttle != null ? ` (المتوقع: ${Number(data.expected_sum_sttle).toLocaleString('en-US')})` : ''));
      if (code === 'SETTLEMENT_MISMATCH') {
        toast({
          title: 'غير مطابقة',
          description: msg + (data?.expected_sum_sttle != null ? ` (المتوقع: ${Number(data.expected_sum_sttle).toLocaleString('en-US')})` : ''),
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = templates.find((t: any) => t.id === parseInt(templateId));
    if (!template) return;

    const created = await createTask.mutateAsync({
      templateId: parseInt(templateId),
      categoryId: template.category_id,
      title: template.title,
      description: template.description,
    });

    // Open execute modal for the created task
    setSelectedTask({ ...created, type: 'ad-hoc' });
    setShowCreateModal(false);
    setShowExecuteModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'success' as const, label: 'مكتملة' },
      pending: { variant: 'warning' as const, label: 'معلقة' },
      overdue: { variant: 'destructive' as const, label: 'متأخرة' },
      cancelled: { variant: 'outline' as const, label: 'ملغاة' },
      skipped: { variant: 'outline' as const, label: 'تخطي' },
    };
    const config = variants[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <SettlementStamp
        show={showSettlementStamp}
        onComplete={() => {
          setShowSettlementStamp(false);
          setShowExecuteModal(false);
          setSelectedTask(null);
          setExecutionData({ resultStatus: 'completed', notes: '', durationMinutes: '', settlement_date: '', settlement_value: '' });
        }}
      />
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
          <h1 className="text-2xl font-bold m-0 text-white">المهام</h1>
          <p className="text-sm opacity-90 mt-1 m-0 text-white">
            إدارة وتنفيذ المهام اليومية والخاصة
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-full overflow-hidden border border-white/30 bg-white/10 p-0.5">
            <button type="button" onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}>
              <LayoutGrid className="w-4 h-4" /> كروت
            </button>
            <button type="button" onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}>
              <Table2 className="w-4 h-4" /> جدول
            </button>
          </div>
          {canGenerateDaily && (
            <button type="button" onClick={() => generateTasks.mutate()} disabled={generateTasks.isPending} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors text-white disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${generateTasks.isPending ? 'animate-spin' : ''}`} /> توليد المهام
            </button>
          )}
          {canCreateAdHoc && (
          <button type="button" onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] cursor-pointer hover:bg-white/95 transition-colors shadow">
            <Plus className="w-4 h-4" /> إنشاء من قالب
          </button>
          )}
          {canDeleteTask && (
            <button type="button" onClick={() => setDeleteAllConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-600/90 hover:bg-red-600 text-white transition-colors shadow" title="حذف جميع المهام">
              <Trash2 className="w-4 h-4" /> حذف الكل
            </button>
          )}
        </div>
      </div>

      <KpiCards
          items={[
            { label: 'إجمالي المهام', value: stats.total, Icon: CheckSquare, color: '#068294', glow: 'rgba(6, 130, 148, 0.4)', gradient: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
            { label: 'معلقة', value: stats.pending, Icon: Clock, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            { label: 'مكتملة', value: stats.completed, Icon: CheckSquare, color: '#059669', glow: 'rgba(5, 150, 105, 0.4)', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
            { label: 'متأخرة', value: stats.overdue, Icon: AlertCircle, color: '#dc2626', glow: 'rgba(220, 38, 38, 0.4)', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
          ]}
        />

      {/* Filters */}
      <div
        className="rounded-2xl p-5 mb-6 border border-slate-200/80"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-slate-100">
            <Filter className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-base font-semibold text-slate-700">الفلاتر والبحث</span>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">بحث في المهام</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن أي مهمة (عنوان، فئة، مسؤول...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#068294]/30 focus:border-[#068294] bg-white text-slate-800"
            />
          </div>
          <p className="text-xs mt-1.5 text-slate-500">يمكنك البحث عن أي مهمة وإنجازها حتى لو لم تكن مخصصة لك</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">نوع المهام</label>
              <SearchableSelect
                value={filterTaskType}
                onChange={(val) => setFilterTaskType(val as 'all' | 'daily_only' | 'ad_hoc_only')}
                options={[
                  { value: 'all', label: 'الكل (اليومية + الخاصة)' },
                  { value: 'daily_only', label: 'اليومية فقط' },
                  { value: 'ad_hoc_only', label: 'الخاصة فقط' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="الكل"
                searchPlaceholder="ابحث..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">عرض المهام</label>
              <SearchableSelect
                value={filterView}
                onChange={setFilterView}
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'department_pending', label: 'مهام القسم المعلقة' },
                  { value: 'department_completed', label: 'مهام القسم المنجزة' },
                  { value: 'my_pending', label: 'مهام المعلقة من قبلي' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="الكل"
                searchPlaceholder="ابحث..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">التاريخ</label>
              <SearchableSelect
                value={dateMode}
                onChange={(val) => setDateMode(val as any)}
                options={[
                  { value: 'all', label: 'عام (كل الفترات)' },
                  { value: 'single', label: 'يوم محدد' },
                  { value: 'range', label: 'فترة معينة' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="اختر وضع التاريخ"
                searchPlaceholder="ابحث..."
              />
            </div>
            {dateMode === 'single' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">اليوم</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="border border-slate-200 rounded-lg"
                />
              </div>
            )}
            {dateMode === 'range' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">من</label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">إلى</label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
            {canFilterByAssignee && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">المسؤول</label>
                <SearchableSelect
                  value={filterAssignee}
                  onChange={setFilterAssignee}
                  options={[{ value: '', label: 'الكل' }, ...users.map((u: any) => ({ value: u.id.toString(), label: u.name }))]}
                  getOptionLabel={(opt: any) => opt.label}
                  getOptionValue={(opt: any) => opt.value}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن مستخدم..."
                />
              </div>
            )}
          </div>
        </div>

      {/* Tasks List */}
      {isLoading ? (
        <div
          className="rounded-2xl p-16 flex justify-center"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}
        >
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>جاري تحميل المهام...</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="ds-table w-full">
            <thead>
              <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                <th className="text-end py-4 px-4 font-bold text-white">المهمة</th>
                <th className="text-end py-4 px-4 font-bold text-white">النوع</th>
                <th className="text-end py-4 px-4 font-bold text-white">الفئة</th>
                <th className="text-end py-4 px-4 font-bold text-white">الحالة</th>
                <th className="text-end py-4 px-4 font-bold text-white">التاريخ</th>
                <th className="text-end py-4 px-4 font-bold text-white">المسؤول</th>
                <th className="text-end py-4 px-4 font-bold text-white">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...(showDailySection ? sortedDailyTasks.map((t: any) => ({ ...t, _rowType: 'daily' })) : []),
                ...(showAdHocSection ? sortedAdHocTasks.map((t: any) => ({ ...t, _rowType: 'ad-hoc' })) : []),
              ].map((task: any) => (
                <tr key={`${task._rowType}-${task.id}`}>
                  <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-strong)' }}>{task.template_title || task.title}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: (task._rowType === 'ad-hoc' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(6, 130, 148, 0.12)'), color: (task._rowType === 'ad-hoc' ? '#7c3aed' : 'var(--primary-800)') }}>{task._rowType === 'ad-hoc' ? 'خاصة' : 'يومية'}</span></td>
                  <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{task.category_name || '—'}</td>
                  <td className="py-3 px-4">{getStatusBadge(task.status)}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{task.task_date ? moment(task.task_date).format('YYYY-MM-DD') : '—'}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{(task.assigned_to_name || task.created_by_name) || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button type="button" onClick={() => { setDetailsTask({ ...task, type: task._rowType }); setShowDetailsModal(true); }} className="ds-btn ds-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-sm"><Eye className="w-3.5 h-3.5" /> تفاصيل</button>
                      {task.status !== 'completed' && canExecute && (
                        <button type="button" onClick={() => openExecuteModal({ ...task, type: task._rowType })} className="ds-btn ds-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm"><CheckSquare className="w-3.5 h-3.5" /> تنفيذ</button>
                      )}
                      {canDeleteTask && (
                        <button type="button" onClick={() => handleDeleteClick(task, task._rowType)} className="ds-btn flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg hover:opacity-90" style={{ background: '#dc2626' }} title="حذف"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Daily Tasks */}
          {showDailySection && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--primary-800)' }}>
                  <Calendar className="h-5 w-5" />
                  المهام اليومية المجدولة
                  <span className="px-2.5 py-0.5 rounded-lg text-sm font-bold" style={{ background: 'rgba(6, 130, 148, 0.12)', color: 'var(--primary-800)' }}>
                    {sortedDailyTasks.length}
                  </span>
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {sortedDailyTasks.map((task: any, index: number) => (
                    <TaskCard
                      key={`daily-${task.id}`}
                      task={task}
                      index={index}
                      type="daily"
                      getStatusBadge={getStatusBadge}
                      onDetails={() => { setDetailsTask({ ...task, type: 'daily' }); setShowDetailsModal(true); }}
                      onExecute={() => openExecuteModal({ ...task, type: 'daily' })}
                      onDelete={canDeleteTask ? () => handleDeleteClick(task, 'daily') : undefined}
                      canExecute={canExecute}
                      canDelete={canDeleteTask}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {sortedDailyTasks.length === 0 && (
                <EmptyTasksCard message="لا توجد مهام مجدولة" />
              )}
            </div>
          )}

          {/* Ad-hoc Tasks */}
          {showAdHocSection && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--primary-800)' }}>
                  <FileText className="h-5 w-5" />
                  المهام الخاصة
                  <span className="px-2.5 py-0.5 rounded-lg text-sm font-bold" style={{ background: 'rgba(6, 130, 148, 0.12)', color: 'var(--primary-800)' }}>
                    {sortedAdHocTasks.length}
                  </span>
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {sortedAdHocTasks.map((task: any, index: number) => (
                    <TaskCard
                      key={`ad-hoc-${task.id}`}
                      task={task}
                      index={index}
                      type="ad-hoc"
                      getStatusBadge={getStatusBadge}
                      onDetails={() => { setDetailsTask({ ...task, type: 'ad-hoc' }); setShowDetailsModal(true); }}
                      onExecute={() => { setSelectedTask({ ...task, type: 'ad-hoc' }); setShowExecuteModal(true); }}
                      onDelete={canDeleteTask ? () => handleDeleteClick(task, 'ad-hoc') : undefined}
                      canExecute={canExecute}
                      canDelete={canDeleteTask}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {sortedAdHocTasks.length === 0 && (
                <EmptyTasksCard message="لا توجد مهام خاصة" />
              )}
            </div>
          )}
        </div>
      )}

      {/* حذف مهمة واحدة */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && !deleteSubmitting && cancelDelete()}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">حذف المهمة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={cancelDelete} disabled={deleteSubmitting}>إلغاء</Button>
            <Button type="button" onClick={handleDeleteConfirm} disabled={deleteSubmitting} className="bg-red-600 hover:bg-red-700 text-white">{deleteSubmitting ? 'جاري الحذف...' : 'حذف'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حذف الكل */}
      <Dialog open={deleteAllConfirm} onOpenChange={(open) => !open && !deleteAllSubmitting && setDeleteAllConfirm(false)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">حذف جميع المهام</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">هل أنت متأكد من حذف <strong>جميع</strong> المهام (اليومية والخاصة)؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteAllConfirm(false)} disabled={deleteAllSubmitting}>إلغاء</Button>
            <Button type="button" onClick={handleDeleteAllConfirm} disabled={deleteAllSubmitting} className="bg-red-600 hover:bg-red-700 text-white">{deleteAllSubmitting ? 'جاري الحذف...' : 'حذف الكل'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
              <Eye className="h-6 w-6" />
              تفاصيل المهمة
            </DialogTitle>
          </DialogHeader>
          {detailsTask && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-lg font-bold mb-2 text-slate-800">
                  {detailsTask.template_title || detailsTask.title}
                </h3>
                {detailsTask.category_name && (
                  <Badge variant="outline" className="rounded-lg">{detailsTask.category_name}</Badge>
                )}
                {getStatusBadge(detailsTask.status)}
              </div>
              <div className="grid gap-3 text-sm">
                {detailsTask.type === 'daily' && detailsTask.assigned_to_name && (
                  <DetailRow label="المسؤول" value={detailsTask.assigned_to_name} />
                )}
                {detailsTask.task_date && (
                  <DetailRow label="التاريخ" value={moment(detailsTask.task_date).format('YYYY-MM-DD')} />
                )}
                {detailsTask.due_date_time && (
                  <DetailRow label="وقت الاستحقاق" value={formatTime12h(detailsTask.due_date_time)} />
                )}
                {detailsTask.description && (
                  <DetailRow label="الوصف" value={detailsTask.description} multiline />
                )}
                {detailsTask.type === 'ad-hoc' && detailsTask.created_by_name && (
                  <DetailRow label="أنشأها" value={detailsTask.created_by_name} />
                )}
                {detailsTask.beneficiary && (
                  <DetailRow label="الجهة المستفيدة" value={detailsTask.beneficiary} />
                )}
                {detailsTask.notes && (
                  <DetailRow label="ملاحظات" value={detailsTask.notes} multiline />
                )}
              </div>
              {detailsTask.status !== 'completed' && canExecute && (
                <Button
                  className="w-full rounded-xl text-white font-bold animate-pulse"
                  style={{ background: BRAND_PRIMARY, color: '#ffffff' }}
                  onClick={() => {
                    setShowDetailsModal(false);
                    openExecuteModal(detailsTask);
                  }}
                >
                  <CheckSquare className="h-4 w-4 ml-2" />
                  تنفيذ المهمة
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Execute Modal */}
      <Dialog
        open={showExecuteModal}
        onOpenChange={(open) => {
          setShowExecuteModal(open);
          if (!open) setExecutionError('');
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CompanyLogo size="sm" animated={false} />
              <DialogTitle className="text-2xl font-bold" style={{ color: BRAND_PRIMARY }}>تنفيذ المهمة</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">حالة التنفيذ</label>
              <SearchableSelect
                value={executionData.resultStatus}
                onChange={(val) => setExecutionData({ ...executionData, resultStatus: val })}
                options={[
                  { value: 'completed', label: 'مكتملة (في الوقت)' },
                  { value: 'completed_late', label: 'مكتملة (متأخرة)' },
                  { value: 'skipped', label: 'تم التخطي' },
                  { value: 'cancelled', label: 'ملغاة' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="اختر الحالة"
              />
            </div>

            {isGovSettlementTask && (executionData.resultStatus === 'completed' || executionData.resultStatus === 'completed_late') && (
              <div className="space-y-3 rounded-xl border-2 p-4" style={{ borderColor: 'rgba(6, 130, 148, 0.25)', background: 'rgba(255,255,255,0.9)' }}>
                <p className="text-sm font-semibold" style={{ color: '#2A6E85' }}>تأكيد التسوية (مطابقة مع صفحة التسويات الحكومية)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">تاريخ التسوية *</label>
                    <Input
                      type="date"
                      value={executionData.settlement_date}
                      onChange={(e) => setExecutionData({ ...executionData, settlement_date: e.target.value })}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">قيمة التسوية (STTLE) *</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={executionData.settlement_value}
                      onChange={(e) => setExecutionData({ ...executionData, settlement_value: e.target.value })}
                      className="border-2 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#068294' }}>يتم مقارنة القيمة مع مجموع STTLE في صفحة التسويات الحكومية حسب التاريخ والمصرف. عند التطابق تُقبل المهمة وتظهر «تسوية مطابقة».</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">ملاحظات</label>
              <Textarea
                value={executionData.notes}
                onChange={(e) => setExecutionData({ ...executionData, notes: e.target.value })}
                rows={4}
                className="border-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">المدة (دقيقة) - اختياري</label>
              <Input
                type="number"
                value={executionData.durationMinutes}
                onChange={(e) =>
                  setExecutionData({ ...executionData, durationMinutes: e.target.value })
                }
                min="0"
                className="border-2"
              />
            </div>
            {executionError && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                {executionError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setShowExecuteModal(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeTask.isPending}
              className="rounded-xl font-semibold"
              style={{ background: 'linear-gradient(135deg, #026174, #068294)', color: '#fff' }}
            >
              {executeTask.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create from Template Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CompanyLogo size="sm" animated={false} />
              <DialogTitle className="text-xl text-slate-900">إنشاء مهمة من قالب</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">اختر قالبًا لإنشاء مهمة خاصة فورًا.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اختر قالب المهمة *</label>
              <SearchableSelect
                value=""
                onChange={handleCreateFromTemplate}
                options={templates}
                getOptionLabel={(opt: any) => opt.title}
                getOptionValue={(opt: any) => opt.id.toString()}
                placeholder="— اختر قالب —"
                searchPlaceholder="ابحث عن قالب..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
