import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { isAuthenticated, getCurrentUser } from './services/authService';
import Login from './pages/Login';
import QuickLogin from './pages/QuickLogin';
import Dashboard from './pages/Dashboard';
import Users from './pages/admin/Users';
import Categories from './pages/supervisor/Categories';
import Templates from './pages/supervisor/Templates';
import Schedules from './pages/supervisor/Schedules';
import Tasks from './pages/employee/Tasks';
import Reports from './pages/admin/Reports';
import TVSettings from './pages/admin/TVSettings';
import AuditLog from './pages/admin/AuditLog';
import Merchants from './pages/admin/Merchants';
import ChangePassword from './pages/ChangePassword';
import AttendanceCalendar from './pages/AttendanceCalendar';
import TVDashboard from './pages/TVDashboard';
import Layout from './components/Layout';

function PrivateRoute({ children, allowedRoles = [] }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  const user = getCurrentUser();
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/quick-login" element={<QuickLogin />} />
          <Route path="/tv" element={<TVDashboard />} />
          
          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Tasks */}
            <Route path="tasks" element={<Tasks />} />
            
            {/* Management routes (admin/supervisor) */}
            <Route
              path="categories"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <Categories />
                </PrivateRoute>
              }
            />
            <Route
              path="templates"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <Templates />
                </PrivateRoute>
              }
            />
            <Route
              path="schedules"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <Schedules />
                </PrivateRoute>
              }
            />
            <Route
              path="reports"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <AttendanceCalendar />
                </PrivateRoute>
              }
            />
            <Route
              path="merchants"
              element={
                <PrivateRoute allowedRoles={['admin', 'supervisor']}>
                  <Merchants />
                </PrivateRoute>
              }
            />
            
            {/* Admin only routes */}
            <Route
              path="users"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <Users />
                </PrivateRoute>
              }
            />
            <Route
              path="tv-settings"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <TVSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="audit-log"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AuditLog />
                </PrivateRoute>
              }
            />
            
            {/* User settings */}
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;