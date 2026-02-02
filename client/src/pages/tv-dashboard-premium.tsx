import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import moment from 'moment-timezone';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  BarChart3,
  Calendar,
  Target,
  Zap,
  Activity,
  UserCheck,
  FolderTree,
  Sparkles,
  User,
  TrendingUp as TrendUp,
  Percent,
  Timer,
  Star,
  Trophy,
  TrendingDown as TrendDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Layers,
  PieChart,
  LineChart,
} from 'lucide-react';

interface TVSlide {
  type: string;
  [key: string]: any;
}

interface TVData {
  settings: {
    slideInterval: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  slides: TVSlide[];
}

const TVDashboardPremium: React.FC = () => {
  const [data, setData] = useState<TVData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(moment().tz('Asia/Baghdad'));

  const visitorFromUrl = new URLSearchParams(window.location.search).get('visitor') === '1';

  // تحديث الوقت كل ثانية
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().tz('Asia/Baghdad'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // جلب البيانات
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh البيانات
  useEffect(() => {
    if (data?.settings?.refreshInterval) {
      const interval = setInterval(
        fetchData,
        Math.max(5000, data.settings.refreshInterval * 1000)
      );
      return () => clearInterval(interval);
    }
  }, [data?.settings?.refreshInterval]);

  // تغيير الشرائح تلقائياً
  useEffect(() => {
    if (data?.slides && data.slides.length > 0) {
      const slideInterval = (data.settings?.slideInterval || 10) * 1000;
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % data.slides.length);
      }, slideInterval);
      return () => clearInterval(timer);
    }
  }, [data]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!data?.slides) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide((prev) => (prev + 1) % data.slides.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide((prev) => (prev - 1 + data.slides.length) % data.slides.length);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [data]);

  const fetchData = async () => {
    try {
      console.log('🔄 بدء جلب بيانات TV Dashboard...');
      setLoading(true);
      setError(null);
      
      // إضافة timeout للطلب
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 ثانية
      
      console.log(`📡 إرسال طلب إلى: /api/tv-dashboard?visitorMode=${visitorFromUrl}`);
      
      const response = await api.get(`/tv-dashboard?visitorMode=${visitorFromUrl}`, {
        signal: controller.signal,
        timeout: 30000
      });
      
      clearTimeout(timeoutId);
      
      console.log('✅ تم استلام الاستجابة:', response.status);
      
      if (response.data && response.data.slides) {
        console.log(`📊 عدد الشرائح المستلمة: ${response.data.slides.length}`);
        setData(response.data);
        setLoading(false);
        setError(null);
      } else {
        console.error('❌ بيانات غير صحيحة:', response.data);
        throw new Error('بيانات غير صحيحة من الخادم');
      }
    } catch (err: any) {
      console.error('❌ خطأ في جلب بيانات لوحة التحكم:', err);
      console.error('تفاصيل الخطأ:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      });
      setLoading(false);
      
      let errorMessage = 'خطأ في جلب البيانات';
      
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'خطأ في الاتصال بالخادم. تأكد من أن الخادم يعمل.';
      } else if (err.response?.status === 500) {
        errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
      } else if (err.response?.status === 404) {
        errorMessage = 'المسار غير موجود.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Loading Screen
  if (loading && !error) {
    return (
      <div className="tv-dashboard-premium">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-screen"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="loading-content"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="loading-spinner"
            >
              <Activity className="h-16 w-16" style={{ color: '#068294' }} />
            </motion.div>
            <h1 className="loading-title">قسم التسويات والمطابقة</h1>
            <p className="loading-subtitle">جاري التحميل...</p>
            <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '1rem' }}>
              قد يستغرق الأمر بضع ثوانٍ...
            </p>
          </motion.div>
          <div className="tv-controls">
            <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'} className="visitor-toggle">
              {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error Screen
  if (error || (!loading && !data)) {
    return (
      <div className="tv-dashboard-premium">
        <div className="error-screen">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="error-content"
          >
            <AlertCircle className="h-20 w-20 mb-6" style={{ color: '#068294' }} />
            <h1 className="error-title">قسم التسويات والمطابقة</h1>
            <p className="error-message">
              {error || 'فشل في جلب البيانات. يرجى التحقق من اتصال الخادم.'}
            </p>
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              <p>تأكد من:</p>
              <ul style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <li>أن الخادم يعمل على المنفذ 5001</li>
                <li>أن قاعدة البيانات متصلة</li>
                <li>أن الـ API متاح على /api/tv-dashboard</li>
              </ul>
            </div>
            <button onClick={fetchData} className="retry-button" style={{ marginTop: '1.5rem' }}>
              إعادة المحاولة
            </button>
          </motion.div>
          <div className="tv-controls">
            <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'} className="visitor-toggle">
              {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.slides || data.slides.length === 0) {
    return (
      <div className="tv-dashboard-premium">
        <div className="error-screen">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="error-content"
          >
            <AlertCircle className="h-20 w-20 mb-6" style={{ color: '#068294' }} />
            <h1 className="error-title">قسم التسويات والمطابقة</h1>
            <p className="error-message">لا توجد بيانات للعرض</p>
            <button onClick={fetchData} className="retry-button" style={{ marginTop: '1.5rem' }}>
              إعادة المحاولة
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const slide = data.slides[currentSlide];

  // Render Slides
  const renderSlide = () => {
    switch (slide.type) {
      case 'opening':
        return <OpeningSlide slide={slide} currentTime={currentTime} />;
      case 'overview':
        return <OverviewSlide slide={slide} />;
      case 'employee':
        return <EmployeeSlide slide={slide} />;
      case 'overdue':
        return <OverdueSlide slide={slide} />;
      case 'coverage':
        return <CoverageSlide slide={slide} />;
      case 'attendance':
        return <AttendanceSlide slide={slide} />;
      case 'categories':
        return <CategoriesSlide slide={slide} />;
      case 'trends':
        return <TrendsSlide slide={slide} />;
      case 'recognition':
        return <RecognitionSlide slide={slide} />;
      case 'comprehensive':
        return <ComprehensiveSlide slide={slide} />;
      default:
        return <div>شريحة غير معروفة</div>;
    }
  };

  return (
    <div className="tv-dashboard-premium">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="slide-container"
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      {/* Slide Indicators */}
      <div className="slide-indicators">
        {data.slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`indicator ${idx === currentSlide ? 'active' : ''}`}
            aria-label={`شريحة ${idx + 1}`}
            title={`${idx + 1} / ${data.slides.length}`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="slide-counter">
        <div className="counter-content">
          <span className="counter-current">{currentSlide + 1}</span>
          <span className="counter-separator">/</span>
          <span className="counter-total">{data.slides.length}</span>
        </div>
        <div className="counter-label">شريحة</div>
      </div>

      {/* Controls */}
      <div className="tv-controls">
        <div className="time-display">
          <Clock className="h-4 w-4" />
          <span>{currentTime.format('HH:mm:ss')}</span>
        </div>
        <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'} className="visitor-toggle">
          {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
        </a>
      </div>
    </div>
  );
};

// Opening Slide Component
const OpeningSlide: React.FC<{ slide: any; currentTime: moment.Moment }> = ({ slide, currentTime }) => {
  return (
    <div className="slide opening-slide">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="opening-content"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="logo-section"
        >
          <img src="/logo.png" alt="ALSAQI Logo" className="tv-logo" />
        </motion.div>
        
        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="main-title"
        >
          {slide.title}
        </motion.h1>
        
        <motion.h2
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="sub-title"
        >
          {slide.subtitle}
        </motion.h2>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="date-time-display"
        >
          <div className="date-box">
            <Calendar className="h-6 w-6" />
            <span>{currentTime.format('YYYY-MM-DD')}</span>
          </div>
          <div className="time-box">
            <Clock className="h-6 w-6" />
            <span>{currentTime.format('HH:mm:ss')}</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Overview Slide Component
const OverviewSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const completionRate = slide.completionRate || ((slide.scheduled || 0) > 0 
    ? Math.round(((slide.done || 0) / slide.scheduled) * 100) 
    : 0);

  const stats = [
    {
      label: 'المجدولة',
      value: slide.scheduled || 0,
      icon: Target,
      color: 'blue',
    },
    {
      label: 'مكتملة',
      value: slide.done || 0,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'متأخرة',
      value: slide.overdue || 0,
      icon: AlertCircle,
      color: 'red',
    },
    {
      label: 'قيد الانتظار',
      value: slide.pending || 0,
      icon: Clock,
      color: 'yellow',
    },
  ];
  
  const additionalStats = [
    {
      label: 'متأخرة (مكتملة)',
      value: slide.late || 0,
      icon: AlertCircle,
      color: 'orange',
    },
    {
      label: 'إجمالي الموظفين',
      value: slide.totalEmployees || 0,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'نشطين اليوم',
      value: slide.activeEmployeesToday || 0,
      icon: UserCheck,
      color: 'green',
    },
    {
      label: 'متوسط الوقت',
      value: slide.avgCompletionTime || 0,
      icon: Timer,
      color: 'blue',
      suffix: ' دقيقة'
    },
  ];

  return (
    <div className="slide overview-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <BarChart3 className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">نظرة عامة - {slide.date}</h1>
      </motion.div>

      <div className="overview-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`stat-card stat-${stat.color}`}
            >
              <div className={`stat-icon bg-${stat.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="completion-rate"
      >
        <div className="rate-circle">
          <svg className="progress-ring" viewBox="0 0 120 120">
            <circle
              className="progress-ring-circle"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${completionRate * 3.39} 339`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="rate-text">
            <span className="rate-value">{completionRate}%</span>
            <span className="rate-label">نسبة الإنجاز</span>
          </div>
        </div>
      </motion.div>

      {/* إحصائيات إضافية */}
      <div className="overview-additional-stats">
        {additionalStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 + idx * 0.1 }}
              className={`stat-card-small stat-${stat.color}`}
            >
              <div className={`stat-icon-small bg-${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="stat-content-small">
                <div className="stat-value-small">{stat.value}{stat.suffix || ''}</div>
                <div className="stat-label-small">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Employee Slide Component - الأهم!
const EmployeeSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const { employee, daily, monthly, weekly } = slide;
  
  const dailyOnTimeRate = daily.tasksDone > 0 
    ? Math.round((daily.onTime / daily.tasksDone) * 100) 
    : 0;
  
  const monthlyOnTimeRate = monthly.tasksDone > 0 
    ? Math.round((monthly.onTime / monthly.tasksDone) * 100) 
    : 0;
  
  const weeklyOnTimeRate = weekly?.tasksDone > 0 
    ? Math.round((weekly.onTime / weekly.tasksDone) * 100) 
    : 0;

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="slide employee-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="employee-header"
      >
        <div className="employee-avatar-section">
          {employee.avatarUrl ? (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              src={employee.avatarUrl}
              alt={employee.name}
              className="employee-avatar"
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="employee-avatar-placeholder"
            >
              {getInitials(employee.name)}
            </motion.div>
          )}
        </div>
        <div className="employee-info">
          <h1 className="employee-name">{employee.name}</h1>
          <p className="employee-role">موظف</p>
        </div>
      </motion.div>

      <div className="employee-stats-container">
        {/* الإحصائيات اليومية */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="stats-section daily-stats"
        >
          <div className="section-header">
            <Calendar className="h-6 w-6" />
            <h2 className="section-title">الإحصائيات اليومية</h2>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon-small">
                <Target className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{daily.tasksDone}</div>
                <div className="stat-text">مهام منجزة</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{daily.onTime}</div>
                <div className="stat-text">في الوقت</div>
                <div className="stat-percentage">{dailyOnTimeRate}%</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{daily.late}</div>
                <div className="stat-text">متأخرة</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small info">
                <Users className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{daily.coverage}</div>
                <div className="stat-text">تغطية</div>
              </div>
            </div>
            
            {daily.avgDuration > 0 && (
              <div className="stat-item">
                <div className="stat-icon-small">
                  <Timer className="h-5 w-5" />
                </div>
                <div className="stat-details">
                  <div className="stat-number">{daily.avgDuration}</div>
                  <div className="stat-text">دقيقة/مهمة</div>
                </div>
              </div>
            )}
          </div>

          <div className="attendance-badge">
            {daily.attendance.present ? (
              <div className="attendance-present">
                <UserCheck className="h-5 w-5" />
                <span>حاضر - {daily.attendance.loginTime}</span>
              </div>
            ) : (
              <div className="attendance-absent">
                <AlertCircle className="h-5 w-5" />
                <span>غير حاضر</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* الإحصائيات الشهرية */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="stats-section monthly-stats"
        >
          <div className="section-header">
            <TrendUp className="h-6 w-6" />
            <h2 className="section-title">الإحصائيات الشهرية - {monthly.attendance.month}</h2>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon-small">
                <Target className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{monthly.tasksDone}</div>
                <div className="stat-text">مهام منجزة</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{monthly.onTime}</div>
                <div className="stat-text">في الوقت</div>
                <div className="stat-percentage">{monthlyOnTimeRate}%</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{monthly.late}</div>
                <div className="stat-text">متأخرة</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon-small info">
                <Users className="h-5 w-5" />
              </div>
              <div className="stat-details">
                <div className="stat-number">{monthly.coverage}</div>
                <div className="stat-text">تغطية</div>
              </div>
            </div>
            
            {monthly.avgDuration > 0 && (
              <div className="stat-item">
                <div className="stat-icon-small">
                  <Timer className="h-5 w-5" />
                </div>
                <div className="stat-details">
                  <div className="stat-number">{monthly.avgDuration}</div>
                  <div className="stat-text">دقيقة/مهمة</div>
                </div>
              </div>
            )}
          </div>

          <div className="attendance-badge">
            <div className="attendance-monthly">
              <UserCheck className="h-5 w-5" />
              <span>{monthly.attendance.daysPresent} يوم حضور</span>
            </div>
            {monthly.bestDay && (
              <div className="best-day-badge">
                <Star className="h-4 w-4" />
                <span>أفضل يوم: {moment(monthly.bestDay.date).format('DD/MM')} ({monthly.bestDay.tasks} مهمة)</span>
              </div>
            )}
            {weekly && (
              <div className="weekly-badge">
                <TrendUp className="h-4 w-4" />
                <span>هذا الأسبوع: {weekly.tasksDone} مهمة ({weeklyOnTimeRate}% في الوقت)</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Overdue Slide Component
const OverdueSlide: React.FC<{ slide: any }> = ({ slide }) => {
  return (
    <div className="slide overdue-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <AlertCircle className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">المهام المتأخرة</h1>
      </motion.div>

      {!slide.tasks || slide.tasks.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <CheckCircle2 className="h-20 w-20 mb-4" style={{ color: '#068294' }} />
          <p className="empty-text">لا توجد مهام متأخرة</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {(slide.tasks || []).map((task: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="task-item"
            >
              <div className="task-icon">
                <AlertCircle className="h-6 w-6" style={{ color: '#068294' }} />
              </div>
              <div className="task-content">
                <h3 className="task-title">{task.title || 'مهمة بدون عنوان'}</h3>
                <div className="task-meta">
                  <span className="task-assignee">
                    <Users className="h-4 w-4" />
                    {task.assignedTo || 'غير محدد'}
                  </span>
                  {task.dueTime && (
                    <span className="task-time">
                      <Clock className="h-4 w-4" />
                      {task.dueTime}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Coverage Slide Component
const CoverageSlide: React.FC<{ slide: any }> = ({ slide }) => {
  return (
    <div className="slide coverage-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <Users className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">التغطية - من قام بمهام الآخرين</h1>
      </motion.div>

      {!slide.coverage || slide.coverage.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <Users className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد تغطية</p>
        </motion.div>
      ) : (
        <div className="coverage-grid">
          {(slide.coverage || []).map((item: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="coverage-card"
            >
              <div className="coverage-rank">#{idx + 1}</div>
              <div className="coverage-content">
                <h3 className="coverage-name">{item.name}</h3>
                <div className="coverage-count">
                  <Zap className="h-5 w-5" />
                  <span>{item.count} مهمة</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Attendance Slide Component
const AttendanceSlide: React.FC<{ slide: any }> = ({ slide }) => {
  return (
    <div className="slide attendance-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <UserCheck className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">الحضور - {slide.date}</h1>
      </motion.div>

      <div className="attendance-summary-container">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="attendance-summary"
        >
          <div className="summary-card">
            <Users className="h-12 w-12" style={{ color: '#068294' }} />
            <div className="summary-content">
              <div className="summary-value">{slide.present || 0}</div>
              <div className="summary-label">موظف حضر اليوم</div>
            </div>
          </div>
        </motion.div>

        {slide.monthly && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="attendance-monthly-summary"
          >
            <div className="summary-card monthly">
              <Calendar className="h-8 w-8" style={{ color: '#068294' }} />
              <div className="summary-content">
                <div className="summary-value">{slide.monthly.totalDays}</div>
                <div className="summary-label">يوم حضور في الشهر</div>
              </div>
            </div>
            {slide.monthly.earliestLogin && (
              <div className="summary-card monthly">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="summary-content">
                  <div className="summary-value">{slide.monthly.earliestLogin}</div>
                  <div className="summary-label">أول تسجيل دخول</div>
                </div>
              </div>
            )}
            {slide.monthly.latestLogin && (
              <div className="summary-card monthly">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="summary-content">
                  <div className="summary-value">{slide.monthly.latestLogin}</div>
                  <div className="summary-label">آخر تسجيل دخول</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {!slide.records || slide.records.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <UserCheck className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا يوجد حضور</p>
        </motion.div>
      ) : (
        <div className="attendance-list">
          {(slide.records || []).map((record: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="attendance-item"
            >
              <div className="attendance-avatar">
                {record.name ? record.name.charAt(0) : '?'}
              </div>
              <div className="attendance-info">
                <h3 className="attendance-name">{record.name || 'غير محدد'}</h3>
                {record.time && (
                  <span className="attendance-time">
                    <Clock className="h-4 w-4" />
                    {record.time}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Categories Slide Component
const CategoriesSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const total = (slide.categories || []).reduce((sum: number, cat: any) => sum + (cat.count || 0), 0);

  return (
    <div className="slide categories-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <FolderTree className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">توزيع الفئات - {slide.date}</h1>
      </motion.div>

      {!slide.categories || slide.categories.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <FolderTree className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد فئات</p>
        </motion.div>
      ) : (
        <div className="categories-container">
          <div className="categories-grid">
            {(slide.categories || []).map((cat: any, idx: number) => {
              const percentage = total > 0 ? Math.round((cat.count / total) * 100) : 0;
              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="category-card"
                >
                  <div className="category-header">
                    <FolderTree className="h-6 w-6" style={{ color: '#068294' }} />
                    <h3 className="category-name">{cat.name}</h3>
                  </div>
                  <div className="category-stats">
                    <div className="category-count">{cat.count}</div>
                    <div className="category-percentage">{percentage}%</div>
                  </div>
                  <div className="category-bar">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: idx * 0.1 + 0.3, duration: 0.8 }}
                      className="category-bar-fill"
                    />
                  </div>
                  <div className="category-details">
                    {cat.uniqueWorkers > 0 && (
                      <div className="category-detail-item">
                        <Users className="h-4 w-4" />
                        <span>{cat.uniqueWorkers} موظف</span>
                      </div>
                    )}
                    {cat.avgDuration > 0 && (
                      <div className="category-detail-item">
                        <Timer className="h-4 w-4" />
                        <span>{cat.avgDuration} دقيقة</span>
                      </div>
                    )}
                    {cat.onTimeRate > 0 && (
                      <div className="category-detail-item">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{cat.onTimeRate}% في الوقت</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Trends Slide Component
const TrendsSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const weekData = slide.week || [];
  const maxTotal = Math.max(...weekData.map((day: any) => day.total || 0), 1);

  return (
    <div className="slide trends-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <TrendingUp className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">الاتجاهات الأسبوعية</h1>
      </motion.div>

      <div className="trends-chart">
        {weekData.map((day: any, idx: number) => {
          const dayTotal = day.total || 0;
          const dayCompleted = day.completed || 0;
          const completionRate = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0;
          const height = (dayTotal / maxTotal) * 100;
          const completedHeight = dayTotal > 0 ? (dayCompleted / dayTotal) * height : 0;

          return (
            <motion.div
              key={idx}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="trend-day"
            >
              <div className="trend-date">
                {moment(day.date).format('ddd')}
                <br />
                <span className="trend-date-num">{moment(day.date).format('DD')}</span>
              </div>
              <div className="trend-bar-container">
                <div className="trend-bar" style={{ height: '200px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: idx * 0.1 + 0.2, duration: 0.6 }}
                    className="trend-bar-total"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${completedHeight}%` }}
                    transition={{ delay: idx * 0.1 + 0.4, duration: 0.6 }}
                    className="trend-bar-completed"
                  />
                </div>
              </div>
              <div className="trend-values">
                <div className="trend-value">
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#068294' }} />
                  {dayCompleted}/{dayTotal}
                </div>
                <div className="trend-rate">{Math.round(completionRate)}%</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Recognition Slide Component
const RecognitionSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="slide recognition-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <Award className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">أفضل الأداء</h1>
      </motion.div>

      <div className="recognition-container">
        {/* أفضل أداء اليوم */}
        <div className="recognition-section">
          <h2 className="recognition-section-title">
            <Trophy className="h-6 w-6" />
            أفضل أداء اليوم
          </h2>
          {!slide.topPerformers || slide.topPerformers.length === 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="empty-state"
            >
              <Award className="h-16 w-16 text-slate-400 mb-4" />
              <p className="empty-text">لا توجد بيانات</p>
            </motion.div>
          ) : (
            <div className="recognition-list">
              {(slide.topPerformers || []).map((performer: any, idx: number) => {
                const onTimeRate = performer.tasks > 0 
                  ? Math.round((performer.onTime / performer.tasks) * 100) 
                  : 0;
                return (
                  <motion.div
                    key={idx}
                    initial={{ x: -100, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
                    className={`recognition-card ${idx < 3 ? 'top-three' : ''}`}
                  >
                    <div className="recognition-rank">
                      {idx < 3 ? (
                        <span className="medal">{medals[idx]}</span>
                      ) : (
                        <span className="rank-number">#{idx + 1}</span>
                      )}
                    </div>
                    <div className="recognition-content">
                      <h3 className="recognition-name">{performer.name}</h3>
                      <div className="recognition-stats">
                        <div className="stat-item">
                          <Target className="h-4 w-4" />
                          <span>{performer.tasks} مهمة</span>
                        </div>
                        <div className="stat-item">
                          <CheckCircle2 className="h-4 w-4" style={{ color: '#068294' }} />
                          <span>{performer.onTime} في الوقت ({onTimeRate}%)</span>
                        </div>
                      </div>
                    </div>
                    {idx < 3 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.15 + 0.3, type: 'spring' }}
                        className="recognition-badge"
                      >
                        <Award className="h-6 w-6" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* أفضل أداء الأسبوع */}
        {slide.weeklyTopPerformers && slide.weeklyTopPerformers.length > 0 && (
          <div className="recognition-section">
            <h2 className="recognition-section-title">
              <TrendUp className="h-6 w-6" />
              أفضل أداء الأسبوع
            </h2>
            <div className="recognition-list">
              {(slide.weeklyTopPerformers || []).map((performer: any, idx: number) => {
                const onTimeRate = performer.tasks > 0 
                  ? Math.round((performer.onTime / performer.tasks) * 100) 
                  : 0;
                return (
                  <motion.div
                    key={idx}
                    initial={{ x: 100, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
                    className="recognition-card weekly"
                  >
                    <div className="recognition-rank">
                      <span className="rank-number">#{idx + 1}</span>
                    </div>
                    <div className="recognition-content">
                      <h3 className="recognition-name">{performer.name}</h3>
                      <div className="recognition-stats">
                        <div className="stat-item">
                          <Target className="h-4 w-4" />
                          <span>{performer.tasks} مهمة</span>
                        </div>
                        <div className="stat-item">
                          <CheckCircle2 className="h-4 w-4" style={{ color: '#068294' }} />
                          <span>{performer.onTime} في الوقت ({onTimeRate}%)</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Comprehensive Stats Slide Component
const ComprehensiveSlide: React.FC<{ slide: any }> = ({ slide }) => {
  return (
    <div className="slide comprehensive-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <BarChart3 className="h-10 w-10" style={{ color: '#068294' }} />
        <h1 className="slide-title">إحصائيات شاملة - {slide.date}</h1>
      </motion.div>

      <div className="comprehensive-grid">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="comprehensive-card"
        >
          <Target className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
          <div className="comprehensive-value">{slide.totalTasks}</div>
          <div className="comprehensive-label">إجمالي المهام</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="comprehensive-card"
        >
          <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
          <div className="comprehensive-value">{slide.completedTasks}</div>
          <div className="comprehensive-label">مهام مكتملة</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="comprehensive-card"
        >
          <AlertCircle className="h-8 w-8 text-red-600 mb-2" />
          <div className="comprehensive-value">{slide.overdueTasks}</div>
          <div className="comprehensive-label">مهام متأخرة</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="comprehensive-card"
        >
          <Clock className="h-8 w-8 text-yellow-600 mb-2" />
          <div className="comprehensive-value">{slide.pendingTasks}</div>
          <div className="comprehensive-label">مهام قيد الانتظار</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="comprehensive-card"
        >
          <Users className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
          <div className="comprehensive-value">{slide.totalEmployees}</div>
          <div className="comprehensive-label">إجمالي الموظفين</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="comprehensive-card"
        >
          <UserCheck className="h-8 w-8 text-green-600 mb-2" />
          <div className="comprehensive-value">{slide.activeEmployeesToday}</div>
          <div className="comprehensive-label">موظفين نشطين اليوم</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="comprehensive-card highlight"
        >
          <Percent className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
          <div className="comprehensive-value">{slide.completionRate}%</div>
          <div className="comprehensive-label">نسبة الإنجاز</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="comprehensive-card"
        >
          <Timer className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
          <div className="comprehensive-value">{slide.avgCompletionTime}</div>
          <div className="comprehensive-label">متوسط وقت التنفيذ (دقيقة)</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="comprehensive-card"
        >
          <FolderTree className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
          <div className="comprehensive-value">{slide.totalCategories}</div>
          <div className="comprehensive-label">عدد الفئات</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="comprehensive-card"
        >
          <Zap className="h-8 w-8 text-yellow-600 mb-2" />
          <div className="comprehensive-value">{slide.totalCoverage}</div>
          <div className="comprehensive-label">إجمالي التغطية</div>
        </motion.div>

        {slide.totalTasksThisMonth !== undefined && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="comprehensive-card"
          >
            <Calendar className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
            <div className="comprehensive-value">{slide.totalTasksThisMonth}</div>
            <div className="comprehensive-label">مهام الشهر</div>
          </motion.div>
        )}

        {slide.completedTasksThisMonth !== undefined && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="comprehensive-card"
          >
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
            <div className="comprehensive-value">{slide.completedTasksThisMonth}</div>
            <div className="comprehensive-label">مكتملة الشهر</div>
          </motion.div>
        )}

        {slide.monthCompletionRate !== undefined && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="comprehensive-card highlight"
          >
            <TrendUp className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
            <div className="comprehensive-value">{slide.monthCompletionRate}%</div>
            <div className="comprehensive-label">نسبة إنجاز الشهر</div>
          </motion.div>
        )}

        {slide.totalExecutionsToday !== undefined && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="comprehensive-card"
          >
            <Activity className="h-8 w-8 style={{ color: '#068294' }} mb-2" />
            <div className="comprehensive-value">{slide.totalExecutionsToday}</div>
            <div className="comprehensive-label">تنفيذات اليوم</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TVDashboardPremium;
