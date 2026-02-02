import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import Loading from '@/components/Loading';
import { Plus, Edit, Trash2, UserPlus, UserX, Users, Search, X, UserCheck, Shield, User, Key } from 'lucide-react';
import { KpiCards } from '@/components/KpiCards';
import { UserPermissionsEditor } from '@/components/UserPermissionsEditor';
import { PermissionTree } from '@/components/PermissionTree';
import type { PermissionDef } from '@/components/UserPermissionsEditor';
import { useHasPermission } from '@/hooks/useHasPermission';

/** خيارات فلتر الصلاحيات حسب الصفحة */
const PERMISSION_PAGE_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'dashboard', label: 'لوحة التحكم' },
  { value: 'tasks', label: 'المهام' },
  { value: 'schedules', label: 'الجداول الزمنية' },
  { value: 'templates', label: 'قوالب المهام' },
  { value: 'categories', label: 'الفئات' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'government_settlements', label: 'التسويات الحكومية' },
  { value: 'ct_matching', label: 'مطابقة العمولات (CT)' },
  { value: 'merchant_disbursements', label: 'صرف مستحقات التجار' },
  { value: 'reports', label: 'التقارير' },
  { value: 'attendance', label: 'الحضور' },
  { value: 'merchants', label: 'إدارة التجار' },
  { value: 'users', label: 'المستخدمين' },
  { value: 'audit_log', label: 'سجل التدقيق' },
  { value: 'tv_settings', label: 'لوحة TV' },
  { value: 'rtgs_settings', label: 'إعدادات RTGS' },
];

export function UsersV2() {
  const { toast } = useToast();
  const canManagePermissions = useHasPermission('users', 'manage_permissions');
  const canCreate = useHasPermission('users', 'create');
  const canEdit = useHasPermission('users', 'edit');
  const canDelete = useHasPermission('users', 'delete');
  const canToggleActive = useHasPermission('users', 'toggle_active');
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [modalPermissions, setModalPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    active: '',
    permissionPage: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'supervisor' | 'employee',
    can_create_ad_hoc: false,
    can_manage_merchants: false,
    active: true,
  });

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { data: permissionUserIdsData } = useQuery({
    queryKey: ['permission-users-by-page', filters.permissionPage],
    queryFn: async () => {
      const res = await api.get(`/permissions/users-by-page?page_key=${encodeURIComponent(filters.permissionPage)}`);
      return res.data as { user_ids: number[] };
    },
    enabled: !!filters.permissionPage,
  });
  const permissionUserIds = permissionUserIdsData?.user_ids ?? [];

  const { data: permissionDefinitions = [] } = useQuery({
    queryKey: ['permission-definitions'],
    queryFn: async () => {
      const res = await api.get('/permissions/definitions');
      return res.data as PermissionDef[];
    },
    enabled: showModal && canManagePermissions,
  });

  const { data: editUserPermissions } = useQuery({
    queryKey: ['user-permissions', editingUser?.id],
    queryFn: async () => {
      const res = await api.get(`/permissions/users/${editingUser.id}`);
      return res.data as Record<string, Record<string, boolean>>;
    },
    enabled: showModal && !!editingUser?.id && editingUser?.role !== 'admin' && canManagePermissions,
  });

  useEffect(() => {
    if (!showModal) return;
    if (!editingUser) {
      setModalPermissions({});
      return;
    }
    if (editingUser.role === 'admin') {
      setModalPermissions({});
      return;
    }
    if (editUserPermissions && typeof editUserPermissions === 'object') {
      setModalPermissions(editUserPermissions);
    }
  }, [showModal, editingUser?.id, editingUser?.role, editUserPermissions]);

  // فلترة المستخدمين
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = !filters.search ||
      user.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesActive = filters.active === '' ||
      (filters.active === 'true' && user.active) ||
      (filters.active === 'false' && !user.active);
    const matchesPermission =
      !filters.permissionPage || permissionUserIds.includes(user.id);
    return matchesSearch && matchesRole && matchesActive && matchesPermission;
  });

  // إحصائيات
  const stats = {
    total: users.length,
    active: users.filter((u: any) => u.active).length,
    inactive: users.filter((u: any) => !u.active).length,
    admins: users.filter((u: any) => u.role === 'admin').length,
    supervisors: users.filter((u: any) => u.role === 'supervisor').length,
    employees: users.filter((u: any) => u.role === 'employee').length,
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'employee',
        can_create_ad_hoc: user.can_create_ad_hoc || false,
        can_manage_merchants: user.can_manage_merchants || false,
        active: user.active !== false,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        can_create_ad_hoc: false,
        can_manage_merchants: false,
        active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'خطأ',
        description: 'الاسم والبريد الإلكتروني مطلوبان',
        variant: 'destructive',
      });
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور مطلوبة للمستخدمين الجدد',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active,
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      // عند الإنشاء فقط: إرسال القيم الافتراضية للتوافق مع الـ API
      if (!editingUser) {
        payload.can_create_ad_hoc = false;
        payload.can_manage_merchants = false;
      }

      let userId: number;
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        userId = editingUser.id;
        toast({
          title: 'نجح',
          description: 'تم تحديث المستخدم بنجاح',
        });
      } else {
        const createRes = await api.post('/users', payload);
        userId = createRes.data?.id;
        toast({
          title: 'نجح',
          description: 'تم إنشاء المستخدم بنجاح',
        });
      }
      if (canManagePermissions && userId && Object.keys(modalPermissions).length > 0) {
        try {
          await api.put(`/permissions/users/${userId}`, { permissions: modalPermissions });
        } catch (permErr: any) {
          toast({
            title: 'تنبيه',
            description: permErr.response?.data?.error || 'تم حفظ المستخدم لكن فشل حفظ الصلاحيات. يمكنك تعيينها من زر الصلاحيات.',
            variant: 'destructive',
          });
        }
      }
      setShowModal(false);
      setModalPermissions({});
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
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await api.delete(`/users/${id}`);
        toast({
          title: 'نجح',
          description: 'تم حذف المستخدم بنجاح',
        });
        refetch();
      } catch (error: any) {
        const msg = error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? 'حدث خطأ';
        toast({
          title: 'خطأ',
          description: typeof msg === 'string' ? msg : 'حدث خطأ',
          variant: 'destructive',
        });
      }
    }
  };

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      await api.patch(`/users/${id}/toggle-active`, { active: !active });
      toast({
        title: 'نجح',
        description: 'تم تحديث حالة المستخدم بنجاح',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: { variant: 'destructive' as const, label: 'مدير' },
      supervisor: { variant: 'info' as const, label: 'مشرف' },
      employee: { variant: 'secondary' as const, label: 'موظف' },
      accountant: { variant: 'default' as const, label: 'موظف حسابات' },
      viewer: { variant: 'outline' as const, label: 'مشاهد' },
    };
    const config = variants[role] || { variant: 'default' as const, label: role };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', role: '', active: '', permissionPage: '' });
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#BBBCC0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1600px' }}>
        {/* هيدر علوي — نص أبيض على التيل */}
        <div
          className="page-header-teal"
          style={{
          background: 'linear-gradient(90deg, #026174, #068294)',
          color: '#ffffff',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>إدارة المستخدمين</h1>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.95rem', opacity: 0.9, color: '#ffffff' }}>
              إدارة المستخدمين والصلاحيات والأدوار في النظام
            </p>
          </div>
          {canCreate && (
          <button 
            onClick={() => handleOpenModal()} 
            style={{
                padding: '0.7rem 1.4rem', 
                background: '#fff', 
                color: '#068294', 
                border: 'none', 
                borderRadius: '999px', 
                cursor: 'pointer', 
                fontWeight: 600, 
                fontSize: '0.9rem', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={18} />
              إضافة مستخدم جديد
            </button>
          )}
        </div>

        <KpiCards
          items={[
            { label: 'إجمالي المستخدمين', value: stats.total, Icon: Users, color: '#068294', glow: 'rgba(6, 130, 148, 0.4)', gradient: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
            { label: 'المستخدمين النشطين', value: stats.active, Icon: UserCheck, color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
            { label: 'المستخدمين غير النشطين', value: stats.inactive, Icon: UserX, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
            { label: 'المدراء', value: stats.admins, Icon: Shield, color: '#026174', glow: 'rgba(2, 97, 116, 0.4)', gradient: 'linear-gradient(135deg, #026174 0%, #0f172a 100%)' },
            { label: 'المشرفين', value: stats.supervisors, Icon: Users, color: '#0f766e', glow: 'rgba(15, 118, 110, 0.4)', gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)' },
            { label: 'الموظفين', value: stats.employees, Icon: User, color: '#0369a1', glow: 'rgba(3, 105, 161, 0.4)', gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' },
          ]}
        />

        {/* الفلاتر */}
        <div style={{ 
          background: '#fff', 
          padding: '1.25rem 1.5rem', 
          borderRadius: '0.9rem', 
          marginBottom: '1.5rem', 
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '0.75rem',
            alignItems: 'end'
          }}>
            <div style={{ position: 'relative', gridColumn: '1 / -1' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  right: '0.9rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#9ca3af' 
                }} 
              />
              <input 
                type="text" 
                placeholder="بحث بالاسم أو البريد الإلكتروني..." 
                value={filters.search} 
                onChange={(e) => handleFilterChange('search', e.target.value)} 
                style={{ 
                  padding: '0.7rem 0.9rem 0.7rem 2.5rem', 
                  border: '1px solid #d4d4d4', 
                  borderRadius: '0.5rem', 
                  fontSize: '0.95rem',
                  width: '100%'
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem' }}>الدور</label>
              <select 
                value={filters.role} 
                onChange={(e) => handleFilterChange('role', e.target.value)} 
                style={{ 
                  padding: '0.7rem 0.9rem', 
                  border: '1px solid #d4d4d4', 
                  borderRadius: '0.5rem', 
                  fontSize: '0.95rem',
                  width: '100%'
                }}
              >
                <option value="">جميع الأدوار</option>
                <option value="admin">مدير</option>
                <option value="supervisor">مشرف</option>
                <option value="employee">موظف</option>
                <option value="accountant">موظف حسابات</option>
                <option value="viewer">مشاهد</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem' }}>الحالة</label>
              <select 
                value={filters.active} 
                onChange={(e) => handleFilterChange('active', e.target.value)} 
                style={{ 
                  padding: '0.7rem 0.9rem', 
                  border: '1px solid #d4d4d4', 
                  borderRadius: '0.5rem', 
                  fontSize: '0.95rem',
                  width: '100%'
                }}
              >
                <option value="">جميع الحالات</option>
                <option value="true">نشط</option>
                <option value="false">غير نشط</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem' }}>الصلاحيات</label>
              <select 
                value={filters.permissionPage} 
                onChange={(e) => handleFilterChange('permissionPage', e.target.value)} 
                style={{ 
                  padding: '0.7rem 0.9rem', 
                  border: '1px solid #d4d4d4', 
                  borderRadius: '0.5rem', 
                  fontSize: '0.95rem',
                  width: '100%',
                  minWidth: '160px'
                }}
              >
                {PERMISSION_PAGE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginTop: '0.25rem' }}>
                لديه صلاحية على الصفحة
              </span>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
            <button 
              type="button" 
              onClick={clearFilters} 
              style={{ 
                padding: '0.4rem 0.9rem', 
                borderRadius: '999px', 
                border: 'none', 
                background: '#e5e7eb', 
                color: '#111827', 
                fontSize: '0.8rem', 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <X size={14} />
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ marginTop: '2rem' }}>
            <Loading message="جاري تحميل المستخدمين..." />
          </div>
        )}

        {/* الجدول */}
        {!isLoading && (
          <div style={{ 
            background: '#fff', 
            borderRadius: '0.9rem', 
            overflow: 'hidden', 
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)', 
            maxHeight: 'calc(100vh - 400px)', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                  <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.1rem', margin: 0 }}>لا يوجد مستخدمين مطابقين لمعايير البحث</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    {users.length === 0 ? (
                      <>
                        لا يوجد مستخدمين في النظام.{' '}
                        <button 
                          type="button" 
                          onClick={() => handleOpenModal()} 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#068294', 
                            cursor: 'pointer', 
                            textDecoration: 'underline', 
                            fontSize: '0.9rem' 
                          }}
                        >
                          إنشاء مستخدم جديد
                        </button>
                      </>
                    ) : (
                      <>
                        جرّب تعديل الفلاتر أو{' '}
                        <button 
                          type="button" 
                          onClick={clearFilters} 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#068294', 
                            cursor: 'pointer', 
                            textDecoration: 'underline', 
                            fontSize: '0.9rem' 
                          }}
                        >
                          مسح جميع الفلاتر
                        </button>
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="table-header-dark" style={{ background: '#068294', color: '#fff' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>المستخدم</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>البريد الإلكتروني</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>الدور</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>الحالة</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>الصلاحيات</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user: any, idx: number) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>
                                {user.name}
                              </div>
                            </div>
                            <Avatar
                              src={user.avatar_url ? `${window.location.origin}${user.avatar_url}` : null}
                              alt={user.name}
                              size="sm"
                            />
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {getRoleBadge(user.role)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <Badge variant={user.active ? 'success' : 'outline'}>
                            {user.active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {canManagePermissions ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPermissionsUser(user);
                                  setShowPermissionsModal(true);
                                }}
                                style={{
                                  padding: '0.4rem 0.7rem',
                                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  transition: 'opacity 0.2s',
                                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.9';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                                title="إدارة الصلاحيات التفصيلية"
                              >
                                <Key size={14} />
                                الصلاحيات
                              </button>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {canEdit && (
                            <button
                              onClick={() => handleOpenModal(user)}
                              style={{
                                padding: '0.4rem 0.7rem',
                                background: '#068294',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.4rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#026174';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#068294';
                              }}
                            >
                              <Edit size={14} />
                              تعديل
                            </button>
                            )}
                            {canToggleActive && (
                            <button
                              onClick={() => handleToggleActive(user.id, user.active)}
                              style={{
                                padding: '0.4rem 0.7rem',
                                background: user.active ? '#ef4444' : '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.4rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = user.active ? '#dc2626' : '#059669';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = user.active ? '#ef4444' : '#10b981';
                              }}
                            >
                              {user.active ? <UserX size={14} /> : <UserPlus size={14} />}
                              {user.active ? 'تعطيل' : 'تفعيل'}
                            </button>
                            )}
                            {canDelete && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              style={{
                                padding: '0.4rem 0.7rem',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.4rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ef4444';
                              }}
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {filteredUsers.length > 0 && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                borderTop: '1px solid #e5e7eb', 
                background: '#f9fafb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  عرض {filteredUsers.length} من {users.length} مستخدم
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{ 
              background: '#fff', 
              padding: '2rem', 
              borderRadius: '1rem', 
              maxWidth: '700px', 
              width: '100%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              {/* Header */}
              <div style={{ 
                marginBottom: '1.5rem', 
                paddingBottom: '1rem', 
                borderBottom: '2px solid #e5e7eb' 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {editingUser ? 'تعديل المستخدم' : 'مستخدم جديد'}
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#6b7280'
                    }}
                  >
                    <X size={20} />
                  </button>
                </h2>
              </div>

              {/* Avatar Display Section */}
              {editingUser && (
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  background: '#f9fafb', 
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    الصورة الشخصية
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Avatar
                      src={editingUser.avatar_url ? `${window.location.origin}${editingUser.avatar_url}` : null}
                      alt={editingUser.name}
                      size="xl"
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.875rem', 
                        color: '#6b7280',
                        lineHeight: 1.5
                      }}>
                        {editingUser.avatar_url 
                          ? 'يمكن للمستخدم تغيير صورته من صفحة الإعدادات الشخصية'
                          : 'لا توجد صورة شخصية. يمكن للمستخدم رفع صورته من صفحة الإعدادات الشخصية'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  {/* الاسم */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#374151' 
                    }}>
                      الاسم *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل الاسم"
                      required
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#068294'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  {/* البريد الإلكتروني */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#374151' 
                    }}>
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#068294'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  {/* كلمة المرور */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#374151' 
                    }}>
                      {editingUser ? 'كلمة المرور (اتركها فارغة للاحتفاظ بالقديمة)' : 'كلمة المرور *'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="أدخل كلمة المرور"
                      required={!editingUser}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#068294'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  {/* الدور */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#374151' 
                    }}>
                      الدور *
                    </label>
                    <SearchableSelect
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val as any })}
                      options={[
                        { value: 'admin', label: 'مدير' },
                        { value: 'supervisor', label: 'مشرف' },
                        { value: 'employee', label: 'موظف' },
                        { value: 'accountant', label: 'موظف حسابات' },
                        { value: 'viewer', label: 'مشاهد' },
                      ]}
                      getOptionLabel={(opt: any) => opt.label}
                      getOptionValue={(opt: any) => opt.value}
                      placeholder="اختر الدور"
                    />
                  </div>
                </div>

                {/* الحالة */}
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: '#f9fafb', 
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '1rem', 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#374151' 
                  }}>
                    الحالة
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="custom-checkbox"
                    />
                    <label 
                      htmlFor="active" 
                      style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: 500,
                        color: '#374151',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      نشط (المستخدم يمكنه تسجيل الدخول واستخدام النظام)
                    </label>
                  </div>
                </div>

                {/* الصلاحيات التفصيلية — منح الصلاحيات من هنا أو من زر الصلاحيات في الجدول (لا تظهر للمدير) */}
                {canManagePermissions && formData.role !== 'admin' && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#374151' 
                    }}>
                      الصلاحيات التفصيلية
                    </label>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      اختر الصفحات والإجراءات المسموح بها. يمكنك أيضاً تعيينها لاحقاً من زر «الصلاحيات» في الجدول.
                    </p>
                    {permissionDefinitions.length > 0 ? (
                      <PermissionTree
                        definitions={permissionDefinitions}
                        value={modalPermissions}
                        onChange={setModalPermissions}
                        maxHeight="320px"
                      />
                    ) : (
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        جاري تحميل قائمة الصلاحيات...
                      </div>
                    )}
                  </div>
                )}
                {(!canManagePermissions || formData.role === 'admin') && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(6, 130, 148, 0.08)', 
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(6, 130, 148, 0.2)',
                    fontSize: '0.875rem',
                    color: '#0d9488'
                  }}>
                    <strong>الصلاحيات التفصيلية:</strong> تُدار من زر «الصلاحيات» في عمود الصلاحيات لكل مستخدم (عرض، إضافة، تعديل، حذف، إلخ).
                  </div>
                )}

                {/* Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  justifyContent: 'flex-end', 
                  marginTop: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#068294',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#026174';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#068294';
                    }}
                  >
                    {editingUser ? 'تحديث' : 'إنشاء'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نافذة إدارة الصلاحيات */}
        {showPermissionsModal && permissionsUser && (
          <UserPermissionsEditor
            userId={permissionsUser.id}
            userName={permissionsUser.name}
            userRole={permissionsUser.role}
            open={showPermissionsModal}
            onClose={() => {
              setShowPermissionsModal(false);
              setPermissionsUser(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
