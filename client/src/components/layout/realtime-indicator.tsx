import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeIndicator() {
  const { isConnected } = useRealtimeTasks();

  if (!isConnected) {
    return (
      <div
        className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border"
        style={{ color: '#64748b', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.06)' }}
      >
        <WifiOff className="h-4 w-4" style={{ color: '#ef4444' }} />
        <span>غير متصل</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border"
      style={{ color: '#026174', borderColor: 'rgba(2, 97, 116, 0.25)', background: 'rgba(255, 255, 255, 0.9)' }}
    >
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
      <Wifi className="h-4 w-4" style={{ color: '#22c55e' }} />
      <span>متصل</span>
    </div>
  );
}
