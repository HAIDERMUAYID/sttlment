import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ToastProvider } from '@/components/ui/toast';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ErrorBoundary } from '@/hooks/use-error-boundary';
import { RealtimeProvider } from '@/components/realtime-provider';
import { useEffect } from 'react';
import api from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();
  const { token, updateUser } = useAuthStore();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    if (token && localStorage.getItem('token')) {
      api.get('/auth/verify')
        .then((res) => {
          const u = res.data?.user;
          if (u) updateUser(u);
        })
        .catch(() => {});
    }
  }, [token, updateUser]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RealtimeProvider>
            {children}
            <Toaster />
          </RealtimeProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
