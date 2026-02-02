import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';

const TVSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slideInterval: 10,
    visitorMode: false,
    autoRefresh: true,
    refreshInterval: 30
  });
  const toast = useToast();

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/tv-dashboard/settings');
      setForm({
        slideInterval: res.data.slideInterval ?? 10,
        visitorMode: !!res.data.visitorMode,
        autoRefresh: res.data.autoRefresh !== false,
        refreshInterval: res.data.refreshInterval ?? 30
      });
    } catch (e) {
      toast.error(e.response?.data?.error || 'خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/tv-dashboard/settings', form);
      toast.success('تم حفظ إعدادات لوحة التحكم التلفزيونية');
    } catch (e) {
      toast.error(e.response?.data?.error || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="جاري تحميل الإعدادات..." />;

  return (
    <div className="tv-settings-page">
      <div className="page-header">
        <h1>إعدادات لوحة التحكم التلفزيونية</h1>
        <a href="/tv" target="_blank" rel="noopener noreferrer" className="btn-primary">
          فتح لوحة TV
        </a>
      </div>
      <form onSubmit={handleSubmit} className="tv-settings-form">
        <div className="form-group">
          <label>فاصل الشرائح (ثانية)</label>
          <input
            type="number"
            min={5}
            max={120}
            value={form.slideInterval}
            onChange={(e) => setForm({ ...form, slideInterval: parseInt(e.target.value) || 10 })}
          />
        </div>
        <div className="form-group">
          <label>فاصل تحديث البيانات (ثانية)</label>
          <input
            type="number"
            min={10}
            max={300}
            value={form.refreshInterval}
            onChange={(e) => setForm({ ...form, refreshInterval: parseInt(e.target.value) || 30 })}
          />
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={form.autoRefresh}
              onChange={(e) => setForm({ ...form, autoRefresh: e.target.checked })}
            />
            تحديث تلقائي للبيانات
          </label>
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={form.visitorMode}
              onChange={(e) => setForm({ ...form, visitorMode: e.target.checked })}
            />
            وضع الزائر (إخفاء الأسماء والبيانات الحساسة) — افتراضي
          </label>
        </div>
        <p className="hint">
          يمكن أيضاً تفعيل وضع الزائر عبر الرابط: <code>/tv?visitor=1</code>
        </p>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TVSettings;
