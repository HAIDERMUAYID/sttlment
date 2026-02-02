import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Providers } from './components/providers';
import { MainLayout } from './components/layout/main-layout';
import { RouteGuard } from './components/route-guard';
import { SuspenseFallback } from './components/suspense-fallback';
import { NotFound } from './pages/not-found';

// Lazy load all pages for better performance
const LoginV2 = lazy(() => import('./pages/login-v2').then(m => ({ default: m.LoginV2 })));
const QuickLogin = lazy(() => import('./pages/QuickLogin'));
const TVDashboardCinematic = lazy(() => import('./pages/tv-dashboard-cinematic'));
const TVDashboardPremium = lazy(() => import('./pages/tv-dashboard-premium'));
const TVDashboardV2 = lazy(() => import('./pages/tv-dashboard-v2'));
const TVDashboard = lazy(() => import('./pages/TVDashboard'));
const DashboardV2 = lazy(() => import('./pages/dashboard-v2').then(m => ({ default: m.DashboardV2 })));
const TasksV2 = lazy(() => import('./pages/tasks-v2').then(m => ({ default: m.TasksV2 })));
const SchedulesV2 = lazy(() => import('./pages/schedules-v2'));
const TemplatesV2 = lazy(() => import('./pages/templates-v2').then(m => ({ default: m.TemplatesV2 })));
const CategoriesV2 = lazy(() => import('./pages/categories-v2').then(m => ({ default: m.CategoriesV2 })));
const ReportsV2 = lazy(() => import('./pages/reports-v2').then(m => ({ default: m.ReportsV2 })));
const UsersV2 = lazy(() => import('./pages/users-v2').then(m => ({ default: m.UsersV2 })));
const AttendanceV2 = lazy(() => import('./pages/attendance-v2').then(m => ({ default: m.AttendanceV2 })));
const AuditLogV2 = lazy(() => import('./pages/audit-log-v2').then(m => ({ default: m.AuditLogV2 })));
const ChangePasswordV2 = lazy(() => import('./pages/change-password-v2').then(m => ({ default: m.ChangePasswordV2 })));
const TVSettingsV2 = lazy(() => import('./pages/tv-settings-v2').then(m => ({ default: m.TVSettingsV2 })));
const Merchants = lazy(() => import('./pages/admin/Merchants'));
const RTGS = lazy(() => import('./pages/admin/RTGS').then(m => ({ default: m.RTGS })));
const RtgsSettings = lazy(() => import('./pages/admin/RtgsSettings').then(m => ({ default: m.RtgsSettings })));
const GovernmentSettlements = lazy(() => import('./pages/admin/GovernmentSettlements').then(m => ({ default: m.GovernmentSettlements })));
const CtMatching = lazy(() => import('./pages/admin/CtMatching'));
const MerchantDisbursements = lazy(() => import('./pages/admin/MerchantDisbursements').then(m => ({ default: m.MerchantDisbursements })));

function App() {
  return (
    <Providers>
      <Router>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <LoginV2 />
                </Suspense>
              } 
            />
            <Route 
              path="/quick-login" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <QuickLogin />
                </Suspense>
              } 
            />
            
            {/* TV Dashboard Routes (Public) */}
            <Route 
              path="/tv" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <TVDashboardCinematic />
                </Suspense>
              } 
            />
            <Route 
              path="/tv-premium" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <TVDashboardPremium />
                </Suspense>
              } 
            />
            <Route 
              path="/tv-v2" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <TVDashboardV2 />
                </Suspense>
              } 
            />
            <Route 
              path="/tv-old" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <TVDashboard />
                </Suspense>
              } 
            />
            
            {/* Protected Routes with MainLayout */}
            <Route
              path="/"
              element={
                <RouteGuard requireAuth={true}>
                  <MainLayout />
                </RouteGuard>
              }
            >
              {/* Default redirect */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              <Route path="dashboard" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><DashboardV2 /></Suspense></RouteGuard>} />
              <Route path="tasks" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><TasksV2 /></Suspense></RouteGuard>} />
              <Route path="rtgs" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><RTGS /></Suspense></RouteGuard>} />
              <Route path="government-settlements" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><GovernmentSettlements /></Suspense></RouteGuard>} />
              <Route path="ct-matching" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><CtMatching /></Suspense></RouteGuard>} />
              <Route path="merchant-disbursements" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><MerchantDisbursements /></Suspense></RouteGuard>} />
              
              <Route path="schedules" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><SchedulesV2 /></Suspense></RouteGuard>} />
              <Route path="templates" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><TemplatesV2 /></Suspense></RouteGuard>} />
              <Route path="categories" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><CategoriesV2 /></Suspense></RouteGuard>} />
              <Route path="reports" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><ReportsV2 /></Suspense></RouteGuard>} />
              <Route path="attendance" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><AttendanceV2 /></Suspense></RouteGuard>} />
              <Route path="merchants" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><Merchants /></Suspense></RouteGuard>} />
              <Route path="users" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><UsersV2 /></Suspense></RouteGuard>} />
              <Route path="audit-log" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><AuditLogV2 /></Suspense></RouteGuard>} />
              <Route path="tv-settings" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><TVSettingsV2 /></Suspense></RouteGuard>} />
              <Route path="rtgs-settings" element={<RouteGuard><Suspense fallback={<SuspenseFallback />}><RtgsSettings /></Suspense></RouteGuard>} />
              
              {/* Settings - All authenticated users */}
              <Route
                path="change-password"
                element={
                  <Suspense fallback={<SuspenseFallback />}>
                    <ChangePasswordV2 />
                  </Suspense>
                }
              />
            </Route>
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </Providers>
  );
}

export default App;
