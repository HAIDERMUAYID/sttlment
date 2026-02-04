import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/hooks/use-toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000,
});

let lastNetworkErrorToast = 0;
const NETWORK_ERROR_DEBOUNCE_MS = 10000;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — تخفيف تعدد رسائل "فشل جلب البيانات" عند مشاكل الشبكة (مثل استيقاظ الخادم)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error');
    if (isNetworkError && Date.now() - lastNetworkErrorToast > NETWORK_ERROR_DEBOUNCE_MS) {
      lastNetworkErrorToast = Date.now();
      toast({
        title: 'مشكلة في الاتصال',
        description: 'لم يتم الوصول إلى الخادم. إن كانت الخدمة تستيقظ، انتظر نصف دقيقة ثم حدّث الصفحة.',
        variant: 'destructive',
      });
    }
    return Promise.reject(error);
  }
);

export default api;
