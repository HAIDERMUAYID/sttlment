import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './sidebar';
import { RealtimeIndicator } from './realtime-indicator';
import { useSidebarStore, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/store/useSidebarStore';
import { useInactivityLogout } from '@/hooks/use-inactivity-logout';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function MainLayout() {
  const location = useLocation();
  const { isOpen, isCollapsed } = useSidebarStore();
  useInactivityLogout(); // خروج تلقائي بعد ساعة خمول (صفحة TV مستثناة)
  const mainMarginRight = !isOpen ? 0 : isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="flex h-screen" style={{ background: '#EBF4F6' }}>
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginRight: mainMarginRight }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 overflow-y-auto flex flex-col"
        style={{ background: 'transparent' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="flex-1 p-6 min-h-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>

        <div className="fixed bottom-4 left-4 z-40">
          <RealtimeIndicator />
        </div>
      </motion.main>
    </div>
  );
}
