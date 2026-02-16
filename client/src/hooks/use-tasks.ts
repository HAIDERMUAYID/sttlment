import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTasksStore } from '@/store/useTasksStore';

export function useDailyTasks(filters?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  view?: string;
  assignedTo?: string;
}) {
  const queryClient = useQueryClient();
  const { setDailyTasks } = useTasksStore();

  const query = useQuery({
    queryKey: ['daily-tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);
      if (filters?.view) params.append('view', filters.view);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);

      const response = await api.get(`/tasks/daily?${params.toString()}`);
      const tasks = response.data.map((task: any) => ({
        ...task,
        type: 'daily' as const,
      }));
      setDailyTasks(tasks);
      return tasks;
    },
  });

  return query;
}

export function useAdHocTasks(filters?: {
  dateFrom?: string;
  dateTo?: string;
  filterByExecutionDate?: string;
  view?: string;
  assignedTo?: string;
}) {
  const queryClient = useQueryClient();
  const { setAdHocTasks } = useTasksStore();

  const query = useQuery({
    queryKey: ['ad-hoc-tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);
      if (filters?.filterByExecutionDate) params.append('filterByExecutionDate', filters.filterByExecutionDate);
      if (filters?.view) params.append('view', filters.view);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);

      const response = await api.get(`/tasks/ad-hoc?${params.toString()}`);
      const tasks = response.data.map((task: any) => ({
        ...task,
        type: 'ad-hoc' as const,
      }));
      setAdHocTasks(tasks);
      return tasks;
    },
  });

  return query;
}

export function useExecuteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      dailyTaskId?: number;
      adHocTaskId?: number;
      resultStatus: string;
      notes?: string;
      durationMinutes?: number;
      settlement_date?: string;
      settlement_value?: string | number;
    }) => {
      const response = await api.post('/tasks/execute', data);
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] });
      if (data?.verification_status === 'matched') {
        toast({
          title: 'تسوية مطابقة',
          description: 'تم التحقق من قيمة التسوية مع صفحة التسويات الحكومية بنجاح.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'نجح',
          description: 'تم تسجيل تنفيذ المهمة بنجاح',
          variant: 'success',
        });
      }
    },
    onError: (error: any) => {
      const code = error.response?.data?.code;
      if (code === 'SETTLEMENT_MISMATCH') return;
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || error.message || 'حدث خطأ',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateAdHocTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      templateId?: number;
      categoryId?: number;
      title: string;
      description?: string;
      beneficiary?: string;
    }) => {
      const response = await api.post('/tasks/ad-hoc', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-hoc-tasks'] });
      toast({
        title: 'نجح',
        description: 'تم إنشاء المهمة الخاصة بنجاح',
        variant: 'success',
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

export function useGenerateDailyTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/tasks/generate-daily');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      toast({
        title: 'نجح',
        description: data.message || 'تم توليد المهام بنجاح',
        variant: 'success',
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
