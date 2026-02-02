import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from '@/hooks/use-schedules';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  FolderTree,
  X,
  Hash,
  CalendarDays,
  Layers,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { CompanyLogo } from '@/components/CompanyLogo';
import { formatTime12h } from '@/lib/format';
import { KpiCards } from '@/components/KpiCards';
import { useHasPermission } from '@/hooks/useHasPermission';

const days = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

function SchedulesV2() {
  const { toast } = useToast();
  const canCreate = useHasPermission('schedules', 'create');
  const canEdit = useHasPermission('schedules', 'edit');
  const canDelete = useHasPermission('schedules', 'delete');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterFrequency, setFilterFrequency] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [formData, setFormData] = useState({
    templateId: '',
    frequencyType: 'daily' as 'daily' | 'weekly' | 'monthly',
    daysOfWeek: [] as number[],
    dayOfWeekSingle: 0,
    dayOfMonth: 1,
    dueTime: '',
    graceMinutes: 0,
    defaultAssigneeUserId: '',
    active: true,
    settlementOffsetDays: 0, // للتسوية الحكومية: 0=نفس اليوم، -1=اليوم السابق، -2=يومين قبله، -3=3 أيام
  });

  const settlementOffsetOptions = [
    { value: 0, label: 'تسوية نفس اليوم' },
    { value: -1, label: 'تسوية اليوم الذي يسبقه' },
    { value: -2, label: 'تسوية يومين قبله' },
    { value: -3, label: 'تسوية 3 أيام قبله' },
  ];

  const { data: schedules = [], isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const toggleSchedule = useToggleSchedule();

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.get('/templates?active=true');
      return response.data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data.filter((u: any) => u.role === 'employee' && u.active);
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories?active=true');
      return response.data;
    },
  });

  const toggleDay = (dayValue: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(dayValue)
        ? formData.daysOfWeek.filter((d) => d !== dayValue)
        : [...formData.daysOfWeek, dayValue],
    });
  };

  const getFrequencyLabel = (schedule: any) => {
    const offset = schedule.settlement_offset_days != null ? parseInt(schedule.settlement_offset_days, 10) : 0;
    const offsetLabel =
      offset === 0
        ? 'تسوية نفس اليوم'
        : offset === -1
          ? 'تسوية اليوم السابق'
          : offset === -2
            ? 'تسوية يومين قبله'
            : offset === -3
              ? 'تسوية 3 أيام قبله'
              : offset !== 0
                ? `تسوية ${offset} أيام`
                : null;
    const suffix = offsetLabel ? ` — ${offsetLabel}` : '';
    if (schedule.frequency_type === 'daily') {
      if (!schedule.days_of_week || schedule.days_of_week.length === 0)
        return `يومية (بدون أيام)${suffix}`;
      const dayLabels = schedule.days_of_week
        .map((d: number) => days.find((day) => day.value === d)?.label)
        .filter(Boolean);
      return `يومية: ${dayLabels.join(', ')}${suffix}`;
    } else if (schedule.frequency_type === 'weekly') {
      const dayLabel =
        days.find((d) => d.value === schedule.day_of_week_single)?.label || 'غير محدد';
      return `أسبوعية: كل ${dayLabel}${suffix}`;
    } else if (schedule.frequency_type === 'monthly') {
      return `شهرية: يوم ${schedule.day_of_month} من كل شهر${suffix}`;
    }
    return 'غير محدد';
  };

  const handleOpenModal = (schedule?: any) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        templateId: schedule.template_id?.toString() || '',
        frequencyType: schedule.frequency_type || 'daily',
        daysOfWeek: schedule.days_of_week || [],
        dayOfWeekSingle: schedule.day_of_week_single || 0,
        dayOfMonth: schedule.day_of_month || 1,
        dueTime: schedule.due_time || '',
        graceMinutes: schedule.grace_minutes || 0,
        defaultAssigneeUserId: schedule.default_assignee_user_id?.toString() || '',
        active: schedule.active !== false,
        settlementOffsetDays: schedule.settlement_offset_days ?? 0,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        templateId: '',
        frequencyType: 'daily',
        daysOfWeek: [],
        dayOfWeekSingle: 0,
        dayOfMonth: 1,
        dueTime: '',
        graceMinutes: 0,
        defaultAssigneeUserId: '',
        active: true,
        settlementOffsetDays: 0,
      });
    }
    setShowModal(true);
  };

  const selectedTemplate = formData.templateId
    ? templates.find((t: any) => t.id?.toString() === formData.templateId)
    : null;
  const isGovSettlementTemplate =
    selectedTemplate?.required_fields?.category_type === 'government_settlement_bank';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.templateId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار قالب المهمة',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.dueTime) {
      toast({
        title: 'خطأ',
        description: 'وقت الاستحقاق مطلوب',
        variant: 'destructive',
      });
      return;
    }

    if (formData.frequencyType === 'daily' && formData.daysOfWeek.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار يوم واحد على الأقل',
        variant: 'destructive',
      });
      return;
    }

    const payload: any = {
      templateId: parseInt(formData.templateId),
      frequencyType: formData.frequencyType,
      dueTime: formData.dueTime,
      graceMinutes: formData.graceMinutes,
      active: formData.active,
    };

    if (formData.frequencyType === 'daily') {
      payload.daysOfWeek = formData.daysOfWeek;
    } else if (formData.frequencyType === 'weekly') {
      payload.dayOfWeekSingle = formData.dayOfWeekSingle;
    } else if (formData.frequencyType === 'monthly') {
      payload.dayOfMonth = formData.dayOfMonth;
    }

    if (formData.defaultAssigneeUserId) {
      payload.defaultAssigneeUserId = parseInt(formData.defaultAssigneeUserId);
    }

    if (isGovSettlementTemplate && formData.settlementOffsetDays != null) {
      payload.settlementOffsetDays = parseInt(String(formData.settlementOffsetDays), 10);
    }

    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({ id: editingSchedule.id, ...payload });
      } else {
        await createSchedule.mutateAsync(payload);
      }
      setShowModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
      await deleteSchedule.mutateAsync(id);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    await toggleSchedule.mutateAsync({ id, active: !active });
  };

  // Filter and search logic
  const filteredSchedules = schedules.filter((schedule: any) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        schedule.template_title?.toLowerCase().includes(query) ||
        schedule.category_name?.toLowerCase().includes(query) ||
        schedule.assignee_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus) {
      if (filterStatus === 'active' && !schedule.active) return false;
      if (filterStatus === 'inactive' && schedule.active) return false;
    }

    // Category filter
    if (filterCategory) {
      if (schedule.category_id?.toString() !== filterCategory) return false;
    }

    // Frequency filter
    if (filterFrequency) {
      if (schedule.frequency_type !== filterFrequency) return false;
    }

    // Assignee filter
    if (filterAssignee) {
      if (schedule.default_assignee_user_id?.toString() !== filterAssignee) return false;
    }

    return true;
  });

  const activeCount = schedules.filter((s: any) => s.active).length;
  const inactiveCount = schedules.filter((s: any) => !s.active).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterFrequency('');
    setFilterAssignee('');
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
            <h1 className="text-2xl font-bold m-0 text-white">الجداول الزمنية</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              إدارة جداول المهام المجدولة
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
            {canCreate && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] cursor-pointer hover:bg-white/95 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              جدول جديد
            </button>
            )}
          </div>
        </div>

        <KpiCards
          items={[
            { label: 'إجمالي الجداول', value: schedules.length, Icon: Hash, color: '#068294', glow: 'rgba(6, 130, 148, 0.4)', gradient: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
            { label: 'جداول نشطة', value: activeCount, Icon: CalendarDays, color: '#059669', glow: 'rgba(5, 150, 105, 0.4)', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
            { label: 'جداول غير نشطة', value: inactiveCount, Icon: Calendar, color: '#64748b', glow: 'rgba(100, 116, 139, 0.35)', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
            { label: 'القوالب', value: templates.length, Icon: Layers, color: '#0369a1', glow: 'rgba(3, 105, 161, 0.4)', gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالقالب أو الفئة أو المسؤول..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#068294]/30 focus:border-[#068294] bg-white text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">الحالة</label>
              <SearchableSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'active', label: 'نشط' },
                  { value: 'inactive', label: 'غير نشط' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="الكل"
                searchPlaceholder="ابحث..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">الفئة</label>
              <SearchableSelect
                value={filterCategory}
                onChange={setFilterCategory}
                options={[{ id: '', name: 'الكل' }, ...categories]}
                getOptionLabel={(opt: any) => opt.name}
                getOptionValue={(opt: any) => opt.id?.toString() || ''}
                placeholder="الكل"
                searchPlaceholder="ابحث عن فئة..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">نوع التكرار</label>
              <SearchableSelect
                value={filterFrequency}
                onChange={setFilterFrequency}
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'daily', label: 'يومية' },
                  { value: 'weekly', label: 'أسبوعية' },
                  { value: 'monthly', label: 'شهرية' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="الكل"
                searchPlaceholder="ابحث..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">المسؤول</label>
              <SearchableSelect
                value={filterAssignee}
                onChange={setFilterAssignee}
                options={[{ id: '', name: 'الكل' }, ...users]}
                getOptionLabel={(opt: any) => opt.name}
                getOptionValue={(opt: any) => opt.id?.toString() || ''}
                placeholder="الكل"
                searchPlaceholder="ابحث عن مسؤول..."
              />
            </div>
          </div>
          {(searchQuery || filterStatus || filterCategory || filterFrequency || filterAssignee) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                مسح الفلاتر
              </button>
              <span className="text-sm text-slate-500">
                عرض {filteredSchedules.length} من {schedules.length} جدول
              </span>
            </div>
          )}
        </div>

        {/* Schedules Grid */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border)',
          }}
        >
          {isLoading ? (
            <div className="p-16 flex justify-center">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>جاري تحميل الجداول...</p>
              </div>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
                <Calendar className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>
                {schedules.length === 0 ? 'لا توجد جداول زمنية' : 'لا توجد نتائج تطابق البحث والفلاتر'}
              </p>
              {schedules.length === 0 && canCreate && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="mt-5 ds-btn ds-btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء جدول جديد
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="ds-table w-full">
                <thead>
                  <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                    <th className="text-end py-4 px-4 font-bold text-white">القالب</th>
                    <th className="text-end py-4 px-4 font-bold text-white">الفئة</th>
                    <th className="text-end py-4 px-4 font-bold text-white">التكرار</th>
                    <th className="text-end py-4 px-4 font-bold text-white">وقت الاستحقاق</th>
                    <th className="text-end py-4 px-4 font-bold text-white">المسؤول</th>
                    <th className="text-end py-4 px-4 font-bold text-white">الحالة</th>
                    <th className="text-end py-4 px-4 font-bold text-white">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule: any) => (
                    <tr key={schedule.id}>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-strong)' }}>{schedule.template_title}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{schedule.category_name || '—'}</td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>{getFrequencyLabel(schedule)}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatTime12h(schedule.due_time)}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{schedule.assignee_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: schedule.active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                            color: schedule.active ? 'var(--success)' : 'var(--text-muted)',
                          }}
                        >
                          {schedule.active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenModal(schedule)}
                            className="ds-btn ds-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-sm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          )}
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleToggle(schedule.id, schedule.active)}
                            className="p-2 rounded-lg border hover:bg-slate-100 transition-colors"
                            title={schedule.active ? 'إلغاء التفعيل' : 'تفعيل'}
                          >
                            {schedule.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          )}
                          {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(schedule.id)}
                            className="ds-btn ds-btn-danger p-2 rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {filteredSchedules.map((schedule: any, index: number) => (
                    <motion.div
                      key={schedule.id}
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
                      transition={{
                        duration: 0.25,
                        delay: index * 0.03,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
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
                        style={{
                          right: 0,
                          background: schedule.active
                            ? 'linear-gradient(180deg, var(--success), #22c55e)'
                            : 'linear-gradient(180deg, var(--text-muted), #94a3b8)',
                          boxShadow: schedule.active ? '0 0 12px rgba(22, 163, 74, 0.3)' : '0 0 8px rgba(100, 116, 139, 0.2)',
                        }}
                      />
                      <div
                        className="absolute top-0 right-0 left-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(90deg, var(--primary-600), var(--primary-800))' }}
                      />
                      <div className="p-5 pl-5 pr-6 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3
                            className="text-lg font-bold leading-snug line-clamp-2 flex-1 min-w-0"
                            style={{ color: 'var(--text-strong)' }}
                          >
                            {schedule.template_title}
                          </h3>
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
                            style={{
                              background: schedule.active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                              color: schedule.active ? 'var(--success)' : 'var(--text-muted)',
                            }}
                          >
                            {schedule.active ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                        {schedule.category_name && (
                          <div
                            className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg mb-3 text-sm font-medium"
                            style={{
                              background: 'rgba(8, 131, 149, 0.08)',
                              color: 'var(--primary-800)',
                            }}
                          >
                            <FolderTree className="w-3.5 h-3.5" />
                            {schedule.category_name}
                          </div>
                        )}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>التكرار:</span>
                            <span style={{ color: 'var(--text)' }}>{getFrequencyLabel(schedule)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>وقت الاستحقاق:</span>
                            <span style={{ color: 'var(--text)' }}>{formatTime12h(schedule.due_time)}</span>
                          </div>
                          {schedule.assignee_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-muted)' }}>المسؤول:</span>
                              <span style={{ color: 'var(--text)' }}>{schedule.assignee_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-4 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
                          {canEdit && (
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(schedule); }}
                            className="ds-btn ds-btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </motion.button>
                          )}
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggle(schedule.id, schedule.active); }}
                            className="ds-btn ds-btn-ghost flex items-center justify-center p-2.5"
                            title={schedule.active ? 'إلغاء التفعيل' : 'تفعيل'}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {schedule.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </motion.button>
                          {canDelete && (
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                            className="ds-btn ds-btn-danger flex items-center justify-center p-2.5"
                            title="حذف"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto ds-popover">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CompanyLogo size="sm" animated={false} />
              <DialogTitle className="text-xl font-bold text-slate-900">{editingSchedule ? 'تعديل الجدول' : 'جدول جديد'}</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {editingSchedule ? 'تعديل إعدادات الجدول الزمني.' : 'إضافة جدول زمني جديد لتوليد المهام تلقائياً.'}
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">قالب المهمة *</label>
              <SearchableSelect
                value={formData.templateId}
                onChange={(val) => setFormData({ ...formData, templateId: val })}
                options={templates}
                getOptionLabel={(opt: any) => opt.title}
                getOptionValue={(opt: any) => opt.id.toString()}
                placeholder="— اختر قالب —"
                searchPlaceholder="ابحث عن قالب..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">نوع التكرار *</label>
              <SearchableSelect
                value={formData.frequencyType}
                onChange={(val) =>
                  setFormData({ ...formData, frequencyType: val as any, daysOfWeek: [] })
                }
                options={[
                  { value: 'daily', label: 'يومية' },
                  { value: 'weekly', label: 'أسبوعية' },
                  { value: 'monthly', label: 'شهرية' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="اختر نوع التكرار"
              />
            </div>

            {isGovSettlementTemplate && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">يوم التسوية المطلوب *</label>
                <SearchableSelect
                  value={String(formData.settlementOffsetDays)}
                  onChange={(val) => setFormData({ ...formData, settlementOffsetDays: parseInt(val, 10) })}
                  options={settlementOffsetOptions}
                  getOptionLabel={(opt: any) => opt.label}
                  getOptionValue={(opt: any) => String(opt.value)}
                  placeholder="اختر تسوية..."
                  searchPlaceholder="ابحث..."
                />
                <p className="text-xs text-slate-500">
                  مثال: عند اختيار الأربعاء و«تسوية اليوم الذي يسبقه» تُنشأ مهمة تطلب تسوية الثلاثاء. يمكن إنشاء عدة جداول لنفس القالب (تسوية نفس اليوم، اليوم السابق، إلخ) ليوم واحد.
                </p>
              </div>
            )}

            {formData.frequencyType === 'daily' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">أيام الأسبوع *</label>
                <div className="grid grid-cols-4 gap-2">
                  {days.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                      onClick={() => toggleDay(day.value)}
                      className="w-full"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {formData.frequencyType === 'weekly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">يوم الأسبوع *</label>
                <SearchableSelect
                  value={formData.dayOfWeekSingle.toString()}
                  onChange={(val) => setFormData({ ...formData, dayOfWeekSingle: parseInt(val) })}
                  options={days}
                  getOptionLabel={(opt: any) => opt.label}
                  getOptionValue={(opt: any) => opt.value.toString()}
                  placeholder="اختر يوم الأسبوع"
                />
              </div>
            )}

            {formData.frequencyType === 'monthly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">يوم الشهر *</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">وقت الاستحقاق *</label>
                <Input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">دقائق السماح</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.graceMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, graceMinutes: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">المسؤول الافتراضي</label>
              <SearchableSelect
                value={formData.defaultAssigneeUserId}
                onChange={(val) => setFormData({ ...formData, defaultAssigneeUserId: val })}
                options={[{ id: '', name: '— لا يوجد —' }, ...users]}
                getOptionLabel={(opt: any) => opt.name}
                getOptionValue={(opt: any) => opt.id?.toString() || ''}
                placeholder="— لا يوجد —"
                searchPlaceholder="ابحث عن موظف..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="custom-checkbox"
              />
              <label htmlFor="active" className="text-sm font-medium cursor-pointer text-slate-700">
                نشط
              </label>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createSchedule.isPending || updateSchedule.isPending}
                className="rounded-xl font-semibold"
                style={{ background: 'linear-gradient(135deg, #026174, #068294)' }}
              >
                {createSchedule.isPending || updateSchedule.isPending
                  ? 'جاري الحفظ...'
                  : editingSchedule
                  ? 'تحديث'
                  : 'إنشاء'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

export default SchedulesV2;
