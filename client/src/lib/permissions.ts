/** ربط مسار الصفحة بمفتاح الصفحة (page_key) */
export const ROUTE_TO_PAGE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/schedules': 'schedules',
  '/templates': 'templates',
  '/categories': 'categories',
  '/rtgs': 'rtgs',
  '/government-settlements': 'government_settlements',
  '/settlement-details': 'government_settlements',
  '/ct-matching': 'ct_matching',
  '/merchant-disbursements': 'merchant_disbursements',
  '/reports': 'reports',
  '/attendance': 'attendance',
  '/merchants': 'merchants',
  '/users': 'users',
  '/audit-log': 'audit_log',
  '/tv-settings': 'tv_settings',
  '/rtgs-settings': 'rtgs_settings',
  '/change-password': 'change_password',
};

/** الصلاحيات الافتراضية حسب الدور (للـ fallback في الواجهة — يجب أن تطابق الخادم) */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, Record<string, Record<string, boolean>> | null> = {
  admin: null,
  supervisor: {
    dashboard: { view: true },
    tasks: { view: true, create_ad_hoc: true, filter_by_assignee: true, execute: true, delete_task: true },
    schedules: { view: true, create: true, edit: true, delete: true },
    templates: { view: true, create: true, edit: true, delete: true },
    categories: { view: true, create: true, edit: true, delete: true },
    rtgs: { view: true, import: true, export: true, delete_import: true, delete_all: true, view_import_logs: true },
    government_settlements: { view: true },
    ct_matching: { view: false, create_ct: false, edit_ct: false, delete_ct: false },
    merchant_disbursements: { view: false, create_disbursement: false, update_disbursement: false, delete_disbursement: false },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: true },
    merchants: { view: true, create: true, edit: true, delete: true, import: true, export: true },
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
    rtgs: { view: true, import: false, export: false, delete_import: false, delete_all: false, view_import_logs: false },
    government_settlements: { view: true },
    ct_matching: { view: false, create_ct: false, edit_ct: false, delete_ct: false },
    merchant_disbursements: { view: false, create_disbursement: false, update_disbursement: false, delete_disbursement: false },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: false },
    merchants: { view: false, create: false, edit: false, delete: false, import: false, export: false },
    users: { view: true, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
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
    rtgs: { view: true, import: false, export: true, delete_import: false, delete_all: false, view_import_logs: true },
    government_settlements: { view: true },
    ct_matching: { view: true, create_ct: true, edit_ct: true, delete_ct: true },
    merchant_disbursements: { view: true, create_disbursement: true, update_disbursement: true, delete_disbursement: true },
    reports: { view: true, export_excel: true, export_pdf: true },
    attendance: { view: true, manage_stats: false },
    merchants: { view: false, create: false, edit: false, delete: false, import: false, export: false },
    users: { view: false, create: false, edit: false, delete: false, manage_permissions: false, toggle_active: false },
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
    rtgs: { view: true, import: false, export: false, delete_import: false, delete_all: false, view_import_logs: false },
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

export type PermissionsMap = Record<string, Record<string, boolean>> | null;

/**
 * الحصول على صلاحيات المستخدم الفعلية (مع fallback)
 */
export function getEffectivePermissions(
  permissions: PermissionsMap | undefined,
  role: string
): PermissionsMap {
  if (role === 'admin') return null;
  if (permissions !== undefined && permissions !== null && Object.keys(permissions || {}).length > 0) {
    return permissions;
  }
  return DEFAULT_PERMISSIONS_BY_ROLE[role] ?? DEFAULT_PERMISSIONS_BY_ROLE.employee;
}

/**
 * التحقق من صلاحية — مع fallback للصلاحيات الافتراضية
 */
export function hasPermission(
  permissions: PermissionsMap | undefined,
  role: string,
  pageKey: string,
  actionKey: string
): boolean {
  const effective = getEffectivePermissions(permissions, role);
  if (effective === null) return true; // admin
  const page = effective[pageKey];
  if (!page) return false;
  return page[actionKey] === true;
}
