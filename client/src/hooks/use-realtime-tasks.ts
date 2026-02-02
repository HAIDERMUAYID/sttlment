import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';
import { useToast } from './use-toast';
import { useAuthStore } from '@/store/useAuthStore';

export function useRealtimeTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Get WebSocket URL from environment or use default
  // Support CRA (process.env)
  const wsUrl =
    process.env.REACT_APP_WS_URL ||
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.hostname + ':5001';
  
  const { isConnected, on } = useWebSocket(wsUrl);

  useEffect(() => {
    if (!isConnected) return;

    // Handle task updates
    const unsubscribeTaskUpdate = on('task_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] });
      
      if (data.userId !== user?.id) {
        toast({
          title: 'تحديث',
          description: data.message || 'تم تحديث مهمة',
        });
      }
    });

    // Handle task execution
    const unsubscribeTaskExecute = on('task_executed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] });
      
      if (data.userId !== user?.id) {
        toast({
          title: 'تنفيذ مهمة',
          description: `${data.userName} قام بتنفيذ مهمة`,
        });
      }
    });

    // Handle new task creation
    const unsubscribeTaskCreate = on('task_created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] });
      
      if (data.userId !== user?.id) {
        toast({
          title: 'مهمة جديدة',
          description: `${data.userName} أنشأ مهمة جديدة`,
        });
      }
    });

    // Handle schedule updates
    const unsubscribeScheduleUpdate = on('schedule_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    });

    return () => {
      unsubscribeTaskUpdate();
      unsubscribeTaskExecute();
      unsubscribeTaskCreate();
      unsubscribeScheduleUpdate();
    };
  }, [isConnected, on, queryClient, toast, user]);

  return { isConnected };
}
