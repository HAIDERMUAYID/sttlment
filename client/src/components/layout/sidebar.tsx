import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FileText,
  Users,
  Settings,
  BarChart3,
  FolderTree,
  Clock,
  Tv,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Store,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  ChevronLeft,
  ImageOff,
  FileSpreadsheet,
  Banknote,
  Calculator,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { hasPermission } from '@/lib/permissions';
import { useThemeStore } from '@/store/useThemeStore';
import { useSidebarStore, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/store/useSidebarStore';
import { usePWA } from '@/hooks/use-pwa';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { CompanyLogo } from '@/components/CompanyLogo';

const menuItems = [
  {
    title: 'القسم الرئيسي',
    items: [
      { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard', pageKey: 'dashboard' },
      { icon: CheckSquare, label: 'المهام', path: '/tasks', pageKey: 'tasks' },
    ],
  },
  {
    title: 'إدارة المهام',
    items: [
      { icon: Calendar, label: 'الجداول الزمنية', path: '/schedules', pageKey: 'schedules' },
      { icon: FileText, label: 'قوالب المهام', path: '/templates', pageKey: 'templates' },
      { icon: FolderTree, label: 'الفئات', path: '/categories', pageKey: 'categories' },
    ],
  },
  {
    title: 'التقارير والتحليلات',
    items: [
      { icon: FileSpreadsheet, label: 'RTGS', path: '/rtgs', pageKey: 'rtgs' },
      { icon: Banknote, label: 'التسويات الحكومية', path: '/government-settlements', pageKey: 'government_settlements' },
      { icon: Calculator, label: 'مطابقة العمولات (CT)', path: '/ct-matching', pageKey: 'ct_matching' },
      { icon: Wallet, label: 'صرف مستحقات التجار', path: '/merchant-disbursements', pageKey: 'merchant_disbursements' },
      { icon: BarChart3, label: 'التقارير', path: '/reports', pageKey: 'reports' },
      { icon: Clock, label: 'الحضور', path: '/attendance', pageKey: 'attendance' },
    ],
  },
  {
    title: 'الإدارة',
    items: [
      { icon: Store, label: 'إدارة التجار', path: '/merchants', pageKey: 'merchants' },
      { icon: Users, label: 'المستخدمين', path: '/users', pageKey: 'users' },
      { icon: FileText, label: 'سجل التدقيق', path: '/audit-log', pageKey: 'audit_log' },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      { icon: Tv, label: 'لوحة TV', path: '/tv-settings', pageKey: 'tv_settings' },
      { icon: FileSpreadsheet, label: 'إعدادات RTGS', path: '/rtgs-settings', pageKey: 'rtgs_settings' },
      { icon: Settings, label: 'كلمة المرور', path: '/change-password', pageKey: 'change_password' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { isInstallable, install } = usePWA();
  const { isOpen, isCollapsed, showLogo, toggleOpen, toggleCollapsed, setShowLogo } = useSidebarStore();

  const filteredMenuItems = menuItems.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const pk = (item as { pageKey?: string }).pageKey;
      if (!pk) return true;
      if (pk === 'change_password') return true; // متاح للجميع
      return hasPermission(user?.permissions, user?.role || '', pk, 'view');
    }),
  })).filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const roleLabel = user?.role === 'admin' ? 'مدير' : user?.role === 'supervisor' ? 'مشرف' : 'موظف';

  const width = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const showLogoArea = showLogo && !isCollapsed;
  /* لوحة Color Hunt: #09637E #088395 #7AB2B2 #EBF4F6 */
  const brandPrimary = '#088395';
  const shadeColor = '#09637E'; /* تضليل - عنصر نشط */
  const textOnWhite = '#09637E'; /* نص على الخلفية الفاتحة */
  const textOnShade = '#ffffff';

  // زر عائم عند إخفاء الشريط بالكامل
  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-4 top-6 z-50"
      >
        <Button
          onClick={toggleOpen}
          size="lg"
          className="rounded-full shadow-lg h-12 w-12 p-0"
          style={{ background: shadeColor, color: '#fff', border: 'none' }}
        >
          <PanelRightOpen className="h-6 w-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{
        width,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="app-sidebar fixed right-0 top-0 h-screen flex flex-col z-50 overflow-hidden"
      style={{
        background: '#EBF4F6',
        borderLeft: `2px solid ${shadeColor}`,
        boxShadow: '-4px 0 24px rgba(9, 99, 126, 0.12)',
      }}
    >
      {/* شريط التحكم العلوي — تصميم حديث وواضح */}
      <div
        className={cn(
          'sidebar-top-bar flex items-center shrink-0',
          isCollapsed ? 'flex-col gap-2 py-3 px-2' : 'justify-between gap-3 px-4 py-3'
        )}
        style={{
          background: 'linear-gradient(135deg, #09637E 0%, #0d7a8c 50%, #088395 100%)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <AnimatePresence mode="wait">
          {showLogoArea ? (
            <motion.div
              key="logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <CompanyLogo size="lg" animated className="flex-shrink-0" onDarkBackground />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate tracking-tight" style={{ color: '#ffffff' }}>نظام المهام</p>
                <p className="text-[11px] truncate mt-0.5 opacity-95" style={{ color: '#ffffff' }}>التسويات والمطابقة</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn('flex justify-center', isCollapsed ? 'w-full' : 'flex-1')}
            >
              <CompanyLogo size={isCollapsed ? 'md' : 'lg'} animated onDarkBackground />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn('flex items-center flex-shrink-0', isCollapsed ? 'flex-col gap-1' : 'gap-1')}>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogo(!showLogo)}
              className="h-9 w-9 rounded-xl transition-colors"
              style={{ color: '#ffffff' }}
              title={showLogo ? 'إخفاء الشعار' : 'إظهار الشعار'}
            >
              <ImageOff className="h-4 w-4" style={{ color: 'inherit' }} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-9 w-9 rounded-xl transition-colors"
            style={{ color: '#ffffff' }}
            title={isCollapsed ? 'توسيع الشريط' : 'طي الشريط'}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" style={{ color: 'inherit' }} /> : <ChevronRight className="h-4 w-4" style={{ color: 'inherit' }} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleOpen}
            className="h-9 w-9 rounded-xl transition-colors"
            style={{ color: '#ffffff' }}
            title="إخفاء الشريط"
          >
            <PanelRightClose className="h-4 w-4" style={{ color: 'inherit' }} />
          </Button>
        </div>
      </div>

      {/* القائمة - خلفية بيضاء ونص واضح */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 min-h-0"
        style={{
          background: '#EBF4F6',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(8, 131, 149, 0.35) transparent',
        }}
      >
        {filteredMenuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-1">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-1"
                  style={{ color: textOnWhite }}
                >
                  {section.title}
                </motion.h3>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} className="block">
                    <motion.div
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'group sidebar-nav-item flex items-center gap-3 rounded-xl transition-colors py-2.5',
                        isCollapsed ? 'justify-center px-0' : 'px-3',
                        isActive ? 'sidebar-nav-item-active bg-[#09637E] text-white' : 'bg-[#EBF4F6] text-[#09637E] hover:bg-[#09637E] hover:text-white'
                      )}
                      style={{ fontWeight: isActive ? 700 : 600 }}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 text-inherit group-hover:text-white" />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="truncate text-inherit group-hover:text-white"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* تذييل: المستخدم — خلفية بيضاء ونص داكن واضح */}
      <div
        className="sidebar-footer shrink-0 py-3 px-3 mt-auto relative z-10"
        style={{
          borderTop: `2px solid rgba(9, 99, 126, 0.3)`,
          background: '#EBF4F6',
          minHeight: isCollapsed ? '80px' : 'auto',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <Avatar
              src={user?.avatarUrl ? `${window.location.origin}${user.avatarUrl}` : undefined}
              alt={user?.name || ''}
              fallback={user?.name || ''}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate leading-tight" style={{ color: textOnWhite }}>
                {user?.name || 'مستخدم'}
              </p>
              <p className="text-[11px] truncate leading-tight mt-0.5 font-medium" style={{ color: textOnWhite, opacity: 0.85 }}>
                {roleLabel}
              </p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg hover:bg-slate-100"
                title="مظهر الفاتح / الداكن"
                style={{ color: textOnWhite }}
              >
                <ThemeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg hover:bg-red-50"
                title="تسجيل الخروج"
                style={{ color: '#dc2626' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <Avatar
                src={user?.avatarUrl ? `${window.location.origin}${user.avatarUrl}` : undefined}
                alt={user?.name || ''}
                fallback={user?.name || ''}
                size="sm"
                className="flex-shrink-0"
              />
            </div>
            <div className="flex justify-center gap-1 mt-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg hover:bg-slate-100"
                title="مظهر الفاتح / الداكن"
                style={{ color: textOnWhite }}
              >
                <ThemeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg hover:bg-red-50"
                title="تسجيل الخروج"
                style={{ color: '#dc2626' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {isInstallable && !isCollapsed && (
          <button
            type="button"
            onClick={install}
            className="w-full mt-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border-2 transition-colors"
            style={{ color: brandPrimary, borderColor: 'rgba(8, 131, 149, 0.5)' }}
          >
            <span>📱</span>
            تثبيت التطبيق
          </button>
        )}
      </div>
    </motion.aside>
  );
}
