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

function num(n: number | undefined | null): string {
  return String(n ?? 0);
}

interface ReportFull {
  period: string;
  dateFrom: string;
  dateTo: string;
  settlementsByBank: { bank_name: string; settlement_count: number }[];
  tasksByCategory: { category_name: string; task_count: number }[];
  tasksByTemplateAndCategory: { template_title: string; category_name: string; task_count: number }[];
  employees: {
    id: number;
    name: string;
    avatar_url: string | null;
    attendance_days: number;
    tasks_done: number;
    on_time: number;
    late: number;
  }[];
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
  rows: { template_title: string; category_name: string; task_count: number }[];
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
                <span className="text-left font-mono">عدد المهام</span>
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
                        <span className="font-mono text-left">{num(row.task_count)}</span>
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

  const { data, isLoading, refetch } = useQuery<ReportFull>({
    queryKey: ['report-full', period, date, month, year, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get(`/reports/full?${params.toString()}`);
      return res.data;
    },
    enabled: period !== 'custom' && period !== 'week' ? true : !!(dateFrom && dateTo),
    staleTime: 90 * 1000, // 90 ثانية — توافق مع TTL التخزين المؤقت في السيرفر
  });

  const settlementsByBank = data?.settlementsByBank ?? [];
  const tasksByCategory = data?.tasksByCategory ?? [];
  const tasksByTemplateAndCategory = data?.tasksByTemplateAndCategory ?? [];
  const employeesRaw = data?.employees ?? [];

  const totalSettlements = settlementsByBank.reduce((s, r) => s + r.settlement_count, 0);
  const totalTasks = tasksByCategory.reduce((s, r) => s + r.task_count, 0);

  const employees = useMemo(() => {
    const list = [...employeesRaw];
    if (employeeSort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (employeeSort === 'tasks') list.sort((a, b) => b.tasks_done - a.tasks_done);
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

  const handlePrint = () => {
    if (!reportRef.current) {
      window.print();
      return;
    }
    const prev = document.body.innerHTML;
    const content = reportRef.current.cloneNode(true) as HTMLElement;
    content.classList.add('report-print-root');
    const printWin = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html><html dir="rtl"><head>
        <meta charset="utf-8"><title>التقرير</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-print-root { max-width: 100%; }
          .report-print-root .no-print { display: none !important; }
          .report-print-root table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          .report-print-root th, .report-print-root td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: right; }
          .report-print-root th { background: #026174; color: #fff; font-weight: 600; }
          .report-print-root tr:nth-child(even) { background: #f8fafc; }
          .report-print-root .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .report-print-root .kpi-card { background: linear-gradient(135deg, #026174, #068294); color: #fff; padding: 16px; border-radius: 12px; text-align: center; }
          .report-print-root .kpi-card .value { font-size: 1.5rem; font-weight: 700; }
          .report-print-root h1 { font-size: 1.5rem; margin-bottom: 8px; }
          .report-print-root h2 { font-size: 1.1rem; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #068294; }
          .report-print-root .chart-placeholder { height: 200px; background: #f1f5f9; border-radius: 8px; margin: 12px 0; display: flex; align-items: center; justify-content: center; color: #64748b; }
          .report-print-root .employee-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .report-print-root .employee-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
          .report-print-root .employee-card img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; }
        </style>
      </head><body>${content.outerHTML}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقرير</h1>
          <p className="text-muted-foreground mt-1">
            محصلات حسب المصرف، مهام حسب الفئة والقالب، توزيع الموظفين
          </p>
        </div>
        {data && (
          <Button variant="outline" size="sm" className="no-print gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
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
            <Button onClick={() => refetch()}>عرض التقرير</Button>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-2">
              من {data.dateFrom} إلى {data.dateTo}
            </p>
          )}
        </CardContent>
      </Card>

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
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">إجمالي التسويات</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(totalSettlements)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">إجمالي المهام</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(totalTasks)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">المصارف</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(settlementsByBank.length)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg" style={{ background: KPI_BG }}>
              <CardContent className="pt-4 pb-4 text-white">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 opacity-90" />
                  <span className="text-sm font-medium opacity-90">الموظفون</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(employees.length)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* 1. المحصلات */}
          <motion.div variants={item}>
            <Card className="overflow-hidden shadow-md print:break-inside-avoid">
              <CardHeader className="bg-slate-50/80 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5 text-[#026174]" />
                  المحصلات — التسويات حسب المصرف
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {settlementsByBank.length > 0 ? (
                  <>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={settlementsByBank}
                          layout="vertical"
                          margin={{ left: 140, right: 24 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tickFormatter={(v) => num(v)} stroke="#64748b" />
                          <YAxis
                            type="category"
                            dataKey="bank_name"
                            width={130}
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <Tooltip
                            formatter={(v: number) => [num(v), 'عدد التسويات']}
                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Bar
                            dataKey="settlement_count"
                            name="تسويات"
                            fill="url(#barGradient)"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={32}
                          />
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlementsByBank.map((row, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="font-medium">{row.bank_name}</TableCell>
                            <TableCell className="font-mono text-left">{num(row.settlement_count)}</TableCell>
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

          {/* 2. المهام حسب الفئة */}
          <motion.div variants={item}>
            <Card className="overflow-hidden shadow-md print:break-inside-avoid">
              <CardHeader className="bg-slate-50/80 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="h-5 w-5 text-[#026174]" />
                  المهام حسب الفئة
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
                              dataKey="task_count"
                              nameKey="category_name"
                              cx="50%"
                              cy="50%"
                              outerRadius={110}
                              innerRadius={40}
                              paddingAngle={2}
                              label={({ category_name, task_count }) =>
                                `${category_name}: ${num(task_count)}`
                              }
                            >
                              {tasksByCategory.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number, _: unknown, props: { payload: { category_name: string } }) => [
                                num(v),
                                props.payload?.category_name ?? 'مهام',
                              ]}
                              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
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
                            <Tooltip
                              formatter={(v: number) => [num(v), 'مهام']}
                              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                            <Bar
                              dataKey="task_count"
                              name="مهام"
                              fill="#068294"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={48}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead>الفئة</TableHead>
                          <TableHead className="text-left font-mono">عدد المهام</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasksByCategory.map((row, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="font-medium">{row.category_name}</TableCell>
                            <TableCell className="font-mono text-left">{num(row.task_count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-muted-foreground py-8 text-center">لا توجد مهام في الفترة المحددة.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 3. المهام حسب القالب والفئة — جدول افتراضي عند كثرة الصفوف */}
          <TemplateCategoryTable
            rows={filteredTemplateCategory}
            templateSearch={templateSearch}
            onTemplateSearchChange={setTemplateSearch}
            num={num}
          />

          {/* 4. توزيع الموظفين */}
          <motion.div variants={item}>
            <Card className="overflow-hidden shadow-md print:break-inside-avoid">
              <CardHeader className="bg-slate-50/80 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-[#026174]" />
                  توزيع الموظفين
                </CardTitle>
                <div className="flex gap-2 no-print">
                  <Button
                    variant={employeeSort === 'tasks' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEmployeeSort('tasks')}
                  >
                    حسب المهام
                  </Button>
                  <Button
                    variant={employeeSort === 'attendance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEmployeeSort('attendance')}
                  >
                    حسب الحضور
                  </Button>
                  <Button
                    variant={employeeSort === 'name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEmployeeSort('name')}
                  >
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
                        const onTimePct =
                          emp.tasks_done > 0
                            ? Math.round((emp.on_time / emp.tasks_done) * 100)
                            : 0;
                        return (
                          <motion.div
                            key={emp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: idx * 0.02 }}
                          >
                            <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg border-slate-200">
                              <CardContent className="pt-5 pb-5">
                                <div className="flex flex-col items-center text-center gap-3">
                                  <Avatar
                                    src={avatarSrc ?? undefined}
                                    alt={emp.name}
                                    fallback={emp.name?.slice(0, 1)?.toUpperCase() ?? '?'}
                                    size="xl"
                                    className="h-20 w-20 ring-2 ring-slate-200"
                                  />
                                  <div className="w-full">
                                    <p className="font-semibold text-slate-800">{emp.name}</p>
                                    <div className="mt-2 space-y-1.5 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">أيام الحضور</span>
                                        <span className="font-mono text-foreground">{num(emp.attendance_days)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">مهام منجزة</span>
                                        <span className="font-mono text-foreground">{num(emp.tasks_done)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">في الوقت</span>
                                        <span className="font-mono text-foreground">{num(emp.on_time)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">متأخرة</span>
                                        <span className="font-mono text-foreground">{num(emp.late)}</span>
                                      </div>
                                    </div>
                                    {emp.tasks_done > 0 && (
                                      <div className="mt-3">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                          <span>نسبة الإنجاز في الوقت</span>
                                          <span className="font-mono">{num(onTimePct)}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                          <motion.div
                                            className="h-full rounded-full"
                                            style={{ background: 'linear-gradient(90deg, #026174, #068294)' }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${onTimePct}%` }}
                                            transition={{ duration: 0.6, delay: idx * 0.03 }}
                                          />
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
