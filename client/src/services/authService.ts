import api from '@/lib/api';
import { useAuthStore, type User } from '@/store/useAuthStore';

export type { User };

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const { user, token } = response.data;
  useAuthStore.getState().setAuth(user, token);
  return { user, token };
}

export function logout() {
  useAuthStore.getState().logout();
}

export function getCurrentUser(): User | null {
  return useAuthStore.getState().user;
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}
