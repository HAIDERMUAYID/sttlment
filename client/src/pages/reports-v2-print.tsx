import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { CompanyLogo } from '@/components/CompanyLogo';
import {
  Calendar,
  FileCheck,
  Printer,
  ArrowRight,
  LayoutList,
  Users,
  Banknote,
  Building2,
} from 'lucide-react';

type Period = 'day' | 'week' | 'month' | 'custom';

function num(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '0';
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function numIqd(n: number | undefined | null): string {
  return `${num(n)} IQD`;
}

const CHART_COLORS = [
  '#026174',
  '#068294',
  '#0ea5e9',
  '#38bdf8',
  '#7dd3fc',
  '#0d9488',
  '#14b8a6',
  '#2dd4bf',
];

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
    avg_delay_late_minutes: number | null;
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
      result_status: string;
      duration_minutes: number | null;
      user_id: number;
      task_type: 'scheduled' | 'ad_hoc';
      assigned_to_user_id: number | null;
      template_title: string | null;
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
    avg_attendance_time: string | null;
    executed_total: number;
    scheduled_executed: number;
    ad_hoc_executed: number;
    on_time: number;
    late: number;
    coverage: number;
    avg_duration_minutes: number | null;
    avg_delay_late_minutes: number | null;
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
    }>;
  };
  merchantDisbursements: {
    count: number;
    total_amount: number;
    rows: Array<{
      id: number;
      merchant_id: string;
      amount: number;
      transfer_date: string;
      status: string;
    }>;
  };
  audit: Array<{
    id: number;
    user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    created_at: string | null;
  }>;
}

function formatPeriodLabel(period: Period | string): string {
  if (period === 'day') return 'يوم';
  if (period === 'week') return 'أسبوع';
  if (period === 'month') return 'شهر';
  if (period === 'custom') return 'مخصص';
  return String(period || '—');
}

export function ReportsV2Print() {
  const location = useLocation();

  const { apiParams, period, autoPrint } = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const p = (sp.get('period') as Period) || 'month';
    const ap = new URLSearchParams(sp.toString());
    ap.delete('autoPrint');
    ap.delete('preview');
    if (!ap.get('tasksPage')) ap.set('tasksPage', '1');
    if (!ap.get('tasksLimit')) ap.set('tasksLimit', '200');
    return {
      apiParams: ap,
      period: p,
      autoPrint: sp.get('autoPrint') === '1',
    };
  }, [location.search]);

  const { data, isLoading } = useQuery<ReportV2>({
    queryKey: ['report-v2-print', apiParams.toString()],
    queryFn: async () => {
      const res = await api.get(`/reports/v2?${apiParams.toString()}`);
      return res.data;
    },
    enabled:
      period !== 'custom' && period !== 'week'
        ? true
        : !!(apiParams.get('dateFrom') && apiParams.get('dateTo')),
    staleTime: 90 * 1000,
  });

  const dept = data?.departmentSummary;
  const settlementsByBank = data?.settlements?.byBank ?? [];
  const tasksByCategory = data?.tasksByCategory ?? [];
  const templateCategory = data?.tasksByTemplateAndCategory ?? [];
  const employees = useMemo(() => data?.employees ?? [], [data?.employees]);
  const coverageRows = data?.coverage ?? [];
  const idToName = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const onTimePct = useMemo(() => {
    const total = dept?.executed_total ?? 0;
    if (!total) return 0;
    return Math.round(((dept?.on_time ?? 0) / total) * 100);
  }, [dept?.executed_total, dept?.on_time]);

  const generatedAt = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  useEffect(() => {
    if (!autoPrint) return;
    if (!data) return;
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [autoPrint, data]);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white report-print-root" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4; margin: 6mm 2mm; }
          .report-print-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-print-root .print-content-area { padding-left: 2mm !important; padding-right: 2mm !important; }
          .report-print-root section { page-break-inside: avoid; }
          .report-print-root table thead { display: table-header-group; }
          .report-print-root table tbody tr { page-break-inside: avoid; }
          .report-print-root .print-keep-together { page-break-inside: avoid; }
          .report-print-root [class*="Card"] { page-break-inside: avoid; }
          .report-print-root .recharts-wrapper,
          .report-print-root .recharts-surface,
          .report-print-root .recharts-wrapper svg { visibility: visible !important; opacity: 1 !important; }
          .report-print-root .recharts-wrapper { min-height: 200px !important; height: 280px !important; }
          .report-print-root .print-chart-box { min-height: 200px !important; height: 280px !important; overflow: visible !important; }
        }
      `}</style>
      <div className="no-print sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.print()}
              disabled={isLoading || !data}
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Link to="/reports">
              <Button variant="ghost" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                رجوع للتقارير
              </Button>
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">
            {data ? `من ${data.dateFrom} إلى ${data.dateTo}` : '—'}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 print:px-0 print:py-0">
        {/* Paper container — عند الطباعة: ظلال مخففة وتقسيم واضح */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:overflow-visible print:border print:border-slate-200">
          {/* الصفحة الأولى — تصميم بألوان النظام */}
          <div
            className="print-content-area print:py-6"
            style={{
              background: 'linear-gradient(180deg, #026174 0%, #068294 28%, #EBF4F6 28%, #F6FAFB 100%)',
              borderBottom: '3px solid #068294',
            }}
          >
            <div className="px-6 py-8">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/95 p-2 shadow-md print:shadow-none ring-2 ring-white/80">
                    <CompanyLogo size="lg" animated={false} showRing={false} />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-sm" style={{ color: '#fff' }}>
                      تقرير القسم (ورقي)
                    </h1>
                    <p className="text-sm mt-1 text-white/95">
                      تقرير شامل حسب تاريخ التنفيذ — من {data?.dateFrom ?? '—'} إلى {data?.dateTo ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'الفترة', value: formatPeriodLabel(period), icon: Calendar, color: '#026174' },
                  { label: 'تاريخ الإصدار', value: generatedAt, icon: null, color: '#068294' },
                  { label: 'المنجزة', value: num(dept?.executed_total ?? 0), icon: null, color: '#068294' },
                  { label: 'التسويات', value: num(data?.settlements?.total_settlements ?? 0), icon: null, color: '#068294' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white border-l-4 p-3 shadow-sm print:shadow-none"
                    style={{ borderLeftColor: item.color }}
                  >
                    <div className="text-xs font-medium text-slate-500">{item.label}</div>
                    <div className="font-semibold text-slate-900 mt-1 flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />}
                      <span className="font-mono">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-white/95 p-4 shadow-sm print:shadow-none border border-slate-200/80 max-w-sm">
                <div className="text-xs font-semibold text-[#026174] mb-2">مختصر</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">في الوقت</span>
                    <span className="font-mono font-semibold text-[#026174]">{num(dept?.on_time ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">متأخرة</span>
                    <span className="font-mono font-semibold">{num(dept?.late ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">تغطية</span>
                    <span className="font-mono font-semibold">{num(dept?.coverage ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">الموظفون</span>
                    <span className="font-mono font-semibold">{num(employees.length)}</span>
                  </div>
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="px-6 mt-4 text-sm text-slate-600">جاري تجهيز التقرير للطباعة…</div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-8 print-content-area print:py-6 space-y-8">
            {!data ? (
              <div className="rounded-2xl border bg-slate-50 p-8 text-center text-muted-foreground">
                لا توجد بيانات لعرضها. تأكد من تحديد الفترة بشكل صحيح.
              </div>
            ) : (
              <>
                {/* KPI summary — عناوين موحدة + بطاقات KPI بحد ملون */}
                <section className="print:break-inside-avoid">
                  <div className="flex items-center gap-2 mb-4 border-r-4 border-[#026174] pr-3">
                    <FileCheck className="h-5 w-5 text-[#026174]" />
                    <h2 className="text-lg font-bold text-slate-800">ملخص سريع</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { label: 'مهام منجزة', value: num(dept?.executed_total ?? 0), color: '#026174' },
                      { label: 'في الوقت', value: num(dept?.on_time ?? 0), color: '#068294' },
                      { label: 'متأخرة', value: num(dept?.late ?? 0), color: '#068294' },
                      { label: 'نسبة في الوقت', value: `${num(onTimePct)}%`, color: '#068294' },
                      { label: 'تغطية', value: num(dept?.coverage ?? 0), color: '#068294' },
                      { label: 'متوسط المدة', value: dept?.avg_duration_minutes != null ? `${num(dept.avg_duration_minutes)} د` : '—', color: '#068294' },
                      { label: 'متوسط التأخير (للمتأخرة)', value: dept?.avg_delay_late_minutes != null ? `${num(dept.avg_delay_late_minutes)} د` : '—', color: '#068294' },
                    ].map((kpi, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 border-l-4 p-3 bg-white" style={{ borderLeftColor: kpi.color }}>
                        <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                        <div className="font-mono text-lg font-semibold text-slate-900 mt-1">{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="page-break" />

                {/* Settlements — عنوان قسم موحد */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none border border-slate-200">
                    <CardHeader className="border-b border-slate-200 py-4">
                      <CardTitle className="flex items-center gap-2 text-lg border-r-4 border-[#026174] pr-3">
                        <Banknote className="h-5 w-5 text-[#026174]" />
                        <span className="text-slate-800">التسويات الحكومية — حسب المصرف</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      {settlementsByBank.length > 0 ? (
                        <>
                          <div className="h-[320px] print:h-[280px] print-chart-box">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={settlementsByBank}
                                layout="vertical"
                                margin={{ left: 150, right: 24, top: 8, bottom: 8 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  type="number"
                                  tickFormatter={(v) => num(v)}
                                  stroke="#64748b"
                                />
                                <YAxis
                                  type="category"
                                  dataKey="bank_name"
                                  width={140}
                                  tick={{ fontSize: 12 }}
                                  stroke="#64748b"
                                />
                                <Tooltip
                                  formatter={(v: number) => [num(v), 'عدد التسويات']}
                                  contentStyle={{
                                    borderRadius: 10,
                                    border: '1px solid #e2e8f0',
                                  }}
                                />
                                <Bar
                                  dataKey="settlement_count"
                                  name="تسويات"
                                  fill="#068294"
                                  radius={[0, 5, 5, 0]}
                                  maxBarSize={30}
                                  isAnimationActive={false}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[#026174] hover:bg-[#026174]">
                                  <TableHead className="text-white font-semibold">المصرف</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">عدد التسويات</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">عدد الحركات</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">STTLE</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {settlementsByBank.map((row, i) => (
                                  <TableRow key={i} className={i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                    <TableCell className="font-medium">{row.bank_name}</TableCell>
                                    <TableCell className="font-mono text-left">
                                      {num(row.settlement_count)}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">
                                      {num(row.total_movements)}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">
                                      {numIqd(Math.round(row.total_sttle))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">
                          لا توجد تسويات ضمن الفترة.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <div className="page-break" />

                {/* Tasks by category */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none border border-slate-200">
                    <CardHeader className="border-b border-slate-200 py-4">
                      <CardTitle className="flex items-center gap-2 text-lg border-r-4 border-[#026174] pr-3">
                        <LayoutList className="h-5 w-5 text-[#026174]" />
                        <span className="text-slate-800">المهام — حسب الفئة</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      {tasksByCategory.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                          <div className="h-[320px] print:h-[280px] print-chart-box">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={tasksByCategory}
                                  dataKey="executed_total"
                                  nameKey="category_name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={110}
                                  innerRadius={45}
                                  paddingAngle={2}
                                  labelLine={false}
                                >
                                  {tasksByCategory.map((_, i) => (
                                    <Cell
                                      key={i}
                                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                                      stroke="#fff"
                                      strokeWidth={2}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(v: number) => [num(v), 'مهام']}
                                  contentStyle={{
                                    borderRadius: 10,
                                    border: '1px solid #e2e8f0',
                                  }}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: 12 }}
                                  iconType="circle"
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[#026174] hover:bg-[#026174]">
                                  <TableHead className="text-white font-semibold">الفئة</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">المنجزة</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">في الوقت</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">متأخرة</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tasksByCategory.map((r, idx) => (
                                  <TableRow key={r.category_id} className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                    <TableCell className="font-medium">{r.category_name}</TableCell>
                                    <TableCell className="font-mono text-left">{num(r.executed_total)}</TableCell>
                                    <TableCell className="font-mono text-left">{num(r.on_time)}</TableCell>
                                    <TableCell className="font-mono text-left">{num(r.late)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">
                          لا توجد مهام منفذة ضمن الفترة.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* Template/category breakdown */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none border border-slate-200">
                    <CardHeader className="border-b border-slate-200 py-4">
                      <CardTitle className="flex items-center gap-2 text-lg border-r-4 border-[#026174] pr-3">
                        <LayoutList className="h-5 w-5 text-[#026174]" />
                        <span className="text-slate-800">المهام حسب القالب والفئة</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {templateCategory.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#026174] hover:bg-[#026174]">
                                <TableHead className="text-white font-semibold">القالب</TableHead>
                                <TableHead className="text-white font-semibold">الفئة</TableHead>
                                <TableHead className="text-left font-mono text-white font-semibold">المنجزة</TableHead>
                                <TableHead className="text-left font-mono text-white font-semibold">في الوقت</TableHead>
                                <TableHead className="text-left font-mono text-white font-semibold">متأخرة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {templateCategory.map((r, i) => (
                                <TableRow key={`${r.template_id}-${r.category_id}-${i}`} className={i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                  <TableCell className="font-medium">{r.template_title || '—'}</TableCell>
                                  <TableCell>{r.category_name || '—'}</TableCell>
                                  <TableCell className="font-mono text-left">{num(r.executed_total)}</TableCell>
                                  <TableCell className="font-mono text-left">{num(r.on_time)}</TableCell>
                                  <TableCell className="font-mono text-left">{num(r.late)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">
                          لا توجد بيانات ضمن الفترة.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <div className="page-break" />

                {/* Employees — بطاقات مع صورة ومتوسط وقت الحضور */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-lg print:shadow-none border border-slate-200">
                    <CardHeader className="border-b border-slate-200 py-4 bg-slate-50/50">
                      <CardTitle className="flex items-center gap-2 text-lg border-r-4 border-[#026174] pr-3">
                        <Users className="h-5 w-5 text-[#026174]" />
                        <span className="text-slate-800">الموظفون — ملخص الأداء</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {employees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:gap-3">
                          {employees.map((e) => {
                            const avatarSrc = e.avatar_url
                              ? (e.avatar_url.startsWith('http') ? e.avatar_url : `${window.location.origin}${e.avatar_url}`)
                              : null;
                            return (
                              <div
                                key={e.id}
                                className="rounded-xl border border-slate-200 border-r-4 bg-white p-4 shadow-sm print:shadow-none print:break-inside-avoid"
                                style={{ borderRightColor: '#026174' }}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#068294]/30 bg-slate-100 flex-shrink-0">
                                    {avatarSrc ? (
                                      <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-xl font-bold text-[#026174] bg-slate-200">
                                        {e.name?.trim().charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">{e.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                      <span>أيام حضور: {num(e.attendance_days)}</span>
                                      {e.avg_attendance_time && (
                                        <>
                                          <span>•</span>
                                          <span>متوسط وقت الحضور: {e.avg_attendance_time}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">منجزة</span>
                                    <span className="font-mono font-medium">{num(e.executed_total)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">في الوقت</span>
                                    <span className="font-mono font-medium text-emerald-600">{num(e.on_time)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">متأخرة</span>
                                    <span className="font-mono font-medium text-amber-600">{num(e.late)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">تغطية</span>
                                    <span className="font-mono font-medium">{num(e.coverage)}</span>
                                  </div>
                                  <div className="flex justify-between col-span-2">
                                    <span className="text-muted-foreground">متوسط المدة</span>
                                    <span className="font-mono">
                                      {e.avg_duration_minutes != null ? `${num(e.avg_duration_minutes)} د` : '—'}
                                    </span>
                                  </div>
                                  {e.avg_delay_late_minutes != null && e.avg_delay_late_minutes > 0 && (
                                    <div className="flex justify-between col-span-2">
                                      <span className="text-muted-foreground">متوسط التأخير (للمتأخرة)</span>
                                      <span className="font-mono text-amber-600">{num(e.avg_delay_late_minutes)} د</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">لا يوجد موظفون.</div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* Coverage */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none border border-slate-200">
                    <CardHeader className="border-b border-slate-200 py-4">
                      <CardTitle className="flex items-center gap-2 text-lg border-r-4 border-[#026174] pr-3">
                        <Users className="h-5 w-5 text-[#026174]" />
                        <span className="text-slate-800">التغطية — من قام بمهام الآخرين</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {coverageRows.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#026174] hover:bg-[#026174]">
                                <TableHead className="text-white font-semibold">المنفذ</TableHead>
                                <TableHead className="text-white font-semibold">المكلف</TableHead>
                                <TableHead className="text-left font-mono text-white font-semibold">العدد</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {coverageRows.map((r, i) => (
                                <TableRow key={i} className={i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                  <TableCell className="font-medium">
                                    {idToName.get(r.done_by_user_id) || `#${r.done_by_user_id}`}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {idToName.get(r.assigned_to_user_id) || `#${r.assigned_to_user_id}`}
                                  </TableCell>
                                  <TableCell className="font-mono text-left">{num(r.count)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">لا توجد تغطية ضمن الفترة.</div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <div className="page-break" />

                {/* Systems */}
                <section className="print:break-inside-avoid">
                  <div className="flex items-center gap-2 mb-4 border-r-4 border-[#026174] pr-3">
                    <Building2 className="h-5 w-5 text-[#026174]" />
                    <h2 className="text-lg font-bold text-slate-800">أنظمة/سجلات</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="shadow-md print:shadow-none border border-slate-200">
                      <CardHeader className="border-b border-slate-200 py-4">
                        <CardTitle className="text-lg border-r-4 border-[#068294] pr-3 text-slate-800">CT Matching</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'الإجمالي', value: num(data.ctMatching.total) },
                            { label: 'مطابقة', value: num(data.ctMatching.matched) },
                            { label: 'غير مطابقة', value: num(data.ctMatching.notMatched) },
                          ].map((k, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 border-l-4 p-3 bg-white" style={{ borderLeftColor: '#068294' }}>
                              <div className="text-xs font-medium text-slate-500">{k.label}</div>
                              <div className="font-mono text-lg font-semibold text-slate-900 mt-1">{k.value}</div>
                            </div>
                          ))}
                        </div>

                        {data.ctMatching.records.length > 0 ? (
                          <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[#068294] hover:bg-[#068294]">
                                  <TableHead className="text-white font-semibold">الفترة</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">CT</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">ACQ</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">Fees</TableHead>
                                  <TableHead className="text-white font-semibold">الحالة</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.ctMatching.records.slice(0, 25).map((r, i) => (
                                  <TableRow key={r.id} className={i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                    <TableCell className="font-mono">
                                      {r.sttl_date_from} → {r.sttl_date_to}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">{num(Math.round(r.ct_value))}</TableCell>
                                    <TableCell className="font-mono text-left">{num(Math.round(r.sum_acq))}</TableCell>
                                    <TableCell className="font-mono text-left">{num(Math.round(r.sum_fees))}</TableCell>
                                    <TableCell>{r.match_status || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-muted-foreground py-6 text-center">لا توجد سجلات CT ضمن الفترة.</div>
                        )}
                        {data.ctMatching.records.length > 25 && (
                          <div className="text-xs text-muted-foreground">
                            ملاحظة: تم عرض أول 25 سجل فقط للطباعة.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-md print:shadow-none border border-slate-200">
                      <CardHeader className="border-b border-slate-200 py-4">
                        <CardTitle className="text-lg border-r-4 border-[#068294] pr-3 text-slate-800">صرف مستحقات التجار</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-slate-200 border-l-4 p-3 bg-white" style={{ borderLeftColor: '#068294' }}>
                            <div className="text-xs font-medium text-slate-500">عدد عمليات الصرف</div>
                            <div className="font-mono text-lg font-semibold text-slate-900 mt-1">{num(data.merchantDisbursements.count)}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 border-l-4 p-3 bg-white" style={{ borderLeftColor: '#068294' }}>
                            <div className="text-xs font-medium text-slate-500">الإجمالي</div>
                            <div className="font-mono text-lg font-semibold text-slate-900 mt-1">{numIqd(Math.round(data.merchantDisbursements.total_amount))}</div>
                          </div>
                        </div>

                        {data.merchantDisbursements.rows.length > 0 ? (
                          <div className="rounded-xl border border-slate-200 overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[#068294] hover:bg-[#068294]">
                                  <TableHead className="text-white font-semibold">التاريخ</TableHead>
                                  <TableHead className="text-white font-semibold">التاجر</TableHead>
                                  <TableHead className="text-left font-mono text-white font-semibold">المبلغ</TableHead>
                                  <TableHead className="text-white font-semibold">الحالة</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.merchantDisbursements.rows.slice(0, 30).map((r, i) => (
                                  <TableRow key={r.id} className={i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                                    <TableCell className="font-mono">{r.transfer_date}</TableCell>
                                    <TableCell className="font-mono">{r.merchant_id}</TableCell>
                                    <TableCell className="font-mono text-left">{numIqd(Math.round(r.amount))}</TableCell>
                                    <TableCell>{r.status}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-muted-foreground py-6 text-center">لا توجد عمليات صرف ضمن الفترة.</div>
                        )}
                        {data.merchantDisbursements.rows.length > 30 && (
                          <div className="text-xs text-muted-foreground">
                            ملاحظة: تم عرض أول 30 سجل فقط للطباعة.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

