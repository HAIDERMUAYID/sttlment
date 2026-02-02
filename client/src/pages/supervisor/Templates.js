import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';
import SearchableSelect from '../../components/SearchableSelect';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ title: '', categoryId: '', description: '', active: true });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب القوالب');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?active=true');
      setCategories(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب الفئات');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, formData);
      } else {
        await api.post('/templates', formData);
      }
      setShowModal(false);
      setEditingTemplate(null);
      toast.success(editingTemplate ? 'تم تحديث القالب' : 'تم إضافة القالب');
      setFormData({ title: '', categoryId: '', description: '', active: true });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  if (loading) return <Loading message="جاري تحميل القوالب..." />;

  return (
    <div className="templates-page">
      <div className="page-header">
        <h1>قوالب المهام</h1>
        <button onClick={() => { setEditingTemplate(null); setFormData({ title: '', categoryId: '', description: '', active: true }); setShowModal(true); }} className="btn-primary">
          إضافة قالب
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الفئة</th>
              <th>الوصف</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id}>
                <td>{template.title}</td>
                <td>{template.category_name || '-'}</td>
                <td>{template.description || '-'}</td>
                <td>{template.active ? 'نشط' : 'معطل'}</td>
                <td>
                  <button onClick={() => { setEditingTemplate(template); setFormData({ title: template.title, categoryId: template.category_id || '', description: template.description || '', active: template.active }); setShowModal(true); }} className="btn-edit">تعديل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTemplate ? 'تعديل قالب' : 'إضافة قالب'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>العنوان</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>الفئة</label>
                <SearchableSelect
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  options={[{ id: '', name: 'اختر فئة' }, ...categories]}
                  placeholder="اختر فئة"
                  searchPlaceholder="ابحث عن فئة..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id || ''}
                />
              </div>
              <div className="form-group">
                <label>الوصف</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;