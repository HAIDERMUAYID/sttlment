import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';

const QuickLogin = () => {
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();

  const quickUsers = [
    {
      name: 'المدير',
      email: 'admin@alsaqi.com',
      password: '123456',
      role: 'admin',
      icon: '👑',
      color: '#6366f1'
    },
    {
      name: 'المشرف',
      email: 'supervisor@alsaqi.com',
      password: '123456',
      role: 'supervisor',
      icon: '👨‍💼',
      color: '#8b5cf6'
    },
    {
      name: 'موظف 1',
      email: 'employee1@alsaqi.com',
      password: '123456',
      role: 'employee',
      icon: '👤',
      color: '#10b981'
    },
    {
      name: 'موظف 2',
      email: 'employee2@alsaqi.com',
      password: '123456',
      role: 'employee',
      icon: '👤',
      color: '#10b981'
    },
    {
      name: 'موظف 3',
      email: 'employee3@alsaqi.com',
      password: '123456',
      role: 'employee',
      icon: '👤',
      color: '#10b981'
    },
    {
      name: 'موظف 4',
      email: 'employee4@alsaqi.com',
      password: '123456',
      role: 'employee',
      icon: '👤',
      color: '#10b981'
    },
  ];

  const handleQuickLogin = async (user) => {
    setLoading(user.email);
    try {
      const response = await api.post('/auth/login', {
        email: user.email,
        password: user.password,
      });
      
      const { user: userData, token } = response.data;
      
      // Set auth in store
      setAuth(userData, token);
      
      // Set token in axios defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      toast({
        title: 'نجح',
        description: `تم تسجيل الدخول كـ ${user.name}`,
        variant: 'success',
      });
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg) {
        toast({
          title: 'خطأ',
          description: msg,
          variant: 'destructive',
        });
        if (msg.includes('غير صحيحة')) {
          toast({
            title: 'معلومة',
            description: '💡 تأكد من تشغيل: npm run seed لإضافة بيانات الاختبار',
            variant: 'info',
          });
        }
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        toast({
          title: 'خطأ',
          description: 'لا يمكن الاتصال بالخادم. تأكد من تشغيل: npm run dev',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تسجيل الدخول',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="quick-login-container">
      <div className="quick-login-box">
        <div className="quick-login-header">
          <h1>تسجيل دخول سريع</h1>
          <p>اختر نوع المستخدم للاختبار</p>
          <a href="/login" className="normal-login-link">تسجيل دخول عادي</a>
        </div>
        
        <div className="quick-users-grid">
          {quickUsers.map((user) => (
            <button
              key={user.email}
              onClick={() => handleQuickLogin(user)}
              disabled={loading !== null}
              className="quick-user-card"
              style={{ '--user-color': user.color }}
            >
              <div className="quick-user-icon">{user.icon}</div>
              <div className="quick-user-info">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <span className="quick-user-role">{user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : 'موظف'}</span>
              </div>
              {loading === user.email && (
                <div className="quick-login-spinner"></div>
              )}
            </button>
          ))}
        </div>
        
        <div className="quick-login-footer">
          <p>💡 كلمة المرور لجميع الحسابات: <strong>123456</strong></p>
          <p style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            ⚠️ إذا فشل تسجيل الدخول، تأكد من تشغيل: <code style={{ background: 'var(--color-bg)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>npm run seed</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickLogin;
