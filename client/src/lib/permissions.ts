/** ربط مسار الصفحة بمفتاح الصفحة (page_key) */
export const ROUTE_TO_PAGE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/schedules': 'schedules',
  '/templates': 'templates',
  '/categories': 'categories',
  '/rtgs': 'rtgs',
  '/government-settlements': 'government_settlements',
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

/** الصلاحيات الافتراضية حسب الدور (للـ fallback في الواجهة) */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, Record<string, Record<string, boolean>> | null> = {
  admin: null,
  supervisor: {
    dashboard: { view: true },
    tasks: { view: true },
    schedules: { view: true },
    templates: { view: true },
    categories: { view: true },
    rtgs: { view: true },
    government_settlements: { view: true },
    ct_matching: { view: false },
    merchant_disbursements: { view: false },
    reports: { view: true },
    attendance: { view: true },
    merchants: { view: true },
    users: { view: false },
    audit_log: { view: false },
    tv_settings: { view: false },
    rtgs_settings: { view: false },
    change_password: { self_update: true },
  },
  employee: {
    dashboard: { view: true },
    tasks: { view: true },
    schedules: { view: true },
    templates: { view: true },
    categories: { view: true },
    rtgs: { view: true },
    government_settlements: { view: true },
    ct_matching: { view: false },
    merchant_disbursements: { view: false },
    reports: { view: true },
    attendance: { view: true },
    merchants: { view: false },
    users: { view: true },
    audit_log: { view: false },
    tv_settings: { view: false },
    rtgs_settings: { view: false },
    change_password: { self_update: true },
  },
  accountant: {
    dashboard: { view: true },
    tasks: { view: true },
    schedules: { view: true },
    templates: { view: true },
    categories: { view: true },
    rtgs: { view: true },
    government_settlements: { view: true },
    ct_matching: { view: true },
    merchant_disbursements: { view: true },
    reports: { view: true },
    attendance: { view: true },
    merchants: { view: false },
    users: { view: false },
    audit_log: { view: false },
    tv_settings: { view: false },
    rtgs_settings: { view: false },
    change_password: { self_update: true },
  },
  viewer: {
    dashboard: { view: true },
    tasks: { view: true },
    schedules: { view: true },
    templates: { view: true },
    categories: { view: true },
    rtgs: { view: true },
    government_settlements: { view: true },
    ct_matching: { view: false },
    merchant_disbursements: { view: false },
    reports: { view: true },
    attendance: { view: true },
    merchants: { view: false },
    users: { view: false },
    audit_log: { view: false },
    tv_settings: { view: false },
    rtgs_settings: { view: false },
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
