import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Plus, Edit, Trash2, FileText, FolderTree, Search, Filter, X, Hash, Layers, LayoutGrid, Table2 } from 'lucide-react';
import { CompanyLogo } from '@/components/CompanyLogo';
import { KpiCards } from '@/components/KpiCards';
import { useHasPermission } from '@/hooks/useHasPermission';

export function TemplatesV2() {
  const { toast } = useToast();
  const canCreate = useHasPermission('templates', 'create');
  const canEdit = useHasPermission('templates', 'edit');
  const canDelete = useHasPermission('templates', 'delete');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    description: '',
    active: true,
    bankDisplayName: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories?active=true');
      return response.data;
    },
  });

  const govSettlementCategoryName = 'التسوية الحكومية مع المصارف';
  const isGovSettlementCategory = formData.categoryId && categories.find((c: any) => c.id?.toString() === formData.categoryId)?.name === govSettlementCategoryName;

  const { data: banks = [] } = useQuery({
    queryKey: ['rtgs-settlement-maps'],
    queryFn: async () => {
      const res = await api.get('/rtgs/settlement-maps');
      return res.data || [];
    },
    enabled: Boolean(isGovSettlementCategory),
  });

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.get('/templates?active=true');
      return response.data;
    },
  });

  const handleOpenModal = (template?: any) => {
    if (template) {
      const rf = template.required_fields || {};
      setEditingTemplate(template);
      setFormData({
        title: template.title || '',
        categoryId: template.category_id?.toString() || '',
        description: template.description || '',
        active: template.active !== false,
        bankDisplayName: rf.bank_display_name || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        title: '',
        categoryId: '',
        description: '',
        active: true,
        bankDisplayName: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGovSettlementCategory && !formData.bankDisplayName) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المصرف لفئة التسوية الحكومية مع المصارف',
        variant: 'destructive',
      });
      return;
    }

    const title = isGovSettlementCategory && formData.bankDisplayName
      ? `${govSettlementCategoryName} / ${formData.bankDisplayName}`
      : formData.title.trim();
    if (!title) {
      toast({
        title: 'خطأ',
        description: 'عنوان القالب مطلوب أو اختر المصرف',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload: any = {
        title,
        description: formData.description,
        active: formData.active,
      };

      if (formData.categoryId) {
        payload.categoryId = parseInt(formData.categoryId);
      }

      if (isGovSettlementCategory && formData.bankDisplayName) {
        payload.requiredFields = {
          category_type: 'government_settlement_bank',
          bank_display_name: formData.bankDisplayName,
        };
      } else if (editingTemplate) {
        payload.requiredFields = null;
      }

      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
        toast({
          title: 'نجح',
          description: 'تم تحديث القالب بنجاح',
        });
      } else {
        await api.post('/templates', payload);
        toast({
          title: 'نجح',
          description: 'تم إنشاء القالب بنجاح',
        });
      }
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      try {
        await api.delete(`/templates/${id}`);
        toast({
          title: 'نجح',
          description: 'تم حذف القالب بنجاح',
        });
        refetch();
      } catch (error: any) {
        toast({
          title: 'خطأ',
          description: error.response?.data?.error || 'حدث خطأ',
          variant: 'destructive',
        });
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
  };

  const filteredTemplates = templates.filter((template: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        template.title?.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (filterStatus) {
      if (filterStatus === 'active' && !template.active) return false;
      if (filterStatus === 'inactive' && template.active) return false;
    }

    if (filterCategory) {
      if (template.category_id?.toString() !== filterCategory) return false;
    }

    return true;
  });

  const activeCount = templates.filter((t: any) => t.active).length;
  const inactiveCount = templates.filter((t: any) => !t.active).length;

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
            <h1 className="text-2xl font-bold m-0 text-white">قوالب المهام</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              إدارة قوالب المهام المستخدمة في الجداول الزمنية والمهام اليومية
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
              قالب جديد
            </button>
            )}
          </div>
        </div>

        <KpiCards
          items={[
            { label: 'إجمالي القوالب', value: templates.length, Icon: Hash, color: '#068294', glow: 'rgba(6, 130, 148, 0.4)', gradient: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
            { label: 'قوالب نشطة', value: activeCount, Icon: FileText, color: '#059669', glow: 'rgba(5, 150, 105, 0.4)', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
            { label: 'قوالب غير نشطة', value: inactiveCount, Icon: FileText, color: '#64748b', glow: 'rgba(100, 116, 139, 0.35)', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
            { label: 'الفئات', value: categories.length, Icon: Layers, color: '#0369a1', glow: 'rgba(3, 105, 161, 0.4)', gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالعنوان أو الوصف أو الفئة..."
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
                searchPlaceholder="ابحث عن الحالة..."
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
          </div>
          {(searchQuery || filterStatus || filterCategory) && (
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
                عرض {filteredTemplates.length} من {templates.length} قالب
              </span>
            </div>
          )}
        </div>

        {/* Templates Grid */}
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
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>جاري تحميل القوالب...</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
                <FileText className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>
                {templates.length === 0 ? 'لا توجد قوالب' : 'لا توجد نتائج تطابق البحث والفلاتر'}
              </p>
              {templates.length === 0 && canCreate && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="mt-5 ds-btn ds-btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء قالب جديد
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="ds-table w-full">
                <thead>
                  <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                    <th className="text-end py-4 px-4 font-bold text-white">العنوان</th>
                    <th className="text-end py-4 px-4 font-bold text-white">الفئة</th>
                    <th className="text-end py-4 px-4 font-bold text-white">الحالة</th>
                    <th className="text-end py-4 px-4 font-bold text-white">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template: any) => (
                    <tr key={template.id}>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-strong)' }}>{template.title}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{template.category_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: template.active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                            color: template.active ? 'var(--success)' : 'var(--text-muted)',
                          }}
                        >
                          {template.active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          {canEdit && (
                          <button type="button" onClick={() => handleOpenModal(template)} className="ds-btn ds-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-sm">
                            <Edit className="w-3.5 h-3.5" /> تعديل
                          </button>
                          )}
                          {canDelete && (
                          <button type="button" onClick={() => handleDelete(template.id)} className="ds-btn ds-btn-danger p-2 rounded-lg" title="حذف">
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
                  {filteredTemplates.map((template: any, index: number) => (
                    <motion.div
                      key={template.id}
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
                      {/* لمعان خفيف يمر على الكرت عند الـ hover */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl card-shine-hover"
                      />
                      {/* شريط جانبي — يفصل الكرت عن المجاور بتدرج تيل */}
                      <div
                        className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300"
                        style={{
                          right: 0,
                          background: 'linear-gradient(180deg, var(--primary-800), var(--primary-600), var(--primary-700))',
                          boxShadow: '0 0 12px rgba(8, 131, 149, 0.3)',
                        }}
                      />
                      {/* شريط علوي خفيف للتلميح */}
                      <div
                        className="absolute top-0 right-0 left-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(90deg, var(--primary-600), var(--primary-800))' }}
                      />
                      <div className="p-5 pl-5 pr-6 flex flex-col flex-1">
                        {/* Header: Title + Status */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3
                            className="text-lg font-bold leading-snug line-clamp-2 flex-1 min-w-0"
                            style={{ color: 'var(--text-strong)' }}
                          >
                            {template.title}
                          </h3>
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
                            style={{
                              background: template.active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                              color: template.active ? 'var(--success)' : 'var(--text-muted)',
                            }}
                          >
                            {template.active ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                        {/* Category */}
                        {template.category_name && (
                          <div
                            className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg mb-3 text-sm font-medium transition-transform duration-300 group-hover:scale-[1.02]"
                            style={{
                              background: 'rgba(8, 131, 149, 0.08)',
                              color: 'var(--primary-800)',
                            }}
                          >
                            <FolderTree className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-6" />
                            {template.category_name}
                          </div>
                        )}
                        {/* Description */}
                        {template.description && (
                          <p
                            className="text-sm leading-relaxed line-clamp-2 flex-1 mb-4"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {template.description}
                          </p>
                        )}
                        {/* Actions */}
                        <div className="flex gap-2 pt-4 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
                          {canEdit && (
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(template); }}
                            className="ds-btn ds-btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </motion.button>
                          )}
                          {canDelete && (
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
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
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CompanyLogo size="sm" animated={false} />
              <DialogTitle className="text-xl text-slate-900">
                {editingTemplate ? 'تعديل القالب' : 'قالب جديد'}
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {editingTemplate ? 'تعديل بيانات القالب المستخدم في الجداول الزمنية.' : 'إضافة قالب مهمة جديد. لفئة «التسوية الحكومية مع المصارف» اختر المصرف من قائمة RTGS.'}
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الفئة</label>
              <SearchableSelect
                value={formData.categoryId}
                onChange={(val) => setFormData({ ...formData, categoryId: val, bankDisplayName: '' })}
                options={[{ id: '', name: '— لا يوجد —' }, ...categories]}
                getOptionLabel={(opt: any) => opt.name}
                getOptionValue={(opt: any) => opt.id?.toString() || ''}
                placeholder="— لا يوجد —"
                searchPlaceholder="ابحث عن فئة..."
              />
            </div>

            {isGovSettlementCategory && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">المصرف * (نفس مصارف RTGS)</label>
                <SearchableSelect
                  value={formData.bankDisplayName}
                  onChange={(val) => setFormData({ ...formData, bankDisplayName: val })}
                  options={banks}
                  getOptionLabel={(opt: any) => opt.display_name_ar || opt.inst_id}
                  getOptionValue={(opt: any) => opt.display_name_ar || opt.inst_id}
                  placeholder="اختر المصرف..."
                  searchPlaceholder="ابحث عن مصرف..."
                />
                <p className="text-xs text-slate-500">سيظهر العنوان: التسويات الحكومية مع المصارف / [المصرف]</p>
              </div>
            )}

            {!isGovSettlementCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">عنوان القالب *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="أدخل عنوان القالب"
                  required
                  className="text-slate-800"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="أدخل وصف القالب..."
                className="text-slate-800"
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
                نشط (القالب متاح للاستخدام في الجداول)
              </label>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button
                type="submit"
                className="rounded-xl font-semibold"
                style={{ background: 'linear-gradient(135deg, #026174, #068294)' }}
              >
                {editingTemplate ? 'تحديث القالب' : 'إنشاء القالب'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
