import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';
import SearchableSelect from '../../components/SearchableSelect';
import moment from 'moment-timezone';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    templateId: '',
    frequencyType: 'daily',
    daysOfWeek: [],
    dayOfWeekSingle: 0,
    dayOfMonth: 1,
    dueTime: '',
    graceMinutes: 0,
    defaultAssigneeUserId: '',
    active: true
  });

  const days = [
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الاثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' }
  ];

  useEffect(() => {
    fetchSchedules();
    fetchTemplates();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/schedules');
      setSchedules(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب الجداول');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates?active=true');
      setTemplates(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب القوالب');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.filter(u => u.role === 'employee' && u.active));
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب المستخدمين');
    }
  };

  const toggleDay = (dayValue) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(dayValue)
        ? formData.daysOfWeek.filter(d => d !== dayValue)
        : [...formData.daysOfWeek, dayValue]
    });
  };

  const getFrequencyLabel = (schedule) => {
    if (schedule.frequency_type === 'daily') {
      if (!schedule.days_of_week || schedule.days_of_week.length === 0) return 'يومية (بدون أيام)';
      const dayLabels = schedule.days_of_week.map(d => days.find(day => day.value === d)?.label).filter(Boolean);
      return `يومية: ${dayLabels.join(', ')}`;
    } else if (schedule.frequency_type === 'weekly') {
      const dayLabel = days.find(d => d.value === schedule.day_of_week_single)?.label || 'غير محدد';
      return `أسبوعية: كل ${dayLabel}`;
    } else if (schedule.frequency_type === 'monthly') {
      return `شهرية: يوم ${schedule.day_of_month} من كل شهر`;
    }
    return 'غير محدد';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق حسب نوع التكرار
    if (formData.frequencyType === 'daily' && formData.daysOfWeek.length === 0) {
      toast.error('يجب اختيار يوم واحد على الأقل للمهام اليومية');
      return;
    }
    
    if (!formData.dueTime) {
      toast.error('وقت الاستحقاق مطلوب');
      return;
    }
    
    try {
      const payload = {
        templateId: formData.templateId,
        frequencyType: formData.frequencyType,
        dueTime: formData.dueTime,
        graceMinutes: formData.graceMinutes || 0,
        defaultAssigneeUserId: formData.defaultAssigneeUserId || null,
        active: formData.active
      };
      
      if (formData.frequencyType === 'daily') {
        payload.daysOfWeek = formData.daysOfWeek;
      } else if (formData.frequencyType === 'weekly') {
        payload.dayOfWeekSingle = formData.dayOfWeekSingle;
      } else if (formData.frequencyType === 'monthly') {
        payload.dayOfMonth = formData.dayOfMonth;
      }
      
      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, payload);
      } else {
        await api.post('/schedules', payload);
      }
      toast.success(editingSchedule ? 'تم تحديث الجدول' : 'تم إضافة الجدول');
      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const resetForm = () => {
    setFormData({
      templateId: '',
      frequencyType: 'daily',
      daysOfWeek: [],
      dayOfWeekSingle: 0,
      dayOfMonth: 1,
      dueTime: '',
      graceMinutes: 0,
      defaultAssigneeUserId: '',
      active: true
    });
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      templateId: schedule.template_id,
      frequencyType: schedule.frequency_type || 'daily',
      daysOfWeek: schedule.days_of_week || [],
      dayOfWeekSingle: schedule.day_of_week_single ?? 0,
      dayOfMonth: schedule.day_of_month ?? 1,
      dueTime: schedule.due_time,
      graceMinutes: schedule.grace_minutes || 0,
      defaultAssigneeUserId: schedule.default_assignee_user_id || '',
      active: schedule.active
    });
    setShowModal(true);
  };

  if (loading) return <Loading message="جاري تحميل الجداول..." />;

  return (
    <div className="schedules-page">
      <div className="page-header">
        <h1>الجداول الزمنية للمهام</h1>
        <button onClick={() => { setEditingSchedule(null); resetForm(); setShowModal(true); }} className="btn-primary">
          إضافة جدول
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>القالب</th>
              <th>نوع التكرار</th>
              <th>وقت الاستحقاق</th>
              <th>فترة السماح</th>
              <th>المسؤول</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map(schedule => (
              <tr key={schedule.id}>
                <td>{schedule.template_title}</td>
                <td>{getFrequencyLabel(schedule)}</td>
                <td>{schedule.due_time ? moment(schedule.due_time, ['HH:mm', 'HH:mm:ss']).locale('ar').format('hh:mm A') : '—'}</td>
                <td>{schedule.grace_minutes || 0} دقيقة</td>
                <td>{schedule.assignee_name || '-'}</td>
                <td>
                  <span className={`badge ${schedule.active ? 'active' : 'inactive'}`}>
                    {schedule.active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td>
                  <button onClick={() => openEditModal(schedule)} className="btn-edit">تعديل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingSchedule(null); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSchedule ? 'تعديل جدول' : 'إضافة جدول جديد'}</h2>
            <div className="modal-form-wrapper">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>القالب *</label>
                <SearchableSelect
                  value={formData.templateId}
                  onChange={(e) => setFormData({...formData, templateId: e.target.value})}
                  options={templates}
                  placeholder="اختر قالب المهمة"
                  searchPlaceholder="ابحث عن قالب..."
                  getOptionLabel={(opt) => opt.title}
                  getOptionValue={(opt) => opt.id}
                  required
                />
              </div>

              <div className="form-group">
                <label>نوع التكرار *</label>
                <SearchableSelect
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({...formData, frequencyType: e.target.value, daysOfWeek: [], dayOfWeekSingle: 0, dayOfMonth: 1})}
                  options={[
                    { value: 'daily', label: 'يومية (أيام أسبوع محددة)' },
                    { value: 'weekly', label: 'أسبوعية (يوم واحد من الأسبوع)' },
                    { value: 'monthly', label: 'شهرية (يوم محدد من الشهر)' }
                  ]}
                  placeholder="اختر نوع التكرار"
                  searchPlaceholder="ابحث..."
                  getOptionLabel={(opt) => opt.label}
                  getOptionValue={(opt) => opt.value}
                  required
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
                  {formData.frequencyType === 'daily' && 'مثال: تسويات مصرف الرشيد - كل سبت وأحد واثنين...'}
                  {formData.frequencyType === 'weekly' && 'مثال: مهمة أسبوعية - كل يوم أحد'}
                  {formData.frequencyType === 'monthly' && 'مثال: عمولة صندوق سهداء الشرطة - يوم 1 من كل شهر'}
                </small>
              </div>

              {formData.frequencyType === 'daily' && (
                <div className="form-group">
                  <label>أيام الأسبوع *</label>
                  <div className="days-grid">
                    {days.map(day => (
                      <label key={day.value} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.daysOfWeek.includes(day.value)}
                          onChange={() => toggleDay(day.value)}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.frequencyType === 'weekly' && (
                <div className="form-group">
                  <label>يوم الأسبوع *</label>
                  <SearchableSelect
                    value={formData.dayOfWeekSingle}
                    onChange={(e) => setFormData({...formData, dayOfWeekSingle: parseInt(e.target.value)})}
                    options={days}
                    placeholder="اختر يوم الأسبوع"
                    searchPlaceholder="ابحث عن يوم..."
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    required
                  />
                </div>
              )}

              {formData.frequencyType === 'monthly' && (
                <div className="form-group">
                  <label>يوم الشهر * (1-31)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={formData.dayOfMonth} 
                    onChange={(e) => setFormData({...formData, dayOfMonth: parseInt(e.target.value) || 1})}
                    required
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
                    سيتم إنشاء المهمة كل يوم {formData.dayOfMonth} من كل شهر
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>وقت الاستحقاق (وقت الرفع) *</label>
                <input 
                  type="time" 
                  value={formData.dueTime} 
                  onChange={(e) => setFormData({...formData, dueTime: e.target.value})} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>فترة السماح (دقيقة)</label>
                <input 
                  type="number" 
                  value={formData.graceMinutes} 
                  onChange={(e) => setFormData({...formData, graceMinutes: parseInt(e.target.value) || 0})} 
                  min="0" 
                />
              </div>

              <div className="form-group">
                <label>الموظف المسؤول</label>
                <SearchableSelect
                  value={formData.defaultAssigneeUserId}
                  onChange={(e) => setFormData({...formData, defaultAssigneeUserId: e.target.value})}
                  options={[{ id: '', name: 'اختر موظف (اختياري)' }, ...users]}
                  placeholder="اختر موظف (اختياري)"
                  searchPlaceholder="ابحث عن موظف..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id || ''}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={formData.active} 
                    onChange={(e) => setFormData({...formData, active: e.target.checked})} 
                  />
                  نشط (سيتم توليد المهام تلقائياً)
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">حفظ</button>
                <button type="button" onClick={() => { setShowModal(false); setEditingSchedule(null); resetForm(); }} className="btn-secondary">إلغاء</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
