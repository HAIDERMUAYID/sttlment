import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, verifyToken } from '../services/authService';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(() => {
    // استخدام lazy initialization للتأكد من قراءة البيانات من localStorage
    return getCurrentUser();
  });
  const navigate = useNavigate();
  
  // Force re-render عند تغيير localStorage
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUser = getCurrentUser();
      if (currentUser && (!user || currentUser.id !== user.id)) {
        setUser(currentUser);
        forceUpdate(prev => prev + 1);
      }
    }, 1000); // التحقق كل ثانية
    
    return () => clearInterval(interval);
  }, [user]);

  // جلب بيانات المستخدم من API إذا لم تكن موجودة في localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUser = getCurrentUser();
    
    // تحديث user state إذا كانت البيانات موجودة في localStorage
    if (currentUser) {
      if (!user || currentUser.id !== user.id) {
        setUser(currentUser);
      }
    } else if (token) {
      // إذا لم تكن البيانات موجودة لكن token موجود، اجلبها من API
      verifyToken()
        .then((data) => {
          if (data && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          }
        })
        .catch((error) => {
          console.error('Failed to verify token:', error);
          // إذا فشل التحقق، امسح البيانات وأعد التوجيه إلى صفحة تسجيل الدخول
          logout();
          navigate('/login');
        });
    } else if (!token) {
      navigate('/login');
    }
  }, [user, navigate]); // إضافة user و navigate للتحقق عند تغييرهما


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // قراءة user من localStorage مباشرة في كل render للتأكد من الحصول على أحدث البيانات
  const currentUser = getCurrentUser();
  const effectiveUser = user || currentUser;
  
  // قراءة مباشرة من localStorage في كل render (بدون useMemo)
  const userFromStorage = getCurrentUser();
  const isAdmin = userFromStorage?.role === 'admin';
  const isSupervisor = userFromStorage?.role === 'supervisor' || isAdmin;
  const isEmployee = userFromStorage?.role === 'employee';
  

  return (
    <div className="layout" style={{ background: '#BBBCC0', minHeight: '100vh' }}>
        <nav className="navbar" style={{ background: '#ffffff', borderBottom: '2px solid #2A6E85' }}>
          <div className="navbar-brand">
            <img 
              src="/logo-icon.png" 
              alt="ALSAQI" 
              className="navbar-logo"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <div className="navbar-brand-text">
              <h2 style={{ color: '#1a1a1a', margin: 0, fontWeight: 700 }}>نظام إدارة المهام والحضور</h2>
              <p style={{ color: '#444', margin: 0, fontWeight: 500 }}>قسم التسويات والمطابقة</p>
            </div>
          </div>
          <div className="navbar-user">
            <span>{effectiveUser?.name}</span>
            <button onClick={handleLogout} className="btn-logout">تسجيل الخروج</button>
          </div>
        </nav>

        <div className="layout-content">
          <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '◄' : '►'}
            </button>
            
            <nav className="sidebar-nav">
              {/* إدارة التجار */}
              {(isAdmin || isSupervisor) && (
                <div 
                  className="nav-section merchants-section" 
                  id="merchants-section-visible"
                  style={{
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1,
                    marginBottom: '1.5rem',
                    height: 'auto',
                    width: '100%',
                    background: '#ffffff',
                    border: '2px solid #068294',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    boxShadow: '0 2px 8px rgba(6, 130, 148, 0.15)'
                  }}
                >
                  {sidebarOpen && (
                    <div 
                      className="nav-section-title"
                      style={{
                        padding: '0.5rem 1rem',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        backgroundColor: '#068294',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      إدارة التجار
                    </div>
                  )}
                  <NavLink 
                    to="/merchants" 
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      visibility: 'visible',
                      opacity: 1,
                      height: 'auto',
                      width: '100%',
                      minHeight: '44px',
                      padding: '0.75rem 1rem',
                      alignItems: 'center',
                      gap: '0.75rem',
                      textDecoration: 'none',
                      color: '#1a1a1a',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>🏪</span>
                    {sidebarOpen && <span>التجار</span>}
                  </NavLink>
                </div>
              )}

            {/* القسم الرئيسي */}
            <div className="nav-section">
              {sidebarOpen && <div className="nav-section-title">القسم الرئيسي</div>}
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span>🏠</span>
                {sidebarOpen && <span>لوحة التحكم</span>}
              </NavLink>
              
              {(isEmployee || isSupervisor) && (
                <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>✅</span>
                  {sidebarOpen && <span>المهام</span>}
                </NavLink>
              )}
            </div>

            {/* إدارة المهام (للمشرفين) */}
            {isSupervisor && (
              <div className="nav-section">
                {sidebarOpen && <div className="nav-section-title">إدارة المهام</div>}
                <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📁</span>
                  {sidebarOpen && <span>الفئات</span>}
                </NavLink>
                <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📝</span>
                  {sidebarOpen && <span>قوالب المهام</span>}
                </NavLink>
                <NavLink to="/schedules" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📅</span>
                  {sidebarOpen && <span>الجداول الزمنية</span>}
                </NavLink>
              </div>
            )}

            {/* التقارير والتحليلات */}
            {isSupervisor && (
              <div className="nav-section">
                {sidebarOpen && <div className="nav-section-title">التقارير والتحليلات</div>}
                <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📊</span>
                  {sidebarOpen && <span>التقارير</span>}
                </NavLink>
                <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📆</span>
                  {sidebarOpen && <span>تقويم الحضور</span>}
                </NavLink>
              </div>
            )}

            {/* الإدارة (للمديرين) */}
            {isAdmin && (
              <div className="nav-section">
                {sidebarOpen && <div className="nav-section-title">الإدارة</div>}
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>👥</span>
                  {sidebarOpen && <span>المستخدمين</span>}
                </NavLink>
                <NavLink to="/audit-log" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📋</span>
                  {sidebarOpen && <span>سجل التدقيق</span>}
                </NavLink>
                <NavLink to="/tv-settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span>📺</span>
                  {sidebarOpen && <span>إعدادات TV</span>}
                </NavLink>
              </div>
            )}

            {/* الإعدادات */}
            <div className="nav-section">
              {sidebarOpen && <div className="nav-section-title">الإعدادات</div>}
              <a href="/tv" target="_blank" rel="noopener noreferrer" className="nav-item">
                <span>📺</span>
                {sidebarOpen && <span>لوحة التحكم التلفزيونية</span>}
              </a>
              <NavLink to="/change-password" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span>🔑</span>
                {sidebarOpen && <span>تغيير كلمة المرور</span>}
              </NavLink>
            </div>
          </nav>
        </aside>

        <main className="main-content" style={{ background: '#BBBCC0', padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;