import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment-timezone';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const Dashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchDailyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDailyReport = async () => {
    try {
      const response = await api.get('/reports/daily');
      setReport(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="جاري تحميل لوحة التحكم..." />;

  const todayArabic = moment().tz('Asia/Baghdad').locale('ar').format('dddd، D MMMM YYYY');

  const completionRate = report?.scheduled?.total > 0 
    ? Math.round((report.scheduled.completed / report.scheduled.total) * 100) 
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>لوحة التحكم</h1>
          <p className="date">{todayArabic}</p>
        </div>
        <div className="dashboard-quick-actions">
          <Link to="/tasks" className="btn-primary">
            <span>✅</span>
            <span>المهام</span>
          </Link>
          <a href="/tv" target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <span>📺</span>
            <span>TV Dashboard</span>
          </a>
        </div>
      </div>

      {report && (
        <>
          {/* بطاقات الإحصائيات الرئيسية */}
          <div className="dashboard-stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <h3>المهام المجدولة</h3>
                <p className="stat-value">{report.scheduled.total}</p>
                <div className="stat-progress">
                  <div className="stat-progress-bar">
                    <div 
                      className="stat-progress-fill" 
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <span className="stat-progress-text">{completionRate}% مكتملة</span>
                </div>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>مكتملة</h3>
                <p className="stat-value">{report.scheduled.completed}</p>
                <p className="stat-label">في الوقت المحدد</p>
              </div>
            </div>

            <div className="stat-card danger">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>متأخرة</h3>
                <p className="stat-value">{report.scheduled.overdue}</p>
                <p className="stat-label">تتطلب متابعة</p>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">⏰</div>
              <div className="stat-content">
                <h3>مكتملة متأخرة</h3>
                <p className="stat-value">{report.late}</p>
                <p className="stat-label">تم إنجازها بعد الموعد</p>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>الحضور</h3>
                <p className="stat-value">{report.attendance}</p>
                <p className="stat-label">موظف حضر اليوم</p>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h3>مهام خاصة</h3>
                <p className="stat-value">{report.adHoc.total}</p>
                <p className="stat-label">مهام غير مجدولة</p>
              </div>
            </div>
          </div>

          {/* ملخص سريع */}
          <div className="dashboard-summary">
            <div className="summary-card">
              <h3>📊 ملخص اليوم</h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">نسبة الإنجاز:</span>
                  <span className="summary-value">{completionRate}%</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">المهام المعلقة:</span>
                  <span className="summary-value">{report.scheduled.total - report.scheduled.completed}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">معدل الحضور:</span>
                  <span className="summary-value">{report.attendance} موظف</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;