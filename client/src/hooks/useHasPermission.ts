import { useAuthStore } from '@/store/useAuthStore';
import { hasPermission } from '@/lib/permissions';

/**
 * التحقق من صلاحية المستخدم لصفحة + إجراء
 * admin يملك كل الصلاحيات تلقائياً
 */
export function useHasPermission(pageKey: string, actionKey: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return hasPermission(user.permissions, user.role, pageKey, actionKey);
}

/**
 * التحقق من صلاحية عرض صفحة (view)
 */
export function useCanViewPage(pageKey: string): boolean {
  return useHasPermission(pageKey, 'view');
}
