import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';
import SearchableSelect from '../components/SearchableSelect';
import moment from 'moment-timezone';

const AttendanceCalendar = () => {
  const [year, setYear] = useState(moment().year());
  const [month, setMonth] = useState(moment().month() + 1);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const start = moment().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const end = moment().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');
  const daysInMonth = moment().year(year).month(month - 1).daysInMonth();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, attRes] = await Promise.all([
        api.get('/users'),
        api.get(`/attendance?dateFrom=${start}&dateTo=${end}`),
      ]);
      const employees = usersRes.data.filter((u) => u.role === 'employee' && u.active);
      setUsers(employees);
      setAttendance(attRes.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceFor = (userId, day) => {
    const date = moment().year(year).month(month - 1).date(day).format('YYYY-MM-DD');
    const r = attendance.find((a) => a.user_id === userId && a.date === date);
    return r ? (r.first_login_at || '').slice(11, 16) : null;
  };

  if (loading) return <Loading message="جاري تحميل تقويم الحضور..." />;

  return (
    <div className="attendance-calendar-page">
      <div className="page-header">
        <h1>تقويم الحضور</h1>
      </div>
      <div className="calendar-controls">
        <div className="form-group">
          <label>الشهر</label>
          <SearchableSelect
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))}
            placeholder="اختر الشهر"
            searchPlaceholder="ابحث..."
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
          />
        </div>
        <div className="form-group">
          <label>السنة</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>
      </div>
      <div className="calendar-table-wrap">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="col-user">الموظف</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <th key={d} className="col-day">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="col-user">{u.name}</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const t = getAttendanceFor(u.id, d);
                  return (
                    <td key={d} className={`col-day ${t ? 'present' : ''}`} title={t || ''}>
                      {t || '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="calendar-legend">✓ = وقت أول تسجيل دخول (HH:MM) — = غياب</p>
    </div>
  );
};

export default AttendanceCalendar;
