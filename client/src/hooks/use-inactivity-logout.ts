import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // ساعة واحدة

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

/**
 * تسجيل خروج تلقائي بعد ساعة من الخمول.
 * لا يُفعّل عند فتح صفحة TV (أي مسار يبدأ بـ /tv).
 */
export function useInactivityLogout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(logout);
  const navigateRef = useRef(navigate);
  logoutRef.current = logout;
  navigateRef.current = navigate;

  const doLogout = useCallback(() => {
    logoutRef.current();
    navigateRef.current('/login', { replace: true });
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      clearTimer();
      return;
    }
    const path = (location.pathname || '').replace(/\/$/, '') || '/';
    // استثناء شاشة TV فقط (وليست إعدادات TV)
    const isTvDisplayPage = path === '/tv' || /^\/tv-(?:premium|v2|old)$/.test(path);
    if (isTvDisplayPage) {
      clearTimer();
      return;
    }
    resetTimer();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer));
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
      clearTimer();
    };
  }, [token, location.pathname, resetTimer, clearTimer]);
}
