import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import axios from 'axios';
import moment from 'moment-timezone';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Target,
  Timer,
  UserCheck,
  FolderTree,
  Activity,
  TrendingUp,
  Sparkles,
  X,
  Upload,
  Banknote,
  FileCheck,
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
    slideDurations?: Record<string, number>;
  };
  slides: TVSlide[];
}

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string;
}

// Hook للظهور التدريجي — كل 2 ثانية خطوة جديدة
const STEP_MS = 2000;
const useRevealedSteps = (maxSteps: number) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, maxSteps)), STEP_MS);
    return () => clearInterval(id);
  }, [maxSteps]);
  return step;
};

// ساعة دائرية حديثة — تختفي عند وجود محتوى أسفلها وتظهر بانتقال سلس عند اختفاء المحتوى
const CircularClockDisplay = React.forwardRef<HTMLDivElement, {
  currentTime: moment.Moment;
  hasContentBelow: boolean;
}>(({ currentTime, hasContentBelow }, ref) => {
  const hours = currentTime.hours() % 12;
  const minutes = currentTime.minutes();
  const seconds = currentTime.seconds();
  const hourAngle = (hours * 30) + (minutes * 0.5) - 90;
  const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
  const secondAngle = (seconds * 6) - 90;
  const timeStr = currentTime.format('HH:mm:ss');
  const dateStr = currentTime.format('YYYY-MM-DD');
  const visible = !hasContentBelow;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          key="circular-clock"
          className="circular-clock-cinematic"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 15 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.7 }}
        >
      <svg viewBox="0 0 120 120" className="circular-clock-svg">
        <defs>
          <linearGradient id="clock-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#068294" />
            <stop offset="100%" stopColor="#026174" />
          </linearGradient>
          <filter id="clock-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
          </filter>
        </defs>
        <circle cx="60" cy="60" r="54" fill="url(#clock-bg-grad)" filter="url(#clock-shadow)" className="clock-face" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          const x1 = 60 + 44 * Math.cos(a);
          const y1 = 60 + 44 * Math.sin(a);
          const x2 = 60 + 48 * Math.cos(a);
          const y2 = 60 + 48 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.6)" strokeWidth={i % 3 === 0 ? 2 : 1} />;
        })}
        <line x1="60" y1="60" x2={60 + 18 * Math.cos(hourAngle * Math.PI / 180)} y2={60 + 18 * Math.sin(hourAngle * Math.PI / 180)} stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="60" x2={60 + 28 * Math.cos(minuteAngle * Math.PI / 180)} y2={60 + 28 * Math.sin(minuteAngle * Math.PI / 180)} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="60" x2={60 + 38 * Math.cos(secondAngle * Math.PI / 180)} y2={60 + 38 * Math.sin(secondAngle * Math.PI / 180)} stroke="#ffd93d" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="circular-clock-digital">
        <span className="circular-clock-time">{timeStr}</span>
        <span className="circular-clock-date">{dateStr}</span>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
});
CircularClockDisplay.displayName = 'CircularClockDisplay';

const TVDashboardCinematic: React.FC = () => {
  const [data, setData] = useState<TVData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(moment().tz('Asia/Baghdad'));
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);
  const clockSensorRef = useRef<HTMLDivElement | null>(null);
  const [hasContentBelowClock, setHasContentBelowClock] = useState(false);

  // التحقق من وجود محتوى أسفل الساعة (يغطيه المحتوى)
  useEffect(() => {
    if (!containerRef.current) return;
    const check = () => {
      if (toasts.length > 0) {
        setHasContentBelowClock(true);
        return;
      }
      const sensor = clockSensorRef.current;
      if (!sensor) return;
      const rect = sensor.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let el: Element | null = document.elementFromPoint(cx, cy);
      const clockEl = clockRef.current;
      if (clockEl && (el === clockEl || clockEl.contains(el))) {
        const prev = (clockEl as HTMLElement).style.pointerEvents;
        (clockEl as HTMLElement).style.pointerEvents = 'none';
        el = document.elementFromPoint(cx, cy);
        (clockEl as HTMLElement).style.pointerEvents = prev;
      }
      const covered = el && (el.closest('.slide-container-cinematic') || el.closest('.toast-container') || (el as Element).classList?.contains('toast'));
      setHasContentBelowClock(!!covered);
    };
    check();
    const id = setInterval(check, 400);
    return () => clearInterval(id);
  }, [toasts.length, currentSlide]);

  // Fullscreen API
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if ((containerRef.current as any).mozRequestFullScreen) {
            await (containerRef.current as any).mozRequestFullScreen();
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen();
          }
          setIsFullscreen(true);
        }
      } catch (err) {
        console.error('خطأ في تفعيل وضع ملء الشاشة:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
    
    // Cleanup: إلغاء الطلب عند unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
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

  // خريطة نوع الشريحة -> مفتاح الإعدادات (للمدة)
  const SLIDE_TYPE_TO_KEY: Record<string, string> = {
    opening: 'opening',
    overview: 'overview',
    'scheduled-tasks': 'scheduledTasks',
    'additional-tasks': 'additionalTasks',
    employee: 'employee',
    'employee-monthly': 'employeeMonthly',
    'department-monthly-overview': 'departmentMonthlyOverview',
    overdue: 'overdue',
    attendance: 'attendance',
    coverage: 'coverage',
    categories: 'categories',
    recognition: 'recognition',
    'rtgs-imports-today': 'rtgsImportsToday',
    'rtgs-settlements-by-import': 'rtgsSettlementsByImport',
    'ct-matching': 'ctMatching',
    'government-settlements': 'governmentSettlements',
    'government-settlement-cards': 'governmentSettlementCards',
    'settlements-matching-overview': 'settlementsMatchingOverview',
    'monthly-scheduled-by-category': 'monthlyScheduledByCategory',
    'monthly-additional-by-employee': 'monthlyAdditionalByEmployee',
  };

  // تغيير الشرائح تلقائياً — مدة لكل شريحة
  useEffect(() => {
    if (!data?.slides || data.slides.length === 0) return;
    const slide = data.slides[currentSlide];
    const durations = data.settings?.slideDurations || {};
    const defaultSec = (data.settings?.slideInterval || 10) * 1000;
    const key = slide ? SLIDE_TYPE_TO_KEY[slide.type] || slide.type : null;
    const ms = key && typeof durations[key] === 'number' ? durations[key] * 1000 : defaultSec;
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % data!.slides!.length);
    }, Math.max(3000, ms));
    return () => clearTimeout(timer);
  }, [data, currentSlide]);

  // WebSocket للاستماع للإشعارات
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
        : 'ws://localhost:5001/ws');
    let ws: WebSocket | null = null;
    
    try {
      // TV Dashboard لا يحتاج authentication token
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected for TV Dashboard');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'task_executed') {
            const taskTitle = data.taskTitle || 'مهمة';
            const userName = data.userName || 'مستخدم';
            const time = moment().tz('Asia/Baghdad').format('h:mm:ss A');
            addToast(`✅ تم إنجاز مهمة (${taskTitle}) بواسطة (${userName}) الساعة ${time}`, 'success');
            // Refresh data after a short delay
            setTimeout(() => fetchData(), 2000);
          } else if (data.type === 'task_created') {
            const taskTitle = data.title || 'مهمة';
            const userName = data.userName || 'مستخدم';
            const time = moment().tz('Asia/Baghdad').format('h:mm:ss A');
            addToast(`➕ تم إضافة مهمة جديدة (${taskTitle}) بواسطة (${userName}) الساعة ${time}`, 'info');
            setTimeout(() => fetchData(), 2000);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (ws?.readyState === WebSocket.CLOSED) {
            // Will be handled by useEffect cleanup and re-run
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // نسبة التحميل — تصل 90% بسرعة ثم تنتظر استجابة الخادم
  useEffect(() => {
    if (!loading) {
      setLoadProgress(100);
      return;
    }
    setLoadProgress(0);
    const start = Date.now();
    const dur = 3000; // 90% خلال ~3 ثوانٍ
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / dur);
      const p = Math.round(90 * t); // 0 → 90 خلال 3 ثوانٍ
      setLoadProgress(p);
    }, 100);
    return () => clearInterval(iv);
  }, [loading]);

  const fetchData = async () => {
    try {
      // إلغاء الطلب السابق إن وجد
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 60000); // زيادة timeout إلى 60 ثانية
      
      // TV Dashboard لا يحتاج authentication - استخدام axios مباشرة
      console.log('🔄 بدء جلب بيانات TV Dashboard...');
      const response = await axios.get('/api/tv-dashboard', {
        signal: controller.signal,
        timeout: 60000, // زيادة timeout إلى 60 ثانية
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      // التحقق من أن الطلب لم يتم إلغاؤه
      if (controller.signal.aborted) {
        return; // تم إلغاء الطلب، لا نحدث الحالة
      }
      
      console.log('✅ تم استلام البيانات:', {
        hasData: !!response.data,
        hasSlides: !!response.data?.slides,
        slidesCount: response.data?.slides?.length,
        hasSettings: !!response.data?.settings
      });
      
      // التحقق من شرائح الموظفين
      if (response.data?.slides) {
        const employeeSlides = response.data.slides.filter((s: any) => s.type === 'employee');
        console.log(`👥 عدد شرائح الموظفين: ${employeeSlides.length}`);
        employeeSlides.slice(0, 3).forEach((slide: any) => {
          const taskCount = slide.daily?.tasks?.length || 0;
          console.log(`   ${slide.employee?.name}: ${taskCount} مهمة`, slide.daily?.tasks ? '✅' : '❌');
          if (taskCount === 0 && slide.daily) {
            console.log(`   ⚠️ daily object:`, Object.keys(slide.daily));
          }
        });
      }
      
      if (response.data && response.data.slides && Array.isArray(response.data.slides)) {
        // التحقق مرة أخرى من أن الطلب لم يتم إلغاؤه
        if (controller.signal.aborted) {
          return;
        }
        
        setData(response.data);
        setLoading(false);
        setError(null);
        abortControllerRef.current = null; // تنظيف المرجع
        console.log('✅ تم تحديث البيانات بنجاح');
      } else {
        console.error('❌ بيانات غير صحيحة:', response.data);
        throw new Error('بيانات غير صحيحة من الخادم');
      }
    } catch (err: any) {
      // تجاهل أخطاء الإلغاء (CanceledError) - هذه طبيعية عند تغيير السلايد
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'canceled') {
        console.log('ℹ️ تم إلغاء الطلب (هذا طبيعي عند تغيير السلايد)');
        return; // لا نحدث الحالة عند الإلغاء
      }
      
      console.error('❌ خطأ في جلب بيانات لوحة التحكم:', err);
      setLoading(false);
      abortControllerRef.current = null; // تنظيف المرجع حتى في حالة الخطأ
      
      let errorMessage = 'خطأ في جلب البيانات';
      
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'خطأ في الاتصال بالخادم. تأكد من أن الخادم يعمل.';
      } else if (err.response?.status === 403) {
        errorMessage = 'غير مصرح بالوصول. يرجى التحقق من إعدادات الخادم.';
        console.error('خطأ 403 - تفاصيل:', err.response?.data);
      } else if (err.response?.status === 500) {
        errorMessage = err.response?.data?.message || 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
        if (err.response?.data?.details) {
          console.error('تفاصيل الخطأ من الخادم:', err.response.data.details);
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
    }
  };

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const newToast: ToastNotification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: currentTime.format('h:mm:ss A')
    };
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 10000);
  };

  // Loading Screen — تصميم احترافي مع الشعار الدوار ونسبة التحميل
  if (loading && !error) {
    return (
      <div ref={containerRef} className="tv-cinematic-dashboard">
        <div className="loading-screen-cinematic loading-screen-pro">
          <div className="loading-pro-bg" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="loading-content loading-content-pro"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="loading-logo-ring"
            >
              <div className="loading-logo-inner">
                <img src="/logo-icon.png" alt="الساقي" className="loading-logo-img" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="loading-title-pro"
            >
              قسم التسويات والمطابقة
            </motion.h1>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="loading-subtitle-pro"
            >
              جاري التحميل...
            </motion.p>
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="loading-progress-wrapper"
            >
              <div className="loading-progress-track">
                <motion.div
                  className="loading-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="loading-progress-text">{loadProgress}%</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || (!loading && !data)) {
    return (
      <div ref={containerRef} className="tv-cinematic-dashboard">
        <div className="error-screen-cinematic">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="error-content"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: 'spring' }}
              className="error-logo-container"
            >
              <img src="/logo.png" alt="ALSAQI Logo" className="error-logo" />
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <AlertCircle className="h-24 w-24 mb-8" style={{ color: '#068294' }} />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="error-title"
            >
              قسم التسويات والمطابقة
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="error-message"
            >
              {error || 'فشل في جلب البيانات. يرجى التحقق من اتصال الخادم.'}
            </motion.p>
            
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={fetchData}
              className="retry-button-cinematic"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              إعادة المحاولة
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!data || !data.slides || data.slides.length === 0) {
    return (
      <div ref={containerRef} className="tv-cinematic-dashboard">
        <div className="error-screen-cinematic">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="error-content"
          >
            <AlertCircle className="h-24 w-24 mb-8" style={{ color: '#068294' }} />
            <h1 className="error-title">قسم التسويات والمطابقة</h1>
            <p className="error-message">لا توجد بيانات للعرض</p>
            <button onClick={fetchData} className="retry-button-cinematic">
              إعادة المحاولة
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // التأكد من أن currentSlide ضمن النطاق
  const safeCurrentSlide = Math.max(0, Math.min(currentSlide, data.slides.length - 1));
  if (safeCurrentSlide !== currentSlide) {
    setCurrentSlide(safeCurrentSlide);
  }

  const slide = data.slides[safeCurrentSlide];

  // Render Slides
  const renderSlide = () => {
    if (!slide) {
      return (
        <div className="error-screen-cinematic">
          <AlertCircle className="h-20 w-20 mb-4" style={{ color: '#ef4444' }} />
          <h2>خطأ في تحميل الشريحة</h2>
          <p>الشريحة الحالية غير موجودة</p>
        </div>
      );
    }

    switch (slide.type) {
      case 'opening':
        return <OpeningCinematicSlide slide={slide} currentTime={currentTime} />;
      case 'overview':
        return <OverviewCinematicSlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'scheduled-tasks':
        return <ScheduledTasksSlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'additional-tasks':
        return <AdditionalTasksSlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'employee':
        return <EmployeeDailySlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'employee-monthly':
        return <EmployeeMonthlySlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'department-monthly-overview':
        return <DepartmentMonthlySlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 90} />;
      case 'attendance':
        return <AttendanceCinematicSlide slide={slide} />;
      case 'coverage':
        return <CoverageCinematicSlide slide={slide} />;
      case 'categories':
        return <CategoriesCinematicSlide slide={slide} />;
      case 'recognition':
        return <RecognitionCinematicSlide slide={slide} />;
      case 'overdue':
        return <OverdueCinematicSlide slide={slide} />;
      case 'rtgs-imports-today':
        return <RtgsImportsCinematicSlide slide={slide} />;
      case 'rtgs-settlements-by-import':
        return <RtgsSettlementsCinematicSlide slide={slide} />;
      case 'ct-matching':
        return <CtMatchingCinematicSlide slide={slide} />;
      case 'government-settlements':
        return <GovernmentSettlementsCinematicSlide slide={slide} />;
      case 'government-settlement-cards': {
        const durations = data.settings?.slideDurations || {};
        const slideDurationSec = durations['governmentSettlementCards'] ?? data.settings?.slideInterval ?? 40;
        return <GovernmentSettlementCardsCinematicSlide slide={slide} slideDurationSec={slideDurationSec} />;
      }
      case 'settlements-matching-overview':
        return <SettlementsMatchingOverviewSlide slide={slide} />;
      case 'monthly-scheduled-by-category':
        return <MonthlyScheduledByCategorySlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 10} />;
      case 'monthly-additional-by-employee':
        return <MonthlyAdditionalByEmployeeSlide slide={slide} slideIntervalSec={data.settings?.slideInterval ?? 10} />;
      default:
        return (
          <div className="error-screen-cinematic">
            <AlertCircle className="h-20 w-20 mb-4" style={{ color: '#ef4444' }} />
            <h2>شريحة غير معروفة</h2>
            <p>نوع الشريحة: {slide.type || 'غير محدد'}</p>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="tv-cinematic-dashboard">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={safeCurrentSlide}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -20 }}
          transition={{ 
            duration: 0.8, 
            ease: [0.4, 0, 0.2, 1],
            opacity: { duration: 0.6 }
          }}
          className="slide-container-cinematic"
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`toast toast-${toast.type}`}
            >
              <div className="toast-content">
                {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                {toast.type === 'warning' && <AlertCircle className="h-5 w-5" />}
                {toast.type === 'info' && <Activity className="h-5 w-5" />}
                <span className="toast-message">{toast.message}</span>
                <span className="toast-time">{toast.timestamp}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="toast-close"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Slide Counter - Minimal */}
      <div className="slide-counter-cinematic">
        <span className="counter-current">{safeCurrentSlide + 1}</span>
        <span className="counter-separator">/</span>
        <span className="counter-total">{data.slides.length}</span>
      </div>

      {/* Sensor للمتحقق من المحتوى أسفل الساعة */}
      <div
        ref={clockSensorRef}
        className="circular-clock-sensor"
        aria-hidden
      />
      {/* Circular Clock */}
      <CircularClockDisplay
        ref={clockRef}
        currentTime={currentTime}
        hasContentBelow={hasContentBelowClock}
      />
    </div>
  );
};

// Opening Cinematic Slide - إعادة بناء من الصفر بشكل احترافي
const OpeningCinematicSlide: React.FC<{ slide: any; currentTime: moment.Moment }> = ({ slide, currentTime }) => {
  const companyName = 'شركة الساقي لخدمات الدفع الإلكتروني';
  const departmentName = 'قسم التسويات & المطابقة';
  const revealedStep = useRevealedSteps(5); // 1:logo, 2:company, 3:dept, 4:datetime, 5:lines

  return (
    <div className="slide opening-cinematic-new">
      {/* Animated Background */}
      <div className="opening-bg-animated" />
      
      {/* Particle Effects */}
      <div className="particles-container">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Logo with Advanced Animation */}
      {revealedStep >= 1 && (
      <motion.div
        className="logo-container-cinematic"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 1.2, 
          type: 'spring', 
          stiffness: 150,
          damping: 15
        }}
      >
        <motion.div
          className="logo-wrapper-cinematic"
          animate={{
            scale: [1, 1.08, 1],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.img 
            src="/logo.png" 
            alt="ALSAQI Logo" 
            className="logo-cinematic-main"
            initial={{ filter: 'brightness(0) blur(20px)' }}
            animate={{ filter: 'brightness(1) blur(0px)' }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          {/* Glow Effect */}
          <motion.div
            className="logo-glow"
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </motion.div>
      )}

      {/* Company Name - Connected Text */}
      {revealedStep >= 2 && (
      <motion.div
        className="company-name-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <motion.h1 className="company-name-cinematic">
          {companyName}
        </motion.h1>
      </motion.div>
      )}

      {/* Department Name - Connected Text */}
      {revealedStep >= 3 && (
      <motion.div
        className="department-name-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <motion.h2 className="department-name-cinematic">
          {departmentName}
        </motion.h2>
      </motion.div>
      )}

      {/* Date & Time Display - Modern Design */}
      {revealedStep >= 4 && (
      <motion.div
        className="datetime-container-cinematic"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, type: 'spring' }}
      >
        <motion.div
          className="datetime-box-modern"
          animate={{
            boxShadow: [
              '0 0 20px rgba(6, 130, 148, 0.3)',
              '0 0 40px rgba(6, 130, 148, 0.5)',
              '0 0 20px rgba(6, 130, 148, 0.3)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            className="date-display-cinematic"
            key={currentTime.format('YYYY-MM-DD')}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Calendar className="datetime-icon" />
            <span>{currentTime.format('YYYY-MM-DD')}</span>
          </motion.div>
          <motion.div
            className="time-display-cinematic-main"
            key={currentTime.format('h:mm:ss A')}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Clock className="datetime-icon" />
            <span>{currentTime.format('h:mm:ss A')}</span>
          </motion.div>
        </motion.div>
      </motion.div>
      )}

      {/* Decorative Elements */}
      {revealedStep >= 5 && (
      <div className="decorative-lines">
        <motion.div
          className="line line-1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5 }}
        />
        <motion.div
          className="line line-2"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        />
      </div>
      )}
    </div>
  );
};

// Overview Cinematic Slide
const OverviewCinematicSlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const completionRate = slide.completionRate || ((slide.scheduled || 0) > 0 
    ? Math.round(((slide.done || 0) / slide.scheduled) * 100) 
    : 0);

  const stats = [
    { label: 'المجدولة اليوم', value: slide.scheduled || 0, icon: Target, color: '#068294' },
    { label: 'المنجزة اليوم', value: slide.done || 0, icon: CheckCircle2, color: '#10b981' },
    { label: 'المتأخرة اليوم', value: slide.overdue || 0, icon: AlertCircle, color: '#ef4444' },
    { label: 'قيد الانتظار', value: slide.pending || 0, icon: Clock, color: '#f59e0b' },
  ];

  const remaining = (slide.scheduled || 0) - (slide.done || 0);
  const revealedStep = useRevealedSteps(7); // 1:header, 2-5:stats, 6-7:bottom
  const showHeader = revealedStep >= 1;
  const showStat = (i: number) => revealedStep >= 2 + i;
  const showBottom = revealedStep >= 6;

  return (
    <div className="slide overview-cinematic">
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      <AnimatePresence>
        {showHeader && (
          <motion.div key="oh-header" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} className="slide-header-cinematic">
            <Activity className="h-12 w-12" style={{ color: '#068294' }} />
            <h1 className="slide-title-cinematic">نظرة عامة - {slide.date}</h1>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stats-grid-cinematic">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return showStat(idx) ? (
            <motion.div key={stat.label} initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="stat-card-cinematic" style={{ borderColor: stat.color }}>
              <motion.div className="stat-icon-cinematic" style={{ background: `${stat.color}20`, color: stat.color }}>
                <Icon className="h-10 w-10" />
              </motion.div>
              <div className="stat-content-cinematic">
                <AnimatedCounter value={stat.value} />
                <div className="stat-label-cinematic">{stat.label}</div>
              </div>
            </motion.div>
          ) : <div key={stat.label} className="stat-card-cinematic stat-placeholder" aria-hidden />;
        })}
      </div>

      <AnimatePresence>
        {showBottom && (
          <motion.div key="oh-bottom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overview-bottom-cinematic">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="completion-ring-cinematic"
        >
          <svg className="progress-ring-cinematic" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="rgba(6, 130, 148, 0.2)"
              strokeWidth="12"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#068294"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: completionRate / 100 }}
              transition={{ duration: 2, delay: 1 }}
              strokeDasharray={`${2 * Math.PI * 85}`}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="ring-content">
            <AnimatedCounter value={completionRate} suffix="%" />
            <span className="ring-label">نسبة الإنجاز</span>
          </div>
        </motion.div>

        <motion.div initial={{ scale: 0.8, opacity: 0, x: 50 }} animate={{ scale: 1, opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="remaining-card-cinematic">
          <Target className="h-8 w-8" style={{ color: '#068294' }} />
          <div className="remaining-content">
            <AnimatedCounter value={remaining} />
            <div className="remaining-label">المتبقي اليوم</div>
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, value);
      setDisplayValue(Math.floor(current));

      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="animated-number">
      {displayValue}{suffix}
    </span>
  );
};

// Scheduled Tasks Slide
const ScheduledTasksSlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const totalTasks = slide.tasks?.length || 0;
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState(12);
  const [pageIndex, setPageIndex] = useState(0);
  const revealedStep = useRevealedSteps(20); // header(1) + 3 KPIs(2-4) + grid(5+)
  const showHeader = revealedStep >= 1;
  const showKpi = (i: number) => revealedStep >= 2 + i;
  const showGrid = revealedStep >= 5;

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const calc = () => {
      const styles = getComputedStyle(el);
      // قيم افتراضية منطقية للكروت على شاشة 86 بوصة
      const cardH = parseFloat(styles.getPropertyValue('--scheduled-card-h')) || 220;
      const minCardW = parseFloat(styles.getPropertyValue('--scheduled-card-min-w')) || 320;
      const gap = parseFloat(styles.getPropertyValue('--scheduled-grid-gap')) || 20;

      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) {
        // إذا لم يكن الحجم متاحاً بعد، استخدم قيماً افتراضية
        setCardsPerPage(12);
        return;
      }

      // حساب عدد الأعمدة والصفوف بناءً على الحجم الفعلي
      const cols = Math.max(1, Math.floor((w + gap) / (minCardW + gap)));
      const rows = Math.max(1, Math.floor((h + gap) / (cardH + gap)));
      const calculated = Math.max(1, cols * rows);
      setCardsPerPage(calculated);
      
      // Debug log (يمكن حذفه لاحقاً)
      if (totalTasks > calculated) {
        console.log(`📄 Scheduled Tasks Paging: ${totalTasks} tasks, showing ${calculated} per page (${cols}x${rows}), total pages: ${Math.ceil(totalTasks / calculated)}`);
      }
    };

    // حساب فوري + عند تغيير الحجم
    calc();
    const ro = new ResizeObserver(() => {
      // تأخير بسيط للتأكد من أن الحجم مستقر
      setTimeout(calc, 100);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalTasks]);

  const totalPages = Math.max(1, Math.ceil(totalTasks / Math.max(1, cardsPerPage)));

  useEffect(() => {
    setPageIndex(0);
    if (totalPages <= 1) return;
    const ms = Math.max(7000, Math.floor((Math.max(10, slideIntervalSec) * 1000) / totalPages));
    const id = window.setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => window.clearInterval(id);
  }, [totalPages, slideIntervalSec]);

  const visibleTasks = useMemo(() => {
    const start = pageIndex * cardsPerPage;
    return (slide.tasks || []).slice(start, start + cardsPerPage);
  }, [slide.tasks, pageIndex, cardsPerPage]);

  const formatTimeBeautiful = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const time = moment(timeStr, 'HH:mm');
      const hour12 = time.format('h');
      const minute = time.format('mm');
      const period = time.format('A');
      return {
        hour: hour12,
        minute: minute,
        period: period,
        full: time.format('h:mm A')
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="slide scheduled-tasks-cinematic-new">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      <AnimatePresence>
        {showHeader && (
          <motion.div key="sch-header" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="scheduled-header-cinematic">
            <div className="scheduled-title-section">
              <Calendar className="h-10 w-10" style={{ color: '#068294' }} />
              <h1 className="scheduled-title-main">المهام المجدولة اليوم</h1>
            </div>
            <div className="scheduled-kpis-row">
              {[
                { icon: Target, val: slide.total || 0, lbl: 'المجدولة', cls: '' },
                { icon: CheckCircle2, val: slide.completed || 0, lbl: 'المنجزة', cls: 'completed' },
                { icon: AlertCircle, val: slide.overdue || 0, lbl: 'المتأخرة', cls: 'overdue' },
              ].map((k, i) => {
                const IconC = k.icon;
                return showKpi(i) ? (
                  <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className={`scheduled-kpi-card ${k.cls}`}>
                    <IconC className="h-7 w-7" style={{ color: k.cls === 'completed' ? '#10b981' : k.cls === 'overdue' ? '#ef4444' : '#068294' }} />
                    <div className="scheduled-kpi-content">
                      <AnimatedCounter value={k.val} />
                      <div className="scheduled-kpi-label">{k.lbl}</div>
                    </div>
                  </motion.div>
                ) : <div key={i} className="scheduled-kpi-card scheduled-kpi-placeholder" aria-hidden />;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="scheduled-tasks-grid-container" ref={gridContainerRef}>
        {!showGrid ? null : (!slide.tasks || slide.tasks.length === 0) ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
            <CheckCircle2 className="h-20 w-20 mb-4" style={{ color: '#068294' }} />
            <p className="empty-text-cinematic">لا توجد مهام مجدولة اليوم</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`scheduled-page-${pageIndex}-${cardsPerPage}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`scheduled-tasks-grid ${totalTasks > 20 ? 'many-tasks-grid' : totalTasks > 10 ? 'medium-tasks-grid' : 'few-tasks-grid'}`}
            >
              {visibleTasks.map((task: any, idx: number) => {
              const isCompleted = task.status === 'completed';
              const isOverdue = task.status === 'overdue';
              const delayMinutes = task.delayMinutes || 0;
              const expectedTimeFormatted = formatTimeBeautiful(task.expectedTime);
              const actualTimeFormatted = formatTimeBeautiful(task.actualCompletedTime);

              return (
                <motion.div
                  key={task.id || idx}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ 
                    delay: idx * 0.04, 
                    type: 'spring',
                    stiffness: 150,
                    damping: 15
                  }}
                  className={`scheduled-task-card-new ${isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending'}`}
                >
                  {/* Status Indicator */}
                  <div className={`task-status-indicator ${isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending'}`} />
                  
                  {/* Task Content */}
                  <div className="scheduled-task-content">
                    <div className="scheduled-task-header-new">
                      <h3 className="scheduled-task-title-new">{task.title || 'مهمة بدون عنوان'}</h3>
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="scheduled-status-badge completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>مكتملة</span>
                        </motion.div>
                      )}
                      {isOverdue && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="scheduled-status-badge overdue"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span>متأخرة</span>
                        </motion.div>
                      )}
                      {!isCompleted && !isOverdue && (
                        <div className="scheduled-status-badge pending">
                          <Clock className="h-4 w-4" />
                          <span>معلقة</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="scheduled-task-details-new">
                      <div className="scheduled-detail-row">
                        <Clock className="scheduled-detail-icon" />
                        <span className="scheduled-detail-label">الوقت المطلوب:</span>
                        {expectedTimeFormatted ? (
                          <div className="time-display-bi scheduled-time">
                            <div className="time-main-bi">
                              <span className="time-hour-bi">{expectedTimeFormatted.hour}</span>
                              <span className="time-separator-bi">:</span>
                              <span className="time-minute-bi">{expectedTimeFormatted.minute}</span>
                            </div>
                            <span className="time-period-bi">{expectedTimeFormatted.period}</span>
                          </div>
                        ) : (
                          <span className="scheduled-detail-value">غير محدد</span>
                        )}
                      </div>
                      
                      {isCompleted && actualTimeFormatted && (
                        <div className="scheduled-detail-row">
                          <CheckCircle2 className="scheduled-detail-icon" style={{ color: '#10b981' }} />
                          <span className="scheduled-detail-label">وقت التنفيذ الفعلي:</span>
                          <div className="time-display-bi completed-time-bi scheduled-time">
                            <div className="time-main-bi">
                              <span className="time-hour-bi">{actualTimeFormatted.hour}</span>
                              <span className="time-separator-bi">:</span>
                              <span className="time-minute-bi">{actualTimeFormatted.minute}</span>
                            </div>
                            <span className="time-period-bi">{actualTimeFormatted.period}</span>
                          </div>
                        </div>
                      )}
                      
                      {isOverdue && delayMinutes > 0 && (
                        <div className="scheduled-detail-row">
                          <AlertCircle className="scheduled-detail-icon" style={{ color: '#ef4444' }} />
                          <span className="scheduled-detail-label">مدة التأخير:</span>
                          <span className="scheduled-detail-value delay">{formatDelay(delayMinutes)}</span>
                        </div>
                      )}
                      
                      {task.executedBy && (
                        <div className="scheduled-detail-row">
                          <Users className="scheduled-detail-icon" />
                          <span className="scheduled-detail-label">المنفذ:</span>
                          <span className="scheduled-detail-value">{task.executedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="scheduled-page-indicator">
            <span>{pageIndex + 1}</span>
            <span className="sep">/</span>
            <span>{totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Additional Tasks Slide — تصميم محسّن
const AdditionalTasksSlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const tasks = slide.tasks || [];
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const pendingCount = totalTasks - completedCount;
  const tasksContainerRef = useRef<HTMLDivElement | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState(6);
  const [pageIndex, setPageIndex] = useState(0);
  const revealedStep = useRevealedSteps(6); // 1:header, 2-4:stats, 5:grid
  const showHeader = revealedStep >= 1;
  const showStat = (i: number) => revealedStep >= 2 + i;
  const showGrid = revealedStep >= 5;

  useEffect(() => {
    const el = tasksContainerRef.current;
    if (!el) return;
    const calc = () => {
      const cardH = 200;
      const gap = 20;
      const h = el.clientHeight;
      setCardsPerPage(h ? Math.max(2, Math.floor((h + gap) / (cardH + gap))) : 6);
    };
    calc();
    const ro = new ResizeObserver(() => setTimeout(calc, 100));
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalTasks]);

  const totalPages = Math.max(1, Math.ceil(totalTasks / Math.max(1, cardsPerPage)));

  useEffect(() => {
    setPageIndex(0);
    if (totalPages <= 1) return;
    const ms = Math.max(6000, Math.floor((Math.max(10, slideIntervalSec) * 1000) / totalPages));
    const id = window.setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => window.clearInterval(id);
  }, [totalPages, slideIntervalSec]);

  const visibleTasks = useMemo(() => {
    const start = pageIndex * cardsPerPage;
    return tasks.slice(start, start + cardsPerPage);
  }, [tasks, pageIndex, cardsPerPage]);

  return (
    <div className="slide additional-tasks-cinematic-v2">
      <motion.div className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      {/* Header مع شريط إحصائيات */}
      {showHeader && (
      <motion.div
        key="add-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="additional-tasks-header-v2"
      >
        <div className="additional-tasks-title-row">
          <div className="additional-tasks-icon-wrap">
            <Sparkles className="h-10 w-10" />
          </div>
          <div>
            <h1 className="additional-tasks-title-v2">المهام الإضافية</h1>
            <p className="additional-tasks-date-v2">{slide.date}</p>
          </div>
        </div>
        {totalTasks > 0 && (
          <div className="additional-tasks-stats-bar">
            {showStat(0) && (
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="additional-stat-pill completed">
                <CheckCircle2 className="h-5 w-5" /><span>{completedCount}</span><span>مكتملة</span>
              </motion.div>
            )}
            {showStat(1) && (
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="additional-stat-pill pending">
                <Clock className="h-5 w-5" /><span>{pendingCount}</span><span>قيد الانتظار</span>
              </motion.div>
            )}
            {showStat(2) && (
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="additional-stat-pill total">
                <Target className="h-5 w-5" /><span>{totalTasks}</span><span>الإجمالي</span>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
      )}

      <div className="additional-tasks-grid-wrap" ref={tasksContainerRef}>
        {!showGrid ? null : totalTasks === 0 ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="additional-empty-state-v2"
          >
            <div className="additional-empty-icon">
              <Sparkles className="h-24 w-24" />
            </div>
            <p className="additional-empty-title">لا توجد مهام إضافية</p>
            <p className="additional-empty-desc">المهام الإضافية التي يُنشئها الموظفون ستظهر هنا</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`add-page-${pageIndex}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="additional-tasks-grid-v2"
            >
              {visibleTasks.map((task: any, idx: number) => {
                const isCompleted = task.status === 'completed';
                return (
                  <motion.div
                    key={`${task.id || idx}-${pageIndex}`}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
                    className={`additional-task-card-v2 ${isCompleted ? 'completed' : 'pending'}`}
                  >
                    <div className="additional-card-accent" />
                    <div className="additional-card-content">
                      <div className="additional-card-header">
                        <h3 className="additional-card-title">{task.title || 'مهمة بدون عنوان'}</h3>
                        {isCompleted ? (
                          <span className="additional-badge-v2 completed">
                            <CheckCircle2 className="h-4 w-4" />
                            مكتملة
                          </span>
                        ) : (
                          <span className="additional-badge-v2 pending">
                            <Clock className="h-4 w-4" />
                            قيد الانتظار
                          </span>
                        )}
                      </div>
                      <div className="additional-card-meta">
                        {task.expectedTime && (
                          <div className="additional-meta-item">
                            <Clock className="h-4 w-4" />
                            <span>{task.expectedTime}</span>
                          </div>
                        )}
                        {isCompleted && task.actualCompletedTime && (
                          <div className="additional-meta-item done">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>تم: {task.actualCompletedTime}</span>
                          </div>
                        )}
                        {task.executedBy && (
                          <div className="additional-meta-item user">
                            <Users className="h-4 w-4" />
                            <span>{task.executedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {showGrid && totalPages > 1 && (
          <div className="additional-page-dots-v2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`additional-dot ${i === pageIndex ? 'active' : ''}`}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Employee Daily Slide
const EmployeeDailySlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const { employee, daily } = slide;
  const revealedStep = useRevealedSteps(8); // 1:header, 2:avatar, 3:name, 4-7:KPIs(4), 8:tasks
  const showHeader = revealedStep >= 1;
  const showKpis = revealedStep >= 4;
  const showTasks = revealedStep >= 8;
  
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => setAvatarError(false), [employee?.id]);

  // حساب وقت الحضور: أول دخول - 30 دقيقة
  const attendanceTime = daily?.attendance?.loginTime 
    ? moment(daily.attendance.loginTime, 'HH:mm').subtract(30, 'minutes').format('h:mm A')
    : null;

  // حساب KPIs
  const tasks = daily?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Paging داخل نفس الصفحة (بدل scroll): إذا البيانات أكثر من اللي يسعها، نعرض دفعات ثم نبدّل تلقائياً
  const rowsContainerRef = useRef<HTMLDivElement | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);

  useEffect(() => {
    const el = rowsContainerRef.current;
    if (!el) return;

    const calc = () => {
      const styles = getComputedStyle(el);
      const rowH = parseFloat(styles.getPropertyValue('--task-row-height')) || 44;
      const h = el.clientHeight;
      if (!h) {
        // إذا لم يكن الحجم متاحاً بعد، استخدم قيمة افتراضية
        setRowsPerPage(10);
        return;
      }
      const per = Math.max(1, Math.floor(h / rowH));
      setRowsPerPage(per);
      
      // Debug log (يمكن حذفه لاحقاً)
      if (totalTasks > per) {
        console.log(`📄 Employee Tasks Paging: ${totalTasks} tasks, showing ${per} per page, total pages: ${Math.ceil(totalTasks / per)}`);
      }
    };

    // حساب فوري + عند تغيير الحجم
    calc();
    const ro = new ResizeObserver(() => {
      // تأخير بسيط للتأكد من أن الحجم مستقر
      setTimeout(calc, 100);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalTasks]);

  const totalPages = Math.max(1, Math.ceil(totalTasks / Math.max(1, rowsPerPage)));

  useEffect(() => {
    setPageIndex(0);
    if (totalPages <= 1) return;
    const ms = Math.max(7000, Math.floor((Math.max(10, slideIntervalSec) * 1000) / totalPages));
    const id = window.setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => window.clearInterval(id);
  }, [totalPages, slideIntervalSec]);

  const visibleTasks = useMemo(() => {
    const start = pageIndex * rowsPerPage;
    return tasks.slice(start, start + rowsPerPage);
  }, [tasks, pageIndex, rowsPerPage]);

  // دالة لتنسيق الوقت بشكل أجمل
  // تحسين عرض الوقت بصيغة 12 ساعة بشكل احترافي
  const formatTimeBeautiful = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const time = moment(timeStr, 'HH:mm');
      const hour12 = time.format('h'); // ساعة بصيغة 12 (1-12)
      const minute = time.format('mm');
      const period = time.format('A'); // AM/PM
      const hour24 = time.format('HH'); // للاستخدام الداخلي
      
      return {
        hour: hour12,
        minute: minute,
        period: period,
        hour24: hour24,
        full: time.format('h:mm A'), // صيغة كاملة: 2:30 PM
        display: `${hour12}:${minute} ${period}` // للعرض
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="slide employee-daily-cinematic">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      {showHeader && (
      <motion.div
        key="emp-daily-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="employee-header-cinematic"
      >
        <div className="employee-avatar-cinematic">
          {employee.avatarUrl && !avatarError ? (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              src={employee.avatarUrl.startsWith('http') ? employee.avatarUrl : `${window.location.origin}${employee.avatarUrl}`}
              alt={employee.name}
              className="avatar-image"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="avatar-placeholder-cinematic"
            >
              {getInitials(employee.name)}
            </motion.div>
          )}
        </div>
        <div className="employee-info-cinematic">
          <h1 className="employee-name-cinematic">{employee.name}</h1>
          {attendanceTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="attendance-time-cinematic"
            >
              <UserCheck className="h-5 w-5" />
              <span>حضور اليوم: {attendanceTime}</span>
            </motion.div>
          )}
          
          {/* KPIs */}
          {showKpis && totalTasks > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="employee-kpis-cinematic"
            >
              <div className="kpi-item-cinematic">
                <Target className="h-5 w-5" />
                <span className="kpi-label">المكلف بها</span>
                <span className="kpi-value">{totalTasks}</span>
              </div>
              <div className="kpi-item-cinematic completed-kpi">
                <CheckCircle2 className="h-5 w-5" />
                <span className="kpi-label">المكتملة</span>
                <span className="kpi-value">{completedTasks}</span>
              </div>
              <div className="kpi-item-cinematic pending-kpi">
                <Clock className="h-5 w-5" />
                <span className="kpi-label">المعلقة</span>
                <span className="kpi-value">{pendingTasks}</span>
              </div>
              <div className="kpi-item-cinematic rate-kpi">
                <Activity className="h-5 w-5" />
                <span className="kpi-label">نسبة الإنجاز</span>
                <span className="kpi-value">{completionRate}%</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
      )}

      {/* Tasks List - بدون كروت، جميع المهام داخل الشاشة */}
      {showTasks && (
      <div className="employee-tasks-list-cinematic">
        {(!daily.tasks || daily.tasks.length === 0) ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="empty-state-cinematic"
          >
            <CheckCircle2 className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
            <p className="empty-text-cinematic">لا توجد مهام لهذا الموظف اليوم</p>
          </motion.div>
        ) : (
          <div className={`tasks-table-cinematic ${totalTasks > 15 ? 'many-tasks' : ''} ${totalTasks > 25 ? 'very-many-tasks' : ''}`}>
            {/* Table Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="tasks-table-header-cinematic"
            >
              <div className="task-col-name">اسم المهمة</div>
              <div className="task-col-time">الوقت المفترض</div>
              <div className="task-col-time">الوقت الفعلي</div>
              <div className="task-col-status">الحالة</div>
              <div className="task-col-delay">التأخير</div>
            </motion.div>
            
            {/* Rows Container - Paging */}
            <div
              className="tasks-table-rows-container"
              ref={rowsContainerRef}
              style={{ '--task-count': totalTasks } as React.CSSProperties}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`employee-page-${pageIndex}-${rowsPerPage}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {visibleTasks.map((task: any, idx: number) => {
              const isCompleted = task.status === 'completed';
              const isOverdue = task.status === 'overdue';
              const isPending = task.status === 'pending';
              const delayMinutes = task.delayMinutes || 0;
              
              const expectedTimeFormatted = formatTimeBeautiful(task.expectedTime);
              const actualTimeFormatted = formatTimeBeautiful(task.actualCompletedTime);

                  return (
                <motion.div
                  key={task.id || idx}
                  initial={{ y: -30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: idx * 0.08, 
                    type: 'spring', 
                    stiffness: 120,
                    damping: 15
                  }}
                  className={`task-row-cinematic ${isCompleted ? 'completed' : isOverdue ? 'overdue' : isPending ? 'pending' : ''}`}
                >
                  <div className="task-col-name">
                    <span className="task-title-row">
                      {task.type === 'ad-hoc' && (
                        <span className="task-type-badge">إضافية</span>
                      )}
                      {task.title || 'مهمة بدون عنوان'}
                    </span>
                  </div>
                  <div className="task-col-time">
                    {expectedTimeFormatted ? (
                      <div className="time-display-bi">
                        <div className="time-main-bi">
                          <span className="time-hour-bi">{expectedTimeFormatted.hour}</span>
                          <span className="time-separator-bi">:</span>
                          <span className="time-minute-bi">{expectedTimeFormatted.minute}</span>
                        </div>
                        <span className="time-period-bi">{expectedTimeFormatted.period}</span>
                      </div>
                    ) : (
                      <span className="time-value-empty">غير محدد</span>
                    )}
                  </div>
                  <div className="task-col-time">
                    {isCompleted && actualTimeFormatted ? (
                      <div className="time-display-bi completed-time-bi">
                        <div className="time-main-bi">
                          <span className="time-hour-bi">{actualTimeFormatted.hour}</span>
                          <span className="time-separator-bi">:</span>
                          <span className="time-minute-bi">{actualTimeFormatted.minute}</span>
                        </div>
                        <span className="time-period-bi">{actualTimeFormatted.period}</span>
                      </div>
                    ) : (
                      <span className="time-value-empty">-</span>
                    )}
                  </div>
                  <div className="task-col-status">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: idx * 0.08 + 0.3, type: 'spring', stiffness: 200 }}
                        className="status-badge completed-badge-row stamp-effect"
                      >
                        <div className="stamp-pattern"></div>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>مكتملة</span>
                      </motion.div>
                    ) : isOverdue ? (
                      <span className="status-badge overdue-badge-row">
                        <AlertCircle className="h-4 w-4" />
                        <span>متأخرة</span>
                      </span>
                    ) : isPending ? (
                      <span className="status-badge pending-badge-row">
                        <Clock className="h-4 w-4" />
                        <span>معلقة</span>
                      </span>
                    ) : (
                      <span className="status-badge">-</span>
                    )}
                  </div>
                  <div className="task-col-delay">
                    {delayMinutes > 0 ? (
                      <span className="delay-value">{formatDelay(delayMinutes)}</span>
                    ) : (
                      <span className="delay-value-empty">-</span>
                    )}
                  </div>
                </motion.div>
                  );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="table-page-indicator">
                <span>{pageIndex + 1}</span>
                <span className="sep">/</span>
                <span>{totalPages}</span>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

// Department Monthly Overview — إنجازات القسم الشهرية (جميع الموظفين)
const DepartmentMonthlySlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const { monthly, categories, totalEmployees, month } = slide;
  const m = monthly || {};
  const totalTasks = m.totalTasks ?? 0;
  const scheduledTotal = m.scheduledTotal ?? 0;
  const adHocTotal = m.adHocTotal ?? 0;
  const completedTasks = m.completed ?? 0;
  const onTimeTasks = m.onTime ?? 0;
  const lateTasks = m.late ?? 0;
  const pendingTasks = m.pending ?? 0;
  const accuracyPct = m.accuracy ?? 0;
  const daysPresent = m.attendance?.daysPresent ?? 0;
  const cats = categories || [];
  const maxCatCount = cats.length > 0 ? Math.max(...cats.map((c: any) => c.count || 0), 1) : 1;
  const [pageIndex, setPageIndex] = useState(0);
  const [revealedStep, setRevealedStep] = useState(0);

  const STEP_MS = 2000;
  const TOTAL_STEPS = 1 + 8 + 1 + 15; // عنوان + 8 KPI + عنوان الفئة + 15 خلية

  useEffect(() => {
    setRevealedStep(0);
    const id = setInterval(() => {
      setRevealedStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const CATS_PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(cats.length / CATS_PER_PAGE));
  useEffect(() => {
    setPageIndex(0);
    if (totalPages <= 1) return;
    const ms = Math.max(7000, (slideIntervalSec || 10) * 800);
    const id = setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => clearInterval(id);
  }, [totalPages, slideIntervalSec]);

  const visibleCategories = useMemo(() => {
    const start = pageIndex * CATS_PER_PAGE;
    return cats.slice(start, start + CATS_PER_PAGE);
  }, [cats, pageIndex]);

  const showTitle = revealedStep >= 1;
  const showKpi = (i: number) => revealedStep >= 2 + i;
  const showCatTitle = revealedStep >= 10;
  const showCatCell = (i: number) => revealedStep >= 11 + i;

  return (
    <div className="slide department-monthly-cinematic">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      <AnimatePresence>
        {showTitle && (
          <motion.div
            key="dept-title"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="department-header-cinematic"
          >
            <div className="department-title-wrap">
              <Users className="department-icon-main" style={{ color: '#068294' }} />
              <div>
                <h1 className="department-title-main">إنجازات القسم الشهرية</h1>
                <p className="department-subtitle">{month || moment().format('MMMM YYYY')} — {totalEmployees} موظف</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="department-kpis-cinematic">
        {[
          { icon: Target, val: totalTasks, lbl: 'إجمالي المهام', cls: '' },
          { icon: FolderTree, val: scheduledTotal, lbl: 'المهام المجدولة', cls: '' },
          { icon: Sparkles, val: adHocTotal, lbl: 'المهام الإضافية', cls: '' },
          { icon: CheckCircle2, val: completedTasks, lbl: 'المهام المنجزة', cls: 'dept-kpi-completed' },
          { icon: AlertCircle, val: lateTasks, lbl: 'منفذة متأخراً', cls: 'dept-kpi-warning' },
          { icon: Clock, val: pendingTasks, lbl: 'المهام المعلقة', cls: '' },
          { icon: Activity, val: accuracyPct, suffix: '%', lbl: 'نسبة الدقة', cls: 'dept-kpi-rate' },
          { icon: Calendar, val: daysPresent, lbl: 'إجمالي أيام الحضور', cls: '' },
        ].map((k, i) => {
          const IconComp = k.icon;
          if (!showKpi(i)) return <div key={i} className="dept-kpi-card dept-kpi-placeholder" aria-hidden />;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              className={`dept-kpi-card ${k.cls}`}
            >
              <div className="dept-kpi-icon"><IconComp className="h-6 w-6" /></div>
              <div className="dept-kpi-val">{k.val}{k.suffix || ''}</div>
              <div className="dept-kpi-lbl">{k.lbl}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="department-categories-cinematic">
        <AnimatePresence>
          {showCatTitle && (
            <motion.h2
              key="cat-title"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="department-cat-title"
            >
              إحصائيات شهرية حسب الفئة — {month || moment().format('MMMM YYYY')}
            </motion.h2>
          )}
        </AnimatePresence>
        {cats.length === 0 ? (
          showCatTitle && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="department-empty">
              <FolderTree className="h-14 w-14 mb-3" style={{ color: '#068294' }} />
              <p>لا توجد إحصائيات شهرية</p>
            </motion.div>
          )
        ) : (
          <div className="department-cat-table-wrap">
            <div className="department-cat-grid-5x3">
              {visibleCategories.map((cat: any, idx: number) =>
                showCatCell(idx) ? (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="department-cat-cell"
                  >
                    <span className="department-cat-cell-name">{cat.name}</span>
                    <span className="department-cat-cell-count"><AnimatedCounter value={cat.count || 0} /> مرة</span>
                  </motion.div>
                ) : (
                  <div key={idx} className="department-cat-cell department-cat-cell-placeholder" />
                )
              )}
            </div>
            {totalPages > 1 && revealedStep >= 11 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="monthly-page-indicator">
                <span>{pageIndex + 1}</span>
                <span className="sep">/</span>
                <span>{totalPages}</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Employee Monthly Slide
const EmployeeMonthlySlide: React.FC<{ slide: any; slideIntervalSec: number }> = ({ slide, slideIntervalSec }) => {
  const { employee, monthly, daily } = slide;
  const revealedStep = useRevealedSteps(11); // 1:header, 2-9:KPIs تدريجياً (8), 10:catTitle, 11:all cats
  const showHeader = revealedStep >= 1;
  const showKpi = (i: number) => revealedStep >= 2 + i;
  const showCatTitle = revealedStep >= 10;
  const showAllCats = revealedStep >= 11;
  
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const [avatarErrorMonthly, setAvatarErrorMonthly] = useState(false);
  useEffect(() => setAvatarErrorMonthly(false), [employee?.id]);

  // حساب وقت الحضور: أول دخول - 30 دقيقة
  const attendanceTime = monthly.attendance?.loginTime 
    ? moment(monthly.attendance.loginTime, 'HH:mm').subtract(30, 'minutes').format('h:mm A')
    : null;

  // حساب KPIs من البيانات الشهرية (مجدولة + إضافية)
  const totalTasks = monthly.totalTasks ?? monthly.tasksDone ?? 0;
  const scheduledTotal = monthly.scheduledTotal ?? 0;
  const adHocTotal = monthly.adHocTotal ?? 0;
  const completedTasks = monthly.completed ?? monthly.tasksDone ?? 0;
  const onTimeTasks = monthly.onTime ?? 0;
  const lateTasks = monthly.late ?? 0;
  const pendingTasks = monthly.pending ?? 0;
  const coverageTasks = monthly.coverage ?? 0;
  const avgDuration = monthly.avgDuration ?? 0;
  // نسبة الدقة = (في الوقت / إجمالي المهام) — منطق واضح: المعلقة والمتأخرة تخفضان النسبة
  const accuracyPct = monthly.accuracy ?? (totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 0);
  const daysPresent = monthly.attendance?.daysPresent ?? 0;

  // حساب أعلى فئة
  const maxCategoryCount = monthly.categories && monthly.categories.length > 0
    ? Math.max(...monthly.categories.map((cat: any) => cat.count || 0))
    : 0;

  // Paging للـ categories grid
  const categories = monthly.categories || [];
  const totalCategories = categories.length;
  const categoriesContainerRef = useRef<HTMLDivElement | null>(null);
  const [categoriesPerPage, setCategoriesPerPage] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const el = categoriesContainerRef.current;
    if (!el) return;

    const calc = () => {
      const styles = getComputedStyle(el);
      const cardH = parseFloat(styles.getPropertyValue('--category-card-h')) || 140;
      const minCardW = parseFloat(styles.getPropertyValue('--category-card-min-w')) || 280;
      const gap = parseFloat(styles.getPropertyValue('--category-grid-gap')) || 16;

      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) {
        setCategoriesPerPage(10);
        return;
      }

      const cols = Math.max(1, Math.floor((w + gap) / (minCardW + gap)));
      const rows = Math.max(1, Math.floor((h + gap) / (cardH + gap)));
      const calculated = Math.max(1, cols * rows);
      setCategoriesPerPage(calculated);
      
      if (totalCategories > calculated) {
        console.log(`📄 Monthly Categories Paging: ${totalCategories} categories, showing ${calculated} per page (${cols}x${rows}), total pages: ${Math.ceil(totalCategories / calculated)}`);
      }
    };

    calc();
    const ro = new ResizeObserver(() => {
      setTimeout(calc, 100);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalCategories]);

  const totalPages = Math.max(1, Math.ceil(totalCategories / Math.max(1, categoriesPerPage)));

  useEffect(() => {
    setPageIndex(0);
    if (totalPages <= 1) return;
    const ms = Math.max(7000, Math.floor((Math.max(10, slideIntervalSec) * 1000) / totalPages));
    const id = window.setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => window.clearInterval(id);
  }, [totalPages, slideIntervalSec]);

  const visibleCategories = useMemo(() => {
    const start = pageIndex * categoriesPerPage;
    return categories.slice(start, start + categoriesPerPage);
  }, [categories, pageIndex, categoriesPerPage]);

  return (
    <div className="slide employee-monthly-cinematic">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="logo-corner">
        <img src="/logo.png" alt="ALSAQI" className="logo-small" />
      </motion.div>

      {/* Employee Header */}
      <AnimatePresence>
      {showHeader && (
      <motion.div
        key="emp-m-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="employee-header-cinematic"
      >
        <div className="employee-avatar-cinematic">
          {employee.avatarUrl && !avatarErrorMonthly ? (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              src={employee.avatarUrl.startsWith('http') ? employee.avatarUrl : `${window.location.origin}${employee.avatarUrl}`}
              alt={employee.name}
              className="avatar-image"
              onError={() => setAvatarErrorMonthly(true)}
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="avatar-placeholder-cinematic"
            >
              {getInitials(employee.name)}
            </motion.div>
          )}
        </div>
        <div className="employee-info-cinematic">
          <h1 className="employee-name-cinematic">{employee.name}</h1>
          {attendanceTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="attendance-time-cinematic"
            >
              <UserCheck className="h-5 w-5" />
              <span>حضور اليوم: {attendanceTime}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Monthly KPIs — صف واحد 8×1، ظهور تدريجي مثل المهام اليومية */}
      <div className="monthly-kpis-cinematic">
        {[
          { icon: Target, val: totalTasks, lbl: 'إجمالي المهام', cls: '' },
          { icon: FolderTree, val: scheduledTotal, lbl: 'المهام المجدولة', cls: '' },
          { icon: Sparkles, val: adHocTotal, lbl: 'المهام الإضافية', cls: '' },
          { icon: CheckCircle2, val: completedTasks, lbl: 'المهام المنجزة', cls: 'completed' },
          { icon: AlertCircle, val: lateTasks, lbl: 'منفذة متأخراً', cls: 'warning' },
          { icon: Clock, val: pendingTasks, lbl: 'المهام المعلقة', cls: '' },
          { icon: Activity, val: accuracyPct, lbl: 'نسبة الدقة', cls: 'rate', suffix: '%' },
          { icon: Calendar, val: daysPresent, lbl: 'أيام الحضور', cls: 'days' },
        ].map((k, i) => {
          const IconComp = k.icon;
          return showKpi(i) ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="kpi-card-monthly"
            >
              <div className={`kpi-icon-monthly ${k.cls || ''}`}><IconComp className="h-5 w-5" /></div>
              <div className="kpi-content-monthly">
                <div className={`kpi-value-monthly ${k.cls || ''}`}>{k.val}{k.suffix || ''}</div>
                <div className="kpi-label-monthly">{k.lbl}</div>
              </div>
            </motion.div>
          ) : <div key={i} className="kpi-card-monthly kpi-placeholder" aria-hidden />;
        })}
      </div>

      {/* Monthly Stats by Category */}
      <div className="monthly-stats-cinematic">
        <AnimatePresence>
        {showCatTitle && (
        <motion.h2 key="cat-title" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180 }} className="section-title-cinematic">
          إحصائيات شهرية حسب الفئة - {monthly.attendance?.month || moment().format('MMMM YYYY')}
        </motion.h2>
        )}
        </AnimatePresence>
        
        {(!monthly.categories || monthly.categories.length === 0) ? (
          showCatTitle && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
            <FolderTree className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
            <p className="empty-text-cinematic">لا توجد إحصائيات شهرية</p>
          </motion.div>
          )
        ) : (
          <div className="categories-grid-horizontal-cinematic" ref={categoriesContainerRef}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`monthly-categories-page-${pageIndex}-${categoriesPerPage}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="categories-grid-horizontal-cinematic-inner"
              >
                {visibleCategories.map((cat: any, idx: number) => {
              const percentage = maxCategoryCount > 0 ? (cat.count || 0) / maxCategoryCount * 100 : 0;
              return showAllCats ? (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 150 }}
                  className="category-card-horizontal-cinematic"
                >
                  <div className="category-header-horizontal">
                    <FolderTree className="h-5 w-5" style={{ color: '#068294' }} />
                    <h3 className="category-name-horizontal">{cat.name}</h3>
                  </div>
                  <div className="category-stats-horizontal">
                    <AnimatedCounter value={cat.count || 0} />
                    <span className="category-label-horizontal">مرة</span>
                  </div>
                  <div className="category-bar-container-horizontal">
                    <motion.div className="category-bar-horizontal">
                      <motion.div
                        className="category-bar-fill-horizontal"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ) : <div key={idx} className="category-card-horizontal-cinematic category-placeholder" aria-hidden />;
                })}
              </motion.div>
            </AnimatePresence>
            
            {/* Page indicator */}
            {totalPages > 1 && (
              <div className="monthly-page-indicator">
                <span>{pageIndex + 1}</span>
                <span className="sep">/</span>
                <span>{totalPages}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format delay
const formatDelay = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ساعة ${mins} دقيقة` : `${hours} ساعة`;
};

// Cinematic slides — attendance, coverage, categories, recognition, overdue, RTGS, CT, government
const AttendanceCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const revealedStep = useRevealedSteps(4 + (slide.records?.length || 0)); // 1:header, 2:stat, 3:list, 4+:items
  const showHeader = revealedStep >= 1;
  const showStat = revealedStep >= 2;
  const showList = revealedStep >= 3;
  const showItem = (i: number) => revealedStep >= 4 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <UserCheck className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">الحضور — {slide.date}</h1>
      </motion.div>}
      {showStat && <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="stats-grid-cinematic" style={{ marginBottom: '2rem' }}>
        <motion.div className="stat-card-cinematic" style={{ borderColor: '#068294' }}>
          <div className="stat-icon-cinematic" style={{ background: 'rgba(6,130,148,0.2)', color: '#068294' }}><Users className="h-10 w-10" /></div>
          <div className="stat-content-cinematic"><AnimatedCounter value={slide.present || 0} /><div className="stat-label-cinematic">موظف حضر اليوم</div></div>
        </motion.div>
      </motion.div>}
      {showList && ((!slide.records || slide.records.length === 0) ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <UserCheck className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
          <p className="empty-text-cinematic">لا يوجد حضور</p>
        </motion.div>
      ) : (
        <div className="attendance-list-cinematic">
          {(slide.records || []).map((r: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="attendance-item-cinematic">
              <div className="attendance-avatar-cinematic">{r.name ? r.name.charAt(0) : '?'}</div>
              <div><h3 className="attendance-name-cinematic">{r.name || 'غير محدد'}</h3>{r.time && <span className="attendance-time-cinematic">{r.time}</span>}</div>
            </motion.div>
          ) : <div key={idx} className="attendance-item-cinematic attendance-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const CoverageCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const revealedStep = useRevealedSteps(3 + (slide.coverage?.length || 0));
  const showHeader = revealedStep >= 1;
  const showGrid = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Users className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">التغطية — من قام بمهام الآخرين</h1>
      </motion.div>}
      {showGrid && ((!slide.coverage || slide.coverage.length === 0) ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <Users className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
          <p className="empty-text-cinematic">لا توجد تغطية</p>
        </motion.div>
      ) : (
        <div className="stats-grid-cinematic">
          {(slide.coverage || []).map((item: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="stat-card-cinematic coverage-card-cinematic">
              <div className="stat-icon-cinematic" style={{ background: 'rgba(6,130,148,0.2)', color: '#068294' }}><span className="coverage-rank-cinematic">#{idx + 1}</span></div>
              <div className="stat-content-cinematic"><AnimatedCounter value={item.count} /><div className="stat-label-cinematic">{item.name}</div></div>
            </motion.div>
          ) : <div key={idx} className="stat-card-cinematic stat-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const CategoriesCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const cats = slide.categories || [];
  const total = cats.reduce((s: number, c: any) => s + (c.count || 0), 0);
  const revealedStep = useRevealedSteps(3 + cats.length);
  const showHeader = revealedStep >= 1;
  const showGrid = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <FolderTree className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">توزيع الفئات — {slide.date}</h1>
      </motion.div>}
      {showGrid && (cats.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <FolderTree className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
          <p className="empty-text-cinematic">لا توجد فئات</p>
        </motion.div>
      ) : (
        <div className="stats-grid-cinematic">
          {cats.map((cat: any, idx: number) => {
            const pct = total > 0 ? Math.round(((cat.count || 0) / total) * 100) : 0;
            return showItem(idx) ? (
              <motion.div key={idx} initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="stat-card-cinematic">
                <div className="stat-icon-cinematic" style={{ background: 'rgba(6,130,148,0.2)', color: '#068294' }}><FolderTree className="h-8 w-8" /></div>
                <div className="stat-content-cinematic"><AnimatedCounter value={cat.count} /><div className="stat-label-cinematic">{cat.name}</div><span className="category-pct-cinematic">{pct}%</span></div>
              </motion.div>
            ) : <div key={idx} className="stat-card-cinematic stat-placeholder" aria-hidden />;
          })}
        </div>
      ))}
    </div>
  );
};

const RecognitionCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const performers = slide.topPerformers || [];
  const revealedStep = useRevealedSteps(3 + Math.min(performers.length, 8));
  const showHeader = revealedStep >= 1;
  const showGrid = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">أفضل الأداء</h1>
      </motion.div>}
      {showGrid && (performers.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <Activity className="h-16 w-16 mb-4" style={{ color: '#068294' }} />
          <p className="empty-text-cinematic">لا توجد بيانات</p>
        </motion.div>
      ) : (
        <div className="stats-grid-cinematic">
          {performers.slice(0, 8).map((p: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="stat-card-cinematic recognition-card-cinematic">
              <div className="stat-icon-cinematic" style={{ background: 'rgba(6,130,148,0.2)', color: '#068294' }}><span>#{idx + 1}</span></div>
              <div className="stat-content-cinematic"><div className="stat-label-cinematic">{p.name}</div><span className="recognition-stats-cinematic">{p.tasks} مهمة — {p.onTime} في الوقت</span></div>
            </motion.div>
          ) : <div key={idx} className="stat-card-cinematic stat-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const OverdueCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const tasks = slide.tasks || [];
  const revealedStep = useRevealedSteps(3 + Math.min(tasks.length, 10));
  const showHeader = revealedStep >= 1;
  const showList = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <AlertCircle className="h-12 w-12" style={{ color: '#ef4444' }} />
        <h1 className="slide-title-cinematic">المهام المتأخرة</h1>
      </motion.div>}
      {showList && (tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <CheckCircle2 className="h-16 w-16 mb-4" style={{ color: '#10b981' }} />
          <p className="empty-text-cinematic">لا توجد مهام متأخرة</p>
        </motion.div>
      ) : (
        <div className="task-list-cinematic">
          {tasks.slice(0, 10).map((t: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="task-item-cinematic overdue-item">
              <AlertCircle className="h-6 w-6" style={{ color: '#ef4444' }} />
              <div><h3 className="task-title-cinematic">{t.title || 'مهمة'}</h3><span className="task-meta-cinematic">{t.assignedTo} — {t.dueTime}</span></div>
            </motion.div>
          ) : <div key={idx} className="task-item-cinematic task-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const RtgsImportsCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const imports = slide.imports || [];
  const revealedStep = useRevealedSteps(3 + Math.min(imports.length, 8));
  const showHeader = revealedStep >= 1;
  const showList = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">استيراد RTGS — {slide.date}</h1>
      </motion.div>}
      {showList && (imports.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <p className="empty-text-cinematic">لم يتم تحميل أي ملف RTGS مؤخراً</p>
        </motion.div>
      ) : (
        <div className="task-list-cinematic">
          {imports.slice(0, 8).map((imp: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="task-item-cinematic">
              <Activity className="h-6 w-6" style={{ color: '#068294' }} />
              <div><h3 className="task-title-cinematic">{imp.filename || 'ملف'}</h3><span className="task-meta-cinematic">{imp.importedAt} — {imp.rowCount} حركة</span></div>
            </motion.div>
          ) : <div key={idx} className="task-item-cinematic task-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const RtgsSettlementsCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const cards = slide.cards || [];
  const fmt = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0');
  const revealedStep = useRevealedSteps(3 + Math.min(cards.length, 6));
  const showHeader = revealedStep >= 1;
  const showGrid = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">كروت التسويات — حسب التحميل</h1>
      </motion.div>}
      {showGrid && (cards.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <p className="empty-text-cinematic">لا توجد تسويات تم تحميلها</p>
        </motion.div>
      ) : (
        <div className="stats-grid-cinematic">
          {cards.slice(0, 6).map((card: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="stat-card-cinematic">
              <div className="stat-icon-cinematic" style={{ background: 'rgba(6,130,148,0.2)', color: '#068294' }}><span className="stat-value-cinematic">{card.rowCount}</span></div>
              <div className="stat-content-cinematic"><div className="stat-label-cinematic">{card.filename}</div><span className="task-meta-cinematic">STTLE: {fmt(card.totalSttle)} IQD</span></div>
            </motion.div>
          ) : <div key={idx} className="stat-card-cinematic stat-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

const CtMatchingCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const records = slide.records || [];
  const fmt = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0');
  const revealedStep = useRevealedSteps(3 + Math.min(records.length, 8));
  const showHeader = revealedStep >= 1;
  const showList = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">مطابقة CT</h1>
      </motion.div>}
      {showList && (records.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <p className="empty-text-cinematic">لا توجد سجلات CT</p>
        </motion.div>
      ) : (
        <div className="task-list-cinematic">
          {records.slice(0, 8).map((r: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className={`task-item-cinematic ${r.matchStatus === 'matched' ? 'completed' : ''}`}>
              {r.matchStatus === 'matched' ? <CheckCircle2 className="h-6 w-6" style={{ color: '#10b981' }} /> : <AlertCircle className="h-6 w-6" style={{ color: '#f59e0b' }} />}
              <div><h3 className="task-title-cinematic">{r.sttlDateFrom} — {r.sttlDateTo}</h3><span className="task-meta-cinematic">CT: {fmt(r.ctValue)} — {r.matchStatus === 'matched' ? '✓ مطابق' : 'غير مطابق'}</span></div>
            </motion.div>
          ) : <div key={idx} className="task-item-cinematic task-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

// إنجازات الشهر - المهام المجدولة حسب الفئة (شاشة كاملة، KPI ثابت، تدوير عند كثرة البيانات)
const MonthlyScheduledByCategorySlide: React.FC<{ slide: any; slideIntervalSec?: number }> = ({ slide, slideIntervalSec = 10 }) => {
  const categories = slide.categories || [];
  const month = slide.month || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const revealedStep = useRevealedSteps(6); // 1:header, 2-5:kpis, 6:table
  const showHeader = revealedStep >= 1;
  const showKpi = (i: number) => revealedStep >= 2 + i;
  const showTable = revealedStep >= 6;

  const totals = useMemo(() => ({
    completed: categories.reduce((s: number, c: any) => s + (c.completed || 0), 0),
    late: categories.reduce((s: number, c: any) => s + (c.completedLate || 0), 0),
    pending: categories.reduce((s: number, c: any) => s + (c.pending || 0), 0),
    total: categories.reduce((s: number, c: any) => s + (c.total || 0), 0)
  }), [categories]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight;
      const rowH = 56;
      setRowsPerPage(Math.max(1, Math.floor(h / rowH)));
    };
    calc();
    const ro = new ResizeObserver(() => setTimeout(calc, 50));
    ro.observe(el);
    return () => ro.disconnect();
  }, [categories.length]);

  const totalPages = Math.max(1, Math.ceil(categories.length / rowsPerPage));
  const visibleCats = categories.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);

  useEffect(() => {
    if (totalPages <= 1) return;
    const ms = (slideIntervalSec || 10) * 1000;
    const t = setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => clearInterval(t);
  }, [totalPages, slideIntervalSec]);

  return (
    <div className="slide monthly-scheduled-fullscreen">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>

      {/* شريط ثابت: العنوان + KPI إجمالي فقط */}
      {showHeader && (
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="monthly-fixed-bar">
        <div className="monthly-fixed-title">
          <Target className="h-8 w-8" />
          <div>
            <h1>إنجازات الشهر — {month}</h1>
            <span>المهام المجدولة حسب الفئة</span>
          </div>
        </div>
        <div className="monthly-fixed-kpi">
          {showKpi(0) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item completed"><CheckCircle2 className="h-4 w-4" />{totals.completed} منجزة</motion.span>}
          {showKpi(1) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item late"><AlertCircle className="h-4 w-4" />{totals.late} متأخرة</motion.span>}
          {showKpi(2) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item pending"><Clock className="h-4 w-4" />{totals.pending} معلقة</motion.span>}
          {showKpi(3) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item total">{totals.total} الإجمالي</motion.span>}
        </div>
      </motion.div>
      )}

      {/* منطقة المحتوى — تستغل باقي الشاشة */}
      <div className="monthly-content-area" ref={containerRef}>
        {!showTable ? null : categories.length === 0 ? (
          <div className="monthly-empty-full">
            <FolderTree className="h-16 w-16" />
            <p>لا توجد مهام مجدولة هذا الشهر</p>
          </div>
        ) : (
          <>
            <div className="monthly-table-wrap">
              <table className="monthly-detail-table">
                <thead>
                  <tr>
                    <th>الفئة</th>
                    <th>منجزة</th>
                    <th>متأخرة</th>
                    <th>معلقة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCats.map((cat: any, idx: number) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <td className="cat-name"><FolderTree className="h-4 w-4" />{cat.name}</td>
                      <td className="num completed">{cat.completed}</td>
                      <td className="num late">{cat.completedLate}</td>
                      <td className="num pending">{cat.pending}</td>
                      <td className="num total">{cat.total}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="monthly-pager">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div key={i} className={`monthly-pager-dot ${i === pageIndex ? 'active' : ''}`} />
                ))}
                <span className="monthly-pager-text">{pageIndex + 1} / {totalPages}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// المهام الإضافية الشهرية — شاشة كاملة، KPI ثابت، تدوير عند كثرة البيانات
const MonthlyAdditionalByEmployeeSlide: React.FC<{ slide: any; slideIntervalSec?: number }> = ({ slide, slideIntervalSec = 10 }) => {
  const groups = slide.groups || [];
  const month = slide.month || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [groupsPerPage, setGroupsPerPage] = useState(2);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<number>>(new Set());
  const revealedStep = useRevealedSteps(5); // 1:header, 2-3:kpis, 4:content
  const showHeader = revealedStep >= 1;
  const showKpi = (i: number) => revealedStep >= 2 + i;
  const showContent = revealedStep >= 4;

  const totalTasks = useMemo(() => groups.reduce((s: number, g: any) => s + (g.tasks?.length || 0), 0), [groups]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight;
      const cardMinH = 220;
      setGroupsPerPage(Math.max(1, Math.floor(h / cardMinH)));
    };
    calc();
    const ro = new ResizeObserver(() => setTimeout(calc, 50));
    ro.observe(el);
    return () => ro.disconnect();
  }, [groups.length]);

  const totalPages = Math.max(1, Math.ceil(groups.length / groupsPerPage));
  const visibleGroups = groups.slice(pageIndex * groupsPerPage, (pageIndex + 1) * groupsPerPage);

  useEffect(() => {
    if (totalPages <= 1) return;
    const ms = (slideIntervalSec || 10) * 1000;
    const t = setInterval(() => setPageIndex((p) => (p + 1) % totalPages), ms);
    return () => clearInterval(t);
  }, [totalPages, slideIntervalSec]);

  return (
    <div className="slide monthly-additional-fullscreen">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>

      {/* شريط ثابت: العنوان + KPI */}
      {showHeader && (
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="monthly-fixed-bar">
        <div className="monthly-fixed-title">
          <Sparkles className="h-8 w-8" />
          <div>
            <h1>المهام الإضافية الشهرية — {month}</h1>
            <span>مجمعة حسب الموظف المنفذ</span>
          </div>
        </div>
        <div className="monthly-fixed-kpi">
          {showKpi(0) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item total">{groups.length} موظف</motion.span>}
          {showKpi(1) && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="kpi-item completed">{totalTasks} مهمة منجزة</motion.span>}
        </div>
      </motion.div>
      )}

      {/* منطقة المحتوى — تستغل باقي الشاشة */}
      <div className="monthly-content-area monthly-additional-content" ref={containerRef}>
        {!showContent ? null : groups.length === 0 ? (
          <div className="monthly-empty-full">
            <Sparkles className="h-16 w-16" />
            <p>لا توجد مهام إضافية منجزة هذا الشهر</p>
          </div>
        ) : (
          <>
            <div className="monthly-additional-cards-grid">
              {visibleGroups.map((g: any, idx: number) => (
                <motion.div
                  key={g.employee?.id || idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="monthly-employee-card-full"
                >
                  <div className="monthly-employee-card-header">
                    <div className="monthly-employee-avatar-wrap">
                      {g.employee?.avatarUrl && !failedAvatarIds.has(g.employee?.id) ? (
                        <img
                          src={g.employee.avatarUrl.startsWith('http') ? g.employee.avatarUrl : `${window.location.origin}${g.employee.avatarUrl}`}
                          alt={g.employee.name}
                          className="monthly-employee-avatar"
                          onError={() => g.employee?.id != null && setFailedAvatarIds(prev => new Set(prev).add(g.employee.id))}
                        />
                      ) : (
                        <div className="monthly-employee-avatar-placeholder">{g.employee?.name?.charAt(0) || '?'}</div>
                      )}
                    </div>
                    <div className="monthly-employee-card-info">
                      <h3>{g.employee?.name || '—'}</h3>
                      <span>{g.tasks?.length || 0} مهمة</span>
                    </div>
                  </div>
                  <div className="monthly-employee-tasks-list">
                    {(g.tasks || []).map((t: any, ti: number) => (
                      <motion.div
                        key={ti}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: ti * 0.02 }}
                        className="monthly-task-row"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="task-title">{t.title}</span>
                        {t.doneAt && <span className="task-date">{t.doneAt}</span>}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="monthly-pager">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div key={i} className={`monthly-pager-dot ${i === pageIndex ? 'active' : ''}`} />
                ))}
                <span className="monthly-pager-text">{pageIndex + 1} / {totalPages}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// شريحة التسويات والمطابقة — شاملة: شعار + ختم + KPI بسقوط + حسب المصرف
const KPI_DISPLAY_MS = 2000;
const SettlementsMatchingOverviewSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const kpis = slide.kpis || [];
  const categories = slide.categories || [];
  const [kpiIndex, setKpiIndex] = useState(0);
  const currentKpi = kpis[kpiIndex] ?? null;
  const revealedStep = useRevealedSteps(4 + categories.length); // 1:header, 2:kpi-zone, 3:cat-title, 4+:cats
  const showHeader = revealedStep >= 1;
  const showKpiZone = revealedStep >= 2;
  const showCatTitle = revealedStep >= 3;
  const showCat = (i: number) => revealedStep >= 4 + i;
  const fmt = (n: number, isNumber = false) => {
    if (n == null) return '—';
    if (isNumber && typeof n === 'number' && n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (typeof n === 'number' && (n % 1 !== 0 || n >= 1000)) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return String(n);
  };

  useEffect(() => {
    if (kpis.length <= 1) return;
    const t = setInterval(() => setKpiIndex((i) => (i + 1) % kpis.length), KPI_DISPLAY_MS);
    return () => clearInterval(t);
  }, [kpis.length]);

  const getKpiIcon = (icon: string) => {
    switch (icon) {
      case 'upload': return <Upload className="h-12 w-12" />;
      case 'activity': return <Activity className="h-12 w-12" />;
      case 'dollar':
      case 'bank': return <Banknote className="h-12 w-12" />;
      case 'file': return <FileCheck className="h-12 w-12" />;
      case 'check': return <CheckCircle2 className="h-12 w-12" />;
      case 'alert': return <AlertCircle className="h-12 w-12" />;
      case 'target': return <Target className="h-12 w-12" />;
      default: return <Activity className="h-12 w-12" />;
    }
  };

  const maxCatValue = categories.length > 0 ? Math.max(...categories.map((c: any) => c.value || c.count || 0), 1) : 1;

  return (
    <div className="slide settlements-matching-overview-slide">
      {/* Film letterbox */}
      <div className="film-letterbox film-letterbox-top" aria-hidden />
      <div className="film-letterbox film-letterbox-bottom" aria-hidden />
      <div className="film-vignette" aria-hidden />

      {showHeader && (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180 }} className="settlements-overview-header">
        <img src="/logo.png" alt="ALSAQI" className="settlements-logo" />
        <div className="settlements-stamp-wrap">
          <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="settlements-stamp" />
        </div>
        <h1 className="settlements-overview-title">التسويات والمطابقة</h1>
      </motion.div>
      )}

      {showKpiZone && <div className="settlements-kpi-drop-zone">
        <AnimatePresence mode="wait">
          {currentKpi && (
            <motion.div
              key={currentKpi.id}
              initial={{ opacity: 0, y: -120, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="settlements-kpi-card-drop"
            >
              <div className="settlements-kpi-icon" style={{ background: 'linear-gradient(135deg, rgba(6,130,148,0.2) 0%, rgba(2,97,116,0.2) 100%)', color: '#068294' }}>
                {getKpiIcon(currentKpi.icon)}
              </div>
              <div className="settlements-kpi-value" dir="ltr">
                {currentKpi.format === 'number' ? fmt(currentKpi.value, true) : currentKpi.value}
                {currentKpi.suffix || ''}
              </div>
              <div className="settlements-kpi-label">{currentKpi.label}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}

      <div className="settlements-categories-section">
        {showCatTitle && <motion.h2 initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180 }} className="settlements-categories-title">حسب المصرف — {slide.month || moment().format('MMMM YYYY')}</motion.h2>}
        {categories.length === 0 ? (
          showCatTitle && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="settlements-empty-cat">لا توجد بيانات حسب المصرف</motion.p>
        ) : (
          <div className="settlements-categories-grid">
            {categories.map((cat: any, idx: number) => {
              const pct = maxCatValue > 0 ? ((cat.value ?? cat.count ?? 0) / maxCatValue) * 100 : 0;
              return showCat(idx) ? (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="settlements-category-card"
                >
                  <div className="settlements-cat-name">{cat.name}</div>
                  <div className="settlements-cat-stats">
                    <span className="settlements-cat-count">{fmt(cat.count)} حركة</span>
                    <span className="settlements-cat-value" dir="ltr">{fmt(cat.value)} IQD</span>
                  </div>
                  <div className="settlements-cat-bar-wrap">
                    <motion.div
                      className="settlements-cat-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                      style={{ background: 'linear-gradient(90deg, #026174 0%, #068294 100%)' }}
                    />
                  </div>
                </motion.div>
              ) : <div key={idx} className="settlements-category-card cat-placeholder" aria-hidden />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// كروت التسويات الحكومية — عرض 4 كروت في كل صفحة، التبديل ذكي: مدة كل صفحة = مدة الشريحة ÷ عدد الصفحات
const CARDS_PER_PAGE = 4;
const GovernmentSettlementCardsCinematicSlide: React.FC<{ slide: any; slideDurationSec?: number }> = ({ slide, slideDurationSec = 40 }) => {
  const cards = slide.cards || [];
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
  const visibleCards = cards.slice(pageIndex * CARDS_PER_PAGE, (pageIndex + 1) * CARDS_PER_PAGE);
  const fmt = (n: number) => (n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—');
  const formatDate = (d: string | null) => (d ? d.replace(/-/g, '/') : '—');
  const revealedStep = useRevealedSteps(3 + Math.min(visibleCards.length, CARDS_PER_PAGE));
  const showHeader = revealedStep >= 1;
  const showGrid = revealedStep >= 2;
  const showCard = (i: number) => revealedStep >= 3 + i;

  useEffect(() => {
    setPageIndex(0);
  }, [cards.length]);

  useEffect(() => {
    if (totalPages <= 1) return;
    // وقت كل صفحة = مدة الشريحة ÷ عدد الصفحات (مثال: 40 ث ÷ 2 = 20 ث لكل مجموعة)
    const durationMs = (slideDurationSec || 40) * 1000;
    const cardPageIntervalMs = Math.max(2000, Math.floor(durationMs / totalPages));
    const t = setInterval(() => {
      setPageIndex((p) => (p + 1) % totalPages);
    }, cardPageIntervalMs);
    return () => clearInterval(t);
  }, [totalPages, slideDurationSec]);

  return (
    <div className="slide overview-cinematic government-settlement-cards-slide">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: 'var(--primary-600)' }} />
        <h1 className="slide-title-cinematic">كروت التسويات الحكومية — {slide.date ? slide.date.replace(/-/g, '/') : ''}</h1>
      </motion.div>}
      {!showGrid ? null : cards.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <p className="empty-text-cinematic">لا توجد تسويات RTGS لعرضها</p>
        </motion.div>
      ) : (
        <>
        <div className="settlement-cards-grid-cinematic">
          {visibleCards.map((card: any, cardIdx: number) => {
            const label = `تسوية ${formatDate(card.sttl_date)} — ${card.bank_name || '—'}`;
            const rows = card.rows || [];
            const totals = card.totals || {};
            const uniqueKey = `${card.sttl_date}-${card.bank_name}-${pageIndex * CARDS_PER_PAGE + cardIdx}`;
            return showCard(cardIdx) ? (
              <motion.div
                key={uniqueKey}
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="settlement-card-cinematic"
              >
                <div className="settlement-card-header-cinematic">{label}</div>
                <div className="settlement-card-body-cinematic">
                  {rows.slice(0, 2).map((row: any, rowIdx: number) => (
                    <div key={rowIdx} className="settlement-row-cinematic">
                      <div className="settlement-row-date">تاريخ الحركة: <span dir="ltr">{formatDate(row.transaction_date)}</span></div>
                      <div className="settlement-row-grid">
                        <span>عدد الحركات</span><span dir="ltr">{row.movement_count?.toLocaleString('en-US')}</span>
                        <span>قيمة الحركات</span><span dir="ltr">{fmt(row.sum_amount)}</span>
                        <span>قيمة العمولة</span><span dir="ltr">{fmt(row.sum_fees)}</span>
                        <span>عمولة المحصل</span><span dir="ltr">{fmt(row.sum_acq)}</span>
                      </div>
                      <div className="settlement-row-total">قيمة التسوية <span dir="ltr">{fmt(row.sum_sttle)} IQD</span></div>
                    </div>
                  ))}
                </div>
                <div className="settlement-card-footer-cinematic">
                  <div className="settlement-footer-title">إجمالي التسوية</div>
                  <div className="settlement-footer-grid">
                    <span>عدد الحركات</span><span dir="ltr">{totals.movement_count?.toLocaleString('en-US')}</span>
                    <span>قيمة الحركات</span><span dir="ltr">{fmt(totals.sum_amount)} IQD</span>
                    <span>قيمة العمولة</span><span dir="ltr">{fmt(totals.sum_fees)} IQD</span>
                    <span>عمولة المحصل</span><span dir="ltr">{fmt(totals.sum_acq)} IQD</span>
                    <span>قيمة التسوية</span><span dir="ltr">{fmt(totals.sum_sttle)} IQD</span>
                  </div>
                </div>
                <div className="settlement-card-logo-footer">
                  <img src="/logo-icon.png" alt="الساقي" className="settlement-logo-small" />
                  <span className="view-details-btn-cinematic">عرض التفصيل</span>
                </div>
              </motion.div>
            ) : <div key={uniqueKey} className="settlement-card-cinematic card-placeholder" aria-hidden />;
          })}
        </div>
        {totalPages > 1 && (
          <div className="settlement-cards-page-indicator">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`settlement-cards-page-dot ${i === pageIndex ? 'active' : ''}`}
                aria-hidden
              />
            ))}
          </div>
        )}
        </>
      )}
    </div>
  );
};

const GovernmentSettlementsCinematicSlide: React.FC<{ slide: any }> = ({ slide }) => {
  const tasks = slide.tasks || [];
  const fmt = (n: number) => (n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—');
  const revealedStep = useRevealedSteps(3 + Math.min(tasks.length, 8));
  const showHeader = revealedStep >= 1;
  const showList = revealedStep >= 2;
  const showItem = (i: number) => revealedStep >= 3 + i;
  return (
    <div className="slide overview-cinematic">
      <motion.div className="logo-corner"><img src="/logo.png" alt="ALSAQI" className="logo-small" /></motion.div>
      {showHeader && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="slide-header-cinematic">
        <Activity className="h-12 w-12" style={{ color: '#068294' }} />
        <h1 className="slide-title-cinematic">التسوية الحكومية — {slide.date}</h1>
      </motion.div>}
      {showList && (tasks.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-cinematic">
          <p className="empty-text-cinematic">لا توجد مهام تسوية حكومية اليوم</p>
        </motion.div>
      ) : (
        <div className="task-list-cinematic">
          {tasks.slice(0, 8).map((t: any, idx: number) => showItem(idx) ? (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className={`task-item-cinematic ${t.verificationStatus === 'matched' ? 'completed' : ''}`}>
              {t.verificationStatus === 'matched' ? <CheckCircle2 className="h-6 w-6" style={{ color: '#10b981' }} /> : <AlertCircle className="h-6 w-6" style={{ color: '#f59e0b' }} />}
              <div><h3 className="task-title-cinematic">{t.title}</h3><span className="task-meta-cinematic">تسوية: {t.targetSettlementDate} — {fmt(t.settlementValue)} IQD</span></div>
            </motion.div>
          ) : <div key={idx} className="task-item-cinematic task-placeholder" aria-hidden />)}
        </div>
      ))}
    </div>
  );
};

export default TVDashboardCinematic;
