import { create } from 'zustand';

interface Task {
  id: number;
  type: 'daily' | 'ad-hoc';
  title: string;
  template_title?: string;
  category_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled' | 'skipped';
  task_date?: string;
  due_date_time?: string;
  beneficiary?: string;
  assigned_to_user_id?: number;
}

interface TasksState {
  dailyTasks: Task[];
  adHocTasks: Task[];
  setDailyTasks: (tasks: Task[]) => void;
  setAdHocTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  removeTask: (id: number, type: 'daily' | 'ad-hoc') => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  dailyTasks: [],
  adHocTasks: [],
  setDailyTasks: (tasks) => set({ dailyTasks: tasks }),
  setAdHocTasks: (tasks) => set({ adHocTasks: tasks }),
  addTask: (task) =>
    set((state) => {
      if (task.type === 'daily') {
        return { dailyTasks: [...state.dailyTasks, task] };
      }
      return { adHocTasks: [...state.adHocTasks, task] };
    }),
  updateTask: (id, updates) =>
    set((state) => ({
      dailyTasks: state.dailyTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
      adHocTasks: state.adHocTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  removeTask: (id, type) =>
    set((state) => {
      if (type === 'daily') {
        return { dailyTasks: state.dailyTasks.filter((t) => t.id !== id) };
      }
      return { adHocTasks: state.adHocTasks.filter((t) => t.id !== id) };
    }),
}));
