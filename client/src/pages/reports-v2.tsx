import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useHasPermission } from '@/hooks/useHasPermission';
import api from '@/lib/api';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export function ReportsV2() {
  const { toast } = useToast();
  const canExportExcel = useHasPermission('reports', 'export_excel');
  const canExportPdf = useHasPermission('reports', 'export_pdf');
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'coverage'>('daily');
  const [dailyDate, setDailyDate] = useState(today);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const canExport = (reportType === 'monthly' && canExportExcel) || (reportType === 'daily' && canExportPdf);

  const { data: reportData, isLoading, refetch } = useQuery<any>({
    queryKey: ['report', reportType, dailyDate, month, year, dateFrom, dateTo],
    queryFn: async () => {
      let url = '';
      if (reportType === 'daily') {
        url = `/reports/daily?date=${dailyDate}`;
      } else if (reportType === 'monthly') {
        url = `/reports/monthly?month=${month}&year=${year}`;
      } else if (reportType === 'coverage') {
        if (!dateFrom || !dateTo) return null;
        url = `/reports/coverage?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }
      if (!url) return null;
      const response = await api.get(url);
      return response.data;
    },
    enabled: reportType === 'coverage' ? !!(dateFrom && dateTo) : true,
  });

  const handleExport = async () => {
    try {
      let url = '';
      let filename = '';
      if (reportType === 'monthly') {
        url = `/reports/export?type=monthly&month=${month}&year=${year}`;
        filename = `report_${year}_${month}.xlsx`;
      } else if (reportType === 'daily') {
        url = `/reports/export-pdf?date=${dailyDate}`;
        filename = `report_${dailyDate}.pdf`;
      } else {
        toast({
          title: 'خطأ',
          description: 'التصدير متاح فقط للتقارير اليومية والشهرية',
          variant: 'destructive',
        });
        return;
      }

      const response = await api.get(url, { responseType: 'blob' });
      const url_blob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url_blob;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: 'نجح',
        description: 'تم تصدير التقرير بنجاح',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ في التصدير',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقارير</h1>
          <p className="text-muted-foreground mt-1">تقارير شاملة عن المهام والأداء</p>
        </div>
        {reportData && canExport && (
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع التقرير</label>
              <SearchableSelect
                value={reportType}
                onChange={(val) => setReportType(val as any)}
                options={[
                  { value: 'daily', label: 'يومي' },
                  { value: 'monthly', label: 'شهري' },
                  { value: 'coverage', label: 'التغطية' },
                ]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="اختر نوع التقرير"
              />
            </div>

            {reportType === 'daily' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">التاريخ</label>
                <Input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                />
              </div>
            )}

            {reportType === 'monthly' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الشهر</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">السنة</label>
                  <Input
                    type="number"
                    min="2020"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  />
                </div>
              </>
            )}

            {reportType === 'coverage' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">من تاريخ</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Data */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {reportType === 'daily' && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">المهام المجدولة</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.scheduled?.total || 0}</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {reportData.scheduled?.completed || 0}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.scheduled?.overdue || 0}</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">الحضور</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.attendance || 0}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>ملخص التقرير اليومي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                      <p className="text-2xl font-bold">
                        {reportData.scheduled?.total > 0
                          ? Math.round(
                              ((reportData.scheduled?.completed || 0) /
                                reportData.scheduled?.total) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">مكتملة متأخرة</p>
                      <p className="text-2xl font-bold">{reportData.late || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">مهام خاصة</p>
                      <p className="text-2xl font-bold">{reportData.adHoc?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {reportType === 'monthly' && Array.isArray(reportData) && (
            <Card>
              <CardHeader>
                <CardTitle>التقرير الشهري</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الموظف</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>عدد المهام</TableHead>
                        <TableHead>في الوقت</TableHead>
                        <TableHead>متأخر</TableHead>
                        <TableHead>تغطية</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{row.user_name}</TableCell>
                          <TableCell>{row.category_name}</TableCell>
                          <TableCell>{row.tasks_done}</TableCell>
                          <TableCell>{row.on_time}</TableCell>
                          <TableCell>{row.late}</TableCell>
                          <TableCell>{row.coverage_count || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === 'coverage' && Array.isArray(reportData) && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير التغطية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>منفذ المهمة</TableHead>
                        <TableHead>المسؤول الأصلي</TableHead>
                        <TableHead>عدد المهام</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{row.done_by_name}</TableCell>
                          <TableCell>{row.assigned_to_name}</TableCell>
                          <TableCell>{row.coverage_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {reportType === 'coverage' && (!dateFrom || !dateTo)
                ? 'يرجى اختيار تاريخ البداية والنهاية'
                : 'لا توجد بيانات للعرض'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
