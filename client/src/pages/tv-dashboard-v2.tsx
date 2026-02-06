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
  UserCheck,
  FolderTree,
  Sparkles,
  ListTodo,
  FilePlus,
  User,
  FileUp,
  Banknote,
  FileCheck,
  Scale,
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

const TVDashboardV2: React.FC = () => {
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
  }, []);

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
      const response = await api.get(`/tv-dashboard?visitorMode=${visitorFromUrl}`);
      setData(response.data);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('خطأ في جلب بيانات لوحة التحكم:', err);
      setLoading(false);
      setError(err.response?.data?.error || 'خطأ في جلب البيانات');
    }
  };

  // Loading Screen
  if (loading || !data) {
    return (
      <div className="tv-dashboard-v2">
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
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="loading-logo-wrapper"
            >
              <img
                src="/logo-icon.png"
                alt="الساقي"
                className="loading-logo"
              />
            </motion.div>
            <h1 className="loading-title">قسم التسويات والمطابقة</h1>
            <p className="loading-subtitle">جاري التحميل...</p>
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
  if (error) {
    return (
      <div className="tv-dashboard-v2">
        <div className="error-screen">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="error-content"
          >
            <AlertCircle className="h-20 w-20 text-red-500 mb-6" />
            <h1 className="error-title">قسم التسويات والمطابقة</h1>
            <p className="error-message">{error}</p>
            <button onClick={fetchData} className="retry-button">
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

  const slide = data.slides[currentSlide];
  if (!slide) {
    return (
      <div className="tv-dashboard-v2">
        <div className="loading-screen">
          <p className="loading-subtitle">لا توجد شرائح لعرضها</p>
        </div>
      </div>
    );
  }

  // Render Slides
  const renderSlide = () => {
    switch (slide.type) {
      case 'opening':
        return <OpeningSlide slide={slide} currentTime={currentTime} />;
      case 'overview':
        return <OverviewSlide slide={slide} />;
      case 'scheduled-tasks':
        return <ScheduledTasksSlide slide={slide} />;
      case 'additional-tasks':
        return <AdditionalTasksSlide slide={slide} />;
      case 'employee':
        return <EmployeeSlide slide={slide} />;
      case 'employee-monthly':
        return <EmployeeMonthlySlide slide={slide} />;
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
      case 'rtgs-imports-today':
        return <RtgsImportsSlide slide={slide} />;
      case 'rtgs-settlements-by-import':
        return <RtgsSettlementsSlide slide={slide} />;
      case 'ct-matching':
        return <CtMatchingSlide slide={slide} />;
      case 'government-settlements':
        return <GovernmentSettlementsSlide slide={slide} />;
      default:
        return <div>شريحة غير معروفة: {slide.type}</div>;
    }
  };

  return (
    <div className="tv-dashboard-v2">
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
        {currentSlide + 1} / {data.slides.length}
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
          <Sparkles className="h-24 w-24 text-blue-400 mb-6" />
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
  const totalTasks = slide.scheduled || 0;
  const completedTasks = slide.done || 0;
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  const stats = [
    {
      label: 'المجدولة',
      value: slide.scheduled || 0,
      icon: Target,
      color: 'blue',
      bg: 'from-blue-600 to-blue-800',
    },
    {
      label: 'مكتملة',
      value: slide.done || 0,
      icon: CheckCircle2,
      color: 'green',
      bg: 'from-green-600 to-green-800',
    },
    {
      label: 'متأخرة',
      value: slide.overdue || 0,
      icon: AlertCircle,
      color: 'red',
      bg: 'from-red-600 to-red-800',
    },
    {
      label: 'قيد الانتظار',
      value: slide.pending || 0,
      icon: Clock,
      color: 'yellow',
      bg: 'from-yellow-600 to-yellow-800',
    },
    {
      label: 'مكتملة متأخرة',
      value: slide.late || 0,
      icon: TrendingDown,
      color: 'orange',
      bg: 'from-orange-600 to-orange-800',
    },
  ];

  return (
    <div className="slide overview-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <BarChart3 className="h-10 w-10 text-blue-400" />
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
              className={`stat-card ${stat.color}`}
            >
              <div className={`stat-icon bg-gradient-to-br ${stat.bg}`}>
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
    </div>
  );
};

// Scheduled Tasks Slide — المهام المجدولة اليوم
const ScheduledTasksSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const tasks = slide.tasks || [];
  return (
    <div className="slide overdue-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <ListTodo className="h-10 w-10 text-blue-400" />
        <h1 className="slide-title">المهام المجدولة — {slide.date}</h1>
      </motion.div>
      <div className="slide-stats-row mb-6">
        <span className="stat-badge">إجمالي: {slide.total || 0}</span>
        <span className="stat-badge success">مكتملة: {slide.completed || 0}</span>
        <span className="stat-badge danger">متأخرة: {slide.overdue || 0}</span>
      </div>
      {tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <ListTodo className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد مهام مجدولة اليوم</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {tasks.map((task: any, idx: number) => (
            <motion.div
              key={task.id || idx}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`task-item ${task.status === 'overdue' ? 'overdue' : ''} ${task.status === 'completed' ? 'completed' : ''}`}
            >
              <div className="task-icon">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : task.status === 'overdue' ? (
                  <AlertCircle className="h-6 w-6 text-red-400" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-400" />
                )}
              </div>
              <div className="task-content">
                <h3 className="task-title">{task.title || 'مهمة بدون عنوان'}</h3>
                <div className="task-meta">
                  {task.executedBy && (
                    <span className="task-assignee">
                      <User className="h-4 w-4" />
                      {task.executedBy}
                    </span>
                  )}
                  {task.expectedTime && (
                    <span className="task-time">
                      <Clock className="h-4 w-4" />
                      {task.expectedTime}
                      {task.actualCompletedTime && ` → ${task.actualCompletedTime}`}
                    </span>
                  )}
                  {task.delayMinutes > 0 && (
                    <span className="task-delay">تأخر: {task.delayMinutes} د</span>
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

// Additional Tasks Slide — المهام الإضافية
const AdditionalTasksSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const tasks = slide.tasks || [];
  return (
    <div className="slide overdue-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <FilePlus className="h-10 w-10 text-purple-400" />
        <h1 className="slide-title">المهام الإضافية — {slide.date}</h1>
      </motion.div>
      {tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <FilePlus className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد مهام إضافية اليوم</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {tasks.map((task: any, idx: number) => (
            <motion.div
              key={task.id || idx}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="task-item completed"
            >
              <div className="task-icon">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div className="task-content">
                <h3 className="task-title">{task.title || 'مهمة إضافية'}</h3>
                <div className="task-meta">
                  {task.executedBy && (
                    <span className="task-assignee">
                      <User className="h-4 w-4" />
                      {task.executedBy}
                    </span>
                  )}
                  {task.actualCompletedTime && (
                    <span className="task-time">
                      <Clock className="h-4 w-4" />
                      {task.actualCompletedTime}
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

// Employee Slide — شريحة الموظف اليومية
const EmployeeSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const emp = slide.employee || {};
  const daily = slide.daily || {};
  const tasks = daily.tasks || [];
  const attendance = daily.attendance || {};
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => setAvatarError(false), [emp?.id]);
  return (
    <div className="slide employee-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header employee-header">
        <div className="employee-avatar-large">
          {emp.avatarUrl && !avatarError ? (
            <img
              src={`${window.location.origin}${emp.avatarUrl}`}
              alt={emp.name}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span>{emp.name ? emp.name.charAt(0) : '?'}</span>
          )}
        </div>
        <div>
          <h1 className="slide-title">{emp.name || 'موظف'}</h1>
          <div className="employee-stats-row">
            <span><CheckCircle2 className="h-4 w-4 text-green-400" /> {daily.tasksDone || 0} منجزة</span>
            <span><Target className="h-4 w-4" /> في الوقت: {daily.onTime || 0}</span>
            {daily.late > 0 && <span className="text-red-400"><AlertCircle className="h-4 w-4" /> متأخرة: {daily.late}</span>}
            {attendance.present && attendance.loginTime && (
              <span><Clock className="h-4 w-4" /> حضور: {attendance.loginTime}</span>
            )}
          </div>
        </div>
      </motion.div>
      {tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <p className="empty-text">لا توجد مهام لهذا اليوم</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {tasks.slice(0, 12).map((task: any, idx: number) => (
            <motion.div
              key={task.id || idx}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className={`task-item ${task.status === 'overdue' ? 'overdue' : ''} ${task.status === 'completed' ? 'completed' : ''}`}
            >
              <div className="task-icon">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : task.status === 'overdue' ? (
                  <AlertCircle className="h-6 w-6 text-red-400" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-400" />
                )}
              </div>
              <div className="task-content">
                <h3 className="task-title">{task.title || 'مهمة'}</h3>
                <div className="task-meta">
                  {task.expectedTime && <span className="task-time">{task.expectedTime}</span>}
                  {task.type === 'ad-hoc' && <span className="badge-adhoc">إضافية</span>}
                </div>
              </div>
            </motion.div>
          ))}
          {tasks.length > 12 && <p className="text-sm opacity-80 mt-2">+ {tasks.length - 12} مهمة أخرى</p>}
        </div>
      )}
    </div>
  );
};

// Employee Monthly Slide — شريحة الموظف الشهرية
const EmployeeMonthlySlide: React.FC<{ slide: any }> = ({ slide }) => {
  const emp = slide.employee || {};
  const monthly = slide.monthly || {};
  const categories = monthly.categories || [];
  const attendance = monthly.attendance || {};
  const [avatarErrorMonthly, setAvatarErrorMonthly] = useState(false);
  useEffect(() => setAvatarErrorMonthly(false), [emp?.id]);
  return (
    <div className="slide employee-monthly-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header employee-header">
        <div className="employee-avatar-large">
          {emp.avatarUrl && !avatarErrorMonthly ? (
            <img
              src={`${window.location.origin}${emp.avatarUrl}`}
              alt={emp.name}
              onError={() => setAvatarErrorMonthly(true)}
            />
          ) : (
            <span>{emp.name ? emp.name.charAt(0) : '?'}</span>
          )}
        </div>
        <div>
          <h1 className="slide-title">إحصائيات {emp.name || 'الموظف'} — {monthly.month || ''}</h1>
        </div>
      </motion.div>
      <div className="overview-grid" style={{ marginBottom: '2rem' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="stat-card blue">
          <div className="stat-icon bg-gradient-to-br from-blue-600 to-blue-800">
            <Target className="h-8 w-8" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{monthly.tasksDone || 0}</div>
            <div className="stat-label">مهام منجزة</div>
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="stat-card green">
          <div className="stat-icon bg-gradient-to-br from-green-600 to-green-800">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{monthly.onTime || 0}</div>
            <div className="stat-label">في الوقت</div>
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="stat-card purple">
          <div className="stat-icon bg-gradient-to-br from-purple-600 to-purple-800">
            <UserCheck className="h-8 w-8" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{attendance.daysPresent || 0}</div>
            <div className="stat-label">أيام حضور</div>
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="stat-card orange">
          <div className="stat-icon bg-gradient-to-br from-orange-600 to-orange-800">
            <Zap className="h-8 w-8" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{monthly.coverage || 0}</div>
            <div className="stat-label">تغطية</div>
          </div>
        </motion.div>
      </div>
      {categories.length > 0 && (
        <div className="categories-container">
          <h3 className="text-lg font-bold mb-4">حسب الفئة</h3>
          <div className="categories-grid">
            {categories.slice(0, 6).map((cat: any, idx: number) => (
              <motion.div
                key={cat.name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="category-card"
              >
                <div className="category-header">
                  <FolderTree className="h-6 w-6 text-purple-400" />
                  <h3 className="category-name">{cat.name}</h3>
                </div>
                <div className="category-count">{cat.count}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// RTGS Imports Today — استيراد RTGS اليوم
const RtgsImportsSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const imports = slide.imports || [];

  return (
    <div className="slide overview-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <FileUp className="h-10 w-10 text-teal-400" />
        <h1 className="slide-title">استيراد RTGS — {slide.date}</h1>
      </motion.div>
      {imports.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <FileUp className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لم يتم تحميل أي ملف RTGS مؤخراً</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {imports.map((imp: any, idx: number) => (
            <motion.div key={imp.importLogId || idx} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }} className="task-item">
              <div className="task-icon"><FileUp className="h-6 w-6 text-teal-400" /></div>
              <div className="task-content">
                <h3 className="task-title">{imp.filename || 'ملف'}</h3>
                <div className="task-meta">
                  <span><Clock className="h-4 w-4" /> {imp.importedAt}</span>
                  <span>{imp.rowCount} حركة</span>
                  {imp.sttlDateFrom && imp.sttlDateTo && <span>تسويات: {imp.sttlDateFrom} — {imp.sttlDateTo}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// RTGS Settlements By Import — كروت التسويات حسب التحميل
const RtgsSettlementsSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const cards = slide.cards || [];
  const formatNum = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0');

  return (
    <div className="slide overview-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <Banknote className="h-10 w-10 text-teal-400" />
        <h1 className="slide-title">كروت التسويات — حسب تاريخ التحميل</h1>
      </motion.div>
      {cards.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <Banknote className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد تسويات تم تحميلها</p>
        </motion.div>
      ) : (
        <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {cards.map((card: any, idx: number) => (
            <motion.div key={card.importLogId || idx} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: idx * 0.08 }} className="stat-card blue">
              <div className="stat-icon bg-gradient-to-br from-teal-600 to-teal-800"><Banknote className="h-8 w-8" /></div>
              <div className="stat-content" style={{ flex: 1 }}>
                <div className="stat-label text-sm">{card.filename}</div>
                <div className="stat-value text-lg">{card.rowCount} حركة</div>
                {card.sttlDateFrom && <span className="text-xs">{card.sttlDateFrom} — {card.sttlDateTo || card.sttlDateFrom}</span>}
                <div className="mt-2 text-xs opacity-90">STTLE: {formatNum(card.totalSttle)} IQD</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// CT Matching Slide — مطابقة CT
const CtMatchingSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const records = slide.records || [];
  const formatNum = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0');

  return (
    <div className="slide overview-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <FileCheck className="h-10 w-10 text-purple-400" />
        <h1 className="slide-title">مطابقة CT</h1>
      </motion.div>
      {records.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <FileCheck className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد سجلات CT</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {records.slice(0, 12).map((r: any, idx: number) => (
            <motion.div key={r.id || idx} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.04 }} className={`task-item ${r.matchStatus === 'matched' ? 'completed' : ''}`}>
              <div className="task-icon">
                {r.matchStatus === 'matched' ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : <AlertCircle className="h-6 w-6 text-amber-400" />}
              </div>
              <div className="task-content">
                <h3 className="task-title">{r.sttlDateFrom} — {r.sttlDateTo}</h3>
                <div className="task-meta">
                  <span>CT: {formatNum(r.ctValue)}</span>
                  <span>ACQ: {formatNum(r.sumAcq)}</span>
                  <span>{r.matchStatus === 'matched' ? '✓ مطابق' : '— غير مطابق'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Government Settlements Slide — التسوية الحكومية
const GovernmentSettlementsSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const tasks = slide.tasks || [];
  const formatNum = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—');

  return (
    <div className="slide overview-slide">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="slide-header">
        <Scale className="h-10 w-10 text-blue-400" />
        <h1 className="slide-title">التسوية الحكومية — {slide.date}</h1>
      </motion.div>
      {tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state">
          <Scale className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد مهام تسوية حكومية اليوم</p>
        </motion.div>
      ) : (
        <div className="task-list">
          {tasks.map((t: any, idx: number) => (
            <motion.div key={t.id || idx} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.04 }} className={`task-item ${t.verificationStatus === 'matched' ? 'completed' : ''}`}>
              <div className="task-icon">
                {t.verificationStatus === 'matched' ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : t.verificationStatus === 'mismatch' ? <AlertCircle className="h-6 w-6 text-red-400" /> : <Clock className="h-6 w-6 text-amber-400" />}
              </div>
              <div className="task-content">
                <h3 className="task-title">{t.title}</h3>
                <div className="task-meta">
                  <span>تاريخ التسوية: {t.targetSettlementDate}</span>
                  {t.settlementValue != null && <span>القيمة: {formatNum(t.settlementValue)} IQD</span>}
                  {t.executedName && <span><Users className="h-4 w-4" />{t.executedName}</span>}
                  <span>{t.verificationStatus === 'matched' ? '✓ مطابق' : t.verificationStatus === 'mismatch' ? 'غير مطابق' : 'قيد الانتظار'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
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
        <AlertCircle className="h-10 w-10 text-red-400" />
        <h1 className="slide-title">المهام المتأخرة</h1>
      </motion.div>

      {!slide.tasks || slide.tasks.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <CheckCircle2 className="h-20 w-20 text-green-400 mb-4" />
          <p className="empty-text">لا توجد مهام متأخرة</p>
          <p className="empty-subtext">جميع المهام في الوقت المحدد</p>
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
                <AlertCircle className="h-6 w-6 text-red-400" />
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
        <Users className="h-10 w-10 text-blue-400" />
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
        <UserCheck className="h-10 w-10 text-green-400" />
        <h1 className="slide-title">الحضور - {slide.date}</h1>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="attendance-summary"
      >
        <div className="summary-card">
          <Users className="h-12 w-12 text-blue-400" />
          <div className="summary-content">
            <div className="summary-value">{slide.present || 0}</div>
            <div className="summary-label">موظف حضر اليوم</div>
          </div>
        </div>
      </motion.div>

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
        <FolderTree className="h-10 w-10 text-purple-400" />
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
                    <FolderTree className="h-6 w-6 text-purple-400" />
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
  const maxCompleted = Math.max(...weekData.map((day: any) => day.completed || 0), 1);

  return (
    <div className="slide trends-slide">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="slide-header"
      >
        <TrendingUp className="h-10 w-10 text-blue-400" />
        <h1 className="slide-title">الاتجاهات الأسبوعية</h1>
      </motion.div>

      <div className="trends-chart">
        {(slide.week || []).map((day: any, idx: number) => {
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
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
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
        <Award className="h-10 w-10 text-yellow-400" />
        <h1 className="slide-title">أفضل الأداء</h1>
      </motion.div>

      {!slide.topPerformers || slide.topPerformers.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="empty-state"
        >
          <Award className="h-20 w-20 text-slate-400 mb-4" />
          <p className="empty-text">لا توجد بيانات</p>
        </motion.div>
      ) : (
        <div className="recognition-list">
          {(slide.topPerformers || []).map((performer: any, idx: number) => (
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
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>{performer.onTime} في الوقت</span>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default TVDashboardV2;
