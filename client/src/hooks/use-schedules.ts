import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useSchedules(active?: boolean) {
  return useQuery({
    queryKey: ['schedules', active],
    queryFn: async () => {
      const params = active !== undefined ? `?active=${active}` : '';
      const response = await api.get(`/schedules${params}`);
      return response.data;
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      templateId: number;
      frequencyType: 'daily' | 'weekly' | 'monthly';
      daysOfWeek?: number[];
      dayOfWeekSingle?: number;
      dayOfMonth?: number;
      dueTime: string;
      graceMinutes?: number;
      defaultAssigneeUserId?: number;
      active?: boolean;
    }) => {
      const response = await api.post('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'نجح',
        description: 'تم إنشاء الجدول بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const response = await api.put(`/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'نجح',
        description: 'تم تحديث الجدول بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/schedules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'نجح',
        description: 'تم حذف الجدول بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSchedule = useUpdateSchedule();

  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await api.put(`/schedules/${id}`, { active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'نجح',
        description: 'تم تحديث حالة الجدول بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });
}
