import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const validate = () => {
    if (!currentPassword) {
      toast.error('أدخل كلمة المرور الحالية');
      return false;
    }
    if (!newPassword) {
      toast.error('أدخل كلمة المرور الجديدة');
      return false;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="page-header">
        <h1>تغيير كلمة المرور</h1>
      </div>
      <form onSubmit={handleSubmit} className="change-password-form">
        <div className="form-group">
          <label>كلمة المرور الحالية</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label>كلمة المرور الجديدة</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label>تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
