import React, { useState, useEffect } from 'react';
import api from '../services/api';
import moment from 'moment-timezone';

const TVDashboard = () => {
  const [data, setData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const sec = data?.settings?.refreshInterval ?? 30;
    const ms = Math.max(5000, (sec || 30) * 1000);
    const interval = setInterval(fetchData, ms);
    return () => clearInterval(interval);
  }, [data?.settings?.refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data?.slides) {
      const slideInterval = (data.settings?.slideInterval || 10) * 1000;
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % data.slides.length);
      }, slideInterval);
      return () => clearInterval(timer);
    }
  }, [data]);

  const visitorFromUrl = new URLSearchParams(window.location.search).get('visitor') === '1';

  const fetchData = async () => {
    try {
      const response = await api.get(`/tv-dashboard?visitorMode=${visitorFromUrl}`);
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('خطأ في جلب بيانات لوحة التحكم:', error);
      // في حالة الخطأ، نعرض رسالة خطأ بدلاً من البقاء في حالة التحميل
      setLoading(false);
      
      // تحديد نوع الخطأ
      let errorMessage = 'حدث خطأ في جلب البيانات';
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'خطأ في الاتصال بالخادم';
      } else if (error.response?.status === 500) {
        errorMessage = 'خطأ في الخادم';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setData({
        error: true,
        message: errorMessage
      });
    }
  };

  if (loading || !data) {
    return (
      <div className="tv-dashboard loading-screen">
        <div className="loading-content">
          <h1>قسم التسويات والمطابقة</h1>
          <p>جاري التحميل...</p>
        </div>
        <div className="tv-visitor-link">
          <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'}>
            {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
          </a>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا فشل جلب البيانات
  if (data.error) {
    return (
      <div className="tv-dashboard loading-screen">
        <div className="loading-content">
          <h1>قسم التسويات والمطابقة</h1>
          <p className="tv-error-message">{data.message || 'حدث خطأ'}</p>
          <p className="tv-error-hint">
            يرجى التأكد من أن الخادم يعمل
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setData(null);
              fetchData();
            }}
            className="tv-retry-button"
          >
            إعادة المحاولة
          </button>
        </div>
        <div className="tv-visitor-link">
          <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'}>
            {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
          </a>
        </div>
      </div>
    );
  }

  const slide = data.slides[currentSlide];
  const now = moment().tz('Asia/Baghdad');

  const renderSlide = () => {
    switch (slide.type) {
      case 'opening':
        return (
          <div className="slide opening-slide">
            <h1 className="main-title">{slide.title}</h1>
            <h2 className="sub-title">{slide.subtitle}</h2>
            <div className="date-time">
              <div className="date">{now.format('YYYY-MM-DD')}</div>
              <div className="time">{now.format('HH:mm:ss')}</div>
            </div>
          </div>
        );

      case 'overview':
        return (
          <div className="slide overview-slide">
            <h1 className="slide-title">نظرة عامة - {slide.date}</h1>
            <div className="stats-grid">
              <div className="stat-card large">
                <div className="stat-label">المجدولة</div>
                <div className="stat-value">{slide.scheduled}</div>
              </div>
              <div className="stat-card success">
                <div className="stat-label">مكتملة</div>
                <div className="stat-value">{slide.done}</div>
              </div>
              <div className="stat-card danger">
                <div className="stat-label">متأخرة</div>
                <div className="stat-value">{slide.overdue}</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-label">مكتملة متأخرة</div>
                <div className="stat-value">{slide.late}</div>
              </div>
            </div>
          </div>
        );

      case 'overdue':
        return (
          <div className="slide overdue-slide">
            <h1 className="slide-title">المهام المتأخرة</h1>
            <div className="task-list">
              {slide.tasks.length > 0 ? (
                slide.tasks.map((task, idx) => (
                  <div key={idx} className="task-item large">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">{task.assignedTo} - {task.dueTime}</div>
                  </div>
                ))
              ) : (
                <div className="no-data">لا توجد مهام متأخرة</div>
              )}
            </div>
          </div>
        );

      case 'coverage':
        return (
          <div className="slide coverage-slide">
            <h1 className="slide-title">التغطية - من قام بمهام الآخرين</h1>
            <div className="coverage-list">
              {slide.coverage.map((item, idx) => (
                <div key={idx} className="coverage-item">
                  <div className="coverage-name">{item.name}</div>
                  <div className="coverage-count">{item.count} مهمة</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="slide attendance-slide">
            <h1 className="slide-title">الحضور - {slide.date}</h1>
            <div className="attendance-stats">
              <div className="attendance-total">الحاضرون: {slide.present}</div>
            </div>
            <div className="attendance-list">
              {slide.records.map((record, idx) => (
                <div key={idx} className="attendance-item">
                  <div className="attendance-name">{record.name}</div>
                  <div className="attendance-time">{record.time}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="slide categories-slide">
            <h1 className="slide-title">توزيع الفئات - {slide.date}</h1>
            <div className="categories-list">
              {slide.categories.map((cat, idx) => (
                <div key={idx} className="category-item">
                  <div className="category-name">{cat.name}</div>
                  <div className="category-count">{cat.count}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'trends':
        return (
          <div className="slide trends-slide">
            <h1 className="slide-title">الاتجاهات الأسبوعية</h1>
            <div className="trends-chart">
              {slide.week.map((day, idx) => (
                <div key={idx} className="trend-day">
                  <div className="trend-date">{moment(day.date).format('ddd')}</div>
                  <div className="trend-bar">
                    <div
                      className="trend-fill"
                      style={{ height: `${(day.completed / Math.max(day.total, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="trend-value">{day.completed}/{day.total}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'recognition':
        return (
          <div className="slide recognition-slide">
            <h1 className="slide-title">أفضل الأداء</h1>
            <div className="recognition-list">
              {slide.topPerformers.map((performer, idx) => (
                <div key={idx} className="recognition-item">
                  <div className="recognition-rank">#{idx + 1}</div>
                  <div className="recognition-name">{performer.name}</div>
                  <div className="recognition-stats">
                    {performer.tasks} مهمة ({performer.onTime} في الوقت)
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className="slide">شريحة غير معروفة</div>;
    }
  };

  return (
    <div className="tv-dashboard">
      {renderSlide()}
      <div className="tv-visitor-link">
        <a href={visitorFromUrl ? '/tv' : '/tv?visitor=1'}>
          {visitorFromUrl ? 'عرض عادي' : 'وضع الزائر'}
        </a>
      </div>
      <div className="slide-indicator">
        {data.slides.map((_, idx) => (
          <span
            key={idx}
            className={idx === currentSlide ? 'active' : ''}
            onClick={() => setCurrentSlide(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default TVDashboard;