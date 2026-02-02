import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { FileSpreadsheet, Save, RefreshCw, Percent, Banknote, Calculator } from 'lucide-react';
import { useHasPermission } from '@/hooks/useHasPermission';

const defaultSettings = {
  amount: { msg_type_negative: 'MSTPFRCB', tran_type_positive: 774 },
  fees: {
    min_amount: 5000,
    mcc_special: 5542,
    mcc_special_date_from: '2026-01-01',
    mcc_special_rate: 0.005,
    mcc_special_max_fee: 10000,
    mcc_special_max_amount: 1428571,
    mcc_5542_rate: 0.007,
    mcc_5542_max_fee: 10000,
    mcc_5542_max_amount: 1428571,
    default_rate: 0.01,
    default_max_fee: 10000,
    default_max_amount: 1000000,
    precision_decimals: 6,
  },
  acq: { pos_rate: 0.7, non_pos_rate: 0.65 },
  match_tolerance: 0.0001,
};

export function RtgsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useHasPermission('rtgs_settings', 'edit');
  const [formData, setFormData] = useState<typeof defaultSettings>(defaultSettings);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['rtgs-settings'],
    queryFn: async () => {
      const response = await api.get('/rtgs/settings');
      return response.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        amount: { ...defaultSettings.amount, ...(settings.amount || {}) },
        fees: { ...defaultSettings.fees, ...(settings.fees || {}) },
        acq: { ...defaultSettings.acq, ...(settings.acq || {}) },
        match_tolerance: settings.match_tolerance ?? defaultSettings.match_tolerance,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: typeof defaultSettings) => {
      const response = await api.put('/rtgs/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtgs-settings'] });
      toast({ title: 'نجح', description: 'تم حفظ إعدادات احتساب RTGS بنجاح' });
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

  const updateField = (section: string, field: string, value: number | string) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...(prev as any)[section], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      className="rounded-xl p-5 border-2 mb-5"
      style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
        </div>
        <h2 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>{title}</h2>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>{children}</div>
    </div>
  );

  const NumInput = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    hint,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    hint?: string;
  }) => (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-strong)' }}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="ds-input w-full py-2 px-3 rounded-lg border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 text-sm"
        dir="ltr"
      />
      {hint && <p className="text-xs mt-0.5 m-0" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-8" dir="rtl" style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      <div className="mx-auto" style={{ maxWidth: '900px' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-header-teal rounded-xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FileSpreadsheet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold m-0 text-white">إعدادات احتساب RTGS</h1>
              <p className="text-sm opacity-95 mt-1 m-0 text-white">عوامل احتساب العمولة و ACQ — تُستخدم في الاستيراد والعرض والتقارير</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-6 border-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-2">
            <Section icon={Banknote} title="حساب المبلغ (Amount)">
              <div>
                <label className="block text-sm font-semibold mb-1">MESSAGETYPE للمبلغ السالب</label>
                <input type="text" value={formData.amount.msg_type_negative} onChange={(e) => updateField('amount', 'msg_type_negative', e.target.value)} className="ds-input w-full py-2 px-3 rounded-lg text-sm" dir="ltr" />
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>إذا كان MESSAGETYPE هذا → amount = -TRANSACTIONAMOUNT</p>
              </div>
              <NumInput label="TRANTYPE للمبلغ الموجب" value={formData.amount.tran_type_positive} onChange={(v) => updateField('amount', 'tran_type_positive', v)} hint="إذا كان TRANTYPE هذا → amount موجب" />
            </Section>

            <Section icon={Percent} title="العمولة (Fees)">
              <NumInput label="الحد الأدنى للمبلغ (IQD)" value={formData.fees.min_amount} onChange={(v) => updateField('fees', 'min_amount', v)} hint="أقل من هذا → العمولة = 0" />
              <NumInput label="MCC الخاص (مثلاً 5542)" value={formData.fees.mcc_special} onChange={(v) => updateField('fees', 'mcc_special', v)} />
              <div>
                <label className="block text-sm font-semibold mb-1">من تاريخ (MCC الخاص)</label>
                <input type="date" value={formData.fees.mcc_special_date_from} onChange={(e) => updateField('fees', 'mcc_special_date_from', e.target.value)} className="ds-input w-full py-2 px-3 rounded-lg text-sm" dir="ltr" />
              </div>
              <NumInput label="نسبة MCC الخاص بعد التاريخ" value={formData.fees.mcc_special_rate} onChange={(v) => updateField('fees', 'mcc_special_rate', v)} step={0.001} hint="مثلاً 0.005 = 0.5%" />
              <NumInput label="الحد الأقصى للعمولة (MCC خاص)" value={formData.fees.mcc_special_max_fee} onChange={(v) => updateField('fees', 'mcc_special_max_fee', v)} />
              <NumInput label="الحد الأقصى للمبلغ (MCC خاص)" value={formData.fees.mcc_special_max_amount} onChange={(v) => updateField('fees', 'mcc_special_max_amount', v)} />
              <NumInput label="نسبة MCC 5542 قبل التاريخ" value={formData.fees.mcc_5542_rate} onChange={(v) => updateField('fees', 'mcc_5542_rate', v)} step={0.001} hint="مثلاً 0.007 = 0.7%" />
              <NumInput label="الحد الأقصى للعمولة (MCC 5542)" value={formData.fees.mcc_5542_max_fee} onChange={(v) => updateField('fees', 'mcc_5542_max_fee', v)} />
              <NumInput label="الحد الأقصى للمبلغ (MCC 5542)" value={formData.fees.mcc_5542_max_amount} onChange={(v) => updateField('fees', 'mcc_5542_max_amount', v)} />
              <NumInput label="النسبة الافتراضية" value={formData.fees.default_rate} onChange={(v) => updateField('fees', 'default_rate', v)} step={0.001} hint="مثلاً 0.01 = 1%" />
              <NumInput label="الحد الأقصى للعمولة (افتراضي)" value={formData.fees.default_max_fee} onChange={(v) => updateField('fees', 'default_max_fee', v)} />
              <NumInput label="الحد الأقصى للمبلغ (افتراضي)" value={formData.fees.default_max_amount} onChange={(v) => updateField('fees', 'default_max_amount', v)} />
              <NumInput label="منازل عشرية للدقة" value={formData.fees.precision_decimals} onChange={(v) => updateField('fees', 'precision_decimals', v)} min={2} max={8} hint="عدد المنازل بعد الفاصلة" />
            </Section>

            <Section icon={Calculator} title="عمولة المحصل (ACQ)">
              <NumInput label="نسبة POS" value={formData.acq.pos_rate} onChange={(v) => updateField('acq', 'pos_rate', v)} min={0} max={1} step={0.01} hint="مثلاً 0.7 = 70%" />
              <NumInput label="نسبة غير POS" value={formData.acq.non_pos_rate} onChange={(v) => updateField('acq', 'non_pos_rate', v)} min={0} max={1} step={0.01} hint="مثلاً 0.65 = 65%" />
            </Section>

            <Section icon={FileSpreadsheet} title="مطابقة CT">
              <NumInput label="هامش التطابق" value={formData.match_tolerance} onChange={(v) => setFormData((p) => ({ ...p, match_tolerance: v }))} step={0.0001} hint="إذا الفرق أقل من هذا → مطابق" />
            </Section>

            <div className="flex gap-3 flex-wrap pt-4 border-t-2" style={{ borderColor: 'var(--border-card)' }}>
              {canEdit && (
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="ds-btn ds-btn-primary px-6 py-2.5 rounded-xl font-semibold shadow-lg flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}
              >
                {updateSettings.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />جاري الحفظ...</> : <><Save className="h-4 w-4" />حفظ</>}
              </button>
              )}
              <a href="/rtgs" className="ds-btn ds-btn-outline px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                صفحة RTGS
              </a>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
