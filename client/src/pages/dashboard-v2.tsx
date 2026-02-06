import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import Loading from '@/components/Loading';
import { useHasPermission } from '@/hooks/useHasPermission';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Target,
  Zap,
  Award,
  Timer,
  UserCheck,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  X,
} from 'lucide-react';
import moment from 'moment-timezone';
import ParticleBackground from '@/components/dashboard/ParticleBackground';
import CountUpNumber from '@/components/dashboard/CountUpNumber';

export function DashboardV2() {
  const canViewReports = useHasPermission('reports', 'view');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));

  const { data: report, isLoading } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: async () => {
      const response = await api.get(`/reports/daily?date=${selectedDate}`);
      return response.data;
    },
    enabled: canViewReports,
  });

  const completionRate = report?.scheduled?.total > 0
    ? Math.round((report.scheduled.completed / report.scheduled.total) * 100)
    : 0;

  const onTimeRate = report?.scheduled?.completed > 0 && report?.scheduled?.total > 0
    ? Math.round((report.scheduled.completed / report.scheduled.total) * 100)
    : 0;

  const todayArabic = moment(selectedDate).locale('ar').format('dddd، D MMMM YYYY');

  const topEmployees = useMemo(() => {
    if (!report?.tasksByUser) return [];
    return [...report.tasksByUser]
      .sort((a, b) => (b.tasks_done || 0) - (a.tasks_done || 0))
      .slice(0, 5);
  }, [report?.tasksByUser]);

  const topCategories = useMemo(() => {
    if (!report?.tasksByCategory) return [];
    return [...report.tasksByCategory]
      .sort((a, b) => (b.tasks_count || 0) - (a.tasks_count || 0))
      .slice(0, 5);
  }, [report?.tasksByCategory]);

  const goToToday = () => {
    setSelectedDate(moment().format('YYYY-MM-DD'));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = moment(selectedDate);
    if (direction === 'prev') {
      newDate.subtract(1, 'day');
    } else {
      newDate.add(1, 'day');
    }
    setSelectedDate(newDate.format('YYYY-MM-DD'));
  };

  if (!canViewReports) {
    return (
      <div style={{ padding: '2rem', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <BarChart3 style={{ width: 48, height: 48, color: 'var(--primary)', opacity: 0.7 }} />
        <p style={{ fontSize: '1.1rem', color: 'var(--text)', margin: 0 }}>لوحة التحكم — لا توجد لديك صلاحية عرض بيانات التقرير اليومي.</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>يمكنك التنقل إلى المهام أو غيرها من الصفحات حسب صلاحياتك.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', minHeight: '100vh', background: '#BBBCC0' }}>
        <Loading message="جاري تحميل لوحة التحكم..." />
      </div>
    );
  }

  const statCards = [
    {
      id: 'scheduled',
      label: 'المهام المجدولة',
      value: report?.scheduled?.total || 0,
      icon: CheckSquare,
      color: '#068294',
      bg: 'rgba(6,130,148,0.12)',
      subtitle: `${report?.scheduled?.completed || 0} مكتملة`,
    },
    {
      id: 'completed',
      label: 'مكتملة',
      value: report?.scheduled?.completed || 0,
      icon: CheckSquare,
      color: '#059669',
      bg: 'rgba(5,150,105,0.12)',
      subtitle: `${onTimeRate}% من المجدولة`,
    },
    {
      id: 'overdue',
      label: 'متأخرة',
      value: report?.scheduled?.overdue || 0,
      icon: AlertCircle,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
      subtitle: `${report?.scheduled?.pending || 0} معلقة`,
    },
    {
      id: 'late',
      label: 'مكتملة متأخرة',
      value: report?.late || 0,
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      subtitle: 'تم التنفيذ بعد الموعد',
    },
    {
      id: 'attendance',
      label: 'الحضور',
      value: report?.attendance || 0,
      icon: UserCheck,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      subtitle: `${report?.weekAttendance?.unique_attendees || 0} موظف هذا الأسبوع`,
    },
    {
      id: 'adHoc',
      label: 'مهام خاصة',
      value: report?.adHoc?.total || 0,
      icon: FileText,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
      subtitle: `${report?.adHoc?.completed || 0} مكتملة`,
    },
    {
      id: 'weekTasks',
      label: 'مهام الأسبوع',
      value: report?.weekStats?.total_executions || 0,
      icon: CalendarDays,
      color: '#2A6E85',
      bg: 'rgba(42,110,133,0.12)',
      subtitle: `${report?.weekStats?.days_with_tasks || 0} يوم نشاط`,
    },
    {
      id: 'activeEmployees',
      label: 'موظفين نشطين',
      value: report?.weekStats?.active_employees || 0,
      icon: Activity,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      subtitle: 'آخر 7 أيام',
    },
    {
      id: 'avgDuration',
      label: 'متوسط المدة',
      value: report?.avgDuration?.avg_duration 
        ? `${Math.round(report.avgDuration.avg_duration)} دقيقة`
        : '—',
      icon: Timer,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
      subtitle: report?.avgDuration?.total_duration 
        ? `${Math.round(report.avgDuration.total_duration / 60)} ساعة إجمالي`
        : '',
    },
    {
      id: 'onTimeRate',
      label: 'نسبة في الوقت',
      value: report?.weekStats?.total_executions > 0
        ? `${Math.round((report.weekStats.on_time_count / report.weekStats.total_executions) * 100)}%`
        : '0%',
      icon: Target,
      color: '#14b8a6',
      bg: 'rgba(20,184,166,0.12)',
      subtitle: 'الأسبوع الحالي',
    },
  ];

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #e5e7eb 0%, #BBBCC0 12%, #BBBCC0 100%)',
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <ParticleBackground />
      <div style={{ width: '100%', maxWidth: '1720px', position: 'relative', zIndex: 1 }}>
        {/* هيدر (يُمرَّر مع الصفحة) */}
        <div style={{ paddingBottom: '1.5rem', marginBottom: '1rem' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="page-header-teal"
            style={{
              background: 'linear-gradient(135deg, #026174 0%, #068294 50%, #0891b2 100%)',
              color: '#ffffff',
              padding: '1.75rem 2rem',
              marginBottom: '1.5rem',
              borderRadius: '1.25rem',
              boxShadow: '0 20px 40px rgba(2,97,116,0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  color: '#ffffff',
                }}>
                  <BarChart3 size={28} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                    لوحة التحكم
                  </h1>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', opacity: 0.95, color: '#ffffff' }}>
                    {todayArabic}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigateDate('prev')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    color: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <ArrowUp size={20} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '0.7rem 1rem',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    minWidth: '160px',
                  }}
                />
                <button
                  onClick={() => navigateDate('next')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    color: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <ArrowDown size={20} />
                </button>
                <button
                  onClick={goToToday}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: moment(selectedDate).isSame(moment(), 'day') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = moment(selectedDate).isSame(moment(), 'day') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)';
                  }}
                >
                  {moment(selectedDate).isSame(moment(), 'day') ? 'اليوم ✓' : 'اليوم'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* شريط نسبة الإنجاز الرئيسية */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            style={{
              background: '#fff',
              padding: '1.5rem 2rem',
              borderRadius: '1.25rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                  نسبة الإنجاز اليومية
                </h2>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
                  {report?.scheduled?.total || 0} مهمة مجدولة · {report?.scheduled?.completed || 0} مكتملة
                </p>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#068294' }}>
                <CountUpNumber value={completionRate} duration={1.8} />%
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '16px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #068294 0%, #0891b2 50%, #06b6d4 100%)',
                  borderRadius: '999px',
                  boxShadow: '0 2px 8px rgba(6,130,148,0.3)',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* كروت الإحصائيات / KPI */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid gap-4 mb-7"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-2xl cursor-default"
                style={{
                  background: '#fff',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
                  border: '1px solid rgba(6, 130, 148, 0.12)',
                  position: 'relative',
                }}
                whileHover={{
                  scale: 1.04,
                  y: -6,
                  boxShadow: '0 16px 40px rgba(2, 97, 116, 0.18)',
                  transition: { duration: 0.2 },
                }}
              >
                {/* Side accent bar */}
                <div
                  className="absolute inset-y-0 start-0 w-1 rounded-s-2xl transition-all duration-200 group-hover:w-1.5 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(180deg, ${stat.color} 0%, ${stat.color}88 100%)`,
                    opacity: 0.9,
                    boxShadow: '0 0 12px rgba(2, 97, 116, 0.25)',
                  }}
                />
                {/* Subtle shine on hover */}
                <div className="card-shine-hover absolute inset-0 pointer-events-none overflow-hidden" />
                <div className="flex items-center gap-4 relative">
                  <motion.div
                    className="flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      background: stat.bg,
                      boxShadow: `0 4px 12px ${stat.color}22`,
                    }}
                    whileHover={{ scale: 1.08 }}
                  >
                    <Icon size={24} style={{ color: stat.color }} strokeWidth={2.5} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold m-0 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                    <p className="text-2xl font-extrabold m-0 leading-tight tracking-tight tabular-nums" style={{ color: 'var(--text-strong)' }}>
                      {typeof stat.value === 'string' ? (
                        stat.value
                      ) : (
                        <CountUpNumber value={stat.value} duration={1.2} />
                      )}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs font-medium m-0 mt-1 opacity-90" style={{ color: 'var(--text-muted)' }}>
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* جداول تفصيلية */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          {/* أفضل الموظفين */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              background: '#fff',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(180deg, #068294 0%, #026174 100%)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Award size={24} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  أفضل الموظفين
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                أعلى أداء في اليوم المحدد
              </p>
            </div>
            <div style={{ padding: '1rem' }}>
              {topEmployees.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>لا توجد بيانات</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {topEmployees.map((emp: any, idx: number) => (
                    <div
                      key={emp.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: idx === 0 ? 'rgba(6,130,148,0.08)' : '#f9fafb',
                        border: idx === 0 ? '2px solid #068294' : '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: idx === 0 ? '#068294' : '#e5e7eb',
                          color: idx === 0 ? '#fff' : '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                            {emp.name || 'غير محدد'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                            {emp.on_time || 0} في الوقت · {emp.late || 0} متأخر
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        background: '#068294',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}>
                        {emp.tasks_done || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* المهام حسب الفئة */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            style={{
              background: '#fff',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(180deg, #2A6E85 0%, #026174 100%)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <BarChart3 size={24} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  المهام حسب الفئة
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                توزيع المهام المنفذة
              </p>
            </div>
            <div style={{ padding: '1rem' }}>
              {topCategories.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>لا توجد بيانات</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topCategories.map((cat: any) => {
                    const total = report?.scheduled?.total || 1;
                    const percentage = cat.tasks_count ? Math.round((cat.tasks_count / total) * 100) : 0;
                    return (
                      <div key={cat.id} style={{ padding: '0.5rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                            {cat.name || 'غير محدد'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                              {cat.completed || 0}/{cat.tasks_count || 0}
                            </span>
                            <span style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '8px',
                              background: '#068294',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}>
                              {cat.tasks_count || 0}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '10px',
                          borderRadius: '999px',
                          background: '#f3f4f6',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #068294 0%, #0891b2 100%)',
                            borderRadius: '999px',
                            transition: 'width 0.5s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ملخص إضافي */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          style={{
            background: '#fff',
            borderRadius: '1.25rem',
            padding: '1.75rem 2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.35rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TrendingUp size={24} style={{ color: '#068294' }} />
            ملخص الأداء
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}>
            <div style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6,130,148,0.08) 0%, rgba(6,130,148,0.04) 100%)',
              border: '1px solid rgba(6,130,148,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
                أيام نشاط الأسبوع
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#068294' }}>
                {report?.weekStats?.days_with_tasks || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                من 7 أيام
              </div>
            </div>
            <div style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(5,150,105,0.08) 0%, rgba(5,150,105,0.04) 100%)',
              border: '1px solid rgba(5,150,105,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
                موظفين نشطين
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>
                {report?.weekStats?.active_employees || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                آخر 7 أيام
              </div>
            </div>
            <div style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.04) 100%)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
                إجمالي التنفيذات
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>
                {report?.weekStats?.total_executions || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                هذا الأسبوع
              </div>
            </div>
            <div style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(20,184,166,0.04) 100%)',
              border: '1px solid rgba(20,184,166,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
                نسبة في الوقت
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#14b8a6' }}>
                {report?.weekStats?.total_executions > 0
                  ? `${Math.round((report.weekStats.on_time_count / report.weekStats.total_executions) * 100)}%`
                  : '0%'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                الأسبوع الحالي
              </div>
            </div>
            <div style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.04) 100%)',
              border: '1px solid rgba(139,92,246,0.15)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
                سجلات الحضور
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>
                {report?.weekAttendance?.total_records || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                {report?.weekAttendance?.unique_attendees || 0} موظف مختلف
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
