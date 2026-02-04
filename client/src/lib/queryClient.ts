import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // إعادة المحاولة عند فشل الشبكة (الخدمة تستيقظ) — حتى 3 مرات
        const isNetworkError = !error?.response && (error?.code === 'ECONNABORTED' || error?.message === 'Network Error');
        if (isNetworkError && failureCount < 3) return true;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * (attemptIndex + 1), 8000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});
