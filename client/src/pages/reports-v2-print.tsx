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
  return String(n ?? 0);
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
    <div className="min-h-screen bg-slate-100 print:bg-white" dir="rtl">
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
        {/* Paper container */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:overflow-visible">
          {/* Cover/Header */}
          <div
            className="px-6 py-8 print:px-[15mm] print:py-8"
            style={{
              background:
                'linear-gradient(135deg, rgba(2,97,116,0.08) 0%, rgba(6,130,148,0.08) 100%)',
              borderBottom: '2px solid rgba(6,130,148,0.25)',
            }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <CompanyLogo size="lg" animated={false} showRing={false} />
                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      تقرير القسم (ورقي)
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      تقرير شامل حسب تاريخ التنفيذ — من {data?.dateFrom ?? '—'} إلى{' '}
                      {data?.dateTo ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl border bg-white p-3">
                    <div className="text-xs text-muted-foreground">الفترة</div>
                    <div className="font-semibold flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-[#026174]" />
                      {formatPeriodLabel(period)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="text-xs text-muted-foreground">تاريخ الإصدار</div>
                    <div className="font-mono mt-1">{generatedAt}</div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="text-xs text-muted-foreground">المنجزة</div>
                    <div className="font-mono text-lg mt-1">
                      {num(dept?.executed_total ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="text-xs text-muted-foreground">التسويات</div>
                    <div className="font-mono text-lg mt-1">
                      {num(data?.settlements?.total_settlements ?? 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block text-left">
                <div className="rounded-2xl border bg-white px-4 py-3">
                  <div className="text-xs text-muted-foreground">مختصر</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-600">في الوقت</span>
                      <span className="font-mono">{num(dept?.on_time ?? 0)}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-600">متأخرة</span>
                      <span className="font-mono">{num(dept?.late ?? 0)}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-600">تغطية</span>
                      <span className="font-mono">{num(dept?.coverage ?? 0)}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-600">الموظفون</span>
                      <span className="font-mono">{num(employees.length)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="mt-6 text-sm text-muted-foreground">جاري تجهيز التقرير للطباعة…</div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-8 print:px-[15mm] print:py-8 space-y-8">
            {!data ? (
              <div className="rounded-2xl border bg-slate-50 p-8 text-center text-muted-foreground">
                لا توجد بيانات لعرضها. تأكد من تحديد الفترة بشكل صحيح.
              </div>
            ) : (
              <>
                {/* KPI summary */}
                <section className="print:break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="h-5 w-5 text-[#026174]" />
                    <h2 className="text-lg font-bold">ملخص سريع</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">مهام منجزة</div>
                      <div className="font-mono text-lg">{num(dept?.executed_total ?? 0)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">في الوقت</div>
                      <div className="font-mono text-lg">{num(dept?.on_time ?? 0)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">متأخرة</div>
                      <div className="font-mono text-lg">{num(dept?.late ?? 0)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">نسبة في الوقت</div>
                      <div className="font-mono text-lg">{num(onTimePct)}%</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">تغطية</div>
                      <div className="font-mono text-lg">{num(dept?.coverage ?? 0)}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">متوسط المدة</div>
                      <div className="font-mono text-lg">
                        {dept?.avg_duration_minutes != null ? `${num(dept.avg_duration_minutes)} د` : '—'}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="page-break" />

                {/* Settlements */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Banknote className="h-5 w-5 text-[#026174]" />
                        التسويات الحكومية — حسب المصرف
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      {settlementsByBank.length > 0 ? (
                        <>
                          <div className="h-[320px] print:h-[280px]">
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

                          <div className="rounded-xl border overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-100 hover:bg-slate-100">
                                  <TableHead>المصرف</TableHead>
                                  <TableHead className="text-left font-mono">عدد التسويات</TableHead>
                                  <TableHead className="text-left font-mono">عدد الحركات</TableHead>
                                  <TableHead className="text-left font-mono">STTLE</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {settlementsByBank.map((row, i) => (
                                  <TableRow key={i} className="hover:bg-slate-50">
                                    <TableCell className="font-medium">{row.bank_name}</TableCell>
                                    <TableCell className="font-mono text-left">
                                      {num(row.settlement_count)}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">
                                      {num(row.total_movements)}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">
                                      {num(Math.round(row.total_sttle))}
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
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <LayoutList className="h-5 w-5 text-[#026174]" />
                        المهام — حسب الفئة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      {tasksByCategory.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                          <div className="h-[320px] print:h-[280px]">
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

                          <div className="rounded-xl border overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-100 hover:bg-slate-100">
                                  <TableHead>الفئة</TableHead>
                                  <TableHead className="text-left font-mono">المنجزة</TableHead>
                                  <TableHead className="text-left font-mono">في الوقت</TableHead>
                                  <TableHead className="text-left font-mono">متأخرة</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tasksByCategory.map((r) => (
                                  <TableRow key={r.category_id} className="hover:bg-slate-50">
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
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <LayoutList className="h-5 w-5 text-[#026174]" />
                        المهام حسب القالب والفئة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {templateCategory.length > 0 ? (
                        <div className="rounded-xl border overflow-hidden print:overflow-visible">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-100 hover:bg-slate-100">
                                <TableHead>القالب</TableHead>
                                <TableHead>الفئة</TableHead>
                                <TableHead className="text-left font-mono">المنجزة</TableHead>
                                <TableHead className="text-left font-mono">في الوقت</TableHead>
                                <TableHead className="text-left font-mono">متأخرة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {templateCategory.map((r, i) => (
                                <TableRow key={`${r.template_id}-${r.category_id}-${i}`} className="hover:bg-slate-50">
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

                {/* Employees */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-[#026174]" />
                        الموظفون — ملخص الأداء
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {employees.length > 0 ? (
                        <div className="rounded-xl border overflow-hidden print:overflow-visible">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-100 hover:bg-slate-100">
                                <TableHead>الموظف</TableHead>
                                <TableHead className="text-left font-mono">حضور</TableHead>
                                <TableHead className="text-left font-mono">منجزة</TableHead>
                                <TableHead className="text-left font-mono">مجدولة/إضافية</TableHead>
                                <TableHead className="text-left font-mono">في الوقت</TableHead>
                                <TableHead className="text-left font-mono">متأخرة</TableHead>
                                <TableHead className="text-left font-mono">تغطية</TableHead>
                                <TableHead className="text-left font-mono">متوسط المدة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employees.map((e) => (
                                <TableRow key={e.id} className="hover:bg-slate-50">
                                  <TableCell className="font-medium">{e.name}</TableCell>
                                  <TableCell className="font-mono text-left">{num(e.attendance_days)}</TableCell>
                                  <TableCell className="font-mono text-left">{num(e.executed_total)}</TableCell>
                                  <TableCell className="font-mono text-left">
                                    {num(e.scheduled_executed)} / {num(e.ad_hoc_executed)}
                                  </TableCell>
                                  <TableCell className="font-mono text-left">{num(e.on_time)}</TableCell>
                                  <TableCell className="font-mono text-left">{num(e.late)}</TableCell>
                                  <TableCell className="font-mono text-left">{num(e.coverage)}</TableCell>
                                  <TableCell className="font-mono text-left">
                                    {e.avg_duration_minutes != null ? `${num(e.avg_duration_minutes)} د` : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">لا يوجد موظفون.</div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* Coverage */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-[#026174]" />
                        التغطية — من قام بمهام الآخرين
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {coverageRows.length > 0 ? (
                        <div className="rounded-xl border overflow-hidden print:overflow-visible">
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

                {/* Tasks list (limited) */}
                <section className="print:break-inside-avoid">
                  <Card className="shadow-md print:shadow-none">
                    <CardHeader className="bg-slate-50/80 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <LayoutList className="h-5 w-5 text-[#026174]" />
                        تفاصيل المهام (مختصر)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-3">
                      <div className="text-sm text-muted-foreground">
                        تم عرض {num(data.tasks.rows.length)} سجل من أصل {num(data.tasks.total)}. (للقائمة الكاملة استخدم تصدير CSV)
                      </div>
                      {data.tasks.rows.length > 0 ? (
                        <div className="rounded-xl border overflow-hidden print:overflow-visible">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-100 hover:bg-slate-100">
                                <TableHead>التاريخ</TableHead>
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
                                const isCoverage =
                                  r.assigned_to_user_id != null &&
                                  r.assigned_to_user_id !== r.user_id;
                                return (
                                  <TableRow key={r.execution_id} className="hover:bg-slate-50">
                                    <TableCell className="font-mono">{r.done_at ?? r.done_date}</TableCell>
                                    <TableCell>
                                      {r.task_type === 'scheduled' ? 'مجدولة' : 'إضافية'}
                                    </TableCell>
                                    <TableCell>{r.category_name || 'بدون فئة'}</TableCell>
                                    <TableCell className="max-w-[240px] truncate" title={r.template_title || ''}>
                                      {r.template_title || 'بدون قالب'}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">{r.result_status}</TableCell>
                                    <TableCell className="font-mono text-left">
                                      {r.duration_minutes != null ? `${num(r.duration_minutes)} د` : '—'}
                                    </TableCell>
                                    <TableCell className="font-mono text-left">{isCoverage ? 'نعم' : '—'}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-muted-foreground py-6 text-center">لا توجد مهام ضمن الفترة.</div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <div className="page-break" />

                {/* Systems */}
                <section className="print:break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-[#026174]" />
                    <h2 className="text-lg font-bold">أنظمة/سجلات</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="shadow-md print:shadow-none">
                      <CardHeader className="bg-slate-50/80 border-b">
                        <CardTitle className="text-lg">CT Matching</CardTitle>
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
                          <div className="rounded-xl border overflow-hidden print:overflow-visible">
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
                                {data.ctMatching.records.slice(0, 25).map((r) => (
                                  <TableRow key={r.id} className="hover:bg-slate-50">
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

                    <Card className="shadow-md print:shadow-none">
                      <CardHeader className="bg-slate-50/80 border-b">
                        <CardTitle className="text-lg">صرف مستحقات التجار</CardTitle>
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
                          <div className="rounded-xl border overflow-hidden print:overflow-visible">
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
                                {data.merchantDisbursements.rows.slice(0, 30).map((r) => (
                                  <TableRow key={r.id} className="hover:bg-slate-50">
                                    <TableCell className="font-mono">{r.transfer_date}</TableCell>
                                    <TableCell className="font-mono">{r.merchant_id}</TableCell>
                                    <TableCell className="font-mono text-left">{num(Math.round(r.amount))}</TableCell>
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

                    <Card className="shadow-md print:shadow-none">
                      <CardHeader className="bg-slate-50/80 border-b">
                        <CardTitle className="text-lg">سجل التدقيق (الأحدث)</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {data.audit.length > 0 ? (
                          <div className="rounded-xl border overflow-hidden print:overflow-visible">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-100 hover:bg-slate-100">
                                  <TableHead>الوقت</TableHead>
                                  <TableHead className="text-left font-mono">User ID</TableHead>
                                  <TableHead>الإجراء</TableHead>
                                  <TableHead>الكيان</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.audit.slice(0, 35).map((r) => (
                                  <TableRow key={r.id} className="hover:bg-slate-50">
                                    <TableCell className="font-mono">{r.created_at || '—'}</TableCell>
                                    <TableCell className="font-mono text-left">{r.user_id ?? '—'}</TableCell>
                                    <TableCell className="font-mono">{r.action}</TableCell>
                                    <TableCell className="font-mono">
                                      {r.entity_type || '—'}
                                      {r.entity_id != null ? `#${r.entity_id}` : ''}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-muted-foreground py-6 text-center">لا توجد أحداث تدقيق ضمن الفترة.</div>
                        )}
                        {data.audit.length > 35 && (
                          <div className="text-xs text-muted-foreground mt-3">
                            ملاحظة: تم عرض أول 35 سجل فقط للطباعة.
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

