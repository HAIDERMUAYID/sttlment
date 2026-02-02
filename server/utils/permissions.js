const pool = require('../config/database');

/** الصلاحيات الافتراضية حسب الدور — عند عدم وجود صلاحيات مخزنة */
const DEFAULT_BY_ROLE = {
  admin: null, // admin يملك الكل — لا نحتاج صلاحيات
  supervisor: {
    dashboard: { view: true },
    tasks: { view: true, create_ad_hoc: true, filter_by_assignee: true, execute: true, delete_task: false },
    schedules: { view: true, create: true, edit: true, delete: true },
    templates: { view: true, create: true, edit: true, delete: true },
    categories: { view: true, create: true, edit: true, delete: true },
    rtgs: { view: true, import: true, export: true, delete_import: true, delete_all: true, view_import_logs: true, access_settings: false },
    government_settlements: { view: true },
    ct_matching: { view: false, create_ct: false, edit_ct: false, delete_ct: false },
    merchant_disbursements: { view: false, create_disbursement: false, update_disbursement: false, delete_disbursement: false },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: true },
    merchants: { view: true, create: true, edit: true, delete: false, import: true, export: true },
    users: { view: false, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
    audit_log: { view: false },
    tv_settings: { view: false, edit: false },
    rtgs_settings: { view: false, edit: false },
    change_password: { self_update: true },
  },
  employee: {
    dashboard: { view: true },
    tasks: { view: true, create_ad_hoc: false, filter_by_assignee: false, execute: true, delete_task: false },
    schedules: { view: true, create: false, edit: false, delete: false },
    templates: { view: true, create: false, edit: false, delete: false },
    categories: { view: true, create: false, edit: false, delete: false },
    rtgs: { view: true, import: false, export: false, delete_import: false, delete_all: false, view_import_logs: false, access_settings: false },
    government_settlements: { view: true },
    ct_matching: { view: false, create_ct: false, edit_ct: false, delete_ct: false },
    merchant_disbursements: { view: false, create_disbursement: false, update_disbursement: false, delete_disbursement: false },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: false },
    merchants: { view: false, create: false, edit: false, delete: false, import: false, export: false },
    users: { view: false, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
    audit_log: { view: false },
    tv_settings: { view: false, edit: false },
    rtgs_settings: { view: false, edit: false },
    change_password: { self_update: true },
  },
  accountant: {
    dashboard: { view: true },
    tasks: { view: true, create_ad_hoc: false, filter_by_assignee: false, execute: true, delete_task: false },
    schedules: { view: true, create: false, edit: false, delete: false },
    templates: { view: true, create: false, edit: false, delete: false },
    categories: { view: true, create: false, edit: false, delete: false },
    rtgs: { view: true, import: false, export: true, delete_import: false, delete_all: false, view_import_logs: true, access_settings: false },
    government_settlements: { view: true },
    ct_matching: { view: true, create_ct: true, edit_ct: true, delete_ct: true },
    merchant_disbursements: { view: true, create_disbursement: true, update_disbursement: true, delete_disbursement: true },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: false },
    merchants: { view: false, create: false, edit: false, delete: false, import: false, export: false },
    users: { view: true, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
    audit_log: { view: false },
    tv_settings: { view: false, edit: false },
    rtgs_settings: { view: false, edit: false },
    change_password: { self_update: true },
  },
  viewer: {
    dashboard: { view: true },
    tasks: { view: true, create_ad_hoc: false, filter_by_assignee: false, execute: false, delete_task: false },
    schedules: { view: true, create: false, edit: false, delete: false },
    templates: { view: true, create: false, edit: false, delete: false },
    categories: { view: true, create: false, edit: false, delete: false },
    rtgs: { view: true, import: false, export: false, delete_import: false, delete_all: false, view_import_logs: false, access_settings: false },
    government_settlements: { view: true },
    ct_matching: { view: false, create_ct: false, edit_ct: false, delete_ct: false },
    merchant_disbursements: { view: false, create_disbursement: false, update_disbursement: false, delete_disbursement: false },
    reports: { view: true, export_excel: false, export_pdf: false },
    attendance: { view: true, manage_stats: false },
    merchants: { view: false, create: false, edit: false, delete: false, import: false, export: false },
    users: { view: false, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
    audit_log: { view: false },
    tv_settings: { view: false, edit: false },
    rtgs_settings: { view: false, edit: false },
    change_password: { self_update: true },
  },
};

/**
 * جلب صلاحيات المستخدم من DB — بما فيها الملغاة (granted = false)
 * حتى تُطبَّق إلغاءات الصلاحيات التي يضبطها المدير وتُدمج مع الافتراضيات بشكل صحيح
 */
async function loadUserPermissionsFromDb(userId) {
  try {
    const r = await pool.query(
      'SELECT page_key, action_key, granted FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    const perms = {};
    r.rows.forEach((row) => {
      if (!perms[row.page_key]) perms[row.page_key] = {};
      perms[row.page_key][row.action_key] = row.granted;
    });
    return perms;
  } catch (err) {
    console.error('خطأ في جلب صلاحيات المستخدم:', err);
    return {};
  }
}

/**
 * دمج صلاحيات مخزنة مع الافتراضية — الصلاحيات المخزنة لها الأولوية
 */
function mergeWithDefaults(stored, role) {
  const defaults = DEFAULT_BY_ROLE[role];
  if (!defaults) return stored || {};
  if (!stored || Object.keys(stored).length === 0) return defaults;
  const merged = {};
  for (const pageKey of Object.keys(defaults)) {
    merged[pageKey] = { ...defaults[pageKey], ...(stored[pageKey] || {}) };
  }
  for (const pageKey of Object.keys(stored)) {
    if (!merged[pageKey]) merged[pageKey] = { ...stored[pageKey] };
  }
  return merged;
}

/**
 * جلب صلاحيات المستخدم (من DB أو الافتراضية)
 */
async function loadUserPermissions(userId, role) {
  if (role === 'admin') return null;
  const stored = await loadUserPermissionsFromDb(userId);
  return mergeWithDefaults(stored, role);
}

/**
 * التحقق من صلاحية — permissions من req.user.permissions
 * إذا permissions === null → admin يملك الكل → true
 */
function hasPermission(permissions, pageKey, actionKey) {
  if (permissions === null) return true; // admin يملك كل الصلاحيات
  const page = permissions[pageKey];
  if (!page) return false;
  const val = page[actionKey];
  return val === true;
}

module.exports = {
  loadUserPermissions,
  hasPermission,
  DEFAULT_BY_ROLE,
  mergeWithDefaults,
};
