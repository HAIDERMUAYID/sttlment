import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import { useHasPermission } from '@/hooks/useHasPermission';
import { useToast } from '@/hooks/use-toast';
import Loading from '../../components/Loading';
import { ChevronDown, Filter, X, Building2, Landmark, FileText, Search, MapPin, Briefcase, Users, Store } from 'lucide-react';
import { ExcelColumnFilter } from '@/components/ui/excel-column-filter';
import * as XLSX from 'xlsx';

/* سهم ناعم بجانب اسم العمود (يورث لون النص من الرأس) */
const ColHeader = ({ children }) => (
  <span className="inline-flex items-center gap-1">
    {children}
    <ChevronDown className="w-4 h-4 opacity-90 flex-shrink-0 text-current" strokeWidth={2.5} />
  </span>
);

/* زر فلتر Excel — يظهر في خلية رأس العمود */
const FilterTrigger = ({ value, label }) => {
  const count = value ? value.split(',').filter(Boolean).length : 0;
  const hasFilter = count > 0;
  return (
    <div
      className={`flex items-center gap-1.5 w-full min-w-0 py-1.5 px-2 rounded-md border transition-all cursor-pointer ${hasFilter ? 'merchant-filter-trigger-active' : 'merchant-filter-trigger'}`}
    >
      <Filter className={`w-3.5 h-3.5 flex-shrink-0 ${hasFilter ? 'text-[#026174]' : 'text-slate-500'}`} />
      <span className={`text-xs truncate ${hasFilter ? 'text-[#026174] font-medium' : 'text-slate-600'}`}>
        {count > 0 ? `${count} محدد` : label}
      </span>
    </div>
  );
};

const Merchants = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    governorate: '',
    ministry: '',
    bank_code: '',
    commission_type: ''
  });
  /* فلاتر أعمدة (قيم متعددة مفصولة بفاصلة) + فرز */
  const [columnFilters, setColumnFilters] = useState({
    merchant_id: '',
    governorate: '',
    ministry: '',
    directorate_name: '',
    bank_code: '',
    settlement_name: '',
    commission_type: '',
    device_count: '',
    iban: '',
    account_number: '',
    branch_name: ''
  });
  const [sortState, setSortState] = useState({ column: null, direction: null });
  const [filterOptions, setFilterOptions] = useState({
    governorates: [], ministries: [], bankCodes: [],
    merchantIds: [], directorates: [], settlements: [], deviceCounts: [], ibans: [], accountNumbers: [], branches: []
  });
  const { toast } = useToast();
  const canCreate = useHasPermission('merchants', 'create');
  const canEdit = useHasPermission('merchants', 'edit');
  const canDelete = useHasPermission('merchants', 'delete');
  const canImport = useHasPermission('merchants', 'import');
  const canExport = useHasPermission('merchants', 'export');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    merchant_id: '',
    governorate: '',
    ministry: '',
    directorate_name: '',
    details: '',
    device_count: 0,
    iban: '',
    account_key: '',
    account_number: '',
    branch_name: '',
    branch_number: '',
    bank_code: '',
    bank_name: '',
    bank_name_alt: '',
    iban_length_check: 23,
    notes: '',
    settlement_name: '',
    commission_type: 'حكومي'
  });

  useEffect(() => {
    fetchMerchants();
    fetchFilterOptions();
  }, [pagination.page, filters, columnFilters]);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const apiParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
        /* إرسال فلاتر الأعمدة للـ API — نُفضّل columnFilters عند وجوده */
        ...(columnFilters.merchant_id && { merchant_id: columnFilters.merchant_id }),
        ...(columnFilters.iban && { iban: columnFilters.iban }),
        ...(columnFilters.directorate_name && { directorate_name: columnFilters.directorate_name }),
        ...(columnFilters.settlement_name && { settlement_name: columnFilters.settlement_name }),
        ...(columnFilters.device_count && { device_count: columnFilters.device_count }),
        ...(columnFilters.account_number && { account_number: columnFilters.account_number }),
        ...(columnFilters.branch_name && { branch_name: columnFilters.branch_name }),
        ...((columnFilters.governorate || filters.governorate) && { governorate: columnFilters.governorate || filters.governorate }),
        ...((columnFilters.ministry || filters.ministry) && { ministry: columnFilters.ministry || filters.ministry }),
        ...((columnFilters.bank_code || filters.bank_code) && { bank_code: columnFilters.bank_code || filters.bank_code }),
        ...((columnFilters.commission_type || filters.commission_type) && { commission_type: columnFilters.commission_type || filters.commission_type }),
      };
      const params = new URLSearchParams(Object.fromEntries(Object.entries(apiParams).filter(([_, v]) => v != null && v !== '')));
      const response = await api.get(`/merchants?${params}`);
      setMerchants(response.data?.merchants || []);
      setPagination(response.data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching merchants:', error);
      const msg = error.response?.data?.error || error.response?.data?.details || error.message || 'خطأ في جلب التجار';
      const hint = !error.response ? ' (تحقق من الاتصال أو أعد تحميل الصفحة بعد ثوانٍ إن كانت الخدمة تستيقظ)' : '';
      toast({
        title: 'خطأ',
        description: msg + hint,
        variant: 'destructive'
      });
      setMerchants([]);
      setPagination({ page: 1, limit: 50, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/merchants/filter-options');
      const data = response.data || {};
      setFilterOptions({
        governorates: data.governorates || [],
        ministries: data.ministries || [],
        bankCodes: data.bankCodes || [],
        merchantIds: data.merchantIds || [],
        directorates: data.directorates || [],
        settlements: data.settlements || [],
        deviceCounts: data.deviceCounts || [],
        ibans: data.ibans || [],
        accountNumbers: data.accountNumbers || [],
        branches: data.branches || []
      });
    } catch (error) {
      console.error('خطأ في جلب خيارات الفلترة:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMerchant) {
        await api.put(`/merchants/${editingMerchant.id}`, formData);
        toast({
          title: 'نجح',
          description: 'تم تحديث التاجر بنجاح',
          variant: 'success'
        });
      } else {
        await api.post('/merchants', formData);
        toast({
          title: 'نجح',
          description: 'تم إضافة التاجر بنجاح',
          variant: 'success'
        });
      }
      setShowModal(false);
      resetForm();
      fetchMerchants();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (merchant) => {
    setEditingMerchant(merchant);
    setFormData({
      merchant_id: merchant.merchant_id || '',
      governorate: merchant.governorate || '',
      ministry: merchant.ministry || '',
      directorate_name: merchant.directorate_name || '',
      details: merchant.details || '',
      device_count: merchant.device_count || 0,
      iban: merchant.iban || '',
      account_key: merchant.account_key || '',
      account_number: merchant.account_number || '',
      branch_name: merchant.branch_name || '',
      branch_number: merchant.branch_number || '',
      bank_code: merchant.bank_code || '',
      bank_name: merchant.bank_name || '',
      bank_name_alt: merchant.bank_name_alt || '',
      iban_length_check: merchant.iban_length_check || 23,
      notes: merchant.notes || '',
      settlement_name: merchant.settlement_name || '',
      commission_type: merchant.commission_type || 'حكومي'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التاجر؟')) return;
    try {
      await api.delete(`/merchants/${id}`);
      toast({
        title: 'نجح',
        description: 'تم حذف التاجر بنجاح',
        variant: 'success'
      });
      fetchMerchants();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive'
      });
    }
  };

  // معالجة رفع ملف Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      toast({
        title: 'خطأ',
        description: 'يرجى رفع ملف Excel (.xlsx, .xls) أو CSV',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // قراءة أول ورقة عمل
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // تحويل إلى JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' // القيمة الافتراضية للخلايا الفارغة
        });

        if (jsonData.length < 2) {
          toast({
            title: 'خطأ',
            description: 'الملف فارغ أو لا يحتوي على بيانات',
            variant: 'destructive'
          });
          return;
        }

        // السطر الأول هو العناوين
        const headers = jsonData[0].map(h => String(h).trim());
        
        // التحقق من وجود عمود merchant_id
        const merchantIdIndex = headers.findIndex(h => 
          h && (h.toLowerCase().includes('merchant') && h.toLowerCase().includes('id')) ||
          h === 'Merchant ID' || h === 'merchant_id' || h === 'Merchant ID'
        );

        if (merchantIdIndex === -1) {
          toast({
            title: 'خطأ',
            description: 'لم يتم العثور على عمود Merchant ID في الملف',
            variant: 'destructive'
          });
          return;
        }

        // تحويل البيانات إلى كائنات
        const merchants = jsonData.slice(1)
          .filter(row => row && row[merchantIdIndex]) // تجاهل الصفوف الفارغة
          .map((row, index) => {
            const merchant = {};
            headers.forEach((header, idx) => {
              const value = row[idx];
              merchant[header] = value !== undefined && value !== null ? String(value).trim() : '';
            });
            merchant._rowNumber = index + 2; // رقم الصف في Excel (يبدأ من 2 لأن 1 هو العنوان)
            return merchant;
          });

        if (merchants.length === 0) {
          toast({
            title: 'خطأ',
            description: 'لا توجد بيانات صالحة في الملف',
            variant: 'destructive'
          });
          return;
        }

        // التحقق من التكرارات داخل الملف نفسه
        const merchantIds = merchants.map(m => {
          const merchantId = m[headers[merchantIdIndex]] || m['Merchant ID'] || m['merchant_id'];
          return merchantId;
        });
        const duplicates = merchantIds.filter((id, index) => merchantIds.indexOf(id) !== index);
        
        if (duplicates.length > 0) {
          const uniqueDuplicates = [...new Set(duplicates)];
          toast({
            title: 'تحذير',
            description: `تم العثور على تكرارات في الملف: ${uniqueDuplicates.join(', ')}. سيتم تجاهل التكرارات.`,
            variant: 'warning'
          });
        }

        // إزالة التكرارات من الملف
        const seenIds = new Set();
        const uniqueMerchants = merchants.filter(merchant => {
          const merchantId = merchant[headers[merchantIdIndex]] || merchant['Merchant ID'] || merchant['merchant_id'];
          if (!merchantId || seenIds.has(merchantId)) {
            return false;
          }
          seenIds.add(merchantId);
          return true;
        });

        setImportPreview({
          total: merchants.length,
          unique: uniqueMerchants.length,
          duplicates: merchants.length - uniqueMerchants.length,
          merchants: uniqueMerchants,
          headers
        });
      } catch (error) {
        console.error('Error reading file:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ في قراءة الملف. تأكد من أن الملف صحيح.',
          variant: 'destructive'
        });
      }
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // تنفيذ الاستيراد
  const handleImport = async () => {
    if (!importPreview || importPreview.merchants.length === 0) {
      toast({
        title: 'خطأ',
        description: 'لا توجد بيانات للاستيراد',
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    try {
      // تحويل البيانات إلى الصيغة المتوقعة من الـ backend
      const merchantsToImport = importPreview.merchants.map(merchant => {
        const merchantIdHeader = importPreview.headers.find(h => 
          h && (h.toLowerCase().includes('merchant') && h.toLowerCase().includes('id'))
        ) || 'Merchant ID';
        
        return {
          merchant_id: merchant[merchantIdHeader] || merchant['Merchant ID'] || merchant['merchant_id'],
          governorate: merchant['المحافظة'] || merchant['governorate'] || '',
          ministry: merchant['الوزارة'] || merchant['ministry'] || '',
          directorate_name: merchant['اسم المديرية'] || merchant['directorate_name'] || merchant['المديرية'] || '',
          details: merchant['التفاصيل'] || merchant['details'] || '',
          device_count: parseInt(merchant['عدد الأجهزة'] || merchant['device_count'] || 0),
          iban: merchant['IBAN'] || merchant['iban'] || '',
          account_key: merchant['key'] || merchant['account_key'] || '',
          account_number: merchant['رقم الحــــساب'] || merchant['رقم الحساب'] || merchant['account_number'] || '',
          branch_name: merchant['اسم الفرع'] || merchant['branch_name'] || '',
          branch_number: merchant['رقم الفرع'] || merchant['branch_number'] || '',
          bank_code: merchant['المصرف'] || merchant['bank_code'] || '',
          bank_name: merchant['المصرف2'] || merchant['bank_name'] || '',
          bank_name_alt: merchant['المصرف3'] || merchant['bank_name_alt'] || '',
          iban_length_check: parseInt(merchant['التحقق من طول الايبان'] || merchant['iban_length_check'] || 23),
          notes: merchant['الملاحظات'] || merchant['notes'] || '',
          settlement_name: merchant['اسم التسوية'] || merchant['settlement_name'] || '',
          commission_type: merchant['نوع العمولة'] || merchant['commission_type'] || 'حكومي'
        };
      });

      const response = await api.post('/merchants/import', { 
        merchants: merchantsToImport,
        rejectDuplicates: true // إرسال علامة لرفض التكرارات
      });

      // عرض تقرير مفصل
      if (response.data.errors && response.data.errors.length > 0) {
        const duplicateErrors = response.data.errors.filter(e => 
          e.error && e.error.includes('موجود') || e.error && e.error.includes('duplicate')
        );
        const otherErrors = response.data.errors.filter(e => 
          !e.error || (!e.error.includes('موجود') && !e.error.includes('duplicate'))
        );

        if (duplicateErrors.length > 0) {
          toast({
            title: 'تحذير',
            description: `تم رفض ${duplicateErrors.length} تاجر بسبب تكرار Merchant ID`,
            variant: 'warning'
          });
        }

        if (otherErrors.length > 0) {
          toast({
            title: 'تحذير',
            description: `فشل استيراد ${otherErrors.length} تاجر بسبب أخطاء أخرى`,
            variant: 'warning'
          });
        }
      }

      if (response.data.imported > 0) {
        toast({
          title: 'نجح',
          description: `تم استيراد ${response.data.imported} تاجر بنجاح`,
          variant: 'success'
        });
      }

      setShowImportModal(false);
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchMerchants();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ في الاستيراد',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setEditingMerchant(null);
    setFormData({
      merchant_id: '',
      governorate: '',
      ministry: '',
      directorate_name: '',
      details: '',
      device_count: 0,
      iban: '',
      account_key: '',
      account_number: '',
      branch_name: '',
      branch_number: '',
      bank_code: '',
      bank_name: '',
      bank_name_alt: '',
      iban_length_check: 23,
      notes: '',
      settlement_name: '',
      commission_type: 'حكومي'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
    /* تزامن مع filters للـ API */
    if (['governorate', 'ministry', 'bank_code', 'commission_type'].includes(key)) {
      const first = (value || '').split(',')[0]?.trim() || '';
      setFilters(prev => ({ ...prev, [key]: first }));
    }
    if (key === 'merchant_id') setFilters(prev => ({ ...prev, search: (value || '').split(',')[0]?.trim() || '' }));
  };

  const handleSortChange = (column, direction) => {
    setSortState({ column, direction });
  };

  /* تطبيق الفلاتر والفرز على بيانات الصفحة الحالية
   * ملاحظة: filters.search يُعالَج في الـ API (ILIKE)، فلا نطبّقه هنا كمطابقة تامّة حتى لا نخفي النتائج عند البحث الجزئي */
  const filteredMerchants = useMemo(() => {
    let list = merchants;
    const toSet = (v) => {
      const arr = (v || '').split(',').map(s => s.trim()).filter(Boolean);
      return arr.length ? new Set(arr) : null;
    };
    const applyCol = (getVal, filterVal) => {
      const s = toSet(filterVal);
      if (s) list = list.filter(m => s.has(String(getVal(m) || '')));
    };
    /* merchant_id: فقط من columnFilters (اختيار صريح)، لأن search يُطبَّق في API كـ ILIKE */
    applyCol(m => m.merchant_id, columnFilters.merchant_id);
    applyCol(m => m.governorate, columnFilters.governorate || filters.governorate);
    applyCol(m => m.ministry, columnFilters.ministry || filters.ministry);
    applyCol(m => m.directorate_name, columnFilters.directorate_name);
    applyCol(m => m.bank_code || m.bank_name, columnFilters.bank_code || filters.bank_code);
    applyCol(m => m.settlement_name, columnFilters.settlement_name);
    applyCol(m => m.commission_type, columnFilters.commission_type || filters.commission_type);
    applyCol(m => String(m.device_count), columnFilters.device_count);
    applyCol(m => m.iban, columnFilters.iban);
    applyCol(m => m.account_number, columnFilters.account_number);
    applyCol(m => m.branch_name, columnFilters.branch_name);

    /* فرز */
    if (sortState.column && sortState.direction) {
      const key = sortState.column;
      const dir = sortState.direction === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = a[key] ?? '';
        const vb = b[key] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return list;
  }, [merchants, filters, columnFilters, sortState]);

  const stats = useMemo(() => {
    const total = pagination.total || merchants.length || 0;
    const govCount = merchants.filter(m => m.commission_type === 'حكومي').length;
    const privateCount = merchants.filter(m => m.commission_type === 'خاص').length;
    const uniqueGovernorates = new Set(merchants.map(m => m.governorate).filter(Boolean)).size;
    return { total, govCount, privateCount, uniqueGovernorates };
  }, [merchants, pagination.total]);

  const hasActiveFilters =
    Object.values(filters).some(Boolean) ||
    Object.values(columnFilters).some(Boolean) ||
    sortState.column;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 100000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await api.get(`/merchants?${params.toString()}`);
      const allMerchants = response.data?.merchants || [];

      if (!allMerchants || allMerchants.length === 0) {
        toast({
          title: 'تنبيه',
          description: 'لا توجد بيانات حالياً للتصدير حسب الفلاتر الحالية',
          variant: 'warning'
        });
        return;
      }

      const govMerchants = allMerchants.filter(m => m.commission_type === 'حكومي');
      const privateMerchants = allMerchants.filter(m => m.commission_type === 'خاص');

      const mapExport = (list) =>
        list.map(m => ({
          'Merchant ID': m.merchant_id || '',
          'المحافظة': m.governorate || '',
          'الوزارة': m.ministry || '',
          'اسم المديرية': m.directorate_name || '',
          'التفاصيل': m.details || '',
          'عدد الأجهزة': m.device_count || 0,
          'IBAN': m.iban || '',
          'رقم الحساب': m.account_number || '',
          'اسم الفرع': m.branch_name || '',
          'رقم الفرع': m.branch_number || '',
          'كود المصرف': m.bank_code || '',
          'اسم المصرف': m.bank_name || '',
          'اسم التسوية': m.settlement_name || '',
          'نوع العمولة / القطاع': m.commission_type || ''
        }));

      const workbook = XLSX.utils.book_new();

      // ورقة لجميع البيانات حسب الفلاتر
      const allSheet = XLSX.utils.json_to_sheet(mapExport(allMerchants));
      XLSX.utils.book_append_sheet(workbook, allSheet, 'الكل');

      // ورقة للقطاع الحكومي
      if (govMerchants.length > 0) {
        const govSheet = XLSX.utils.json_to_sheet(mapExport(govMerchants));
        XLSX.utils.book_append_sheet(workbook, govSheet, 'حكومي');
      }

      // ورقة للقطاع الخاص
      if (privateMerchants.length > 0) {
        const privateSheet = XLSX.utils.json_to_sheet(mapExport(privateMerchants));
        XLSX.utils.book_append_sheet(workbook, privateSheet, 'خاص');
      }

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `merchants_${today}.xlsx`);

      toast({
        title: 'نجح',
        description: `تم تصدير ${allMerchants.length} تاجر إلى Excel (حسب الفلاتر الحالية)`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تصدير البيانات إلى Excel',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ padding: '1.5rem 2rem', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      <div className="mx-auto" style={{ width: '100%', maxWidth: '1400px' }}>
        {/* هيدر علوي */}
        <div
          className="page-header-teal rounded-xl flex flex-wrap items-center justify-between gap-4 p-5 mb-6"
          style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#ffffff', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}
        >
          <div>
            <h1 className="text-2xl font-bold m-0 text-white">إدارة التجار</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">إدارة حسابات الجهات الحكومية والقطاع الخاص، المصارف، وأرقام الحسابات المرتبطة بالتسويات.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canExport && <button type="button" onClick={handleExport} className="ds-btn ds-btn-outline px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] border-0 shadow">تصدير إلى Excel</button>}
            {canImport && <button type="button" onClick={() => setShowImportModal(true)} className="ds-btn ds-btn-primary px-4 py-2 rounded-full text-sm font-medium">استيراد من Excel</button>}
            {canCreate && <button type="button" onClick={() => { resetForm(); setShowModal(true); }} className="ds-btn ds-btn-primary px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] border-0 shadow hover:bg-white/95">إضافة تاجر جديد</button>}
          </div>
        </div>

        {/* كروت إحصائيات */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'إجمالي التجار', value: stats.total, Icon: Users, bg: 'linear-gradient(135deg, #eef9fb 0%, #e4f4f7 100%)', border: '#026174', iconBg: 'linear-gradient(135deg, #068294 0%, #026174 100%)', textColor: '#026174' },
            { label: 'تجار القطاع الحكومي', value: stats.govCount, Icon: Building2, bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#16a34a', iconBg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', textColor: '#15803d' },
            { label: 'تجار القطاع الخاص', value: stats.privateCount, Icon: Store, bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '#ea580c', iconBg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', textColor: '#c2410c' },
            { label: 'عدد المحافظات المغطّاة', value: stats.uniqueGovernorates, Icon: MapPin, bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#0284c7', iconBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', textColor: '#0369a1' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl p-5 border-2 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background: item.bg, borderColor: item.border, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.iconBg }}>
                  <item.Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-bold m-0 mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-2xl font-extrabold m-0 tabular-nums" style={{ color: item.textColor }} dir="ltr">{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* الفلاتر */}
        <div
          className="rounded-2xl p-5 mb-6 merchants-filter-card"
          style={{ background: 'linear-gradient(180deg, #eef9fb 0%, #ffffff 100%)', boxShadow: '0 6px 24px rgba(2, 97, 116, 0.12)', border: '2px solid #b8dce2' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                <Filter className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold" style={{ color: '#026174' }}>الفلاتر — إدارة التجار</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilters({ search: '', governorate: '', ministry: '', bank_code: '', commission_type: '' });
                setColumnFilters({ merchant_id: '', governorate: '', ministry: '', directorate_name: '', bank_code: '', settlement_name: '', commission_type: '', device_count: '', iban: '', account_number: '', branch_name: '' });
                setSortState({ column: null, direction: null });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              disabled={!hasActiveFilters}
              className="merchants-clear-filters-btn"
            >
              مسح الفلاتر
            </button>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(240px, 2fr) repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div className="merchants-filter-input-wrapper">
              <Search className="w-5 h-5 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <input type="text" placeholder="بحث باسم المديرية / Merchant ID / IBAN..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="merchants-filter-input" />
            </div>
            <div className="merchants-filter-select-wrapper">
              <MapPin className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <select value={filters.governorate} onChange={(e) => handleFilterChange('governorate', e.target.value)} className="merchants-filter-select">
                <option value="">جميع المحافظات</option>
                {filterOptions.governorates?.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="merchants-filter-select-wrapper">
              <Building2 className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <select value={filters.ministry} onChange={(e) => handleFilterChange('ministry', e.target.value)} className="merchants-filter-select">
                <option value="">جميع الوزارات</option>
                {filterOptions.ministries?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="merchants-filter-select-wrapper">
              <Landmark className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <select value={filters.bank_code} onChange={(e) => handleFilterChange('bank_code', e.target.value)} className="merchants-filter-select">
                <option value="">جميع المصارف</option>
                {filterOptions.bankCodes?.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="merchants-filter-select-wrapper">
              <Briefcase className="w-4 h-4 text-[#026174] flex-shrink-0" strokeWidth={2} />
              <select value={filters.commission_type} onChange={(e) => handleFilterChange('commission_type', e.target.value)} className="merchants-filter-select">
                <option value="">كل القطاعات</option>
                <option value="حكومي">حكومي</option>
                <option value="خاص">خاص</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && merchants.length === 0 && (
          <div className="p-16 flex justify-center"><Loading message="جاري تحميل التجار..." /></div>
        )}

        {/* الجدول — التمرير على مستوى الصفحة حتى يلتصق الرأس عند التمرير */}
        {!loading && (
          <div
            className="rounded-2xl overflow-hidden merchants-table-container"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '2px solid var(--border-card)' }}
          >
            <div className="merchants-table-scroll overflow-x-auto" style={{ isolation: 'isolate' }}>
              {merchants.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>لا توجد تجار مطابقة لمعايير البحث الحالية</p>
                  <p className="mt-2 text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                    جرّب تعديل الفلاتر أو{' '}
                    <button type="button" onClick={() => { setFilters({ search: '', governorate: '', ministry: '', bank_code: '', commission_type: '' }); setColumnFilters({ merchant_id: '', governorate: '', ministry: '', directorate_name: '', bank_code: '', settlement_name: '', commission_type: '', device_count: '', iban: '', account_number: '', branch_name: '' }); setSortState({ column: null, direction: null }); setPagination(prev => ({ ...prev, page: 1 })); }} className="text-[var(--primary-600)] cursor-pointer underline bg-transparent border-0 text-sm">مسح جميع الفلاتر</button>
                  </p>
                </div>
              ) : (
                <table className="ds-table w-full border-collapse text-sm merchants-table-sticky" dir="rtl" style={{ minWidth: '1600px' }}>
                  <thead>
                    <tr className="table-header-dark merchants-sticky-header-row" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>Merchant ID</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>المحافظة</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>الوزارة</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>اسم المديرية</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>التفاصيل</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>المصرف</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>اسم التسوية</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>نوع القطاع</ColHeader></th>
                      <th className="text-center py-4 px-4 font-bold text-white"><ColHeader>عدد الأجهزة</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>IBAN</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>رقم الحساب</ColHeader></th>
                      <th className="text-end py-4 px-4 font-bold text-white"><ColHeader>اسم الفرع</ColHeader></th>
                      <th className="text-center py-4 px-4 font-bold text-white">الإجراءات</th>
                    </tr>
                    {/* صف الفلاتر — نمط Excel: فرز، بحث، تحديد متعدد، تطبيق تلقائي */}
                    <tr className="excel-filter-row merchants-sticky-filter-row">
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="merchant_id"
                          columnLabel="Merchant ID"
                          options={filterOptions.merchantIds || []}
                          value={columnFilters.merchant_id || filters.search}
                          onChange={(v) => { setColumnFilters(p => ({ ...p, merchant_id: v })); setFilters(p => ({ ...p, search: (v || '').split(',')[0]?.trim() || '' })); setPagination(p => ({ ...p, page: 1 })); }}
                          sortDirection={sortState.column === 'merchant_id' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'merchant_id' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.merchant_id || filters.search} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="governorate"
                          columnLabel="المحافظة"
                          options={filterOptions.governorates || []}
                          value={columnFilters.governorate || filters.governorate}
                          onChange={(v) => handleColumnFilterChange('governorate', v)}
                          sortDirection={sortState.column === 'governorate' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'governorate' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.governorate || filters.governorate} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="ministry"
                          columnLabel="الوزارة"
                          options={filterOptions.ministries || []}
                          value={columnFilters.ministry || filters.ministry}
                          onChange={(v) => handleColumnFilterChange('ministry', v)}
                          sortDirection={sortState.column === 'ministry' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'ministry' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.ministry || filters.ministry} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="directorate_name"
                          columnLabel="اسم المديرية"
                          options={filterOptions.directorates || []}
                          value={columnFilters.directorate_name}
                          onChange={(v) => handleColumnFilterChange('directorate_name', v)}
                          sortDirection={sortState.column === 'directorate_name' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'directorate_name' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.directorate_name} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell" />
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="bank_code"
                          columnLabel="المصرف"
                          options={filterOptions.bankCodes || []}
                          value={columnFilters.bank_code || filters.bank_code}
                          onChange={(v) => handleColumnFilterChange('bank_code', v)}
                          sortDirection={sortState.column === 'bank_code' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'bank_code' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.bank_code || filters.bank_code} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="settlement_name"
                          columnLabel="اسم التسوية"
                          options={filterOptions.settlements || []}
                          value={columnFilters.settlement_name}
                          onChange={(v) => handleColumnFilterChange('settlement_name', v)}
                          sortDirection={sortState.column === 'settlement_name' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'settlement_name' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.settlement_name} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="commission_type"
                          columnLabel="نوع القطاع"
                          options={['حكومي', 'خاص']}
                          value={columnFilters.commission_type || filters.commission_type}
                          onChange={(v) => handleColumnFilterChange('commission_type', v)}
                          sortDirection={sortState.column === 'commission_type' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'commission_type' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.commission_type || filters.commission_type} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="device_count"
                          columnLabel="عدد الأجهزة"
                          options={filterOptions.deviceCounts || []}
                          value={columnFilters.device_count}
                          onChange={(v) => handleColumnFilterChange('device_count', v)}
                          sortDirection={sortState.column === 'device_count' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'device_count' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.device_count} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="iban"
                          columnLabel="IBAN"
                          options={filterOptions.ibans || []}
                          value={columnFilters.iban}
                          onChange={(v) => handleColumnFilterChange('iban', v)}
                          sortDirection={sortState.column === 'iban' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'iban' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.iban} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="account_number"
                          columnLabel="رقم الحساب"
                          options={filterOptions.accountNumbers || []}
                          value={columnFilters.account_number}
                          onChange={(v) => handleColumnFilterChange('account_number', v)}
                          sortDirection={sortState.column === 'account_number' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'account_number' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.account_number} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell">
                        <ExcelColumnFilter
                          columnKey="branch_name"
                          columnLabel="اسم الفرع"
                          options={filterOptions.branches || []}
                          value={columnFilters.branch_name}
                          onChange={(v) => handleColumnFilterChange('branch_name', v)}
                          sortDirection={sortState.column === 'branch_name' ? sortState.direction : null}
                          onSortChange={(d) => handleSortChange(d ? 'branch_name' : null, d)}
                          trigger={<FilterTrigger value={columnFilters.branch_name} label="الكل" />}
                        />
                      </th>
                      <th className="excel-filter-cell" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>لا توجد صفوف مطابقة للفلاتر</td>
                      </tr>
                    ) : filteredMerchants.map((merchant, idx) => {
                      const isGov = merchant.commission_type === 'حكومي';
                      return (
                        <tr key={merchant.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50/80 transition-colors`} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.merchant_id}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.governorate || '-'}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.ministry || '-'}</td>
                          <td className="py-3 px-4 max-w-[260px]" style={{ color: 'var(--text)' }}>{merchant.directorate_name || '-'}</td>
                          <td className="py-3 px-4 max-w-[220px] truncate" style={{ color: 'var(--text)' }} title={merchant.details || undefined}>{merchant.details || '-'}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.bank_name || merchant.bank_code || '-'}</td>
                          <td className="py-3 px-4 max-w-[260px]" style={{ color: 'var(--text)' }}>{merchant.settlement_name || '-'}</td>
                          <td className="py-3 px-4 font-semibold" style={{ color: isGov ? 'var(--success)' : '#b45309' }}>{merchant.commission_type || '-'}</td>
                          <td className="py-3 px-4 text-center" style={{ color: 'var(--text)' }}>{merchant.device_count || 0}</td>
                          <td className="py-3 px-4 font-mono text-sm" style={{ color: 'var(--text)' }} dir="ltr">{merchant.iban || '-'}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.account_number || '-'}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{merchant.branch_name || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              <button type="button" onClick={() => handleEdit(merchant)} className="ds-btn ds-btn-primary px-3 py-1.5 rounded-lg text-sm">تعديل</button>
                              <button type="button" onClick={() => handleDelete(merchant.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 border-0 cursor-pointer">حذف</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t flex justify-between items-center text-sm" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <span style={{ color: 'var(--text-muted)' }} dir="ltr">الصفحة {pagination.page} من {pagination.totalPages} – إجمالي {pagination.total} تاجر</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="ds-btn ds-btn-outline px-3 py-2 rounded-lg disabled:opacity-50">السابق</button>
                  <button type="button" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="ds-btn ds-btn-outline px-3 py-2 rounded-lg disabled:opacity-50">التالي</button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Add/Edit Modal — نموذج أنيق بتقسيمات واضحة */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200" style={{ background: 'rgba(2, 97, 116, 0.15)' }}>
          <div className="rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" style={{ background: 'var(--surface)', border: '2px solid var(--border-card)', boxShadow: '0 25px 50px -12px rgba(2, 97, 116, 0.25)' }}>
            {/* هيدر بتدرج teal */}
            <div className="flex items-center justify-between px-6 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
              <h2 className="text-xl font-bold m-0 text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Building2 className="w-5 h-5 text-white" />
                </span>
                {editingMerchant ? 'تعديل تاجر' : 'إضافة تاجر جديد'}
              </h2>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* قسم البيانات الأساسية */}
                <div className="rounded-xl p-5 border-2" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
                    <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>البيانات الأساسية</h3>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>Merchant ID <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.merchant_id} onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" placeholder="مثال: GOVEDU111111111" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>المحافظة</label>
                      <input type="text" value={formData.governorate} onChange={(e) => setFormData({ ...formData, governorate: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>الوزارة</label>
                      <input type="text" value={formData.ministry} onChange={(e) => setFormData({ ...formData, ministry: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>اسم المديرية</label>
                      <input type="text" value={formData.directorate_name} onChange={(e) => setFormData({ ...formData, directorate_name: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>التفاصيل</label>
                      <textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl min-h-[88px] border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all resize-none" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>عدد الأجهزة</label>
                      <input type="number" min={0} value={formData.device_count} onChange={(e) => setFormData({ ...formData, device_count: parseInt(e.target.value) || 0 })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>نوع العمولة</label>
                      <select value={formData.commission_type} onChange={(e) => setFormData({ ...formData, commission_type: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all">
                        <option value="حكومي">حكومي</option>
                        <option value="خاص">خاص</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* قسم البيانات المصرفية */}
                <div className="rounded-xl p-5 border-2" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
                    <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>البيانات المصرفية</h3>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>IBAN</label>
                      <input type="text" value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all font-mono" dir="ltr" placeholder="IQ..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>رقم الحساب</label>
                      <input type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>كود المصرف</label>
                      <input type="text" value={formData.bank_code} onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>اسم المصرف</label>
                      <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>اسم الفرع</label>
                      <input type="text" value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>رقم الفرع</label>
                      <input type="text" value={formData.branch_number} onChange={(e) => setFormData({ ...formData, branch_number: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" dir="ltr" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>اسم التسوية</label>
                      <input type="text" value={formData.settlement_name} onChange={(e) => setFormData({ ...formData, settlement_name: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all" />
                    </div>
                  </div>
                </div>

                {/* قسم الملاحظات */}
                <div className="rounded-xl p-5 border-2" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
                    <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>ملاحظات إضافية</h3>
                  </div>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="ds-input w-full py-2.5 px-4 rounded-xl min-h-[88px] border-2 focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 transition-all resize-none" rows={3} placeholder="أي ملاحظات أو تفاصيل إضافية..." />
                </div>
              </div>

              {/* أزرار التذييل */}
              <div className="flex gap-3 justify-end px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="ds-btn ds-btn-outline px-5 py-2.5 rounded-xl font-semibold">إلغاء</button>
                <button type="submit" className="ds-btn ds-btn-primary px-6 py-2.5 rounded-xl font-semibold shadow-lg" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>{editingMerchant ? 'تحديث التاجر' : 'إضافة التاجر'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(2, 97, 116, 0.2)' }}>
          <div className="rounded-2xl shadow-2xl max-w-[900px] w-[90%] max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', border: '2px solid var(--border-card)' }}>
            <div className="rounded-t-2xl py-4 px-6" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
              <h2 className="text-xl font-bold m-0 text-white">استيراد بيانات التجار من ملف Excel</h2>
            </div>
            <div className="p-6">
            {!importPreview ? (
              <>
                <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--bg)', border: '1px solid var(--border-card)' }}>
                  <h3 className="text-base font-bold m-0 mb-2" style={{ color: 'var(--text-strong)' }}>تعليمات الاستيراد:</h3>
                  <ul className="m-0 pr-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <li>يرجى رفع ملف Excel (.xlsx, .xls) أو CSV</li>
                    <li>يجب أن يحتوي الملف على عمود <strong>Merchant ID</strong> (معرف التاجر)</li>
                    <li>لا يمكن تكرار Merchant ID - سيتم رفض التكرارات تلقائياً</li>
                    <li>السطر الأول يجب أن يحتوي على عناوين الأعمدة</li>
                  </ul>
                </div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>اختر ملف Excel:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="w-full py-3 px-4 rounded-xl cursor-pointer border-2 border-dashed"
                  style={{ borderColor: 'var(--primary-600)', background: 'var(--bg)' }}
                />
              </>
            ) : (
              <>
                <div className="rounded-xl p-4 mb-6 border-2" style={{ background: 'var(--surface)', borderColor: 'var(--success)' }}>
                  <h3 className="text-base font-bold m-0 mb-3" style={{ color: 'var(--text-strong)' }}>معاينة البيانات:</h3>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border-card)', background: 'var(--bg)' }}>
                      <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--text-muted)' }}>إجمالي الصفوف</p>
                      <p className="text-xl font-extrabold m-0 tabular-nums" style={{ color: 'var(--primary-600)' }} dir="ltr">{importPreview.total}</p>
                    </div>
                    <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border-card)', background: 'var(--bg)' }}>
                      <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--text-muted)' }}>سيتم استيرادها</p>
                      <p className="text-xl font-extrabold m-0 tabular-nums" style={{ color: 'var(--success)' }} dir="ltr">{importPreview.unique}</p>
                    </div>
                    <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border-card)', background: 'var(--bg)' }}>
                      <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--text-muted)' }}>تكرارات (مرفوضة)</p>
                      <p className="text-xl font-extrabold m-0 tabular-nums text-red-600" dir="ltr">{importPreview.duplicates}</p>
                    </div>
                  </div>
                </div>

                {importPreview.merchants.length > 0 && (
                  <div className="rounded-xl overflow-hidden border-2 mb-6 max-h-[300px] overflow-y-auto" style={{ borderColor: 'var(--border-card)' }}>
                    <table className="ds-table w-full border-collapse text-sm">
                      <thead>
                        <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                          <th className="text-end py-3 px-4 font-bold text-white">Merchant ID</th>
                          <th className="text-end py-3 px-4 font-bold text-white">المحافظة</th>
                          <th className="text-end py-3 px-4 font-bold text-white">الوزارة</th>
                          <th className="text-end py-3 px-4 font-bold text-white">اسم المديرية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.merchants.slice(0, 10).map((merchant, idx) => {
                          const merchantIdHeader = importPreview.headers.find(h => h && (h.toLowerCase().includes('merchant') && h.toLowerCase().includes('id'))) || 'Merchant ID';
                          const merchantId = merchant[merchantIdHeader] || merchant['Merchant ID'] || merchant['merchant_id'];
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td className="py-2 px-4" style={{ color: 'var(--text)' }}>{merchantId}</td>
                              <td className="py-2 px-4" style={{ color: 'var(--text)' }}>{merchant['المحافظة'] || merchant['governorate'] || '-'}</td>
                              <td className="py-2 px-4" style={{ color: 'var(--text)' }}>{merchant['الوزارة'] || merchant['ministry'] || '-'}</td>
                              <td className="py-2 px-4" style={{ color: 'var(--text)' }}>{merchant['اسم المديرية'] || merchant['directorate_name'] || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {importPreview.merchants.length > 10 && (
                      <div className="py-2 text-center text-sm" style={{ color: 'var(--text-muted)' }}>... و {importPreview.merchants.length - 10} صف إضافي</div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                disabled={importing}
                className="ds-btn ds-btn-outline px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {importPreview ? 'إلغاء' : 'إغلاق'}
              </button>
              {importPreview && (
                <>
                  <button type="button" onClick={() => { setImportPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={importing} className="ds-btn ds-btn-outline px-4 py-2.5 rounded-xl disabled:opacity-50">رفع ملف آخر</button>
                  <button type="button" onClick={handleImport} disabled={importing} className="ds-btn ds-btn-primary px-4 py-2.5 rounded-xl disabled:opacity-50">{importing ? 'جاري الاستيراد...' : `استيراد ${importPreview.unique} تاجر`}</button>
                </>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Merchants;
