import { lazy } from 'react';
import type { RouteConfig } from '@/types/routes';

// Lazy load all pages for better performance
// Note: This file is for future use. Currently routes are defined directly in App.tsx
export const routes: RouteConfig[] = [
  // Public routes
  {
    path: '/login',
    component: lazy(() => import('@/pages/login-v2').then(m => ({ default: m.LoginV2 }))),
    public: true,
  },
  {
    path: '/quick-login',
    component: lazy(() => import('@/pages/QuickLogin')),
    public: true,
  },
  {
    path: '/tv',
    component: lazy(() => import('@/pages/tv-dashboard-cinematic')),
    public: true,
  },
  {
    path: '/tv-premium',
    component: lazy(() => import('@/pages/tv-dashboard-premium')),
    public: true,
  },
  {
    path: '/tv-v2',
    component: lazy(() => import('@/pages/tv-dashboard-v2')),
    public: true,
  },
  {
    path: '/tv-old',
    component: lazy(() => import('@/pages/TVDashboard')),
    public: true,
  },
  
  // Protected routes - Main section
  {
    path: '/dashboard',
    component: lazy(() => import('@/pages/dashboard-v2').then(m => ({ default: m.DashboardV2 }))),
    roles: ['admin', 'supervisor', 'employee'],
  },
  {
    path: '/tasks',
    component: lazy(() => import('@/pages/tasks-v2').then(m => ({ default: m.TasksV2 }))),
    roles: ['admin', 'supervisor', 'employee'],
  },
  
  // Protected routes - Task management
  {
    path: '/schedules',
    component: lazy(() => import('@/pages/schedules-v2')),
    roles: ['admin', 'supervisor'],
  },
  {
    path: '/templates',
    component: lazy(() => import('@/pages/templates-v2').then(m => ({ default: m.TemplatesV2 }))),
    roles: ['admin', 'supervisor'],
  },
  {
    path: '/categories',
    component: lazy(() => import('@/pages/categories-v2').then(m => ({ default: m.CategoriesV2 }))),
    roles: ['admin', 'supervisor'],
  },
  
  // Protected routes - Reports & Analytics
  {
    path: '/reports',
    component: lazy(() => import('@/pages/reports-v2').then(m => ({ default: m.ReportsV2 }))),
    roles: ['admin', 'supervisor'],
  },
  {
    path: '/attendance',
    component: lazy(() => import('@/pages/attendance-v2').then(m => ({ default: m.AttendanceV2 }))),
    roles: ['admin', 'supervisor'],
  },
  
  // Protected routes - Administration
  {
    path: '/merchants',
    component: lazy(() => import('@/pages/admin/Merchants')),
    roles: ['admin', 'supervisor'],
  },
  {
    path: '/users',
    component: lazy(() => import('@/pages/users-v2').then(m => ({ default: m.UsersV2 }))),
    roles: ['admin'],
  },
  {
    path: '/audit-log',
    component: lazy(() => import('@/pages/audit-log-v2').then(m => ({ default: m.AuditLogV2 }))),
    roles: ['admin'],
  },
  
  // Protected routes - Settings
  {
    path: '/tv-settings',
    component: lazy(() => import('@/pages/tv-settings-v2').then(m => ({ default: m.TVSettingsV2 }))),
    roles: ['admin'],
  },
  {
    path: '/change-password',
    component: lazy(() => import('@/pages/change-password-v2').then(m => ({ default: m.ChangePasswordV2 }))),
    roles: ['admin', 'supervisor', 'employee'],
  },
];
