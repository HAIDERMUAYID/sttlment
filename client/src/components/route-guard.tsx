import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTE_TO_PAGE } from '@/lib/permissions';
import { hasPermission } from '@/lib/permissions';

interface RouteGuardProps {
  children: React.ReactNode;
  /** مفتاح الصفحة للتحقق من صلاحية view */
  pageKey?: string;
  allowedRoles?: string[];
  /** إذا true يسمح بالوصول لـ admin أو supervisor أو من لديه can_manage_merchants (للتوافق القديم) */
  allowCanManageMerchants?: boolean;
  requireAuth?: boolean;
}

export function RouteGuard({ 
  children, 
  pageKey,
  allowedRoles = [], 
  allowCanManageMerchants = false,
  requireAuth = true 
}: RouteGuardProps) {
  const { isAuthenticated, user, isLoading, setLoading } = useAuthStore();
  const location = useLocation();

  // Initialize loading state on mount
  useEffect(() => {
    // Check if user data exists in localStorage
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // If no token or user, we're not authenticated
    if (!token || !userStr) {
      setLoading(false);
    } else {
      // If token exists, we might be authenticated (Zustand persist will handle it)
      // Set loading to false after a short delay to allow Zustand to hydrate
      const timer = setTimeout(() => {
        setLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [setLoading]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#BBBCC0' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#068294' }} />
          <p className="text-sm" style={{ color: '#444' }}>جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  // If route requires authentication and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // استنتاج pageKey من المسار
  const pathSeg = '/' + (location.pathname.split('/').filter(Boolean)[0] || '');
  const resolvedPageKey = pageKey || ROUTE_TO_PAGE[location.pathname] || ROUTE_TO_PAGE[pathSeg];

  // التحقق من صلاحية view — الأولوية للصلاحيات
  if (resolvedPageKey && resolvedPageKey !== 'change_password') {
    const canView = hasPermission(user?.permissions, user?.role || '', resolvedPageKey, 'view');
    if (!canView) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // change_password ومسارات أخرى غير معرفة — السماح للمصادقين
  return <>{children}</>;
}
