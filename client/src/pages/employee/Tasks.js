import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getCurrentUser } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/Loading';
import SearchableSelect from '../../components/SearchableSelect';
import moment from 'moment-timezone';

const todayBaghdad = () => moment().tz('Asia/Baghdad').format('YYYY-MM-DD');

const Tasks = () => {
  const [dailyTasks, setDailyTasks] = useState([]);
  const [adHocTasks, setAdHocTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [filterView, setFilterView] = useState('');
  const [dateMode, setDateMode] = useState('single'); // افتراضي: يوم محدد (اليوم)
  const [filterDate, setFilterDate] = useState(todayBaghdad());
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ dailyTasks: [], adHocTasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [executionData, setExecutionData] = useState({ resultStatus: 'completed', notes: '', durationMinutes: '', onBehalfOfUserId: '' });
  const [adHocData, setAdHocData] = useState({ title: '', categoryId: '', description: '', templateId: '' });
  const [templateData, setTemplateData] = useState({ templateId: '', categoryId: '', description: '', beneficiary: '' });
  const [taskToDelete, setTaskToDelete] = useState(null); // { id, type: 'daily'|'ad-hoc' }
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllSubmitting, setDeleteAllSubmitting] = useState(false);
  const executionFilesRef = React.useRef(null);
  const user = getCurrentUser();

  const canFilterByAssignee = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
    fetchUsers();
    // جلب المهام تلقائياً — التأكد من توليد مهام اليوم إن لم تُولَّد بعد
    api.get('/tasks/ensure-daily').then((res) => {
      if (res.data?.generated > 0) fetchTasks();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => handleSearch(), 500);
      return () => clearTimeout(timeoutId);
    }
    fetchTasks();
    setSearchResults({ dailyTasks: [], adHocTasks: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterView, dateMode, filterDate, filterDateFrom, filterDateTo, filterAssignee, searchQuery]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.filter((u) => (u.role === 'employee' || u.role === 'supervisor') && u.active));
    } catch (e) {
      toast.error('خطأ في جلب المستخدمين');
    }
  };

  const buildTasksQuery = (base) => {
    const p = new URLSearchParams();
    if (filterView) p.set('view', filterView);
    if (dateMode === 'single' && filterDate) {
      p.set('date', filterDate);
    } else if (dateMode === 'range' && filterDateFrom && filterDateTo) {
      p.set('dateFrom', filterDateFrom);
      p.set('dateTo', filterDateTo);
    } else if (dateMode === 'all') {
      // عند "عام": نعرض المهام من آخر 30 يوم + اليوم
      const today = todayBaghdad();
      const thirtyDaysAgo = moment.tz('Asia/Baghdad').subtract(30, 'days').format('YYYY-MM-DD');
      p.set('dateFrom', thirtyDaysAgo);
      p.set('dateTo', today);
    }
    if (canFilterByAssignee && filterAssignee) p.set('assignedTo', filterAssignee);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const dailyUrl = buildTasksQuery('/tasks/daily');
      const adHocUrl = buildTasksQuery('/tasks/ad-hoc');
      const [dailyRes, adHocRes] = await Promise.all([
        api.get(dailyUrl),
        api.get(adHocUrl)
      ]);
      setDailyTasks(dailyRes.data);
      setAdHocTasks(adHocRes.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في جلب المهام');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates?active=true');
      setTemplates(response.data || []);
      if (response.data && response.data.length === 0) {
        console.warn('لا توجد قوالب متاحة في النظام');
      }
    } catch (error) {
      console.error('خطأ في جلب القوالب:', error);
      toast.error(error.response?.data?.error || 'خطأ في جلب القوالب');
      setTemplates([]);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults({ dailyTasks: [], adHocTasks: [] });
      fetchTasks();
      return;
    }
    setIsSearching(true);
    try {
      let url = `/tasks/search?q=${encodeURIComponent(searchQuery.trim())}`;
      if (filterView) url += `&view=${filterView}`;
      if (dateMode === 'single' && filterDate) url += `&date=${filterDate}`;
      else if (dateMode === 'range' && filterDateFrom && filterDateTo) {
        url += `&dateFrom=${filterDateFrom}&dateTo=${filterDateTo}`;
      }
      const response = await api.get(url);
      setSearchResults(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في البحث');
      setSearchResults({ dailyTasks: [], adHocTasks: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const openExecuteModal = (task) => {
    // للمهام المجدولة فقط: ضبط onBehalfOfUserId إذا لم يكن المستخدم هو المسؤول
    // للمهام الخاصة: دائماً '' (لأنها غير مكلفة لشخص معين)
    const isDailyTask = task.type === 'daily';
    const assigneeId = task.assigned_to_user_id;
    const isMe = assigneeId && user?.id && String(assigneeId) === String(user.id);
    const onBehalfOfUserId = isDailyTask && !isMe && assigneeId ? String(assigneeId) : '';
    
    setExecutionData({
      resultStatus: 'completed',
      notes: '',
      durationMinutes: '',
      onBehalfOfUserId: onBehalfOfUserId
    });
    setSelectedTask(task);
    setShowExecuteModal(true);
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    try {
      // للمهام الخاصة: لا نرسل onBehalfOfUserId (دائماً null)
      // للمهام المجدولة: النظام يضبطها تلقائياً بناءً على assigned_to_user_id
      const payload = {
        ...executionData,
        dailyTaskId: selectedTask?.type === 'daily' ? selectedTask.id : null,
        adHocTaskId: selectedTask?.type === 'ad-hoc' ? selectedTask.id : null,
        durationMinutes: executionData.durationMinutes ? parseInt(executionData.durationMinutes, 10) : null,
        onBehalfOfUserId: null // النظام يضبطها تلقائياً في الـ backend
      };
      const execRes = await api.post('/tasks/execute', payload);
      const execId = execRes.data?.id;
      const files = executionFilesRef.current?.files;
      if (execId && files?.length) {
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append('file', files[i]);
          await api.post(`/tasks/executions/${execId}/attachments`, fd);
        }
      }
      if (executionFilesRef.current) executionFilesRef.current.value = '';
      setShowExecuteModal(false);
      setSelectedTask(null);
      toast.success('تم تسجيل تنفيذ المهمة' + (files?.length ? ` ورفع ${files.length} مرفق` : ''));
      setExecutionData({ resultStatus: 'completed', notes: '', durationMinutes: '', onBehalfOfUserId: '' });
      if (searchQuery.trim()) handleSearch();
      else fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleCreateAdHoc = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks/ad-hoc', adHocData);
      setShowAdHocModal(false);
      toast.success('تم إنشاء المهمة الخاصة');
      setAdHocData({ title: '', categoryId: '', description: '', templateId: '' });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleCreateFromTemplate = async (e) => {
    e.preventDefault();
    if (!templateData.templateId) {
      toast.error('يرجى اختيار قالب المهمة');
      return;
    }
    try {
      const selectedTemplate = templates.find(t => t.id === parseInt(templateData.templateId));
      if (!selectedTemplate) {
        toast.error('القالب المختار غير موجود');
        return;
      }
      const newTaskData = {
        templateId: templateData.templateId,
        categoryId: templateData.categoryId || selectedTemplate.category_id || '',
        title: selectedTemplate.title,
        description: templateData.description || selectedTemplate.description || '',
        beneficiary: templateData.beneficiary || ''
      };
      const res = await api.post('/tasks/ad-hoc', newTaskData);
      const createdTask = res.data;
      setShowTemplateModal(false);
      setTemplateData({ templateId: '', categoryId: '', description: '', beneficiary: '' });
      toast.success('تم إنشاء المهمة من القالب');
      // بناء بيانات المهمة للتنفيذ
      const categoryName = categories.find(c => c.id === (templateData.categoryId || selectedTemplate.category_id))?.name || '';
      const taskForExecution = {
        ...createdTask,
        id: createdTask.id,
        type: 'ad-hoc',
        template_title: selectedTemplate.title,
        category_name: categoryName,
        title: selectedTemplate.title,
        status: 'pending',
        assigned_to_user_id: createdTask.assigned_to_user_id || null
      };
      // فتح نافذة التنفيذ مباشرة
      openExecuteModal(taskForExecution);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ في إنشاء المهمة');
    }
  };

  const handleDeleteClick = (task, type) => setTaskToDelete({ id: task.id, type });
  const cancelDelete = () => setTaskToDelete(null);
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setDeleteSubmitting(true);
      const path = taskToDelete.type === 'daily' ? 'daily' : 'ad-hoc';
      await api.delete(`/tasks/${path}/${taskToDelete.id}`);
      toast.success('تم حذف المهمة');
      setTaskToDelete(null);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'فشل حذف المهمة');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      setDeleteAllSubmitting(true);
      const res = await api.delete('/tasks/all');
      toast.success(res.data?.message || 'تم حذف جميع المهام');
      setDeleteAllConfirm(false);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'فشل حذف المهام');
    } finally {
      setDeleteAllSubmitting(false);
    }
  };

  const openDetails = async (task) => {
    setSelectedTaskForDetails(task);
    setShowDetailsModal(true);
    setExecutions([]);
    try {
      const res = await api.get(`/tasks/executions?taskId=${task.id}`);
      setExecutions(res.data);
    } catch (e) {
      toast.error('خطأ في جلب تفاصيل التنفيذ');
      setExecutions([]);
    }
  };

  const statusLabels = { completed: 'مكتملة', completed_late: 'مكتملة متأخرة', skipped: 'تخطي', cancelled: 'ملغاة' };

  const renderTaskCard = (task, type) => {
    const isDaily = type === 'daily';
    return (
      <div key={task.id} className={`task-card ${task.status}`}>
        <div className="task-header">
          <div className="task-title-group">
            <h3>{isDaily ? task.template_title : (task.title || task.template_title)}</h3>
            {task.category_name && (
              <span className="task-category">{task.category_name}</span>
            )}
          </div>
          <span className={`status-badge ${task.status}`}>
            {task.status === 'completed' ? 'مكتملة' : 
             task.status === 'overdue' ? 'متأخرة' : 
             task.status === 'pending' ? 'معلقة' : task.status}
          </span>
        </div>
        <div className="task-info">
          {isDaily ? (
            <>
              <div className="info-row">
                <span className="info-label">المسؤول:</span>
                <span className="info-value">{task.assigned_to_name || 'غير محدد'}</span>
              </div>
              {task.task_date && (
                <div className="info-row">
                  <span className="info-label">التاريخ:</span>
                  <span className="info-value">{moment(task.task_date).format('YYYY-MM-DD')}</span>
                </div>
              )}
              {task.due_date_time && (
                <div className="info-row">
                  <span className="info-label">وقت الاستحقاق:</span>
                  <span className="info-value">{moment(task.due_date_time).locale('ar').format('hh:mm A')}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="info-row">
                <span className="info-label">أنشأها:</span>
                <span className="info-value">{task.created_by_name || '-'}</span>
              </div>
              {task.beneficiary && (
                <div className="info-row">
                  <span className="info-label">الجهة المستفيدة:</span>
                  <span className="info-value">{task.beneficiary}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="task-actions">
          {task.status !== 'completed' && (
            <button onClick={() => openExecuteModal({ ...task, type })} className="btn-execute">
              <span>✅</span>
              <span>تنفيذ</span>
            </button>
          )}
          <button onClick={() => openDetails({ ...task, type })} className="btn-details">
            <span>📋</span>
            <span>تفاصيل</span>
          </button>
          {user?.role === 'admin' && (
            <button type="button" onClick={() => handleDeleteClick(task, type)} className="btn-delete" title="حذف المهمة">
              <span>🗑️</span>
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading && dailyTasks.length === 0 && adHocTasks.length === 0)
    return <Loading message="جاري تحميل المهام..." />;

  const stats = {
    total: dailyTasks.length + adHocTasks.length,
    pending: [...dailyTasks, ...adHocTasks].filter(t => t.status === 'pending').length,
    completed: [...dailyTasks, ...adHocTasks].filter(t => t.status === 'completed').length,
    overdue: dailyTasks.filter(t => t.status === 'overdue').length
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>المهام</h1>
          <p className="page-subtitle">إدارة وتنفيذ المهام اليومية والخاصة</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowTemplateModal(true)} className="btn-primary">
            <span>📝</span>
            <span>إنشاء من قالب</span>
          </button>
          {user?.can_create_ad_hoc && (
            <button onClick={() => setShowAdHocModal(true)} className="btn-secondary">
              <span>➕</span>
              <span>مهمة خاصة</span>
            </button>
          )}
          <button 
            onClick={async () => {
              try {
                const res = await api.post('/tasks/generate-daily');
                toast.success(res.data.message || 'تم توليد المهام بنجاح');
                fetchTasks();
              } catch (error) {
                toast.error(error.response?.data?.error || 'حدث خطأ في توليد المهام');
              }
            }} 
            className="btn-secondary"
            style={{ background: 'var(--color-success)', color: 'white' }}
          >
            <span>🔄</span>
            <span>توليد المهام اليومية</span>
          </button>
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setDeleteAllConfirm(true)}
              className="btn-delete"
              title="حذف جميع المهام"
            >
              <span>🗑️</span>
              <span>حذف الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="tasks-stats">
        <div className="stat-item">
          <span className="stat-label">إجمالي المهام</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item pending">
          <span className="stat-label">معلقة</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
        <div className="stat-item completed">
          <span className="stat-label">مكتملة</span>
          <span className="stat-value">{stats.completed}</span>
        </div>
        <div className="stat-item overdue">
          <span className="stat-label">متأخرة</span>
          <span className="stat-value">{stats.overdue}</span>
        </div>
      </div>

      <div className="tasks-filters">
        <div className="form-group search-group">
          <label>🔍 البحث عن المهام</label>
          <div className="search-input-wrapper">
            <input 
              type="text" 
              placeholder="ابحث عن أي مهمة (مثال: إعداد تقرير، تسويات مصرف الرشيد...)" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => { setSearchQuery(''); setSearchResults({ dailyTasks: [], adHocTasks: [] }); fetchTasks(); }}
                className="clear-search"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>
          <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
            يمكنك البحث عن أي مهمة وإنجازها حتى لو لم تكن مخصصة لك
          </small>
        </div>
        {!searchQuery.trim() && (
          <>
            <div className="form-group">
              <label>عرض المهام</label>
              <SearchableSelect
                value={filterView}
                onChange={(e) => setFilterView(e.target.value)}
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'department_pending', label: 'مهام القسم المعلقة' },
                  { value: 'department_completed', label: 'مهام القسم المنجزة' },
                  { value: 'my_pending', label: 'مهام المعلقة من قبلي' }
                ]}
                placeholder="الكل"
                searchPlaceholder="ابحث..."
                getOptionLabel={(opt) => opt.label}
                getOptionValue={(opt) => opt.value || ''}
              />
            </div>
            <div className="form-group">
              <label>التاريخ</label>
              <SearchableSelect
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value)}
                options={[
                  { value: 'all', label: 'عام (كل الفترات)' },
                  { value: 'single', label: 'يوم محدد' },
                  { value: 'range', label: 'فترة معينة' }
                ]}
                placeholder="اختر وضع التاريخ"
                searchPlaceholder="ابحث..."
                getOptionLabel={(opt) => opt.label}
                getOptionValue={(opt) => opt.value}
              />
            </div>
            {dateMode === 'single' && (
              <div className="form-group">
                <label>اليوم</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
            )}
            {dateMode === 'range' && (
              <>
                <div className="form-group">
                  <label>من</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>إلى</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
              </>
            )}
            {canFilterByAssignee && (
              <div className="form-group">
                <label>المسؤول</label>
                <SearchableSelect
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  options={[{ id: '', name: 'الكل' }, ...users]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن موظف..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id || ''}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="tasks-sections">
        {searchQuery.trim() ? (
          <div className="search-results">
            <div className="search-results-header">
              <h2>نتائج البحث</h2>
              <span className="results-count">
                {searchResults.dailyTasks.length + searchResults.adHocTasks.length} نتيجة
              </span>
            </div>
            {isSearching ? (
              <Loading message="جاري البحث..." />
            ) : (
              <>
                {searchResults.dailyTasks.length > 0 && (
                  <section className="tasks-section">
                    <h3 className="section-title">المهام اليومية ({searchResults.dailyTasks.length})</h3>
                    <div className="tasks-list">
                      {searchResults.dailyTasks.map(task => renderTaskCard(task, 'daily'))}
                    </div>
                  </section>
                )}
                {searchResults.adHocTasks.length > 0 && (
                  <section className="tasks-section">
                    <h3 className="section-title">المهام الخاصة ({searchResults.adHocTasks.length})</h3>
                    <div className="tasks-list">
                      {searchResults.adHocTasks.map(task => renderTaskCard(task, 'ad-hoc'))}
                    </div>
                  </section>
                )}
                {searchResults.dailyTasks.length === 0 && searchResults.adHocTasks.length === 0 && (
                  <div className="no-results-container">
                    <div className="no-results-icon">🔍</div>
                    <p className="no-results">لا توجد نتائج للبحث</p>
                    <p className="no-results-hint">جرب مصطلحات بحث مختلفة</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <section className="tasks-section">
              <div className="section-header">
                <h2 className="section-title">المهام اليومية المجدولة</h2>
                <span className="section-count">{dailyTasks.length} مهمة</span>
              </div>
              {loading ? (
                <Loading message="جاري التحميل..." />
              ) : dailyTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p>لا توجد مهام مجدولة لهذا التاريخ</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {dailyTasks.map(task => renderTaskCard(task, 'daily'))}
                </div>
              )}
            </section>

            <section className="tasks-section">
              <div className="section-header">
                <h2 className="section-title">المهام الخاصة</h2>
                <span className="section-count">{adHocTasks.length} مهمة</span>
              </div>
              {adHocTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <p>لا توجد مهام خاصة حالياً</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {adHocTasks.map(task => renderTaskCard(task, 'ad-hoc'))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showDetailsModal && selectedTaskForDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-details" onClick={(e) => e.stopPropagation()}>
            <h2>تفاصيل التنفيذ — {selectedTaskForDetails.template_title || selectedTaskForDetails.title}</h2>
            {executions.length === 0 ? (
              <p className="no-executions">لا توجد سجلات تنفيذ لهذه المهمة.</p>
            ) : (
              <div className="executions-list">
                {executions.map((ex) => {
                  // للمهام المجدولة: إذا نفذها شخص غير المسؤول → عرض "بدلاً عن"
                  // للمهام الخاصة: لا يوجد "بدلاً عن" (لأنها غير مكلفة لشخص معين)
                  const isDailyTask = !!ex.daily_task_id;
                  const showOnBehalf = isDailyTask && ex.on_behalf_of_name && ex.on_behalf_of_name !== ex.done_by_name;
                  
                  return (
                    <div key={ex.id} className="execution-item">
                      <div>
                        <strong>نفّذها:</strong> {ex.done_by_name}
                        {showOnBehalf && (
                          <> <span className="on-behalf">بدلاً عن {ex.on_behalf_of_name}</span></>
                        )}
                      </div>
                      <div><strong>الوقت:</strong> {ex.done_at}</div>
                      <div><strong>الحالة:</strong> {statusLabels[ex.result_status] || ex.result_status}</div>
                      {ex.notes && <div><strong>ملاحظات:</strong> {ex.notes}</div>}
                      {ex.duration_minutes != null && <div><strong>المدة:</strong> {ex.duration_minutes} د</div>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setShowDetailsModal(false)} className="btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {taskToDelete && (
        <div className="modal-overlay" onClick={() => !deleteSubmitting && cancelDelete()}>
          <div className="modal-content modal-details" onClick={(e) => e.stopPropagation()}>
            <h2>حذف المهمة</h2>
            <p className="no-executions">هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="form-actions">
              <button type="button" onClick={cancelDelete} className="btn-secondary" disabled={deleteSubmitting}>إلغاء</button>
              <button type="button" onClick={handleDeleteConfirm} className="btn-primary" disabled={deleteSubmitting} style={{ background: 'var(--color-danger, #dc2626)', color: '#fff' }}>{deleteSubmitting ? 'جاري الحذف...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteAllConfirm && (
        <div className="modal-overlay" onClick={() => !deleteAllSubmitting && setDeleteAllConfirm(false)}>
          <div className="modal-content modal-details" onClick={(e) => e.stopPropagation()}>
            <h2>حذف جميع المهام</h2>
            <p className="no-executions">هل أنت متأكد من حذف <strong>جميع</strong> المهام (اليومية والخاصة)؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="form-actions">
              <button type="button" onClick={() => setDeleteAllConfirm(false)} className="btn-secondary" disabled={deleteAllSubmitting}>إلغاء</button>
              <button type="button" onClick={handleDeleteAllConfirm} className="btn-primary" disabled={deleteAllSubmitting} style={{ background: 'var(--color-danger, #dc2626)', color: '#fff' }}>{deleteAllSubmitting ? 'جاري الحذف...' : 'حذف الكل'}</button>
            </div>
          </div>
        </div>
      )}

      {showExecuteModal && selectedTask && (
        <div className="modal-overlay" onClick={() => { setShowExecuteModal(false); setSelectedTask(null); setExecutionData({ resultStatus: 'completed', notes: '', durationMinutes: '', onBehalfOfUserId: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>تنفيذ المهمة</h2>
            <form onSubmit={handleExecute}>
              {/* حقل "بدلاً عن" فقط للمهام المجدولة */}
              {selectedTask?.type === 'daily' && selectedTask?.assigned_to_user_id && (
                <div className="form-group">
                  <label>تنفيذ بدلاً عن (اختياري)</label>
                  <SearchableSelect
                    value={executionData.onBehalfOfUserId}
                    onChange={(e) => setExecutionData({ ...executionData, onBehalfOfUserId: e.target.value })}
                    options={(() => {
                      const others = users.filter((u) => u.id !== user?.id);
                      const aid = selectedTask?.assigned_to_user_id;
                      const inList = others.some((u) => String(u.id) === String(aid));
                      if (aid && !inList && selectedTask?.assigned_to_name) {
                        return [{ id: '', name: '— أنا أنفذها —' }, { id: aid, name: `${selectedTask.assigned_to_name} (المسؤول)` }, ...others];
                      }
                      return [{ id: '', name: '— أنا أنفذها —' }, ...others];
                    })()}
                    placeholder="— أنا أنفذها —"
                    searchPlaceholder="ابحث عن موظف..."
                    getOptionLabel={(opt) => opt.name}
                    getOptionValue={(opt) => opt.id || ''}
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
                    إذا نفذتها نيابة عن زميل، اختر اسمه. تُسجّل باسمك وتُعرض «بدلاً عن فلان».
                  </small>
                </div>
              )}
              {/* للمهام الخاصة: لا يوجد حقل "بدلاً عن" */}
              {selectedTask?.type === 'ad-hoc' && (
                <div className="form-group">
                  <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', display: 'block', padding: '0.5rem', background: 'var(--color-bg)', borderRadius: 'var(--radius)' }}>
                    ℹ️ المهام الخاصة تُسجّل باسمك مباشرة (لا يوجد "بدلاً عن" لأنها غير مكلفة لشخص معين)
                  </small>
                </div>
              )}
              <div className="form-group">
                <label>حالة التنفيذ</label>
                <SearchableSelect
                  value={executionData.resultStatus}
                  onChange={(e) => setExecutionData({...executionData, resultStatus: e.target.value})}
                  options={[
                    { value: 'completed', label: 'مكتملة (في الوقت)' },
                    { value: 'completed_late', label: 'مكتملة (متأخرة)' },
                    { value: 'skipped', label: 'تم التخطي' },
                    { value: 'cancelled', label: 'ملغاة' }
                  ]}
                  placeholder="اختر الحالة"
                  searchPlaceholder="ابحث عن حالة..."
                  getOptionLabel={(opt) => opt.label}
                  getOptionValue={(opt) => opt.value}
                  required
                />
              </div>
              <div className="form-group">
                <label>ملاحظات</label>
                <textarea value={executionData.notes} onChange={(e) => setExecutionData({...executionData, notes: e.target.value})} rows="4" />
              </div>
              <div className="form-group">
                <label>المدة (دقيقة) - اختياري</label>
                <input type="number" value={executionData.durationMinutes} onChange={(e) => setExecutionData({...executionData, durationMinutes: e.target.value})} min="0" />
              </div>
              <div className="form-group">
                <label>مرفقات (اختياري) — PDF, Word, Excel, صور</label>
                <input ref={executionFilesRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">حفظ</button>
                <button type="button" onClick={() => { setShowExecuteModal(false); setSelectedTask(null); setExecutionData({ resultStatus: 'completed', notes: '', durationMinutes: '', onBehalfOfUserId: '' }); }} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => { setShowTemplateModal(false); setTemplateData({ templateId: '', categoryId: '', description: '', beneficiary: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>إنشاء مهمة من قالب</h2>
            <form onSubmit={handleCreateFromTemplate}>
              <div className="form-group">
                <label>اختر قالب المهمة *</label>
                <SearchableSelect
                  value={templateData.templateId}
                  onChange={(e) => {
                    const selected = templates.find(t => t.id === parseInt(e.target.value));
                    setTemplateData({
                      templateId: e.target.value,
                      categoryId: selected?.category_id || templateData.categoryId,
                      description: templateData.description
                    });
                  }}
                  options={templates}
                  placeholder="— اختر قالب —"
                  searchPlaceholder="ابحث عن قالب..."
                  getOptionLabel={(opt) => opt.title}
                  getOptionValue={(opt) => opt.id}
                  required
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
                  سيتم إنشاء المهمة من القالب المختار وفتح نافذة التنفيذ مباشرة
                </small>
              </div>
              {templateData.templateId && (() => {
                const selectedTemplate = templates.find(t => t.id === parseInt(templateData.templateId));
                return (
                  <>
                    {selectedTemplate?.description && (
                      <div className="form-group">
                        <label>وصف القالب</label>
                        <div style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                          {selectedTemplate.description}
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label>الفئة</label>
                      <SearchableSelect
                        value={templateData.categoryId || selectedTemplate?.category_id || ''}
                        onChange={(e) => setTemplateData({ ...templateData, categoryId: e.target.value })}
                        options={[{ id: '', name: 'استخدام فئة القالب' }, ...categories]}
                        placeholder="استخدام فئة القالب"
                        searchPlaceholder="ابحث عن فئة..."
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id || ''}
                      />
                    </div>
                  </>
                );
              })()}
              <div className="form-group">
                <label>وصف إضافي (اختياري)</label>
                <textarea 
                  value={templateData.description} 
                  onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })} 
                  rows="4"
                  placeholder="أضف أي تفاصيل إضافية للمهمة..."
                />
              </div>
              <div className="form-group">
                <label>الجهة المستفيدة (اختياري)</label>
                <input 
                  type="text"
                  value={templateData.beneficiary} 
                  onChange={(e) => setTemplateData({ ...templateData, beneficiary: e.target.value })} 
                  placeholder="مثال: وزارة المالية، البنك المركزي، إلخ..."
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
                  حدد الجهة أو الشخص المستفيد من هذه المهمة
                </small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">إنشاء وتنفيذ</button>
                <button type="button" onClick={() => { setShowTemplateModal(false); setTemplateData({ templateId: '', categoryId: '', description: '', beneficiary: '' }); }} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdHocModal && (
        <div className="modal-overlay" onClick={() => setShowAdHocModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>إنشاء مهمة خاصة</h2>
            <form onSubmit={handleCreateAdHoc}>
              <div className="form-group">
                <label>القالب (اختياري)</label>
                <SearchableSelect
                  value={adHocData.templateId}
                  onChange={(e) => setAdHocData({...adHocData, templateId: e.target.value})}
                  options={[{ id: '', title: 'بدون قالب' }, ...templates]}
                  placeholder="بدون قالب"
                  searchPlaceholder="ابحث عن قالب..."
                  getOptionLabel={(opt) => opt.title}
                  getOptionValue={(opt) => opt.id || ''}
                />
              </div>
              <div className="form-group">
                <label>العنوان</label>
                <input type="text" value={adHocData.title} onChange={(e) => setAdHocData({...adHocData, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>الفئة</label>
                <SearchableSelect
                  value={adHocData.categoryId}
                  onChange={(e) => setAdHocData({...adHocData, categoryId: e.target.value})}
                  options={[{ id: '', name: 'اختر فئة' }, ...categories]}
                  placeholder="اختر فئة"
                  searchPlaceholder="ابحث عن فئة..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id || ''}
                />
              </div>
              <div className="form-group">
                <label>الوصف</label>
                <textarea value={adHocData.description} onChange={(e) => setAdHocData({...adHocData, description: e.target.value})} rows="4" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">إنشاء</button>
                <button type="button" onClick={() => setShowAdHocModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;