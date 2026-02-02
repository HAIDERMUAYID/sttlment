import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PermissionsMap = Record<string, Record<string, boolean>> | null;

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'employee' | 'accountant' | 'viewer';
  can_create_ad_hoc?: boolean;
  can_manage_merchants?: boolean;
  canManageMerchants?: boolean;
  avatarUrl?: string;
  permissions?: PermissionsMap;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true, isLoading: false });
        // Store token in localStorage for API calls
        localStorage.setItem('token', token);
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        localStorage.removeItem('token');
      },
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
