import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      actualTheme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme });
        const root = window.document.documentElement;
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.classList.remove('light', 'dark');
          root.classList.add(systemTheme);
          set({ actualTheme: systemTheme });
        } else {
          root.classList.remove('light', 'dark');
          root.classList.add(theme);
          set({ actualTheme: theme });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  store.setTheme(store.theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (store.theme === 'system') {
      store.setTheme('system');
    }
  });
}
