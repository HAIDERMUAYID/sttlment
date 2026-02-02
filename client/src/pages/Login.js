import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { login } from '../services/authService';
import '../styles/login.css';

// FORCE RELOAD - VERSION 3.0
console.log('%c🔴🔴🔴 LOGIN PAGE VERSION 3.0 - RED BACKGROUND - LOADED 🔴🔴🔴', 'color: red; font-size: 20px; font-weight: bold;');

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const validate = () => {
    const e = (email || '').trim();
    if (!e) {
      toast.error('أدخل البريد الإلكتروني');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة');
      return false;
    }
    if (!password) {
      toast.error('أدخل كلمة المرور');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg) toast.error(msg);
      else if (err.code === 'ERR_NETWORK' || !err.response)
        toast.error('لا يمكن الاتصال بالخادم. تأكد من تشغيل: npm run dev');
      else toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ background: 'linear-gradient(165deg, #a8dde4 0%, #c5e8ec 35%, #d8f2f5 70%, #e8f8fa 100%)' }}>
      <div className="login-box" style={{ background: '#ffffff', border: '2px solid #2A6E85' }}>
        <div className="login-header">
          <img 
            src="/logo.png" 
            alt="ALSAQI Logo" 
            className="login-logo"
            style={{ 
              width: '450px', 
              maxWidth: '80%',
              height: 'auto', 
              margin: '0 auto 2rem', 
              display: 'block',
              objectFit: 'contain',
            }}
            onError={(e) => {
              console.error('Failed to load logo:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
          <h1 style={{ color: '#1a1a1a', fontSize: '1.75rem', fontWeight: 700 }}>نظام إدارة المهام والحضور</h1>
          <p style={{ color: '#444', fontWeight: 500 }}>قسم التسويات والمطابقة</p>
          <p className="subtitle" style={{ color: '#068294', fontWeight: 600 }}>شركة الصاقي للدفع الإلكتروني</p>
          <a href="/quick-login" className="quick-login-link" style={{ color: '#068294' }}>🚀 تسجيل دخول سريع للاختبار</a>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label style={{ color: '#1a1a1a', fontWeight: 600 }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="أدخل بريدك الإلكتروني"
              autoComplete="email"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '2px solid #2A6E85', 
                borderRadius: '0.5rem',
                fontSize: '1rem',
                color: '#2A6E85',
                background: '#ffffff'
              }}
            />
          </div>
          
          <div className="form-group">
            <label style={{ color: '#1a1a1a', fontWeight: 600 }}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '2px solid #2A6E85', 
                borderRadius: '0.5rem',
                fontSize: '1rem',
                color: '#2A6E85',
                background: '#ffffff'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-login"
            style={{ 
              width: '100%', 
              padding: '0.875rem', 
              background: '#068294', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
