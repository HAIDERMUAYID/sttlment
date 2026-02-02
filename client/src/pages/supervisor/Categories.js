import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', active: true });

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب الفئات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setShowModal(false);
      setEditingCategory(null);
      toast.success(editingCategory ? 'تم تحديث الفئة' : 'تم إضافة الفئة');
      setFormData({ name: '', description: '', active: true });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('تم حذف الفئة');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  if (loading) return <Loading message="جاري تحميل الفئات..." />;

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1>إدارة الفئات</h1>
          <p className="page-subtitle">تنظيم وتصنيف المهام حسب الفئات</p>
        </div>
        <button onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '', active: true }); setShowModal(true); }} className="btn-primary">
          <span>➕</span>
          <span>إضافة فئة</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p>لا توجد فئات حالياً</p>
          <button onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '', active: true }); setShowModal(true); }} className="btn-primary">
            إضافة أول فئة
          </button>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map(category => (
            <div key={category.id} className={`category-card ${category.active ? '' : 'inactive'}`}>
              <div className="category-header">
                <h3>{category.name}</h3>
                <span className={`category-status ${category.active ? 'active' : 'inactive'}`}>
                  {category.active ? 'نشط' : 'معطل'}
                </span>
              </div>
              {category.description && (
                <p className="category-description">{category.description}</p>
              )}
              <div className="card-actions">
                <button onClick={() => { setEditingCategory(category); setFormData({ name: category.name, description: category.description || '', active: category.active }); setShowModal(true); }} className="btn-edit">
                  <span>✏️</span>
                  <span>تعديل</span>
                </button>
                <button onClick={() => handleDelete(category.id)} className="btn-delete">
                  <span>🗑️</span>
                  <span>حذف</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCategory ? 'تعديل فئة' : 'إضافة فئة'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>اسم الفئة</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
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

export default Categories;