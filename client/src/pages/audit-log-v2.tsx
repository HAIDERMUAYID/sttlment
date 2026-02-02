import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { FileText, Filter, Search } from 'lucide-react';
import moment from 'moment-timezone';

const actionLabels: Record<string, string> = {
  login: 'تسجيل دخول',
  create_user: 'إنشاء مستخدم',
  update_user: 'تحديث مستخدم',
  activate_user: 'تفعيل مستخدم',
  deactivate_user: 'تعطيل مستخدم',
  create_category: 'إنشاء فئة',
  update_category: 'تحديث فئة',
  delete_category: 'حذف فئة',
  create_template: 'إنشاء قالب',
  update_template: 'تحديث قالب',
  delete_template: 'حذف قالب',
  create_schedule: 'إنشاء جدول',
  update_schedule: 'تحديث جدول',
  delete_schedule: 'حذف جدول',
  create_ad_hoc_task: 'إنشاء مهمة خاصة',
  execute_task: 'تنفيذ مهمة',
  change_password: 'تغيير كلمة المرور',
};

export function AuditLogV2() {
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/audit-log?${params.toString()}`);
      return response.data;
    },
  });

  const actions = Array.from(new Set(Object.keys(actionLabels)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل التدقيق</h1>
          <p className="text-muted-foreground mt-1">تتبع جميع العمليات في النظام</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">المستخدم</label>
              <SearchableSelect
                value={filters.userId}
                onChange={(val) => setFilters({ ...filters, userId: val })}
                options={[{ id: '', name: 'الكل' }, ...users]}
                getOptionLabel={(opt: any) => opt.name}
                getOptionValue={(opt: any) => opt.id?.toString() || ''}
                placeholder="الكل"
                searchPlaceholder="ابحث عن مستخدم..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الإجراء</label>
              <SearchableSelect
                value={filters.action}
                onChange={(val) => setFilters({ ...filters, action: val })}
                options={[{ value: '', label: 'الكل' }, ...actions.map((a) => ({ value: a, label: actionLabels[a] }))]}
                getOptionLabel={(opt: any) => opt.label}
                getOptionValue={(opt: any) => opt.value}
                placeholder="الكل"
                searchPlaceholder="ابحث عن إجراء..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع الكيان</label>
              <Input
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                placeholder="مثال: user, task..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>سجلات التدقيق ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>نوع الكيان</TableHead>
                    <TableHead>معرف الكيان</TableHead>
                    <TableHead>التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any, index: number) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {moment(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.user_name || 'غير معروف'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.entity_type || '—'}</TableCell>
                      <TableCell>{log.entity_id || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {logs.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد سجلات</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
