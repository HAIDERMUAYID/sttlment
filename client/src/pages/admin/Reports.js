import React, { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SearchableSelect from '../../components/SearchableSelect';

const today = new Date().toISOString().slice(0, 10);

const Reports = () => {
  const [reportType, setReportType] = useState('daily');
  const toast = useToast();
  const [dailyDate, setDailyDate] = useState(today);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (reportType === 'coverage' && (!dateFrom || !dateTo)) {
      toast.error('اختر تاريخ البداية والنهاية لتقرير التغطية');
      return;
    }
    setLoading(true);
    try {
      let response;
      if (reportType === 'daily') {
        response = await api.get(`/reports/daily?date=${dailyDate}`);
      } else if (reportType === 'monthly') {
        response = await api.get(`/reports/monthly?month=${month}&year=${year}`);
      } else if (reportType === 'coverage') {
        response = await api.get(`/reports/coverage?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      }
      setData(response.data);
      toast.success('تم إنشاء التقرير');
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ في جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/reports/export?type=monthly&month=${month}&year=${year}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${year}_${month}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم تصدير التقرير');
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ في التصدير');
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await api.get(`/reports/export-pdf?date=${dailyDate}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${dailyDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم تصدير PDF');
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ في التصدير');
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>التقارير</h1>
      </div>

      <div className="reports-controls">
        <div className="form-group">
          <label>نوع التقرير</label>
          <SearchableSelect
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'daily', label: 'يومي' },
              { value: 'monthly', label: 'شهري' },
              { value: 'coverage', label: 'التغطية' }
            ]}
            placeholder="اختر نوع التقرير"
            searchPlaceholder="ابحث..."
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
          />
        </div>

        {reportType === 'daily' && (
          <div className="form-group">
            <label>التاريخ</label>
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
          </div>
        )}

        {reportType === 'monthly' && (
          <>
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
              <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} min="2020" max="2100" />
            </div>
          </>
        )}

        {reportType === 'coverage' && (
          <>
            <div className="form-group">
              <label>من تاريخ</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>إلى تاريخ</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </>
        )}

        <button onClick={handleGenerate} className="btn-primary" disabled={loading}>
          {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
        </button>

        {reportType === 'monthly' && (
          <button onClick={handleExport} className="btn-export">تصدير Excel</button>
        )}
        {reportType === 'daily' && (
          <button onClick={handleExportPdf} className="btn-export">تصدير PDF</button>
        )}
      </div>

      {data && (
        <div className="report-results">
          {reportType === 'daily' && (
            <div className="report-cards">
              <div className="report-card">
                <h3>المجدولة</h3>
                <p>{data.scheduled.total}</p>
              </div>
              <div className="report-card">
                <h3>مكتملة</h3>
                <p>{data.scheduled.completed}</p>
              </div>
              <div className="report-card">
                <h3>متأخرة</h3>
                <p>{data.scheduled.overdue}</p>
              </div>
              <div className="report-card">
                <h3>مكتملة متأخرة</h3>
                <p>{data.late}</p>
              </div>
              <div className="report-card">
                <h3>الحضور</h3>
                <p>{data.attendance}</p>
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>الفئة</th>
                    <th>عدد المهام</th>
                    <th>في الوقت</th>
                    <th>متأخر</th>
                    <th>تغطية</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.user_name}</td>
                      <td>{row.category_name || '-'}</td>
                      <td>{row.tasks_done}</td>
                      <td>{row.on_time}</td>
                      <td>{row.late}</td>
                      <td>{row.coverage_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'coverage' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>من قام بالتنفيذ</th>
                    <th>المسؤول الأصلي</th>
                    <th>عدد المهام</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.done_by_name}</td>
                      <td>{row.assigned_to_name}</td>
                      <td>{row.coverage_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;