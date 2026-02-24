import { useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import {
  Banknote,
  PieChartIcon,
  LayoutList,
  Users,
  Calendar,
  Printer,
  FileCheck,
  Building2,
} from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().getMonth() + 1;
const thisYear = new Date().getFullYear();

function getWeekRange(): [string, string] {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

type Period = 'day' | 'week' | 'month' | 'custom';
type TabKey = 'summary' | 'tasks' | 'employees' | 'coverage' | 'settlements' | 'systems';

function num(n: number | undefined | null): string {
  return String(n ?? 0);
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows || rows.length === 0) return;
  const headerSet = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r || {})) headerSet.add(k);
  }
  const headers = Array.from(headerSet);
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface ReportV2 {
  period: string;
  dateFrom: string;
  dateTo: string;
  filters: {
    employeeIds: number[] | null;
    categoryIds: number[] | null;
    templateIds: number[] | null;
    bankNames: string[] | null;
  };
  departmentSummary: {
    executed_total: number;
    scheduled_executed: number;
    ad_hoc_executed: number;
    on_time: number;
    late: number;
    coverage: number;
    avg_duration_minutes: number | null;
    total_duration_minutes: number;
    attendance: {
      employees_present: number;
      total_days: number | null;
    };
  };
  tasks: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    rows: Array<{
      execution_id: number;
      done_at: string | null;
      done_date: string;
      result_status: 'completed' | 'completed_late' | 'skipped' | 'cancelled' | string;
      duration_minutes: number | null;
      user_id: number;
      task_type: 'scheduled' | 'ad_hoc';
      task_id: number;
      assigned_to_user_id: number | null;
      scheduled_date: string | null;
      template_id: number | null;
      template_title: string | null;
      category_id: number | null;
      category_name: string | null;
    }>;
  };
  tasksByCategory: Array<{
    category_id: number;
    category_name: string;
    executed_total: number;
    on_time: number;
    late: number;
  }>;
  tasksByTemplateAndCategory: Array<{
    template_id: number;
    template_title: string;
    category_id: number;
    category_name: string;
    executed_total: number;
    on_time: number;
    late: number;
  }>;
  employees: Array<{
    id: number;
    name: string;
    avatar_url: string | null;
    attendance_days: number;
    executed_total: number;
    scheduled_executed: number;
    ad_hoc_executed: number;
    on_time: number;
    late: number;
    coverage: number;
    avg_duration_minutes: number | null;
    total_duration_minutes: number;
  }>;
  coverage: Array<{
    done_by_user_id: number;
    assigned_to_user_id: number;
    count: number;
  }>;
  settlements: {
    total_settlements: number;
    total_movements: number;
    total_amount: number;
    total_fees: number;
    total_acq: number;
    total_sttle: number;
    byBank: Array<{
      bank_name: string;
      settlement_count: number;
      total_movements: number;
      total_amount: number;
      total_fees: number;
      total_acq: number;
      total_sttle: number;
    }>;
  };
  ctMatching: {
    total: number;
    matched: number;
    notMatched: number;
    records: Array<{
      id: number;
      sttl_date_from: string;
      sttl_date_to: string;
      ct_value: number;
      sum_acq: number;
      sum_fees: number;
      match_status: string | null;
      ct_received_date: string | null;
      user_name: string | null;
    }>;
  };
  merchantDisbursements: {
    count: number;
    total_amount: number;
    rows: Array<{
      id: number;
      merchant_id: string;
      iban: string;
      amount: number;
      transfer_date: string;
      status: string;
      created_at: string | null;
    }>;
  };
  audit: Array<{
    id: number;
    user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    details: any;
    created_at: string | null;
  }>;
}

const CHART_COLORS = ['#026174', '#068294', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0d9488', '#14b8a6', '#2dd4bf'];
const KPI_BG = 'linear-gradient(135deg, #026174 0%, #068294 100%)';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ROW_HEIGHT = 48;
const VIRTUAL_TABLE_MAX_HEIGHT = 400;

function TemplateCategoryTable({
  rows,
  templateSearch,
  onTemplateSearchChange,
  num,
}: {
  rows: { template_title: string; category_name: string; executed_total: number }[];
  templateSearch: string;
  onTemplateSearchChange: (v: string) => void;
  num: (n: number | undefined | null) => string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <motion.div variants={item}>
      <Card className="overflow-hidden shadow-md print:break-inside-avoid">
        <CardHeader className="bg-slate-50/80 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutList className="h-5 w-5 text-[#026174]" />
            المهام حسب القالب والفئة
          </CardTitle>
          <Input
            placeholder="بحث (قالب أو فئة)..."
            value={templateSearch}
            onChange={(e) => onTemplateSearchChange(e.target.value)}
            className="max-w-xs no-print"
          />
        </CardHeader>
        <CardContent className="pt-6">
          {rows.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] bg-slate-100 border-b px-4 py-3 text-sm font-semibold text-slate-700">
                <span>القالب</span>
                <span>الفئة</span>
                <span className="text-left font-mono">المنجزة</span>
              </div>
              <div
                ref={parentRef}
                className="overflow-auto"
                style={{ maxHeight: VIRTUAL_TABLE_MAX_HEIGHT }}
              >
                <div
                  style={{
                    height: totalSize,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualItems.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        className="grid grid-cols-[1fr_1fr_auto] border-b border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 even:bg-slate-50/50 items-center"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          height: ROW_HEIGHT,
                        }}
                      >
                        <span className="font-medium truncate" title={row.template_title}>
                          {row.template_title}
                        </span>
                        <span className="truncate" title={row.category_name}>
                          {row.category_name}
                        </span>
                        <span className="font-mono text-left">{num(row.executed_total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              {templateSearch ? 'لا توجد نتائج للبحث.' : 'لا توجد مهام في الفترة المحددة.'}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ReportsV2() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(thisMonth);
  const [year, setYear] = useState(thisYear);
  const [weekRange] = useState(getWeekRange);
  const [dateFrom, setDateFrom] = useState(weekRange[0]);
  const [dateTo, setDateTo] = useState(weekRange[1]);
  const [employeeSort, setEmployeeSort] = useState<'name' | 'tasks' | 'attendance'>('tasks');
  const [templateSearch, setTemplateSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksLimit, setTasksLimit] = useState(50);

  const params = new URLSearchParams();
  params.set('period', period);
  if (period === 'day') params.set('date', date);
  if (period === 'month') {
    params.set('month', String(month));
    params.set('year', String(year));
  }
  if (period === 'custom' || period === 'week') {
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
  }
  params.set('tasksPage', String(tasksPage));
  params.set('tasksLimit', String(tasksLimit));

  const { data, isLoading, refetch } = useQuery<ReportV2>({
    queryKey: ['report-v2', period, date, month, year, dateFrom, dateTo, tasksPage, tasksLimit],
    queryFn: async () => {
      const res = await api.get(`/reports/v2?${params.toString()}`);
      return res.data;
    },
    enabled: period !== 'custom' && period !== 'week' ? true : !!(dateFrom && dateTo),
    staleTime: 90 * 1000, // 90 ثانية — توافق مع TTL التخزين المؤقت في السيرفر
  });

  const settlementsByBank = useMemo(() => data?.settlements?.byBank ?? [], [data?.settlements?.byBank]);
  const tasksByCategory = useMemo(() => data?.tasksByCategory ?? [], [data?.tasksByCategory]);
  const tasksByTemplateAndCategory = useMemo(() => data?.tasksByTemplateAndCategory ?? [], [data?.tasksByTemplateAndCategory]);
  const employeesRaw = useMemo(() => data?.employees ?? [], [data?.employees]);
  const dept = data?.departmentSummary;

  const totalSettlements = data?.settlements?.total_settlements ?? 0;
  const totalExecutedTasks = dept?.executed_total ?? 0;

  const employees = useMemo(() => {
    const list = [...employeesRaw];
    if (employeeSort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (employeeSort === 'tasks') list.sort((a, b) => b.executed_total - a.executed_total);
    if (employeeSort === 'attendance') list.sort((a, b) => b.attendance_days - a.attendance_days);
    return list;
  }, [employeesRaw, employeeSort]);

  const filteredTemplateCategory = useMemo(() => {
    if (!templateSearch.trim()) return tasksByTemplateAndCategory;
    const q = templateSearch.trim().toLowerCase();
    return tasksByTemplateAndCategory.filter(
      (r) =>
        (r.template_title || '').toLowerCase().includes(q) ||
        (r.category_name || '').toLowerCase().includes(q)
    );
  }, [tasksByTemplateAndCategory, templateSearch]);

  const idToName = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employeesRaw) m.set(e.id, e.name);
    return m;
  }, [employeesRaw]);

  const coverageRows = data?.coverage ?? [];

  const onTimePct = useMemo(() => {
    const total = dept?.executed_total ?? 0;
    if (!total) return 0;
    const ot = dept?.on_time ?? 0;
    return Math.round((ot / total) * 100);
  }, [dept?.executed_total, dept?.on_time]);

  const handlePrint = () => {
    const sp = new URLSearchParams();
    sp.set('period', period);
    if (period === 'day') sp.set('date', date);
    if (period === 'month') {
      sp.set('month', String(month));
      sp.set('year', String(year));
    }
    if (period === 'custom' || period === 'week') {
      if (dateFrom) sp.set('dateFrom', dateFrom);
      if (dateTo) sp.set('dateTo', dateTo);
    }
    // لطباعة ورقية: نستخدم حد أكبر للمهام داخل الصفحة الورقية (بدون scrolling)
    sp.set('tasksPage', '1');
    sp.set('tasksLimit', '200');
    sp.set('autoPrint', '1');
    window.open(`/reports/print?${sp.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleExport = () => {
    if (!data) return;
    const suffix = `${data.dateFrom}_to_${data.dateTo}`;
    if (activeTab === 'summary') {
      downloadCsv(`report_summary_${suffix}.csv`, [
        {
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          executed_total: data.departmentSummary.executed_total,
          scheduled_executed: data.departmentSummary.scheduled_executed,
          ad_hoc_executed: data.departmentSummary.ad_hoc_executed,
          on_time: data.departmentSummary.on_time,
          late: data.departmentSummary.late,
          coverage: data.departmentSummary.coverage,
          avg_duration_minutes: data.departmentSummary.avg_duration_minutes,
          total_duration_minutes: data.departmentSummary.total_duration_minutes,
          total_settlements: data.settlements.total_settlements,
          total_movements: data.settlements.total_movements,
          total_amount: data.settlements.total_amount,
          total_fees: data.settlements.total_fees,
          total_acq: data.settlements.total_acq,
          total_sttle: data.settlements.total_sttle,
        },
      ]);
      return;
    }
    if (activeTab === 'tasks') {
      downloadCsv(`report_tasks_${suffix}_page_${data.tasks.page}.csv`, data.tasks.rows.map((r) => ({
        done_at: r.done_at,
        done_date: r.done_date,
        executor: idToName.get(r.user_id) || r.user_id,
        task_type: r.task_type,
        category: r.category_name,
        template: r.template_title,
        status: r.result_status,
        duration_minutes: r.duration_minutes,
        coverage: r.assigned_to_user_id != null && r.assigned_to_user_id !== r.user_id ? 1 : 0,
      })));
      return;
    }
    if (activeTab === 'employees') {
      downloadCsv(`report_employees_${suffix}.csv`, data.employees.map((e) => ({
        id: e.id,
        name: e.name,
        attendance_days: e.attendance_days,
        executed_total: e.executed_total,
        scheduled_executed: e.scheduled_executed,
        ad_hoc_executed: e.ad_hoc_executed,
        on_time: e.on_time,
        late: e.late,
        coverage: e.coverage,
        avg_duration_minutes: e.avg_duration_minutes,
        total_duration_minutes: e.total_duration_minutes,
      })));
      return;
    }
    if (activeTab === 'coverage') {
      downloadCsv(`report_coverage_${suffix}.csv`, (data.coverage || []).map((r) => ({
        done_by: idToName.get(r.done_by_user_id) || r.done_by_user_id,
        assigned_to: idToName.get(r.assigned_to_user_id) || r.assigned_to_user_id,
        count: r.count,
      })));
      return;
    }
    if (activeTab === 'settlements') {
      downloadCsv(`report_settlements_by_bank_${suffix}.csv`, data.settlements.byBank.map((r) => ({
        bank_name: r.bank_name,
        settlement_count: r.settlement_count,
        total_movements: r.total_movements,
        total_amount: r.total_amount,
        total_fees: r.total_fees,
        total_acq: r.total_acq,
        total_sttle: r.total_sttle,
      })));
      return;
    }
    downloadCsv(`report_systems_audit_${suffix}.csv`, data.audit.map((r) => ({
      created_at: r.created_at,
      user: r.user_id != null ? (idToName.get(r.user_id) || r.user_id) : '',
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      details: JSON.stringify(r.details ?? {}),
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقارير</h1>
          <p className="text-muted-foreground mt-1">
            تقرير شامل لكل ما قام به القسم خلال الفترة (حسب تاريخ التنفيذ)
          </p>
        </div>
        {data && (
          <div className="no-print flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              تصدير CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
        )}
      </div>

      {/* فلتر الفترة */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {(['day', 'week', 'month', 'custom'] as Period[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === 'day' && 'يوم'}
                  {p === 'week' && 'أسبوع'}
                  {p === 'month' && 'شهر'}
                  {p === 'custom' && 'مخصص'}
                </Button>
              ))}
            </div>
            {period === 'day' && (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            )}
            {period === 'month' && (
              <>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || thisYear)}
                  className="w-24"
                />
              </>
            )}
            {(period === 'custom' || period === 'week') && (
              <>
                <Input
                  type="date"
                  placeholder="من"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  placeholder="إلى"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </>
            )}
            <Button
              onClick={() => {
                setTasksPage(1);
                refetch();
              }}
            >
              عرض التقرير
            </Button>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-2">
              من {data.dateFrom} إلى {data.dateTo}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="no-print flex flex-wrap gap-2">
        <Button variant={activeTab === 'summary' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('summary')}>
          ملخص
        </Button>
        <Button variant={activeTab === 'tasks' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('tasks')}>
          المهام
        </Button>
        <Button variant={activeTab === 'employees' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('employees')}>
          الموظفون
        </Button>
        <Button variant={activeTab === 'coverage' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('coverage')}>
          التغطية
        </Button>
        <Button variant={activeTab === 'settlements' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('settlements')}>
          التسويات
        </Button>
        <Button variant={activeTab === 'systems' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('systems')}>
          أنظمة/سجلات
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      ) : data ? (
        <motion.div
          ref={reportRef}
          className="space-y-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* KPI علوي */}
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">مهام منجزة</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(totalExecutedTasks)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">في الوقت</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(dept?.on_time ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">متأخرة</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(dept?.late ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">تغطية</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(dept?.coverage ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">عدد التسويات</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(totalSettlements)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">الموظفون</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(employees.length)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <>
              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5 text-[#026174]" />
                      ملخص القسم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">تقسيم المهام المنجزة</div>
                        <div className="mt-2 flex justify-between">
                          <span>مجدولة</span>
                          <span className="font-mono">{num(dept?.scheduled_executed ?? 0)}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span>إضافية</span>
                          <span className="font-mono">{num(dept?.ad_hoc_executed ?? 0)}</span>
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">نسبة الإنجاز في الوقت</div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">{num(onTimePct)}%</div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full" style={{ width: `${onTimePct}%`, background: 'linear-gradient(90deg, #026174, #068294)' }} />
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">متوسط مدة التنفيذ</div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                          {dept?.avg_duration_minutes != null ? `${num(dept.avg_duration_minutes)} د` : '—'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          إجمالي: {num(dept?.total_duration_minutes ?? 0)} دقيقة
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Settlements by bank (chart + table) */}
              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-[#026174]" />
                      التسويات الحكومية — حسب المصرف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {settlementsByBank.length > 0 ? (
                      <>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={settlementsByBank} layout="vertical" margin={{ left: 140, right: 24 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis type="number" tickFormatter={(v) => num(v)} stroke="#64748b" />
                              <YAxis type="category" dataKey="bank_name" width={130} tick={{ fontSize: 12 }} stroke="#64748b" />
                              <Tooltip formatter={(v: number) => [num(v), 'عدد التسويات']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="settlement_count" name="تسويات" fill="url(#barGradient)" radius={[0, 4, 4, 0]} maxBarSize={32} />
                              <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#026174" />
                                  <stop offset="100%" stopColor="#068294" />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-100 hover:bg-slate-100">
                              <TableHead>المصرف</TableHead>
                              <TableHead className="text-left font-mono">عدد التسويات</TableHead>
                              <TableHead className="text-left font-mono">عدد الحركات</TableHead>
                              <TableHead className="text-left font-mono">مبلغ STTLE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settlementsByBank.map((row, i) => (
                              <TableRow key={i} className="hover:bg-slate-50">
                                <TableCell className="font-medium">{row.bank_name}</TableCell>
                                <TableCell className="font-mono text-left">{num(row.settlement_count)}</TableCell>
                                <TableCell className="font-mono text-left">{num(row.total_movements)}</TableCell>
                                <TableCell className="font-mono text-left">{num(Math.round(row.total_sttle))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center">لا توجد تسويات في الفترة المحددة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tasks by category */}
              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PieChartIcon className="h-5 w-5 text-[#026174]" />
                      المهام — حسب الفئة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {tasksByCategory.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={tasksByCategory}
                                  dataKey="executed_total"
                                  nameKey="category_name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={110}
                                  innerRadius={40}
                                  paddingAngle={2}
                                  label={({ category_name, executed_total }) => `${category_name}: ${num(executed_total)}`}
                                >
                                  {tasksByCategory.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number, _: unknown, props: { payload: { category_name: string } }) => [num(v), props.payload?.category_name ?? 'مهام']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={tasksByCategory} margin={{ top: 12, right: 24, left: 12, bottom: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="category_name" tick={{ fontSize: 11 }} stroke="#64748b" />
                                <YAxis tickFormatter={(v) => num(v)} stroke="#64748b" />
                                <Tooltip formatter={(v: number) => [num(v), 'مهام']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="executed_total" name="مهام" fill="#068294" radius={[4, 4, 0, 0]} maxBarSize={48} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center">لا توجد مهام منفذة في الفترة المحددة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <>
              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutList className="h-5 w-5 text-[#026174]" />
                      كل المهام المنفذة (حسب التنفيذ)
                    </CardTitle>
                    <div className="no-print flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">لكل صفحة</span>
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={tasksLimit}
                        onChange={(e) => {
                          setTasksLimit(parseInt(e.target.value, 10) || 50);
                          setTasksPage(1);
                        }}
                      >
                        {[25, 50, 100, 200].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTasksPage((p) => Math.max(1, p - 1))}
                        disabled={(data.tasks?.page ?? 1) <= 1}
                      >
                        السابق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTasksPage((p) => Math.min(data.tasks.totalPages || 1, p + 1))}
                        disabled={(data.tasks?.page ?? 1) >= (data.tasks?.totalPages ?? 1)}
                      >
                        التالي
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        صفحة {num(data.tasks.page)} / {num(data.tasks.totalPages)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {data.tasks.rows.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-100 hover:bg-slate-100">
                              <TableHead>التاريخ</TableHead>
                              <TableHead>المنفذ</TableHead>
                              <TableHead>النوع</TableHead>
                              <TableHead>الفئة</TableHead>
                              <TableHead>القالب</TableHead>
                              <TableHead className="text-left font-mono">الحالة</TableHead>
                              <TableHead className="text-left font-mono">المدة</TableHead>
                              <TableHead className="text-left font-mono">تغطية</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.tasks.rows.map((r) => {
                              const name = idToName.get(r.user_id) || `#${r.user_id}`;
                              const isCoverage = r.assigned_to_user_id != null && r.assigned_to_user_id !== r.user_id;
                              return (
                                <TableRow key={r.execution_id} className="hover:bg-slate-50">
                                  <TableCell className="font-mono">{r.done_at ?? r.done_date}</TableCell>
                                  <TableCell className="font-medium">{name}</TableCell>
                                  <TableCell>{r.task_type === 'scheduled' ? 'مجدولة' : 'إضافية'}</TableCell>
                                  <TableCell>{r.category_name || 'بدون فئة'}</TableCell>
                                  <TableCell title={r.template_title || ''}>{r.template_title || 'بدون قالب'}</TableCell>
                                  <TableCell className="font-mono text-left">{r.result_status}</TableCell>
                                  <TableCell className="font-mono text-left">{r.duration_minutes != null ? `${num(r.duration_minutes)} د` : '—'}</TableCell>
                                  <TableCell className="font-mono text-left">{isCoverage ? 'نعم' : '—'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center">لا توجد مهام منفذة ضمن الفترة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Template/Category breakdown */}
              <TemplateCategoryTable
                rows={filteredTemplateCategory.map((r) => ({
                  template_title: r.template_title,
                  category_name: r.category_name,
                  executed_total: r.executed_total,
                }))}
                templateSearch={templateSearch}
                onTemplateSearchChange={setTemplateSearch}
                num={num}
              />
            </>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <motion.div variants={item}>
              <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                <CardHeader className="bg-slate-50/80 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-[#026174]" />
                    أداء الموظفين خلال الفترة
                  </CardTitle>
                  <div className="flex gap-2 no-print">
                    <Button variant={employeeSort === 'tasks' ? 'default' : 'outline'} size="sm" onClick={() => setEmployeeSort('tasks')}>
                      حسب المهام
                    </Button>
                    <Button variant={employeeSort === 'attendance' ? 'default' : 'outline'} size="sm" onClick={() => setEmployeeSort('attendance')}>
                      حسب الحضور
                    </Button>
                    <Button variant={employeeSort === 'name' ? 'default' : 'outline'} size="sm" onClick={() => setEmployeeSort('name')}>
                      حسب الاسم
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {employees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      <AnimatePresence mode="popLayout">
                        {employees.map((emp, idx) => {
                          const avatarSrc = emp.avatar_url
                            ? emp.avatar_url.startsWith('http')
                              ? emp.avatar_url
                              : `${window.location.origin}${emp.avatar_url}`
                            : undefined;
                          const empOnTimePct = emp.executed_total > 0 ? Math.round((emp.on_time / emp.executed_total) * 100) : 0;
                          return (
                            <motion.div key={emp.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: idx * 0.02 }}>
                              <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg border-slate-200">
                                <CardContent className="pt-5 pb-5">
                                  <div className="flex flex-col items-center text-center gap-3">
                                    <Avatar src={avatarSrc ?? undefined} alt={emp.name} fallback={emp.name?.slice(0, 1)?.toUpperCase() ?? '?'} size="xl" className="h-20 w-20 ring-2 ring-slate-200" />
                                    <div className="w-full">
                                      <p className="font-semibold text-slate-800">{emp.name}</p>
                                      <div className="mt-2 space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">حضور</span>
                                          <span className="font-mono text-foreground">{num(emp.attendance_days)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">منجزة</span>
                                          <span className="font-mono text-foreground">{num(emp.executed_total)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">مجدولة/إضافية</span>
                                          <span className="font-mono text-foreground">
                                            {num(emp.scheduled_executed)} / {num(emp.ad_hoc_executed)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">في الوقت</span>
                                          <span className="font-mono text-foreground">{num(emp.on_time)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">متأخرة</span>
                                          <span className="font-mono text-foreground">{num(emp.late)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">تغطية</span>
                                          <span className="font-mono text-foreground">{num(emp.coverage)}</span>
                                        </div>
                                      </div>
                                      {emp.executed_total > 0 && (
                                        <div className="mt-3">
                                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>نسبة الإنجاز في الوقت</span>
                                            <span className="font-mono">{num(empOnTimePct)}%</span>
                                          </div>
                                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #026174, #068294)' }} initial={{ width: 0 }} animate={{ width: `${empOnTimePct}%` }} transition={{ duration: 0.6, delay: idx * 0.03 }} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center">لا يوجد موظفون.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Coverage Tab */}
          {activeTab === 'coverage' && (
            <motion.div variants={item}>
              <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                <CardHeader className="bg-slate-50/80 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-[#026174]" />
                    التغطية — من قام بمهام الآخرين
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {coverageRows.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead>المنفذ</TableHead>
                          <TableHead>المكلف</TableHead>
                          <TableHead className="text-left font-mono">العدد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coverageRows.map((r, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="font-medium">{idToName.get(r.done_by_user_id) || `#${r.done_by_user_id}`}</TableCell>
                            <TableCell>{idToName.get(r.assigned_to_user_id) || `#${r.assigned_to_user_id}`}</TableCell>
                            <TableCell className="font-mono text-left">{num(r.count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center">لا توجد تغطية ضمن الفترة.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Settlements Tab */}
          {activeTab === 'settlements' && (
            <motion.div variants={item}>
              <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                <CardHeader className="bg-slate-50/80 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5 text-[#026174]" />
                    التسويات الحكومية — مؤشرات وتحليل
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">التسويات</div>
                      <div className="font-mono text-lg">{num(data.settlements.total_settlements)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">الحركات</div>
                      <div className="font-mono text-lg">{num(data.settlements.total_movements)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-mono text-lg">{num(Math.round(data.settlements.total_amount))}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">Fees</div>
                      <div className="font-mono text-lg">{num(Math.round(data.settlements.total_fees))}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">ACQ</div>
                      <div className="font-mono text-lg">{num(Math.round(data.settlements.total_acq))}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">STTLE</div>
                      <div className="font-mono text-lg">{num(Math.round(data.settlements.total_sttle))}</div>
                    </div>
                  </div>
                  {settlementsByBank.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead>المصرف</TableHead>
                          <TableHead className="text-left font-mono">التسويات</TableHead>
                          <TableHead className="text-left font-mono">الحركات</TableHead>
                          <TableHead className="text-left font-mono">STTLE</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlementsByBank.map((r, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="font-medium">{r.bank_name}</TableCell>
                            <TableCell className="font-mono text-left">{num(r.settlement_count)}</TableCell>
                            <TableCell className="font-mono text-left">{num(r.total_movements)}</TableCell>
                            <TableCell className="font-mono text-left">{num(Math.round(r.total_sttle))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center">لا توجد تسويات ضمن الفترة.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Systems Tab: CT + Disbursements + Audit */}
          {activeTab === 'systems' && (
            <>
              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5 text-[#026174]" />
                      CT Matching
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">الإجمالي</div>
                        <div className="font-mono text-lg">{num(data.ctMatching.total)}</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">مطابقة</div>
                        <div className="font-mono text-lg">{num(data.ctMatching.matched)}</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">غير مطابقة</div>
                        <div className="font-mono text-lg">{num(data.ctMatching.notMatched)}</div>
                      </div>
                    </div>
                    {data.ctMatching.records.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead>الفترة</TableHead>
                            <TableHead className="text-left font-mono">CT</TableHead>
                            <TableHead className="text-left font-mono">ACQ</TableHead>
                            <TableHead className="text-left font-mono">Fees</TableHead>
                            <TableHead>الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.ctMatching.records.map((r) => (
                            <TableRow key={r.id} className="hover:bg-slate-50">
                              <TableCell className="font-mono">{r.sttl_date_from} → {r.sttl_date_to}</TableCell>
                              <TableCell className="font-mono text-left">{num(Math.round(r.ct_value))}</TableCell>
                              <TableCell className="font-mono text-left">{num(Math.round(r.sum_acq))}</TableCell>
                              <TableCell className="font-mono text-left">{num(Math.round(r.sum_fees))}</TableCell>
                              <TableCell>{r.match_status || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground py-6 text-center">لا توجد سجلات CT ضمن الفترة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-[#026174]" />
                      صرف مستحقات التجار
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">عدد عمليات الصرف</div>
                        <div className="font-mono text-lg">{num(data.merchantDisbursements.count)}</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">الإجمالي</div>
                        <div className="font-mono text-lg">{num(Math.round(data.merchantDisbursements.total_amount))}</div>
                      </div>
                    </div>
                    {data.merchantDisbursements.rows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead>التاريخ</TableHead>
                            <TableHead>التاجر</TableHead>
                            <TableHead className="text-left font-mono">المبلغ</TableHead>
                            <TableHead>الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.merchantDisbursements.rows.map((r) => (
                            <TableRow key={r.id} className="hover:bg-slate-50">
                              <TableCell className="font-mono">{r.transfer_date}</TableCell>
                              <TableCell className="font-mono">{r.merchant_id}</TableCell>
                              <TableCell className="font-mono text-left">{num(Math.round(r.amount))}</TableCell>
                              <TableCell>{r.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground py-6 text-center">لا توجد عمليات صرف ضمن الفترة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card className="overflow-hidden shadow-md print:break-inside-avoid">
                  <CardHeader className="bg-slate-50/80 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutList className="h-5 w-5 text-[#026174]" />
                      سجل التدقيق (الأحدث)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {data.audit.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead>الوقت</TableHead>
                            <TableHead>المستخدم</TableHead>
                            <TableHead>الإجراء</TableHead>
                            <TableHead>الكيان</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.audit.map((r) => (
                            <TableRow key={r.id} className="hover:bg-slate-50">
                              <TableCell className="font-mono">{r.created_at || '—'}</TableCell>
                              <TableCell>{r.user_id != null ? (idToName.get(r.user_id) || `#${r.user_id}`) : '—'}</TableCell>
                              <TableCell className="font-mono">{r.action}</TableCell>
                              <TableCell className="font-mono">
                                {r.entity_type || '—'}{r.entity_id != null ? `#${r.entity_id}` : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground py-6 text-center">لا توجد أحداث تدقيق ضمن الفترة.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>اختر الفترة واضغط «عرض التقرير» لعرض التقرير.</p>
            <p className="text-sm mt-1">في وضع أسبوع أو مخصص أدخل تاريخ من وإلى.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
