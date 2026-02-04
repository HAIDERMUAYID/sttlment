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
    if (!token || !localStorage.getItem('token')) return;
    let cancelled = false;
    const verify = (attempt = 0) => {
      api.get('/auth/verify')
        .then((res) => {
          if (cancelled) return;
          const u = res.data?.user;
          if (u) updateUser(u);
        })
        .catch((err) => {
          if (cancelled) return;
          const isNetwork = !err?.response;
          if (isNetwork && attempt < 2) setTimeout(() => verify(attempt + 1), 4000);
        });
    };
    verify();
    return () => { cancelled = true; };
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
