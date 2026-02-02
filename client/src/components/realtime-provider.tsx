import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useEffect } from 'react';

// Provider component to initialize real-time updates globally
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // Initialize real-time updates
  useRealtimeTasks();

  return <>{children}</>;
}
