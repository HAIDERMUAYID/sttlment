import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import Loading from '@/components/Loading';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  Info,
  Sun,
  Search,
} from 'lucide-react';
import moment from 'moment-timezone';

const BAGHDAD = 'Asia/Baghdad';
const nowBaghdad = () => moment().tz(BAGHDAD);

const monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function AttendanceV2() {
  const [year, setYear] = useState(nowBaghdad().year());
  const [month, setMonth] = useState(nowBaghdad().month() + 1);
  const [employeeNameFilter, setEmployeeNameFilter] = useState('');

  const start = moment().tz(BAGHDAD).year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const end = moment().tz(BAGHDAD).year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');
  const daysInMonth = moment().tz(BAGHDAD).year(year).month(month - 1).daysInMonth();
  const isCurrentMonth = year === nowBaghdad().year() && month === nowBaghdad().month() + 1;
  const todayDay = isCurrentMonth ? nowBaghdad().date() : null;

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data.filter((u: any) => u.role === 'employee' && u.active);
    },
  });

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', start, end],
    queryFn: async () => {
      const response = await api.get(`/attendance?dateFrom=${start}&dateTo=${end}`);
      return response.data;
    },
  });

  const isLoading = usersLoading || attendanceLoading;

  const filteredUsers = useMemo(() => {
    const q = (employeeNameFilter || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: any) => (u.name || '').toLowerCase().includes(q));
  }, [users, employeeNameFilter]);

  const stats = useMemo(() => {
    const uniqueDates = new Set(attendance.map((a: any) => (a.date || '').slice(0, 10)));
    const totalRecords = attendance.length;
    const employeesWithAttendance = new Set(attendance.map((a: any) => a.user_id)).size;
    const avgPerEmployee = users.length ? (totalRecords / users.length).toFixed(1) : '0';
    return {
      totalEmployees: users.length,
      daysWithRecords: uniqueDates.size,
      totalRecords,
      employeesWithAttendance,
      avgPerEmployee,
    };
  }, [users.length, attendance]);

  const getAttendanceFor = (userId: number, day: number) => {
    const date = moment().tz(BAGHDAD).year(year).month(month - 1).date(day).format('YYYY-MM-DD');
    const record = attendance.find((a: any) => {
      const recordDate = a.date ? (typeof a.date === 'string' ? a.date.slice(0, 10) : moment(a.date).format('YYYY-MM-DD')) : '';
      return a.user_id === userId && recordDate === date;
    });
    // عرض وقت الوصول المقدر = أول دخول للنظام − 20 دقيقة (لأن الموظف لا يفتح النظام فور وصوله)
    const timeToShow = record?.display_first_login_at ?? record?.first_login_at;
    return record ? (timeToShow ? moment(timeToShow).locale('ar').format('hh:mm A') : '✓') : null;
  };

  const getDaysPresentForUser = (userId: number) => {
    return attendance.filter((a: any) => a.user_id === userId).length;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else setMonth(month - 1);
    } else {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else setMonth(month + 1);
    }
  };

  const goToCurrentMonth = () => {
    setYear(nowBaghdad().year());
    setMonth(nowBaghdad().month() + 1);
  };

  const cardStyle = (accent: string) => ({
    background: 'var(--surface)',
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow-card)',
    border: '2px solid var(--border-card)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  });

  return (
    <div style={{
      padding: '1.5rem 2rem',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '1400px' }}>
        {/* هيدر + إحصائيات + فلتر + تحكم الشهر (يُمرَّر مع الصفحة) */}
        <div style={{ paddingBottom: '1.5rem', marginBottom: '0.5rem' }}>
          {/* هيدر */}
          <motion.div
            className="page-header-teal rounded-xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
              color: '#ffffff',
              padding: '1.75rem 2rem',
              marginBottom: '1.5rem',
              boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '1rem' }}>
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
                <Calendar size={28} strokeWidth={2.5} style={{ color: '#ffffff' }} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  تقويم الحضور
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', opacity: 0.95, maxWidth: '520px', color: '#ffffff' }}>
                  متابعة حضور الموظفين حسب الشهر — التسجيل تلقائي عند تسجيل الدخول
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* إحصائيات */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem',
          }}
        >
          {[
            { label: 'الموظفين النشطين', value: stats.totalEmployees, icon: Users, color: '#068294', bg: 'rgba(6,130,148,0.12)' },
            { label: 'سجّلوا حضوراً هذا الشهر', value: stats.employeesWithAttendance, icon: UserCheck, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
            { label: 'أيام بحضور', value: stats.daysWithRecords, icon: CalendarDays, color: '#2A6E85', bg: 'rgba(42,110,133,0.12)' },
            { label: 'إجمالي السجلات', value: stats.totalRecords, icon: Clock, color: '#b45309', bg: 'rgba(180,83,9,0.12)' },
            { label: 'متوسط أيام/موظف', value: stats.avgPerEmployee, icon: Info, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border-2 relative overflow-hidden hover:shadow-lg transition-all"
              style={{
                ...cardStyle(item.color),
                boxShadow: '0 4px 20px rgba(15,23,42,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(2,97,116,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.08)';
              }}
            >
              <div className="absolute inset-y-0 start-0 w-1 rounded-s-2xl opacity-80" style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 100%)` }} />
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: item.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <item.icon size={24} style={{ color: item.color }} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </div>
                <div className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--text-strong)', lineHeight: 1.2 }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

          {/* فلتر باسم الموظف */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="mb-5 rounded-2xl p-4 border-2 flex items-center gap-3 flex-wrap"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', borderColor: 'var(--border-card)' }}
          >
            <Search size={20} className="text-[var(--text-muted)]" />
            <input
              type="text"
              value={employeeNameFilter}
              onChange={(e) => setEmployeeNameFilter(e.target.value)}
              placeholder="بحث باسم الموظف..."
              className="ds-input flex-1 min-w-[200px] py-2.5 px-4"
            />
            {employeeNameFilter.trim() && (
              <button type="button" onClick={() => setEmployeeNameFilter('')} className="ds-btn ds-btn-outline px-4 py-2 rounded-lg text-sm">
                مسح
              </button>
            )}
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filteredUsers.length} من {users.length} موظف
            </span>
          </motion.div>

        {/* التحكم + دليل الرموز */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          {/* تنقل الشهر */}
          <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap border-2" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', borderColor: 'var(--border-card)' }}>
            <button type="button" onClick={() => navigateMonth('prev')} className="ds-btn ds-btn-outline w-12 h-12 rounded-xl flex items-center justify-center p-0">
              <ChevronRight size={24} />
            </button>
            <div className="flex items-center gap-3">
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="ds-input py-2.5 px-4 min-w-[160px] font-semibold text-base">
                {monthNames.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
              <input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="ds-input py-2.5 px-4 w-[110px] text-center font-semibold text-base" dir="ltr" />
            </div>
            <button type="button" onClick={() => navigateMonth('next')} className="ds-btn ds-btn-outline w-12 h-12 rounded-xl flex items-center justify-center p-0">
              <ChevronLeft size={24} />
            </button>
            <button type="button" onClick={goToCurrentMonth} className={`ds-btn px-4 py-2.5 rounded-xl text-sm font-semibold ${isCurrentMonth ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0' : 'ds-btn ds-btn-primary'}`}>
              {isCurrentMonth ? 'الشهر الحالي ✓' : 'الشهر الحالي'}
            </button>
          </div>

          {/* دليل الرموز */}
          <div className="flex items-center gap-4 flex-wrap py-3 px-4 rounded-xl border-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                background: '#d1fae5',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '0.7rem',
                textAlign: 'center',
                lineHeight: '20px',
              }}>09:00</span>
              وقت الحضور
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#d1d5db', fontWeight: 600 }}>—</span>
              لا يوجد تسجيل
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
              }} />
              عطلة نهاية أسبوع
            </span>
            {todayDay !== null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#068294', fontWeight: 600 }}>
                <Sun size={16} />
                اليوم ({todayDay})
              </span>
            )}
          </div>
        </motion.div>

        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ marginTop: '2rem' }}>
            <Loading message="جاري تحميل تقويم الحضور..." />
          </div>
        )}

        {/* الجدول */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-2xl overflow-hidden border-2 flex flex-col"
            style={{
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-card)',
              borderColor: 'var(--border-card)',
              maxHeight: 'calc(100vh - 380px)',
            }}
          >
            <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  color: '#6b7280',
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(6,130,148,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}>
                    <Users size={40} style={{ color: '#068294' }} />
                  </div>
                  <p style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: '#374151' }}>لا يوجد موظفين نشطين</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                    {users.length === 0 ? 'أضف موظفين من صفحة المستخدمين لظهورهم في تقويم الحضور' : 'لا توجد نتائج للبحث — جرّب تغيير اسم الموظف'}
                  </p>
                </div>
              ) : (
                <table className="ds-table w-full border-collapse" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#fff' }}>
                      <th style={{
                        padding: '1rem 1.25rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        position: 'sticky',
                        right: 0,
                        zIndex: 5,
                        background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
                        minWidth: '200px',
                        boxShadow: '4px 0 12px rgba(0,0,0,0.08)',
                      }}>
                        الموظف
                      </th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const date = moment().year(year).month(month - 1).date(day);
                        const isWeekend = date.day() === 5 || date.day() === 6;
                        const isToday = todayDay === day;
                        return (
                          <th
                            key={day}
                            style={{
                              padding: '0.6rem 0.35rem',
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              minWidth: '48px',
                              background: isToday ? 'rgba(255,255,255,0.25)' : (isWeekend ? 'rgba(0,0,0,0.12)' : 'transparent'),
                              borderLeft: isToday ? '2px solid #fff' : 'none',
                              borderRight: isToday ? '2px solid #fff' : 'none',
                            }}
                          >
                            <div>{day}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.95, marginTop: '2px' }}>
                              {dayNames[date.day()]}
                            </div>
                          </th>
                        );
                      })}
                      <th style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        minWidth: '72px',
                        background: 'rgba(0,0,0,0.15)',
                        borderRight: 'none',
                      }}>
                        الأيام
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user: any, userIndex: number) => {
                      const daysPresent = getDaysPresentForUser(user.id);
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: userIndex * 0.015 }}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: userIndex % 2 === 0 ? '#fff' : '#fafafa',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = userIndex % 2 === 0 ? '#fff' : '#fafafa'; }}
                        >
                          <td style={{
                            padding: '0.75rem 1.25rem',
                            fontWeight: 600,
                            color: '#111827',
                            position: 'sticky',
                            right: 0,
                            zIndex: 3,
                            background: 'inherit',
                            boxShadow: '4px 0 12px rgba(0,0,0,0.04)',
                            fontSize: '0.95rem',
                          }}>
                            {user.name}
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const time = getAttendanceFor(user.id, day);
                            const date = moment().year(year).month(month - 1).date(day);
                            const isWeekend = date.day() === 5 || date.day() === 6;
                            const isToday = todayDay === day;
                            return (
                              <td
                                key={day}
                                title={time ? `حضور: ${time}` : (isWeekend ? 'عطلة نهاية أسبوع' : 'لا يوجد تسجيل')}
                                style={{
                                  padding: '0.45rem',
                                  textAlign: 'center',
                                  fontSize: '0.8rem',
                                  background: isToday ? 'rgba(6,130,148,0.06)' : (isWeekend ? '#f8fafc' : 'transparent'),
                                  borderLeft: isToday ? '2px solid #068294' : 'none',
                                  borderRight: isToday ? '2px solid #068294' : 'none',
                                }}
                              >
                                {time ? (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.3rem 0.55rem',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%)',
                                    color: '#065f46',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  }}>
                                    {time}
                                  </span>
                                ) : (
                                  <span style={{ color: '#d1d5db', fontWeight: 500 }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: '0.5rem 1rem',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: daysPresent > 0 ? '#059669' : '#9ca3af',
                            background: 'inherit',
                          }}>
                            {daysPresent}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {filteredUsers.length > 0 && (
              <div className="py-3 px-5 border-t-2 flex justify-between items-center text-sm font-medium" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', color: 'var(--text-muted)' }}>
                <span>
                  {year} — {monthNames[month - 1]} · عرض {filteredUsers.length} من {users.length} موظف
                </span>
                <span>عمود «الأيام» = عدد أيام الحضور للموظف في هذا الشهر</span>
              </div>
            )}
          </motion.div>
        )}

        {/* رسالة عدم وجود سجلات */}
        {users.length > 0 && attendance.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fcd34d',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(245,158,11,0.15)',
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Info size={22} style={{ color: '#b45309' }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', fontWeight: 500 }}>
              لا توجد سجلات حضور للشهر المحدد. سجلات الحضور تُسجّل تلقائياً عند تسجيل دخول الموظفين.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
