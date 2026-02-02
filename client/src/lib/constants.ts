// Application constants

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  EMPLOYEE: 'employee',
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  COMPLETED_LATE: 'completed_late',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
} as const;

export const FREQUENCY_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
] as const;

export const REPORT_TYPES = {
  DAILY: 'daily',
  MONTHLY: 'monthly',
  COVERAGE: 'coverage',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
    CHANGE_PASSWORD: '/api/auth/change-password',
  },
  TASKS: {
    DAILY: '/api/tasks/daily',
    AD_HOC: '/api/tasks/ad-hoc',
    EXECUTE: '/api/tasks/execute',
    EXECUTIONS: '/api/tasks/executions',
    GENERATE_DAILY: '/api/tasks/generate-daily',
  },
  SCHEDULES: '/api/schedules',
  TEMPLATES: '/api/templates',
  CATEGORIES: '/api/categories',
  USERS: '/api/users',
  REPORTS: '/api/reports',
  ATTENDANCE: '/api/attendance',
  AUDIT_LOG: '/api/audit-log',
  TV_DASHBOARD: '/api/tv-dashboard',
  TV_SETTINGS: '/api/tv-settings',
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
} as const;

export const QUERY_KEYS = {
  DAILY_TASKS: 'daily-tasks',
  AD_HOC_TASKS: 'ad-hoc-tasks',
  SCHEDULES: 'schedules',
  TEMPLATES: 'templates',
  CATEGORIES: 'categories',
  USERS: 'users',
  REPORTS: 'reports',
  ATTENDANCE: 'attendance',
  AUDIT_LOG: 'audit-log',
  TV_SETTINGS: 'tv-settings',
} as const;
