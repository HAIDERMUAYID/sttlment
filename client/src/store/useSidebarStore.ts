import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SIDEBAR_STORAGE = 'sidebar-prefs';

type SidebarState = {
  isOpen: boolean;
  isCollapsed: boolean;
  showLogo: boolean;
  toggleOpen: () => void;
  toggleCollapsed: () => void;
  setShowLogo: (show: boolean) => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      isCollapsed: false,
      showLogo: true,
      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
      toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
      setShowLogo: (show) => set({ showLogo: show }),
    }),
    { name: SIDEBAR_STORAGE }
  )
);

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
