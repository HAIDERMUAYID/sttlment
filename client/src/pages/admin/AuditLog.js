import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';
import SearchableSelect from '../../components/SearchableSelect';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.action, filters.entityType, filters.dateFrom, filters.dateTo]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      toast.error('خطأ في جلب المستخدمين');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const res = await api.get(`/audit-log?${params.toString()}`);
      setLogs(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'خطأ في جلب سجل التدقيق');
    } finally {
      setLoading(false);
    }
  };

  const actionLabels = {
    login: 'تسجيل دخول',
    create_user: 'إنشاء مستخدم',
    update_user: 'تحديث مستخدم',
    activate_user: 'تفعيل مستخدم',
    deactivate_user: 'تعطيل مستخدم',
    create_category: 'إنشاء فئة',
    update_category: 'تحديث فئة',
    delete_category: 'حذف فئة',
    create_template: 'إنشاء قالب',
    update_template: 'تحديث قالب',
    delete_template: 'حذف قالب',
    create_schedule: 'إنشاء جدول',
    update_schedule: 'تحديث جدول',
    delete_schedule: 'حذف جدول',
    create_ad_hoc_task: 'إنشاء مهمة خاصة',
    execute_task: 'تنفيذ مهمة',
    change_password: 'تغيير كلمة المرور',
  };

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h1>سجل التدقيق</h1>
      </div>
      <div className="audit-filters">
        <div className="form-group">
          <label>المستخدم</label>
          <SearchableSelect
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            options={[{ id: '', name: 'الكل' }, ...users]}
            placeholder="الكل"
            searchPlaceholder="ابحث عن مستخدم..."
            getOptionLabel={(opt) => opt.name}
            getOptionValue={(opt) => opt.id || ''}
          />
        </div>
        <div className="form-group">
          <label>الإجراء</label>
          <SearchableSelect
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            options={[{ value: '', label: 'الكل' }, ...Object.entries(actionLabels).map(([k, v]) => ({ value: k, label: v }))]}
            placeholder="الكل"
            searchPlaceholder="ابحث عن إجراء..."
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value || ''}
          />
        </div>
        <div className="form-group">
          <label>النوع</label>
          <SearchableSelect
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            options={[
              { value: '', label: 'الكل' },
              { value: 'user', label: 'مستخدم' },
              { value: 'category', label: 'فئة' },
              { value: 'task_template', label: 'قالب' },
              { value: 'schedule', label: 'جدول' },
              { value: 'daily_task', label: 'مهمة يومية' },
              { value: 'ad_hoc_task', label: 'مهمة خاصة' }
            ]}
            placeholder="الكل"
            searchPlaceholder="ابحث عن نوع..."
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value || ''}
          />
        </div>
        <div className="form-group">
          <label>من تاريخ</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>إلى تاريخ</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>
      {loading ? (
        <Loading message="جاري تحميل سجل التدقيق..." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>المستخدم</th>
                <th>الإجراء</th>
                <th>النوع</th>
                <th>المعرف</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at}</td>
                  <td>{row.user_name || '-'}</td>
                  <td>{actionLabels[row.action] || row.action}</td>
                  <td>{row.entity_type || '-'}</td>
                  <td>{row.entity_id ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="no-data">لا توجد سجلات.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
