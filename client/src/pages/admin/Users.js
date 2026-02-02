import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';
import SearchableSelect from '../../components/SearchableSelect';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    active: true,
    canCreateAdHoc: false
  });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'employee', active: true, canCreateAdHoc: false });
      toast.success(editingUser ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
      canCreateAdHoc: user.can_create_ad_hoc
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id) => {
    try {
      await api.patch(`/users/${id}/toggle-active`);
      toast.success('تم تحديث حالة المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  if (loading) return <Loading message="جاري تحميل المستخدمين..." />;

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>إدارة المستخدمين</h1>
        <button onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'employee', active: true, canCreateAdHoc: false }); setShowModal(true); }} className="btn-primary">
          إضافة مستخدم
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>إنشاء مهام خاصة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : user.role === 'employee' ? 'موظف' : 'عارض'}</td>
                <td>
                  <span className={`badge ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td>{user.can_create_ad_hoc ? 'نعم' : 'لا'}</td>
                <td>
                  <button onClick={() => handleEdit(user)} className="btn-edit">تعديل</button>
                  <button onClick={() => handleToggleActive(user.id)} className="btn-toggle">
                    {user.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>الاسم</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>كلمة المرور {editingUser && '(اتركه فارغاً للاحتفاظ بالحالية)'}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingUser} />
              </div>
              <div className="form-group">
                <label>الدور</label>
                <SearchableSelect
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  options={[
                    { value: 'admin', label: 'مدير' },
                    { value: 'supervisor', label: 'مشرف' },
                    { value: 'employee', label: 'موظف' },
                    { value: 'viewer', label: 'عارض' }
                  ]}
                  placeholder="اختر الدور"
                  searchPlaceholder="ابحث..."
                  getOptionLabel={(opt) => opt.label}
                  getOptionValue={(opt) => opt.value}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} />
                  نشط
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={formData.canCreateAdHoc} onChange={(e) => setFormData({...formData, canCreateAdHoc: e.target.checked})} />
                  يمكنه إنشاء مهام خاصة
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;