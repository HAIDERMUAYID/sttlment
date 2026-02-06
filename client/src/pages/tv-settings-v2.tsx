import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Tv, Save, RefreshCw, Users, Banknote, LayoutDashboard, GripVertical, ArrowUp, ArrowDown, Timer } from 'lucide-react';
import { useHasPermission } from '@/hooks/useHasPermission';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_ENABLED_SLIDES: Record<string, boolean> = {
  opening: true,
  overview: true,
  scheduledTasks: true,
  additionalTasks: true,
  employee: true,
  employeeMonthly: true,
  overdue: true,
  attendance: true,
  coverage: true,
  categories: true,
  recognition: true,
  rtgsImportsToday: true,
  rtgsSettlementsByImport: true,
  ctMatching: true,
  governmentSettlements: true,
  governmentSettlementCards: true,
  settlementsMatchingOverview: true,
  monthlyScheduledByCategory: true,
  monthlyAdditionalByEmployee: true,
  departmentMonthlyOverview: true,
};

function SortableSlideRow({
  id,
  index,
  label,
  isEnabled,
  duration,
  canEdit,
  onDurationChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  index: number;
  label: string;
  isEnabled: boolean;
  duration: number;
  canEdit: boolean;
  onDurationChange: (v: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: isEnabled ? 'var(--primary-600)' : 'var(--border-card)',
        background: isEnabled ? 'rgba(2, 97, 116, 0.05)' : '#fafbfc',
        opacity: isEnabled ? 1 : 0.5,
        zIndex: isDragging ? 50 : undefined,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
      }}
      className="flex items-center gap-3 p-3 rounded-lg border-2"
    >
      <span className="text-sm font-bold" style={{ color: 'var(--text-muted)', minWidth: '2rem' }}>{index + 1}</span>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-black/5" title="اسحب لتغيير الترتيب">
        <GripVertical className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
      </div>
      <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Timer className="w-4 h-4" />
          <input
            type="number"
            min={3}
            max={300}
            value={duration}
            onChange={(e) => onDurationChange(parseInt(e.target.value, 10) || 10)}
            disabled={!canEdit}
            className="w-16 py-1 px-2 rounded border text-center text-sm"
            dir="ltr"
          />
          <span>ث</span>
        </label>
      </div>
      <div className="flex gap-1">
        <button type="button" onClick={onMoveUp} disabled={!canEdit || !canMoveUp} className="p-1.5 rounded-lg border-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors" style={{ borderColor: 'var(--border-card)' }} title="تحريك لأعلى">
          <ArrowUp className="w-4 h-4" style={{ color: 'var(--text)' }} />
        </button>
        <button type="button" onClick={onMoveDown} disabled={!canEdit || !canMoveDown} className="p-1.5 rounded-lg border-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors" style={{ borderColor: 'var(--border-card)' }} title="تحريك لأسفل">
          <ArrowDown className="w-4 h-4" style={{ color: 'var(--text)' }} />
        </button>
      </div>
    </div>
  );
}

const SLIDE_GROUPS = [
  {
    label: 'عام',
    items: [
      { key: 'opening', label: 'الافتتاحية' },
      { key: 'overview', label: 'النظرة العامة' },
    ],
  },
  {
    label: 'المهام',
    items: [
      { key: 'scheduledTasks', label: 'المهام المجدولة' },
      { key: 'additionalTasks', label: 'المهام الإضافية' },
      { key: 'overdue', label: 'المهام المتأخرة' },
      { key: 'departmentMonthlyOverview', label: 'إنجازات القسم الشهرية — جميع الموظفين' },
      { key: 'monthlyScheduledByCategory', label: 'إنجازات الشهر — حسب الفئة' },
      { key: 'monthlyAdditionalByEmployee', label: 'المهام الإضافية الشهرية — حسب الموظف' },
    ],
  },
  {
    label: 'الموظفين',
    items: [
      { key: 'employee', label: 'شريحة الموظف (يومي)' },
      { key: 'employeeMonthly', label: 'شريحة الموظف (شهري)' },
      { key: 'attendance', label: 'الحضور' },
      { key: 'coverage', label: 'التغطية' },
      { key: 'categories', label: 'الفئات' },
      { key: 'recognition', label: 'أفضل الأداء' },
    ],
  },
  {
    label: 'التسويات والـ RTGS',
    items: [
      { key: 'settlementsMatchingOverview', label: 'التسويات والمطابقة — شاملة (KPI + حسب المصرف)' },
      { key: 'rtgsImportsToday', label: 'استيراد RTGS اليوم' },
      { key: 'rtgsSettlementsByImport', label: 'كروت التسويات (حسب التحميل)' },
      { key: 'ctMatching', label: 'مطابقة CT' },
      { key: 'governmentSettlements', label: 'التسوية الحكومية' },
      { key: 'governmentSettlementCards', label: 'كروت التسويات (جميع المصارف)' },
    ],
  },
];

export function TVSettingsV2() {
  const { toast } = useToast();
  const canEdit = useHasPermission('tv_settings', 'edit');
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    refreshInterval: 30,
    slideInterval: 10,
    visitorMode: false,
    rtgsDisplayMode: 'by_import_date' as string,
    rtgsImportDateRange: 3,
    enabledSlides: { ...DEFAULT_ENABLED_SLIDES } as Record<string, boolean>,
    visibleEmployeeIds: [] as number[],
    visibleBankNames: [] as string[],
    slideOrder: [] as string[],
    slideDurations: {} as Record<string, number>,
    settlementCardsDateMode: 'previous_day' as 'previous_day' | 'today' | 'custom',
    settlementCardsCustomDate: '' as string,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tv-settings'],
    queryFn: async () => {
      const response = await api.get('/tv-dashboard/settings');
      return response.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users-employees'],
    queryFn: async () => {
      const response = await api.get('/users');
      return (response.data || []).filter((u: { role?: string; active?: boolean }) => u.role === 'employee' && u.active !== false);
    },
  });

  const { data: bankOptions = [] } = useQuery({
    queryKey: ['rtgs-bank-names'],
    queryFn: async () => {
      try {
        const res = await api.get('/rtgs/bank-names');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (settings) {
      const allSlideKeys = SLIDE_GROUPS.flatMap(g => g.items.map(i => i.key));
      const savedOrder = Array.isArray(settings.slideOrder) ? settings.slideOrder : [];
      const slideOrder = savedOrder.length > 0 ? savedOrder : allSlideKeys;
      const defaultDurations: Record<string, number> = {};
      allSlideKeys.forEach(k => { defaultDurations[k] = settings.slideInterval ?? 10; });
      const slideDurations = { ...defaultDurations, ...(settings.slideDurations || {}) };

      setFormData({
        refreshInterval: settings.refreshInterval ?? 30,
        slideInterval: settings.slideInterval ?? 10,
        visitorMode: !!settings.visitorMode,
        rtgsDisplayMode: settings.rtgsDisplayMode || 'by_import_date',
        rtgsImportDateRange: Math.min(7, Math.max(1, parseInt(settings.rtgsImportDateRange, 10) || 3)),
        enabledSlides: { ...DEFAULT_ENABLED_SLIDES, ...(settings.enabledSlides || {}) },
        visibleEmployeeIds: Array.isArray(settings.visibleEmployeeIds) ? settings.visibleEmployeeIds.map((id: unknown) => Number(id)).filter((n) => !isNaN(n)) : [],
        visibleBankNames: Array.isArray(settings.visibleBankNames) ? settings.visibleBankNames.map((s) => String(s).trim()).filter(Boolean) : [],
        slideOrder,
        slideDurations,
        settlementCardsDateMode: settings.settlementCardsDateMode || 'previous_day',
        settlementCardsCustomDate: settings.settlementCardsCustomDate || '',
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.put('/tv-dashboard/settings', {
        refreshInterval: data.refreshInterval,
        slideInterval: data.slideInterval,
        visitorMode: data.visitorMode,
        rtgsDisplayMode: data.rtgsDisplayMode,
        rtgsImportDateRange: data.rtgsImportDateRange,
        enabledSlides: data.enabledSlides,
        visibleEmployeeIds: data.visibleEmployeeIds,
        visibleBankNames: data.visibleBankNames,
        slideOrder: data.slideOrder,
        slideDurations: data.slideDurations,
        settlementCardsDateMode: data.settlementCardsDateMode,
        settlementCardsCustomDate: data.settlementCardsCustomDate,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-settings'] });
      toast({
        title: 'نجح',
        description: 'تم حفظ الإعدادات بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings.mutateAsync(formData);
  };

  const toggleSlide = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledSlides: { ...prev.enabledSlides, [key]: !prev.enabledSlides[key] },
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveSlide = (key: string, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const currentOrder = [...prev.slideOrder];
      const currentIndex = currentOrder.indexOf(key);
      if (currentIndex === -1) return prev;
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= currentOrder.length) return prev;
      [currentOrder[currentIndex], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[currentIndex]];
      return { ...prev, slideOrder: currentOrder };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    setFormData((prev) => {
      const idx = prev.slideOrder.indexOf(activeId);
      const overIdx = prev.slideOrder.indexOf(overId);
      if (idx === -1 || overIdx === -1) return prev;
      const next = arrayMove([...prev.slideOrder], idx, overIdx);
      return { ...prev, slideOrder: next };
    });
  };

  const setSlideDuration = (key: string, seconds: number) => {
    setFormData((prev) => ({
      ...prev,
      slideDurations: { ...prev.slideDurations, [key]: Math.max(3, Math.min(300, seconds)) },
    }));
  };

  const selectAllSlides = (val: boolean) => {
    const next: Record<string, boolean> = {};
    Object.keys(formData.enabledSlides).forEach((k) => (next[k] = val));
    setFormData((prev) => ({ ...prev, enabledSlides: next }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" dir="rtl" style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="page-header-teal rounded-xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Tv className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold m-0 text-white">إعدادات لوحة التحكم التلفزيونية</h1>
              <p className="text-sm opacity-95 mt-1 m-0 text-white">إدارة الصفحات — اختر ما يظهر وما لا يظهر على شاشة TV</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* إدارة الصفحات — اختر ما يظهر في TV */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                    <LayoutDashboard className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
                  </div>
                  <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>إدارة الصفحات</h2>
                </div>
                <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>اختر الصفحات التي تظهر في TV — الصفحة المفعّلة تظهر، والمعطّلة لا تظهر</p>
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--primary-600)' }}>
                  {Object.values(formData.enabledSlides).filter(Boolean).length} من {Object.keys(formData.enabledSlides).length} صفحة مفعّلة
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => selectAllSlides(true)} className="text-sm px-3 py-1.5 rounded-lg border-2 font-medium" style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-600)' }}>
                  إظهار الكل
                </button>
                <button type="button" onClick={() => selectAllSlides(false)} className="text-sm px-3 py-1.5 rounded-lg border-2 font-medium" style={{ borderColor: 'var(--border-card)' }}>
                  إخفاء الكل
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SLIDE_GROUPS.map((grp) => (
                <div key={grp.label} className="rounded-xl p-4 border-2" style={{ borderColor: 'var(--border-card)', background: '#fafbfc' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-strong)' }}>{grp.label}</h3>
                  <div className="space-y-2">
                    {grp.items.map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData.enabledSlides[item.key]}
                          onChange={() => toggleSlide(item.key)}
                          disabled={!canEdit}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: 'var(--primary-600)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ترتيب الصفحات */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                <GripVertical className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>ترتيب الصفحات</h2>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>رتّب الصفحات حسب التسلسل المطلوب — استخدم الأسهم للتحريك لأعلى أو لأسفل</p>
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>اسحب الصفحات لتغيير الترتيب — أو استخدم الأسهم — حدّد الوقت (ثانية) لكل صفحة</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={formData.slideOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {formData.slideOrder.map((key, index) => {
                    const slideInfo = SLIDE_GROUPS.flatMap(g => g.items).find(item => item.key === key);
                    if (!slideInfo) return null;
                    const isEnabled = formData.enabledSlides[key];
                    const duration = formData.slideDurations[key] ?? formData.slideInterval ?? 10;
                    return (
                      <SortableSlideRow
                        key={key}
                        id={key}
                        index={index}
                        label={slideInfo.label}
                        isEnabled={isEnabled}
                        duration={duration}
                        canEdit={canEdit}
                        onDurationChange={(v) => setSlideDuration(key, v)}
                        onMoveUp={() => moveSlide(key, 'up')}
                        onMoveDown={() => moveSlide(key, 'down')}
                        canMoveUp={index > 0}
                        canMoveDown={index < formData.slideOrder.length - 1}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>

          {/* الموظفين الظاهرين في TV */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                <Users className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>الموظفين الظاهرين في TV</h2>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>اختر الموظفين الذين تظهر شرائحهم — إذا لم تختر أحداً يُعرض الكل</p>
              </div>
              <div className="mr-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, visibleEmployeeIds: (employees || []).map((e: { id: number }) => e.id) }))}
                  disabled={!canEdit || !employees?.length}
                  className="text-sm px-3 py-1 rounded-lg border-2"
                  style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-600)' }}
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, visibleEmployeeIds: [] }))}
                  disabled={!canEdit}
                  className="text-sm px-3 py-1 rounded-lg border-2"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  إلغاء التصفية (عرض الكل)
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {(employees || []).map((emp: { id: number; name: string }) => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border-2" style={{ borderColor: formData.visibleEmployeeIds.includes(emp.id) ? 'var(--primary-600)' : 'var(--border-card)', background: formData.visibleEmployeeIds.includes(emp.id) ? 'rgba(2, 97, 116, 0.08)' : '#fafbfc' }}>
                  <input
                    type="checkbox"
                  checked={formData.visibleEmployeeIds.length === 0 || formData.visibleEmployeeIds.includes(emp.id)}
                  onChange={() => {
                      const allIds = (employees || []).map((e: { id: number }) => e.id);
                      if (formData.visibleEmployeeIds.length === 0) {
                        setFormData((prev) => ({ ...prev, visibleEmployeeIds: allIds.filter((id: number) => id !== emp.id) }));
                      } else if (formData.visibleEmployeeIds.includes(emp.id)) {
                        setFormData((prev) => ({ ...prev, visibleEmployeeIds: prev.visibleEmployeeIds.filter((id) => id !== emp.id) }));
                      } else {
                        setFormData((prev) => ({ ...prev, visibleEmployeeIds: [...prev.visibleEmployeeIds, emp.id] }));
                      }
                    }}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--primary-600)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{emp.name}</span>
                </label>
              ))}
            </div>
          </motion.div>

          {/* المصارف الظاهرة في كروت التسويات */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                <Banknote className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>المصارف الظاهرة في كروت التسويات</h2>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>اختر المصارف التي تظهر في كروت التسويات — إذا لم تختر أحداً تُعرض الكل</p>
              </div>
              <div className="mr-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, visibleBankNames: [...(bankOptions || [])] }))}
                  disabled={!canEdit || !bankOptions?.length}
                  className="text-sm px-3 py-1 rounded-lg border-2"
                  style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-600)' }}
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, visibleBankNames: [] }))}
                  disabled={!canEdit}
                  className="text-sm px-3 py-1 rounded-lg border-2"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  إلغاء التصفية (عرض الكل)
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {(bankOptions || []).map((bank: string) => (
                <label key={bank} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border-2" style={{ borderColor: formData.visibleBankNames.includes(bank) ? 'var(--primary-600)' : 'var(--border-card)', background: formData.visibleBankNames.includes(bank) ? 'rgba(2, 97, 116, 0.08)' : '#fafbfc' }}>
                  <input
                    type="checkbox"
                    checked={formData.visibleBankNames.length === 0 || formData.visibleBankNames.includes(bank)}
                    onChange={() => {
                      const allBanks = [...(bankOptions || [])];
                      if (formData.visibleBankNames.length === 0) {
                        setFormData((prev) => ({ ...prev, visibleBankNames: allBanks.filter((b) => b !== bank) }));
                      } else if (formData.visibleBankNames.includes(bank)) {
                        setFormData((prev) => ({ ...prev, visibleBankNames: prev.visibleBankNames.filter((b) => b !== bank) }));
                      } else {
                        setFormData((prev) => ({ ...prev, visibleBankNames: [...prev.visibleBankNames, bank] }));
                      }
                    }}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--primary-600)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{bank}</span>
                </label>
              ))}
            </div>
          </motion.div>

          {/* RTGS والتسويات */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                <Banknote className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              </div>
              <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>RTGS والتسويات</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>عرض التسويات حسب</label>
                <select
                  value={formData.rtgsDisplayMode}
                  onChange={(e) => setFormData({ ...formData, rtgsDisplayMode: e.target.value })}
                  disabled={!canEdit}
                  className="w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20"
                >
                  <option value="by_import_date">تاريخ تحميل الملف</option>
                  <option value="by_sttl_date">تاريخ التسوية</option>
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>التسوية تنزل غالباً بعد يوم — اعتماد تاريخ التحميل أنسب</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>نطاق أيام عرض الاستيراد</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={formData.rtgsImportDateRange}
                  onChange={(e) => setFormData({ ...formData, rtgsImportDateRange: Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 3)) })}
                  disabled={!canEdit}
                  className="w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 max-w-xs"
                  dir="ltr"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>عرض استيرادات آخر 1–7 أيام</p>
              </div>
              <div className="md:col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--border-card)' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>تاريخ عرض كروت التسويات (جميع المصارف)</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="settlementCardsDate" checked={formData.settlementCardsDateMode === 'previous_day'} onChange={() => setFormData({ ...formData, settlementCardsDateMode: 'previous_day' })} disabled={!canEdit} className="w-4 h-4" style={{ accentColor: 'var(--primary-600)' }} />
                    <span className="text-sm" style={{ color: 'var(--text)' }}>اليوم السابق (تلقائي)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="settlementCardsDate" checked={formData.settlementCardsDateMode === 'today'} onChange={() => setFormData({ ...formData, settlementCardsDateMode: 'today' })} disabled={!canEdit} className="w-4 h-4" style={{ accentColor: 'var(--primary-600)' }} />
                    <span className="text-sm" style={{ color: 'var(--text)' }}>اليوم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="settlementCardsDate" checked={formData.settlementCardsDateMode === 'custom'} onChange={() => setFormData({ ...formData, settlementCardsDateMode: 'custom' })} disabled={!canEdit} className="w-4 h-4" style={{ accentColor: 'var(--primary-600)' }} />
                    <span className="text-sm" style={{ color: 'var(--text)' }}>تاريخ محدد:</span>
                  </label>
                  <input
                    type="date"
                    value={formData.settlementCardsCustomDate}
                    onChange={(e) => setFormData({ ...formData, settlementCardsCustomDate: e.target.value })}
                    disabled={!canEdit || formData.settlementCardsDateMode !== 'custom'}
                    className="py-2 px-3 rounded-lg border-2 text-sm"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>اختر تاريخ عرض كروت التسويات — الافتراضي: اليوم السابق (مثال: اليوم 2 يعرض كروت يوم 1)</p>
              </div>
            </div>
          </motion.div>

          {/* التوقيت والعرض */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-6 border-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
                <Tv className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
              </div>
              <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>التوقيت والعرض</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>فترة تحديث البيانات (ثانية)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={formData.refreshInterval}
                  onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 30 })}
                  disabled={!canEdit}
                  className="w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 max-w-xs"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>فترة تبديل الشرائح (ثانية)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={formData.slideInterval}
                  onChange={(e) => setFormData({ ...formData, slideInterval: parseInt(e.target.value) || 10 })}
                  disabled={!canEdit}
                  className="w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 max-w-xs"
                  dir="ltr"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.visitorMode}
                    onChange={(e) => setFormData({ ...formData, visitorMode: e.target.checked })}
                    disabled={!canEdit}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--primary-600)' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>وضع الزائر — إخفاء الأسماء والبيانات الحساسة</span>
                </label>
                <p className="text-xs mt-1 mr-8" style={{ color: 'var(--text-muted)' }}>يمكن أيضاً تفعيله عبر /tv?visitor=1</p>
              </div>
            </div>
          </motion.div>

          <div className="flex gap-3 flex-wrap">
            {canEdit && (
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="px-6 py-2.5 rounded-xl font-semibold shadow-lg flex items-center gap-2 text-white"
                style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
              >
                {updateSettings.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    حفظ الإعدادات
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open('/tv', '_blank')}
              className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 border-2"
              style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-600)' }}
            >
              <Tv className="h-4 w-4" />
              فتح لوحة التحكم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
