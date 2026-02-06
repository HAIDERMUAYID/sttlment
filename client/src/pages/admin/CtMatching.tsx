import React, { useState, useEffect, useRef } from 'react';
import { useHasPermission } from '@/hooks/useHasPermission';
import { Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/Loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  FileCheck,
  Plus,
  Printer,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  X,
  Filter,
  Hash,
  ArrowRight,
  LayoutGrid,
  Table2,
  Eye,
  Download,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface AcqFeesSummary {
  sttl_date_from: string;
  sttl_date_to: string;
  total_movements: number;
  sum_fees: number;
  sum_acq: number;
  sum_acq_plus_fees: number;
}

interface CtRecord {
  id: number;
  sttl_date_from: string;
  sttl_date_to: string;
  ct_value: number;
  sum_acq: number;
  sum_fees: number;
  ct_received_date: string | null;
  match_status: 'matched' | 'not_matched';
  user_name: string | null;
  notes: string | null;
  created_at: string;
}

interface ByDirectorateGovernorate {
  governorate: string;
  directorate_name: string;
  movement_count: number;
  sum_amount: number;
  sum_fees: number;
  sum_acq: number;
}

interface CtMatchingReportData {
  period: { sttl_date_from: string; sttl_date_to: string };
  summary: { total_movements: number; total_amount: number; sum_fees: number; sum_acq: number };
  by_bank: Array<{ bank_name: string; movement_count: number; sum_amount: number; sum_fees: number; sum_acq: number }>;
  by_day: Array<{ sttl_date: string; movement_count: number; sum_amount: number; sum_fees: number; sum_acq: number }>;
  by_directorate_governorate?: ByDirectorateGovernorate[];
  ct_records: Array<{
    id: number;
    sttl_date_from: string;
    sttl_date_to: string;
    ct_value: number;
    sum_acq: number;
    sum_fees: number;
    ct_received_date: string | null;
    user_name: string | null;
    created_at: string;
    match_status: string;
  }>;
}

/** عرض التاريخ بصيغة YYYY/MM/DD فقط — دون تحويل للتوقيت المحلي لتفادي ظهور يوم خاطئ (مثلاً 9 بدل 10). */
const formatDate = (d: string | Date | null) => {
  if (d == null) return '—';
  let s: string;
  if (typeof d === 'string') s = d.slice(0, 10);
  else if (d instanceof Date && !isNaN(d.getTime())) s = d.toISOString().slice(0, 10);
  else s = '';
  if (!s || s.length < 10) return '—';
  return s.replace(/-/g, '/');
};

/** عرض الأرقام مع دقة كافية للعمولة — 6 منازل عشرية لضمان التطابق */
const formatNum = (n: number | null) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

/** بناء HTML تقرير CT للطباعة — مع نسب، مخطط أعمدة، شعار الشركة، وتنظيم احترافي */
function buildReportPrintHtml(
  data: CtMatchingReportData,
  fmtNum: (n: number | null) => string,
  fmtDate: (d: string | Date | null) => string,
  baseUrl: string = ''
): string {
  const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const img = (path: string) => (baseUrl ? baseUrl.replace(/\/$/, '') + path : path);
  const totalAmount = Number(data.summary.total_amount) || 1;
  const totalAcq = Number(data.summary.sum_acq) || 1;
  const totalFees = Number(data.summary.sum_fees) || 1;

  const head = `
<header class="report-print-header mb-10 pt-8 pb-8 px-8 rounded-2xl" style="background:linear-gradient(135deg,#026174 0%,#068294 100%);color:#fff;box-shadow:0 10px 30px rgba(2,97,116,0.35);">
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:24px;margin-bottom:20px;">
    <div style="flex-shrink:0;width:88px;height:88px;border-radius:16px;background:rgba(255,255,255,0.25);border:2px solid rgba(255,255,255,0.5);box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;padding:10px;">
      <img src="${img('/logo.png')}" alt="شعار الشركة" style="max-height:100%;max-width:100%;object-fit:contain;" />
    </div>
    <div style="text-align:center;">
      <h1 style="font-size:1.75rem;font-weight:800;margin:0 0 6px 0;color:#fff;letter-spacing:-0.02em;">مطابقة حوالة عمولات واردة من البنك المركزي</h1>
      <p style="margin:0;color:rgba(255,255,255,0.98);font-weight:600;font-size:1rem;">شركة الساقي لخدمات الدفع الإلكتروني</p>
      <p style="margin:4px 0 0 0;font-size:0.9rem;color:rgba(255,255,255,0.92);font-weight:500;">قسم التسويات والمطابقات</p>
    </div>
  </div>
  <div class="report-print-period" style="display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:24px 16px;padding:14px 24px;border-radius:12px;font-size:0.9rem;font-weight:600;margin-top:8px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;">
    <span>فترة التسوية: <span dir="ltr">${esc(fmtDate(data.period.sttl_date_from))} — ${esc(fmtDate(data.period.sttl_date_to))}</span></span>
    <span dir="ltr">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
</header>`;

  const stampBlock = `
<div class="report-stamp" style="display:flex;justify-content:flex-end;margin-bottom:20px;padding:0;">
  <img src="${img('/stamp-settlement-reconciliation.png')}" alt="ختم قسم التسويات والمطابقات" style="height:100px;width:auto;object-fit:contain;" />
</div>`;

  const kpi = `
<section class="mb-10">
  <h2 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 14px 0;padding-bottom:10px;border-bottom:2px solid #026174;text-align:center;">مؤشرات الأداء</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
    <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,0.06);"><p style="font-size:0.75rem;color:#64748b;margin:0 0 6px 0;font-weight:600;">عدد الحركات</p><p style="font-size:1.3rem;font-weight:700;margin:0;" dir="ltr">${data.summary.total_movements.toLocaleString('en-US')}</p></div>
    <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,0.06);"><p style="font-size:0.75rem;color:#64748b;margin:0 0 6px 0;font-weight:600;">إجمالي المبلغ (IQD)</p><p style="font-size:1.3rem;font-weight:700;margin:0;" dir="ltr">${fmtNum(data.summary.total_amount)}</p></div>
    <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,0.06);"><p style="font-size:0.75rem;color:#64748b;margin:0 0 6px 0;font-weight:600;">الرسوم (Fees)</p><p style="font-size:1.3rem;font-weight:700;margin:0;" dir="ltr">${fmtNum(data.summary.sum_fees)}</p></div>
    <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid #026174;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,0.06);"><p style="font-size:0.75rem;color:#64748b;margin:0 0 6px 0;font-weight:600;">عمولة التحصيل (ACQ)</p><p style="font-size:1.3rem;font-weight:700;margin:0;color:#026174;" dir="ltr">${fmtNum(data.summary.sum_acq)}</p></div>
  </div>
</section>`;

  const byDaySorted = [...(data.by_day || [])].sort((a, b) => (a.sttl_date || '').localeCompare(b.sttl_date || ''));
  const daysWithAcq = byDaySorted.map((d) => ({ date: d.sttl_date, acq: Number(d.sum_acq) || 0 }));
  const dailyAvgAcq = daysWithAcq.length ? daysWithAcq.reduce((s, d) => s + d.acq, 0) / daysWithAcq.length : 0;
  const byAcqDesc = [...daysWithAcq].sort((a, b) => b.acq - a.acq);
  const peakDays = byAcqDesc.slice(0, 5);
  const lowDays = [...byAcqDesc].reverse().slice(0, 5);
  const daysAboveAvg = daysWithAcq.filter((d) => d.acq > dailyAvgAcq);
  const daysBelowAvg = daysWithAcq.filter((d) => d.acq < dailyAvgAcq && d.acq > 0);
  const byBankForTop = [...(data.by_bank || [])].sort((a, b) => (Number(b.sum_acq) || 0) - (Number(a.sum_acq) || 0));
  const topBanks = byBankForTop.slice(0, 3);
  const dirGovList = [...(data.by_directorate_governorate || [])].sort((a, b) => (Number(b.sum_acq) || 0) - (Number(a.sum_acq) || 0));
  const topDirectorates = dirGovList.slice(0, 3);

  const narrativeInsights: string[] = [];
  if (peakDays.length && peakDays[0].acq > 0) {
    narrativeInsights.push(`بلغت عمولة التحصيل الحكومي (ACQ) ذروتها في يوم ${esc(fmtDate(peakDays[0].date))} بقيمة ${fmtNum(peakDays[0].acq)} دينار عراقي.`);
  }
  if (lowDays.length && dailyAvgAcq > 0) {
    const lowest = lowDays.filter((d) => d.acq > 0)[0];
    if (lowest) narrativeInsights.push(`سجّل يوم ${esc(fmtDate(lowest.date))} أدنى عمولة يومية بقيمة ${fmtNum(lowest.acq)} دينار.`);
  }
  if (daysWithAcq.length && dailyAvgAcq > 0) {
    narrativeInsights.push(`بلغ المتوسط اليومي لعمولة التحصيل خلال الفترة ${fmtNum(dailyAvgAcq)} دينار، مع ${daysAboveAvg.length} يوماً فوق المتوسط و${daysBelowAvg.length} يوماً دونه.`);
  }
  if (topBanks.length && topBanks[0].bank_name) {
    narrativeInsights.push(`تصدّر مصرف "${esc(topBanks[0].bank_name)}" قائمة المصارف من حيث عمولة التحصيل بإجمالي ${fmtNum(Number(topBanks[0].sum_acq) || 0)} دينار.`);
  }
  if (topDirectorates.length && topDirectorates[0].directorate_name) {
    narrativeInsights.push(`أعلى المديريات مساهمةً في عمولة التحصيل: "${esc(topDirectorates[0].directorate_name)}" (${esc(topDirectorates[0].governorate)}) بإجمالي ${fmtNum(Number(topDirectorates[0].sum_acq) || 0)} دينار.`);
  }
  if (data.summary.total_movements > 0) {
    narrativeInsights.push(`إجمالي الحركات خلال الفترة ${data.summary.total_movements.toLocaleString('ar-EG')} حركة، بإجمالي عمولة تحصيل ${fmtNum(totalAcq)} دينار.`);
  }
  const narrativeSection = `
<section class="mb-10" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
  <h2 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">تحليل التقرير</h2>
  <p style="font-size:0.8rem;color:#475569;margin:0 0 10px 0;">ملاحظات تحليلية مستخرجة من بيانات الفترة:</p>
  <ul style="margin:0;padding-right:20px;font-size:0.9rem;line-height:1.8;color:#334155;">
    ${narrativeInsights.length ? narrativeInsights.map((text) => `<li>${text}</li>`).join('') : '<li>لا توجد بيانات كافية لاستخراج ملاحظات تحليلية لهذه الفترة.</li>'}
  </ul>
</section>`;
  const maxAcqDay = Math.max(...byDaySorted.map((d) => Number(d.sum_acq) || 0), 1);
  const chartHeight = 220;
  const chartBars = byDaySorted.map((row, i) => {
    const val = Number(row.sum_acq) || 0;
    const pct = maxAcqDay ? (val / maxAcqDay) * 100 : 0;
    return { label: fmtDate(row.sttl_date), value: val, pct };
  });
  const chartSvg = `
<section class="mb-10">
  <h2 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">مخطط عمولة التحصيل الحكومي (ACQ) باليوم</h2>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;min-height:260px;width:100%;">
    <svg viewBox="0 0 800 ${chartHeight + 50}" style="width:100%;height:auto;max-height:280px;" dir="ltr">
      ${chartBars.map((b, i) => {
        const x = 50 + (i / Math.max(chartBars.length, 1)) * 700;
        const barW = Math.max(4, 700 / Math.max(chartBars.length, 1) - 6);
        const barH = (b.pct / 100) * chartHeight;
        const y = chartHeight - barH + 20;
        return `<g><rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#026174" rx="4"/><text x="${x + barW/2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#334155">${Number(b.value).toLocaleString('en-US', { maximumFractionDigits: 0 })}</text><text x="${x + barW/2}" y="${chartHeight + 38}" text-anchor="middle" font-size="10" fill="#64748b">${b.label}</text></g>`;
      }).join('')}
    </svg>
  </div>
</section>`;

  const byDayRows = byDaySorted.map((row, i) => {
    const acqVal = Number(row.sum_acq) || 0;
    const pct = totalAcq ? ((acqVal / totalAcq) * 100).toFixed(1) : '0';
    return `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${esc(fmtDate(row.sttl_date))}</td>
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${row.movement_count.toLocaleString('en-US')}</td>
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_amount)}</td>
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_fees)}</td>
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;color:#0f766e;" dir="ltr">${fmtNum(row.sum_acq)}</td>
      <td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;color:#475569;" dir="ltr">${pct}%</td>
    </tr>`;
  }).join('');
  const byDayTable = `
<section class="mb-10">
  <h2 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">تفصيل عمولة التحصيل (ACQ) باليوم</h2>
  <table style="width:100%;border-collapse:collapse;font-size:0.8rem;" dir="rtl">
    <thead><tr class="table-header-dark" style="background:linear-gradient(135deg,#026174 0%,#068294 100%);color:#fff;"><th style="padding:10px;text-align:right;">التاريخ</th><th style="padding:10px;text-align:right;">عدد الحركات</th><th style="padding:10px;text-align:right;">إجمالي المبلغ</th><th style="padding:10px;text-align:right;">الرسوم</th><th style="padding:10px;text-align:right;">عمولة التحصيل (ACQ)</th><th style="padding:10px;text-align:right;">نسبة %</th></tr></thead>
    <tbody>${byDayRows}</tbody>
  </table>
</section>`;

  const byBankSorted = [...(data.by_bank || [])].sort((a, b) => (a.bank_name || '').localeCompare(b.bank_name || '', 'ar'));
  const byBankRows = byBankSorted.map((row, i) => {
    const acqVal = Number(row.sum_acq) || 0;
    const pct = totalAcq ? ((acqVal / totalAcq) * 100).toFixed(1) : '0';
    return `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};"><td style="padding:10px;border:1px solid #e2e8f0;">${esc(row.bank_name)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${row.movement_count.toLocaleString('en-US')}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_amount)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_fees)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;color:#0f766e;" dir="ltr">${fmtNum(row.sum_acq)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;color:#475569;" dir="ltr">${pct}%</td></tr>`;
  }).join('');
  const byBankTable = `
<section class="mb-10">
  <h2 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">تفصيل حسب المصارف</h2>
  <table style="width:100%;border-collapse:collapse;font-size:0.8rem;" dir="rtl">
    <thead><tr class="table-header-dark" style="background:linear-gradient(135deg,#026174 0%,#068294 100%);color:#fff;"><th style="padding:10px;text-align:right;">المصرف</th><th style="padding:10px;text-align:right;">عدد الحركات</th><th style="padding:10px;text-align:right;">إجمالي المبلغ</th><th style="padding:10px;text-align:right;">الرسوم</th><th style="padding:10px;text-align:right;">عمولة التحصيل (ACQ)</th><th style="padding:10px;text-align:right;">نسبة %</th></tr></thead>
    <tbody>${byBankRows}</tbody>
  </table>
</section>`;

  const dirGov = data.by_directorate_governorate && data.by_directorate_governorate.length > 0;
  const dirGovRows = dirGov ? (data.by_directorate_governorate || []).map((row, i) => {
    const acqVal = Number(row.sum_acq) || 0;
    const pct = totalAcq ? ((acqVal / totalAcq) * 100).toFixed(1) : '0';
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};"><td style="padding:10px;border:1px solid #e2e8f0;">${esc(row.governorate)}</td><td style="padding:10px;border:1px solid #e2e8f0;">${esc(row.directorate_name)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${row.movement_count.toLocaleString('en-US')}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_amount)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${fmtNum(row.sum_acq)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;" dir="ltr">${pct}%</td></tr>`;
  }).join('') : '';
  const dirGovTable = dirGov ? `
<section class="mb-10">
  <h2 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">حسب المديرية والمحافظة</h2>
  <table style="width:100%;border-collapse:collapse;font-size:0.8rem;" dir="rtl">
    <thead><tr class="table-header-dark" style="background:linear-gradient(135deg,#026174 0%,#068294 100%);color:#fff;"><th style="padding:10px;text-align:right;">المحافظة</th><th style="padding:10px;text-align:right;">المديرية</th><th style="padding:10px;text-align:right;">عدد الحركات</th><th style="padding:10px;text-align:right;">إجمالي المبلغ</th><th style="padding:10px;text-align:right;">عمولة التحصيل</th><th style="padding:10px;text-align:right;">نسبة %</th></tr></thead>
    <tbody>${dirGovRows}</tbody>
  </table>
</section>` : '';

  const ctRows = (data.ct_records || []).length === 0
    ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:#64748b;">لا يوجد سجل CT لهذه الفترة</td></tr>'
    : [...data.ct_records].sort((a, b) => (b.sttl_date_from || '').localeCompare(a.sttl_date_from || '') || (b.created_at || '').localeCompare(a.created_at || '')).map((r) => `
    <tr style="background:#fff;"><td style="padding:10px;border:1px solid #e2e8f0;" dir="ltr">${esc(fmtDate(r.sttl_date_from))}</td><td style="padding:10px;border:1px solid #e2e8f0;" dir="ltr">${esc(fmtDate(r.sttl_date_to))}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;" dir="ltr">${fmtNum(r.ct_value)}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;color:#0f766e;" dir="ltr">${fmtNum(r.sum_acq)}</td><td style="padding:10px;border:1px solid #e2e8f0;"><span style="padding:4px 10px;border-radius:9999px;font-size:0.75rem;font-weight:700;${r.match_status === 'matched' ? 'background:#dcfce7;color:#166534;' : 'background:#fef3c7;color:#92400e;'}">${r.match_status === 'matched' ? 'مطابق' : 'غير مطابق'}</span></td><td style="padding:10px;border:1px solid #e2e8f0;">${esc(r.user_name ?? '—')}</td><td style="padding:10px;border:1px solid #e2e8f0;" dir="ltr">${esc(fmtDate(r.created_at))}</td></tr>`).join('');
  const ctTable = `
<section class="mb-10">
  <h2 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #026174;text-align:center;">المطابقة (CT مقابل عمولة التحصيل الحكومي)</h2>
  <table style="width:100%;border-collapse:collapse;font-size:0.8rem;" dir="rtl">
    <thead><tr class="table-header-dark" style="background:linear-gradient(135deg,#026174 0%,#068294 100%);color:#fff;"><th style="padding:10px;text-align:right;">من تاريخ</th><th style="padding:10px;text-align:right;">إلى تاريخ</th><th style="padding:10px;text-align:right;">قيمة CT</th><th style="padding:10px;text-align:right;">عمولة التحصيل</th><th style="padding:10px;text-align:right;">الحالة</th><th style="padding:10px;text-align:right;">المستخدم</th><th style="padding:10px;text-align:right;">تاريخ الإدخال</th></tr></thead>
    <tbody>${ctRows}</tbody>
  </table>
</section>`;

  return `<div class="ct-report-content" style="display:block;padding:0;max-width:100%;min-height:100vh;background:#fff;"><article style="display:block;padding:16px 10px 32px;background:#f6fafb;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:0;max-width:100%;width:100%;">${head}${stampBlock}${kpi}${narrativeSection}${chartSvg}${byDayTable}${byBankTable}${dirGovTable}${ctTable}</article></div>`;
}

/** صنف موحد لحقل التاريخ — متناسق مع التصميم */
const dateInputClass = 'ds-input w-full py-2.5 pl-4 pr-11 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer';
const dateInputWrapperClass = 'relative flex items-center rounded-xl overflow-hidden border border-slate-200 focus-within:border-[var(--primary-600)] focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:outline-none transition-all';

export function CtMatching() {
  const [sttlDateFrom, setSttlDateFrom] = useState('');
  const [sttlDateTo, setSttlDateTo] = useState('');
  const [ctValue, setCtValue] = useState('');
  const [ctReceivedDate, setCtReceivedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<AcqFeesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [records, setRecords] = useState<CtRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CtRecord | null>(null);
  const [editForm, setEditForm] = useState({
    sttl_date_from: '',
    sttl_date_to: '',
    ct_value: '',
    ct_received_date: '',
    notes: '',
  });
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<CtMatchingReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailRecord, setDetailRecord] = useState<CtRecord | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'table' | 'cards'>('table');
  const [downloadingImage, setDownloadingImage] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const canCreateCt = useHasPermission('ct_matching', 'create_ct');
  const canEditCt = useHasPermission('ct_matching', 'edit_ct');
  const canDeleteCt = useHasPermission('ct_matching', 'delete_ct');

  const fetchSummary = async () => {
    if (!sttlDateFrom || !sttlDateTo) {
      setSummary(null);
      return;
    }
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams({ sttl_date_from: sttlDateFrom, sttl_date_to: sttlDateTo });
      const res = await api.get(`/rtgs/acq-fees-summary?${params.toString()}`);
      setSummary(res.data);
    } catch (e: unknown) {
      setSummary(null);
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      const msg = err.response?.data?.error;
      if (msg && err.response?.status === 500) {
        toast({ title: 'خطأ في الجلب', description: msg, variant: 'destructive' });
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (filterDateFrom && filterDateTo) {
        params.set('date_from', filterDateFrom.slice(0, 10));
        params.set('date_to', filterDateTo.slice(0, 10));
      }
      const res = await api.get(`/rtgs/ct-records?${params.toString()}`);
      setRecords(res.data?.data ?? []);
    } catch (e: unknown) {
      setRecords([]);
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      const msg = err.response?.data?.error;
      if (msg && err.response?.status === 500) {
        toast({ title: 'خطأ في الجلب', description: msg, variant: 'destructive' });
      }
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (sttlDateFrom && sttlDateTo) fetchSummary();
    else setSummary(null);
  }, [sttlDateFrom, sttlDateTo]);

  const handleInsertCt = async () => {
    if (!sttlDateFrom || !sttlDateTo || !ctReceivedDate || ctValue === '') {
      toast({ title: 'تنبيه', description: 'مطلوب: من تاريخ التسوية، إلى تاريخ التسوية، تاريخ استلام CT من البنك المركزي، وقيمة CT', variant: 'destructive' });
      return;
    }
    const num = parseFloat(String(ctValue).replace(/,/g, ''));
    if (isNaN(num)) {
      toast({ title: 'تنبيه', description: 'قيمة CT يجب أن تكون رقماً', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/rtgs/ct-records', {
        sttl_date_from: sttlDateFrom,
        sttl_date_to: sttlDateTo,
        ct_value: num,
        ct_received_date: ctReceivedDate,
        notes: notes || undefined,
      });
      toast({ title: 'تم', description: 'تم إدراج سجل CT للمطابقة بنجاح' });
      setCtValue('');
      setCtReceivedDate('');
      setNotes('');
      fetchSummary();
      fetchRecords();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل إدراج سجل CT', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReport = () => {
    if (!filterDateFrom || !filterDateTo) {
      toast({ title: 'تنبيه', description: 'اختر من تاريخ وإلى تاريخ (فلتر الفترة) لطباعة تقرير المطابقة الشامل', variant: 'destructive' });
      return;
    }
    setReportOpen(true);
    setReportData(null);
    setReportLoading(true);
    const params = new URLSearchParams({ date_from: filterDateFrom.slice(0, 10), date_to: filterDateTo.slice(0, 10) });
    api.get(`/rtgs/ct-matching-report?${params.toString()}`)
      .then((res) => {
        setReportData(res.data);
        const hint = (res.data as { _message?: string })?._message;
        if (hint) {
          toast({ title: 'تنبيه', description: hint, variant: 'default' });
        }
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { error?: string } } };
        const msg = err.response?.data?.error ?? 'فشل جلب بيانات التقرير';
        toast({ title: 'خطأ', description: msg, variant: 'destructive' });
        setReportOpen(false);
      })
      .finally(() => setReportLoading(false));
  };

  const closeReport = () => {
    setReportOpen(false);
    setReportData(null);
  };

  useEffect(() => {
    if (reportOpen) {
      document.body.classList.add('ct-report-open');
      const prevTitle = document.title;
      document.title = ' ';
      return () => {
        document.body.classList.remove('ct-report-open');
        document.title = prevTitle;
      };
    } else {
      document.body.classList.remove('ct-report-open');
    }
  }, [reportOpen]);

  const printReportWindow = () => {
    const origin = window.location.origin;
    const styles = `
      @page { size: A4; margin: 10mm 8mm; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 14px; color: #0f172a !important; background: #fff !important; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { padding: 0; }
      .ct-report-content { max-width: 100%; padding: 0; margin: 0; display: block !important; min-height: 100vh; background: #fff !important; }
      article { padding: 0; margin: 0; overflow: visible; }
      .report-print-header { background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; padding: 20px 24px; margin-bottom: 24px; border-radius: 12px; }
      .report-print-header h1, .report-print-header p, .report-print-header span { color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
      .report-print-period { background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.4); padding: 12px 20px; font-weight: 600; color: #ffffff !important; font-size: 0.9rem; border-radius: 6px; margin-top: 12px; }
      section { margin-bottom: 24px; overflow: visible; }
      section h2 { page-break-after: avoid; font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #026174; text-align: center; }
      table { width: 100%; border-collapse: collapse; direction: rtl; table-layout: auto; font-size: 0.8rem; page-break-inside: auto; }
      th, td { min-width: 0; box-sizing: border-box; padding: 8px 6px; text-align: right; vertical-align: middle; border: 1px solid #e2e8f0; color: #334155; }
      table.print-cols-5 th:nth-child(1), table.print-cols-5 td:nth-child(1) { width: 20%; }
      table.print-cols-5 th:nth-child(2), table.print-cols-5 td:nth-child(2) { width: 20%; }
      table.print-cols-5 th:nth-child(3), table.print-cols-5 td:nth-child(3) { width: 20%; }
      table.print-cols-5 th:nth-child(4), table.print-cols-5 td:nth-child(4) { width: 20%; }
      table.print-cols-5 th:nth-child(5), table.print-cols-5 td:nth-child(5) { width: 20%; }
      table.print-cols-7 th:nth-child(1), table.print-cols-7 td:nth-child(1) { width: 14.29%; }
      table.print-cols-7 th:nth-child(2), table.print-cols-7 td:nth-child(2) { width: 14.29%; }
      table.print-cols-7 th:nth-child(3), table.print-cols-7 td:nth-child(3) { width: 14.29%; }
      table.print-cols-7 th:nth-child(4), table.print-cols-7 td:nth-child(4) { width: 14.29%; }
      table.print-cols-7 th:nth-child(5), table.print-cols-7 td:nth-child(5) { width: 14.29%; }
      table.print-cols-7 th:nth-child(6), table.print-cols-7 td:nth-child(6) { width: 14.29%; }
      table.print-cols-7 th:nth-child(7), table.print-cols-7 td:nth-child(7) { width: 14.26%; }
      thead { display: table-header-group; }
      thead tr, .table-header-dark { background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; color: #fff !important; }
      thead th { font-weight: 700; color: #ffffff !important; background: linear-gradient(135deg, #026174 0%, #068294 100%) !important; border: 1px solid rgba(255,255,255,0.2); font-size: 0.85rem; }
      tbody tr { page-break-inside: auto; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      td[dir="ltr"] { direction: ltr; }
    `;
    const html = reportData
      ? buildReportPrintHtml(reportData, formatNum, formatDate, origin)
      : (() => {
          const el = reportContentRef.current ?? document.querySelector<HTMLDivElement>('#ct-matching-report-print .ct-report-content');
          if (!el) return '';
          let h = el.innerHTML.trim();
          if (h && h.length > 100) h = h.replace(/src="\//g, `src="${origin}/`);
          return h;
        })();
    if (!html || html.length < 50) {
      window.print();
      return;
    }
    const fullDoc = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><base href="${origin}/"><title>مطابقة حوالة عمولات واردة من البنك المركزي</title><style>${styles}</style></head><body style="margin:0;padding:0 8px;background:#fff;color:#0f172a;font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;direction:rtl;">${html}</body></html>`;
    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!printWin) {
      URL.revokeObjectURL(blobUrl);
      window.print();
      return;
    }
    printWin.focus();
    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        printWin.print();
        printWin.onafterprint = () => {
          URL.revokeObjectURL(blobUrl);
          printWin.close();
        };
      } catch {
        URL.revokeObjectURL(blobUrl);
        printWin.close();
      }
    };
    printWin.addEventListener('load', () => setTimeout(doPrint, 400));
    setTimeout(() => {
      if (!printed && !printWin.closed && printWin.document?.readyState === 'complete') doPrint();
    }, 1500);
  };

  const openEditModal = (r: CtRecord) => {
    setEditingRecord(r);
    setEditForm({
      sttl_date_from: r.sttl_date_from?.slice(0, 10) ?? '',
      sttl_date_to: r.sttl_date_to?.slice(0, 10) ?? '',
      ct_value: String(r.ct_value ?? ''),
      ct_received_date: r.ct_received_date?.slice(0, 10) ?? '',
      notes: r.notes ?? '',
    });
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setEditForm({ sttl_date_from: '', sttl_date_to: '', ct_value: '', ct_received_date: '', notes: '' });
  };

  const handleUpdateCt = async () => {
    if (!editingRecord) return;
    const num = parseFloat(String(editForm.ct_value).replace(/,/g, ''));
    if (editForm.sttl_date_from === '' || editForm.sttl_date_to === '' || editForm.ct_received_date === '' || editForm.ct_value === '' || isNaN(num)) {
      toast({ title: 'تنبيه', description: 'مطلوب: من تاريخ التسوية، إلى تاريخ التسوية، تاريخ استلام CT، وقيمة CT', variant: 'destructive' });
      return;
    }
    try {
      setUpdateSubmitting(true);
      await api.put(`/rtgs/ct-records/${editingRecord.id}`, {
        sttl_date_from: editForm.sttl_date_from,
        sttl_date_to: editForm.sttl_date_to,
        ct_value: num,
        ct_received_date: editForm.ct_received_date,
        notes: editForm.notes || undefined,
      });
      toast({ title: 'تم', description: 'تم تعديل سجل CT بنجاح' });
      closeEditModal();
      fetchRecords();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل تعديل سجل CT', variant: 'destructive' });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleDeleteCt = async (r: CtRecord) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل CT (من ${formatDate(r.sttl_date_from)} إلى ${formatDate(r.sttl_date_to)})؟`)) return;
    try {
      setDeletingId(r.id);
      await api.delete(`/rtgs/ct-records/${r.id}`);
      toast({ title: 'تم', description: 'تم حذف سجل CT بنجاح' });
      fetchRecords();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: 'خطأ', description: err.response?.data?.error ?? 'فشل حذف سجل CT', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const ctNum = ctValue !== '' ? parseFloat(String(ctValue).replace(/,/g, '')) : NaN;
  const sumAcq = summary ? (typeof summary.sum_acq === 'number' ? summary.sum_acq : parseFloat(String(summary.sum_acq)) || 0) : 0;
  const ctRounded = !isNaN(ctNum) ? Math.round(ctNum * 1000000) / 1000000 : NaN;
  const acqRounded = Math.round(sumAcq * 1000000) / 1000000;
  const isMatched = summary && !isNaN(ctRounded)
    ? Math.abs(ctRounded - acqRounded) < 0.0001
    : null;

  const kpiTotal = records.length;
  const kpiMatched = records.filter((r) => r.match_status === 'matched').length;
  const kpiNotMatched = records.filter((r) => r.match_status === 'not_matched').length;
  const kpiTotalCtValue = records.reduce((sum, r) => sum + (Number(r.ct_value) || 0), 0);
  const hasActiveFilters = filterDateFrom || filterDateTo;

  const resetFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleDownloadAsImage = async () => {
    if (!detailContentRef.current || !detailRecord) return;
    setDownloadingImage(true);
    try {
      const dataUrl = await toPng(detailContentRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      const safeFrom = formatDate(detailRecord.sttl_date_from).replace(/\//g, '-');
      const safeTo = formatDate(detailRecord.sttl_date_to).replace(/\//g, '-');
      link.download = `ct_${safeFrom}_${safeTo}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'تم التحميل', description: 'تم حفظ الصورة بنجاح' });
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل حفظ الصورة', variant: 'destructive' });
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      }}
    >
      <div className="mx-auto print:max-w-none" style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div
          className="page-header-teal rounded-xl flex flex-wrap items-center justify-between gap-4 p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #026174 0%, #068294 100%)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)',
          }}
        >
          <div>
            <h1 className="text-2xl font-bold m-0 text-white">مطابقة العمولات (CT و عمولة التحصيل الحكومي)</h1>
            <p className="text-sm opacity-90 mt-1 m-0 text-white">
              إدراج قيمة CT من البنك المركزي ومطابقتها مع عمولة التحصيل الحكومي (ACQ) لفترة التسوية
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-full overflow-hidden border border-white/30 bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                كروت
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-[#026174] shadow' : 'text-white/90 hover:bg-white/10'}`}
              >
                <Table2 className="w-4 h-4" />
                جدول
              </button>
            </div>
            <Link
              to="/rtgs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-[#026174] hover:bg-white/95 transition-colors shadow"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى RTGS
            </Link>
          </div>
        </div>

        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'إجمالي السجلات', value: kpiTotal },
            { label: 'مطابق', value: kpiMatched },
            { label: 'غير مطابق', value: kpiNotMatched },
            { label: 'إجمالي قيمة CT (IQD)', value: formatNum(kpiTotalCtValue) },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl p-5 border-2" style={{ borderColor: 'var(--border-card)', background: 'var(--surface)' }}>
              <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
              <p className="text-xl font-extrabold m-0 tabular-nums" style={{ color: 'var(--text-strong)' }} dir="ltr">{item.value}</p>
            </div>
          ))}
        </div>

        {canCreateCt && (
        <div
          className="rounded-2xl mb-6 overflow-hidden print:break-inside-avoid"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '2px solid var(--border-card)',
          }}
        >
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-card)', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <Plus className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
            <span className="font-bold text-base" style={{ color: 'var(--text-strong)' }}>إدراج CT للمطابقة</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">من تاريخ التسوية <span className="text-red-500">*</span></label>
                <div className={dateInputWrapperClass}>
                  <input
                    type="date"
                    value={sttlDateFrom}
                    onChange={(e) => setSttlDateFrom(e.target.value)}
                    className={dateInputClass}
                  />
                  <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                    <Calendar className="w-5 h-5" strokeWidth={2} />
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">إلى تاريخ التسوية <span className="text-red-500">*</span></label>
                <div className={dateInputWrapperClass}>
                  <input
                    type="date"
                    value={sttlDateTo}
                    onChange={(e) => setSttlDateTo(e.target.value)}
                    className={dateInputClass}
                  />
                  <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                    <Calendar className="w-5 h-5" strokeWidth={2} />
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">قيمة CT <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ctValue}
                  onChange={(e) => setCtValue(e.target.value)}
                  placeholder="0.00"
                  className="ds-input w-full py-2.5 px-4"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ استلام CT من البنك المركزي <span className="text-red-500">*</span></label>
                <div className={dateInputWrapperClass}>
                  <input
                    type="date"
                    value={ctReceivedDate}
                    onChange={(e) => setCtReceivedDate(e.target.value)}
                    className={dateInputClass}
                  />
                  <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                    <Calendar className="w-5 h-5" strokeWidth={2} />
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleInsertCt}
                  disabled={submitting}
                  className="ds-btn ds-btn-primary w-full py-2.5 px-5"
                >
                  {submitting ? 'جاري الحفظ...' : 'إدراج CT للمطابقة'}
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات..."
                  className="ds-input w-full py-2.5 px-4"
                />
            </div>

            {/* ملخص عمولة التحصيل الحكومي للفترة */}
            {sttlDateFrom && sttlDateTo && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-bold text-neutral-700 m-0 mb-3">ملخص عمولة التحصيل الحكومي للفترة {formatDate(sttlDateFrom)} → {formatDate(sttlDateTo)}</p>
                {summaryLoading ? (
                  <Loading message="جاري جلب الملخص..." />
                ) : summary ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="order-1">
                      <p className="text-xs font-semibold text-neutral-600 m-0">عمولة التحصيل الحكومي (ACQ) — تُقارن مع قيمة CT</p>
                      <p className="text-lg font-bold text-slate-800 m-0 tabular-nums" dir="ltr">{formatNum(summary.sum_acq)}</p>
                    </div>
                    <div className="order-2">
                      <p className="text-xs font-semibold text-neutral-600 m-0">عدد الحركات</p>
                      <p className="text-lg font-bold text-neutral-900 m-0 tabular-nums" dir="ltr">{Number(summary.total_movements).toLocaleString('en-US')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 m-0">لا توجد حركات في هذه الفترة أو حدث خطأ في الجلب.</p>
                )}
                {summary && ctValue !== '' && !isNaN(ctRounded) && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center gap-2">
                    {isMatched ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="text-base font-semibold text-green-700">قيمة CT ({formatNum(ctRounded)}) تطابق عمولة التحصيل الحكومي ({formatNum(acqRounded)})</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-base font-semibold text-amber-700">
                          قيمة CT ({formatNum(ctRounded)}) لا تطابق عمولة التحصيل الحكومي ({formatNum(acqRounded)}). الفرق: {formatNum(Math.abs(ctRounded - acqRounded))}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* سجل CT وطباعة التقرير */}
        <div
          className="rounded-2xl overflow-hidden print:break-inside-avoid"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            border: '2px solid var(--border-card)',
          }}
        >
          {/* Filters */}
          <div
            className="rounded-t-2xl p-5 border-b"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              borderColor: 'var(--border-card)',
            }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  <Filter className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-base font-semibold text-slate-700">الفلاتر — سجل CT</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ds-btn ds-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  إلغاء الفلاتر
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2"
                >
                  <Printer className="w-4 h-4" />
                  طباعة تقرير مطابقة
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="ds-input w-full pl-3 pr-10 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="ds-input w-full pl-3 pr-10 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
          {recordsLoading ? (
            <div className="p-16 flex justify-center">
              <Loading message="جاري تحميل السجل..." />
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(8, 131, 149, 0.08)' }}>
                <FileCheck className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <p className="text-lg font-bold m-0" style={{ color: 'var(--text-strong)' }}>لا توجد سجلات CT حتى الآن</p>
              <p className="text-sm mt-2 m-0" style={{ color: 'var(--text-muted)' }}>استخدم «إدراج CT للمطابقة» أعلاه</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {records.map((r, index) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{
                        scale: 1.03,
                        y: -6,
                        zIndex: 20,
                        boxShadow: '0 20px 40px rgba(2, 97, 116, 0.18), 0 0 0 1px rgba(8, 131, 149, 0.2)',
                        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
                      }}
                      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-default"
                      style={{
                        background: 'var(--surface)',
                        border: '2px solid var(--border-card)',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                      }}
                    >
                      <div className="card-shine-hover absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl" />
                      <div
                        className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300"
                        style={{ right: 0, background: r.match_status === 'matched' ? 'linear-gradient(180deg, #059669 0%, #047857 100%)' : 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' }}
                      />
                      <div className="p-5 flex flex-col gap-3">
                        <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>
                          CT: {formatDate(r.sttl_date_from)} → {formatDate(r.sttl_date_to)}
                        </h3>
                        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(2, 97, 116, 0.04)', border: '1px solid var(--border)' }}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة CT</span><span className="tabular-nums font-bold" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(r.ct_value)} IQD</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عمولة التحصيل</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(r.sum_acq)} IQD</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>تاريخ استلام CT</span><span className="tabular-nums" dir="ltr">{formatDate(r.ct_received_date)}</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>المستخدم</span><span>{r.user_name ?? '—'}</span></div>
                          </div>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm font-bold ${r.match_status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.match_status === 'matched' ? (
                            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> مطابق</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4" /> غير مطابق</span>
                          )}
                        </div>
                        {/* زر عرض التفصيل + ختم التسويات (الختم في الجهة اليسرى — مثل التسويات الحكومية) */}
                        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailRecord(r)}
                              className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              عرض التفصيل
                            </button>
                            {canEditCt && (
                            <button type="button" onClick={() => openEditModal(r)} className="ds-btn ds-btn-outline p-2 rounded-lg" title="تعديل">
                              <Edit className="w-4 h-4" />
                            </button>
                            )}
                            {canDeleteCt && (
                            <button type="button" onClick={() => handleDeleteCt(r)} disabled={deletingId === r.id} className="p-2 rounded-lg border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            )}
                          </div>
                          <div className="flex-shrink-0 ms-auto" style={{ alignSelf: 'flex-end' }}>
                            <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-14 w-auto object-contain opacity-90" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible" style={{ isolation: 'isolate' }}>
              <table className="ds-table w-full" style={{ minWidth: '760px', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                    <th className="text-end py-4 px-4 font-bold text-white">من تاريخ</th>
                    <th className="text-end py-4 px-4 font-bold text-white">إلى تاريخ</th>
                    <th className="text-end py-4 px-4 font-bold text-white">قيمة CT (IQD)</th>
                    <th className="text-end py-4 px-4 font-bold text-white">تاريخ استلام CT</th>
                    <th className="text-end py-4 px-4 font-bold text-white">عمولة التحصيل (IQD)</th>
                    <th className="text-end py-4 px-4 font-bold text-white">الحالة</th>
                    <th className="text-end py-4 px-4 font-bold text-white">المستخدم</th>
                    <th className="text-end py-4 px-4 font-bold text-white">التاريخ</th>
                    <th className="text-end py-4 px-4 font-bold text-white print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-shadow duration-200"
                      style={{ position: 'relative', cursor: 'default' }}
                    >
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(r.sttl_date_from)}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(r.sttl_date_to)}</td>
                      <td className="py-3 px-4 font-bold tabular-nums" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(r.ct_value)}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(r.ct_received_date)}</td>
                      <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(r.sum_acq)}</td>
                      <td className="py-3 px-4">
                        {r.match_status === 'matched' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> مطابق</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold"><XCircle className="w-4 h-4" /> غير مطابق</span>
                        )}
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--text)' }}>{r.user_name ?? '—'}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }} dir="ltr">{formatDate(r.created_at?.slice(0, 10))}</td>
                      <td className="py-3 px-4 print:hidden">
                        <div className="flex items-center gap-2 justify-end">
                          {canEditCt && (
                          <button type="button" onClick={() => openEditModal(r)} className="ds-btn ds-btn-outline p-2 rounded-lg" title="تعديل">
                            <Edit className="w-4 h-4" />
                          </button>
                          )}
                          {canDeleteCt && (
                          <button type="button" onClick={() => handleDeleteCt(r)} disabled={deletingId === r.id} className="p-2 rounded-lg border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* نافذة تقرير مطابقة CT الشامل */}
        {reportOpen && (
          <div className="ct-report-print-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 print:bg-white print:p-0 backdrop-blur-sm" onClick={closeReport}>
            <div className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:bg-white" style={{ background: 'var(--surface)', border: '2px solid var(--border-card)' }} onClick={(e) => e.stopPropagation()} id="ct-matching-report-print">
              {reportLoading ? (
                <div className="p-12 flex justify-center">
                  <Loading message="جاري تحميل التقرير..." />
                </div>
              ) : reportData ? (
                <>
                  <div ref={reportContentRef} className="ct-report-content p-6 print:p-0 max-w-4xl mx-auto">
                    {/* ورق التقرير — خلفية وهمية للصفحة */}
                    <article className="bg-white rounded-2xl shadow-xl print:shadow-none print:rounded-none overflow-hidden print:overflow-visible min-h-[80vh] print:min-h-0">
                      <div className="p-8 print:py-8 print:px-0" style={{ background: 'var(--bg, #f6fafb)' }}>
                        {/* رأس التقرير — نفس تصميم الهيدر التيل */}
                        <header
                          className="report-print-header text-center mb-10 pt-6 pb-6 px-6 rounded-xl"
                          style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}
                        >
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/40 shadow-md flex items-center justify-center p-2">
                              <img src="/logo.png" alt="شعار الشركة" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div>
                              <h1 className="text-2xl sm:text-3xl font-extrabold m-0 tracking-tight text-white">مطابقة حوالة عمولات واردة من البنك المركزي</h1>
                              <p className="text-white/95 mt-2 m-0 text-base font-semibold">شركة الساقي لخدمات الدفع الإلكتروني</p>
                              <p className="text-white/90 font-bold mt-0.5 m-0 text-sm">قسم التسويات والمطابقات</p>
                            </div>
                          </div>
                          <div className="report-print-period inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3 px-6 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}>
                            <span className="text-white">فترة التسوية: <span className="font-bold" dir="ltr">{formatDate(reportData.period.sttl_date_from)} — {formatDate(reportData.period.sttl_date_to)}</span></span>
                            <span className="text-white/95" dir="ltr">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <p className="text-white/90 text-xs mt-3 mb-0">مصدر البيانات: جدول تفاصيل/ملخص التسوية (ملخص حركات RTGS — يقلل الاستهلاك ومشاكل النظام)</p>
                        </header>

                        {/* مؤشرات الأداء (KPI) — نفس تصميم KPI Cards */}
                        <section className="mb-10">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>
                            <Hash className="w-5 h-5" style={{ color: 'var(--primary-600)' }} /> مؤشرات الأداء
                          </h2>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { label: 'عدد الحركات', value: reportData.summary.total_movements.toLocaleString('en-US'), accent: 'linear-gradient(135deg, #068294 0%, #026174 100%)' },
                              { label: 'إجمالي المبلغ (IQD)', value: formatNum(reportData.summary.total_amount), accent: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
                              { label: 'الرسوم (Fees)', value: formatNum(reportData.summary.sum_fees), accent: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
                              { label: 'عمولة التحصيل (ACQ)', value: formatNum(reportData.summary.sum_acq), accent: 'linear-gradient(135deg, #026174 0%, #0f172a 100%)', primary: true },
                            ].map((kpi, i) => (
                              <div
                                key={i}
                                className="rounded-2xl p-5 relative overflow-hidden"
                                style={{ background: 'var(--surface)', border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}
                              >
                                <div className="absolute inset-y-0 start-0 w-1 rounded-s-2xl opacity-80" style={{ background: kpi.accent }} />
                                <p className="text-xs font-semibold uppercase tracking-wider m-0 mb-2" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                                <p className="text-2xl font-bold m-0 tabular-nums" dir="ltr" style={{ color: kpi.primary ? 'var(--primary-800)' : 'var(--text-strong)' }}>{kpi.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* مخطط عمولة التحصيل باليوم */}
                        <section className="mb-10 print:break-inside-avoid">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>مخطط عمولة التحصيل الحكومي (ACQ) باليوم</h2>
                          <div className="rounded-2xl p-5 h-[300px] print:h-[280px]" style={{ border: '2px solid var(--border-card)', background: 'var(--surface)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[...reportData.by_day].sort((a, b) => (a.sttl_date || '').localeCompare(b.sttl_date || '')).map((d) => ({ ...d, date: formatDate(d.sttl_date), acq: Number(d.sum_acq) }))} margin={{ top: 36, right: 24, left: 24, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} tickMargin={10} axisLine={{ stroke: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} tickFormatter={(v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })} width={58} axisLine={{ stroke: '#94a3b8' }} />
                                <Tooltip formatter={(value: number) => [value?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), 'عمولة التحصيل (ACQ)']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="acq" name="عمولة التحصيل (ACQ)" fill="#026174" radius={[6, 6, 0, 0]} maxBarSize={56}>
                                  <LabelList dataKey="acq" position="top" formatter={(v: number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })} style={{ fontSize: 13, fontWeight: 700, fill: '#0f172a' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>

                        {/* تفصيل حسب المصارف — مرتب أبجدياً حسب اسم المصرف */}
                        <section className="mb-10 print:break-inside-avoid" dir="rtl">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>تفصيل حسب المصارف</h2>
                          <div className="overflow-x-auto rounded-2xl print:shadow-none" style={{ border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                            <table className="w-full border-collapse text-sm print-cols-5 ds-table" dir="rtl" role="grid">
                              <colgroup className="print-cols-5-group">
                                <col /><col /><col /><col /><col />
                              </colgroup>
                              <thead>
                                <tr className="table-header-dark report-table-head" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white first:rounded-tr-2xl">المصرف</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">عدد الحركات</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">إجمالي المبلغ</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">الرسوم</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white last:rounded-tl-2xl">عمولة التحصيل (ACQ)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...reportData.by_bank].sort((a, b) => (a.bank_name || '').localeCompare(b.bank_name || '', 'ar')).map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="text-right py-3 px-5 text-slate-800 font-medium border-b border-slate-100">{row.bank_name}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_amount)}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_fees)}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-teal-700 font-semibold border-b border-slate-100" dir="ltr">{formatNum(row.sum_acq)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* تفصيل عمولة التحصيل حسب المديرية والمحافظة */}
                        <section className="mb-10 print:break-inside-avoid" dir="rtl">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>تفصيل عمولة التحصيل حسب المديرية والمحافظة</h2>
                          {(reportData.by_directorate_governorate?.length ?? 0) > 0 ? (() => {
                            const list = [...(reportData.by_directorate_governorate ?? [])].sort((a, b) => (b.sum_acq ?? 0) - (a.sum_acq ?? 0));
                            const totalAcq = reportData.summary.sum_acq || 1;
                            return (
                              <div className="overflow-x-auto rounded-2xl print:shadow-none" style={{ border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                                  <table className="w-full border-collapse text-sm print-cols-7 ds-table" dir="rtl" role="grid">
                                    <colgroup className="print-cols-7-group">
                                      <col /><col /><col /><col /><col /><col /><col />
                                    </colgroup>
                                    <thead>
                                      <tr className="table-header-dark report-table-head" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">المحافظة</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">المديرية</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">عدد الحركات</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">إجمالي المبلغ</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">الرسوم</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">عمولة التحصيل (ACQ)</th>
                                        <th scope="col" className="text-right py-4 px-3 font-bold text-sm text-white">النسبة من الإجمالي</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {list.map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                          <td className="text-right py-3 px-3 text-slate-800 font-medium border-b border-slate-100">{row.governorate}</td>
                                          <td className="text-right py-3 px-3 text-slate-800 border-b border-slate-100">{row.directorate_name}</td>
                                          <td className="text-right py-3 px-3 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                                          <td className="text-right py-3 px-3 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_amount)}</td>
                                          <td className="text-right py-3 px-3 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_fees)}</td>
                                          <td className="text-right py-3 px-3 tabular-nums text-teal-700 font-semibold border-b border-slate-100" dir="ltr">{formatNum(row.sum_acq)}</td>
                                          <td className="text-right py-3 px-3 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{totalAcq ? `${((row.sum_acq / totalAcq) * 100).toFixed(1)}%` : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                            );
                          })() : (
                            <p className="text-slate-500 bg-slate-50 rounded-xl border border-slate-200 py-6 px-4 text-center">لا توجد بيانات مجمّعة حسب المديرية والمحافظة. تأكد من ربط حركات RTGS بالتجار في جدول التجار (merchants) حتى تظهر المحافظة واسم المديرية.</p>
                          )}
                        </section>

                        {/* عمولة التحصيل باليوم — جدول مرتب حسب التاريخ من الأقدم إلى الأحدث */}
                        <section className="mb-10 print:break-inside-avoid" dir="rtl">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>عمولة التحصيل (ACQ) باليوم — تفصيل</h2>
                          <div className="overflow-x-auto rounded-2xl print:shadow-none" style={{ border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                            <table className="w-full border-collapse text-sm print-cols-5 ds-table" dir="rtl" role="grid">
                              <colgroup className="print-cols-5-group">
                                <col /><col /><col /><col /><col />
                              </colgroup>
                              <thead>
                                <tr className="table-header-dark report-table-head" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white first:rounded-tr-2xl">التاريخ</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">عدد الحركات</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">إجمالي المبلغ</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">الرسوم</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white last:rounded-tl-2xl">عمولة التحصيل (ACQ)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...reportData.by_day].sort((a, b) => (a.sttl_date || '').localeCompare(b.sttl_date || '')).map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="text-right py-3 px-5 font-medium text-slate-800 border-b border-slate-100" dir="ltr">{formatDate(row.sttl_date)}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{row.movement_count.toLocaleString('en-US')}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_amount)}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-slate-700 border-b border-slate-100" dir="ltr">{formatNum(row.sum_fees)}</td>
                                    <td className="text-right py-3 px-5 tabular-nums text-teal-700 font-semibold border-b border-slate-100" dir="ltr">{formatNum(row.sum_acq)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* المطابقة (CT مقابل عمولة التحصيل) — مرتب حسب من تاريخ من الأحدث إلى الأقدم */}
                        <section className="mb-10 print:break-inside-avoid" dir="rtl">
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 w-fit" style={{ color: 'var(--text-strong)', borderBottom: '2px solid var(--primary-600)' }}>المطابقة (CT مقابل عمولة التحصيل الحكومي)</h2>
                          <div className="overflow-x-auto rounded-2xl print:shadow-none" style={{ border: '2px solid var(--border-card)', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
                            <table className="w-full border-collapse text-sm print-cols-7 ds-table" dir="rtl" role="grid">
                              <colgroup className="print-cols-7-group">
                                <col /><col /><col /><col /><col /><col /><col />
                              </colgroup>
                              <thead>
                                <tr className="table-header-dark report-table-head" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white first:rounded-tr-2xl">من تاريخ</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">إلى تاريخ</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">قيمة CT</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">عمولة التحصيل</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">الحالة</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white">المستخدم</th>
                                  <th scope="col" className="text-right py-4 px-5 font-bold text-sm text-white last:rounded-tl-2xl">تاريخ الإدخال</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportData.ct_records.length === 0 ? (
                                  <tr><td colSpan={7} className="text-center py-8 text-slate-500 bg-slate-50">لا يوجد سجل CT لهذه الفترة</td></tr>
                                ) : (
                                  [...reportData.ct_records].sort((a, b) => (b.sttl_date_from || '').localeCompare(a.sttl_date_from || '') || (b.created_at || '').localeCompare(a.created_at || '')).map((r) => (
                                    <tr key={r.id} className="bg-white even:bg-slate-50/50">
                                      <td className="text-right py-3 px-5 border-b border-slate-100" dir="ltr">{formatDate(r.sttl_date_from)}</td>
                                      <td className="text-right py-3 px-5 border-b border-slate-100" dir="ltr">{formatDate(r.sttl_date_to)}</td>
                                      <td className="text-right py-3 px-5 tabular-nums font-semibold border-b border-slate-100" dir="ltr">{formatNum(r.ct_value)}</td>
                                      <td className="text-right py-3 px-5 tabular-nums text-teal-700 font-semibold border-b border-slate-100" dir="ltr">{formatNum(r.sum_acq)}</td>
                                      <td className="text-right py-3 px-5 border-b border-slate-100">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${r.match_status === 'matched' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.match_status === 'matched' ? 'مطابق' : 'غير مطابق'}</span>
                                      </td>
                                      <td className="text-right py-3 px-5 text-slate-700 border-b border-slate-100">{r.user_name ?? '—'}</td>
                                      <td className="text-right py-3 px-5 border-b border-slate-100" dir="ltr">{formatDate(r.created_at)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* تذييل — الختم في جهة اليسار (نفس التصميم) */}
                        <footer className="mt-12 pt-8 pb-4 rounded-2xl px-8 -mx-8 print:mx-0 print:px-0 print:rounded-none print:flex print:justify-end print:items-end" dir="rtl" style={{ borderTop: '2px solid var(--border-card)' }}>
                          <p className="text-sm font-bold mb-4 print:hidden" style={{ color: 'var(--text-strong)' }}>ختم قسم التسويات والمطابقات</p>
                          <img src="/stamp-settlement-reconciliation.png" alt="ختم قسم التسويات والمطابقات" className="h-32 w-auto object-contain mx-auto print:h-36 print:mx-0 print:mr-auto print:ml-0 opacity-90" />
                        </footer>
                      </div>
                    </article>
                  </div>
                  <div className="sticky bottom-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 print:hidden">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
                      <p className="text-sm font-medium text-amber-900 m-0">لطباعة التقرير بدون ترويسة أو تذييل (فارغة تماماً — بدون عنوان، تاريخ، وقت، أو رابط):</p>
                      <p className="text-sm text-amber-800 m-0 mt-1">في نافذة الطباعة اضغط «المزيد من الإعدادات» ثم أزل تحديد «الترويسات والتذييلات».</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={closeReport} className="ds-btn ds-btn-outline px-4 py-2">إغلاق</button>
                      <button type="button" onClick={printReportWindow} className="ds-btn ds-btn-primary px-4 py-2 inline-flex items-center gap-2">
                        <Printer className="w-4 h-4" /> طباعة
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* نافذة تعديل سجل CT */}
        <Dialog open={!!editingRecord} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
          <DialogContent className="max-w-lg w-full rounded-2xl gap-0 p-0 overflow-hidden" style={{ border: '2px solid var(--border-card)' }}>
            <DialogHeader className="p-6 pb-4 border-b flex-row justify-between items-center" style={{ borderColor: 'var(--border-card)' }}>
              <DialogTitle className="text-xl font-bold m-0" style={{ color: 'var(--text-strong)' }}>تعديل سجل CT</DialogTitle>
              <button type="button" onClick={closeEditModal} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="إغلاق">
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </DialogHeader>
            {editingRecord && (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">من تاريخ التسوية <span className="text-red-500">*</span></label>
                  <div className={dateInputWrapperClass}>
                    <input
                      type="date"
                      value={editForm.sttl_date_from}
                      onChange={(e) => setEditForm((f) => ({ ...f, sttl_date_from: e.target.value }))}
                      className={dateInputClass}
                    />
                    <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                      <Calendar className="w-5 h-5" strokeWidth={2} />
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">إلى تاريخ التسوية <span className="text-red-500">*</span></label>
                  <div className={dateInputWrapperClass}>
                    <input
                      type="date"
                      value={editForm.sttl_date_to}
                      onChange={(e) => setEditForm((f) => ({ ...f, sttl_date_to: e.target.value }))}
                      className={dateInputClass}
                    />
                    <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                      <Calendar className="w-5 h-5" strokeWidth={2} />
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">قيمة CT <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.ct_value}
                    onChange={(e) => setEditForm((f) => ({ ...f, ct_value: e.target.value }))}
                    placeholder="0.00"
                    className="ds-input w-full py-2.5 px-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ استلام CT من البنك المركزي <span className="text-red-500">*</span></label>
                  <div className={dateInputWrapperClass}>
                    <input
                      type="date"
                      value={editForm.ct_received_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, ct_received_date: e.target.value }))}
                      className={dateInputClass}
                    />
                    <span className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center bg-teal-100/80 text-teal-600 pointer-events-none rounded-l-xl">
                      <Calendar className="w-5 h-5" strokeWidth={2} />
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">ملاحظات</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="ملاحظات..."
                    className="ds-input w-full py-2.5 px-4"
                  />
                </div>
              </div>
              <DialogFooter className="flex items-center gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={closeEditModal} className="ds-btn ds-btn-outline px-4 py-2.5">
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCt}
                  disabled={updateSubmitting}
                  className="ds-btn ds-btn-primary px-4 py-2.5 disabled:opacity-50"
                >
                  {updateSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </DialogFooter>
            </div>
            )}
          </DialogContent>
        </Dialog>

        {/* نافذة عرض التفصيل — بحجم الشاشة (مثل التسويات الحكومية) */}
        <Dialog open={!!detailRecord} onOpenChange={(open) => { if (!open) { setDetailRecord(null); setDetailViewMode('table'); } }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-y-auto p-0 gap-0 rounded-2xl">
            {detailRecord && (
              <>
                <DialogHeader className="p-6 pb-4 border-b flex-row justify-between items-center gap-4 flex-wrap" style={{ borderColor: 'var(--border-card)' }}>
                  <DialogTitle className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
                    CT: {formatDate(detailRecord.sttl_date_from)} → {formatDate(detailRecord.sttl_date_to)}
                  </DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDetailViewMode('table')}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${detailViewMode === 'table' ? 'bg-[#068294] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Table2 className="w-4 h-4 inline-block ms-1" />
                        جدول
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailViewMode('cards')}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${detailViewMode === 'cards' ? 'bg-[#068294] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <LayoutGrid className="w-4 h-4 inline-block ms-1" />
                        كروت
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAsImage}
                      disabled={downloadingImage}
                      className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-70"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingImage ? 'جاري التحميل...' : 'تحميل كصورة'}
                    </button>
                  </div>
                </DialogHeader>
                <div className="p-6 overflow-auto bg-white flex justify-center">
                  <div
                    ref={detailContentRef}
                    className="bg-white"
                    style={{ width: 'fit-content', maxWidth: '100%', paddingBottom: '4rem' }}
                  >
                    {detailViewMode === 'table' ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="ds-table w-full">
                            <thead>
                              <tr className="table-header-dark" style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)' }}>
                                <th className="text-end py-4 px-4 font-bold text-white">من تاريخ</th>
                                <th className="text-end py-4 px-4 font-bold text-white">إلى تاريخ</th>
                                <th className="text-end py-4 px-4 font-bold text-white">قيمة CT (IQD)</th>
                                <th className="text-end py-4 px-4 font-bold text-white">تاريخ استلام CT</th>
                                <th className="text-end py-4 px-4 font-bold text-white">عمولة التحصيل (IQD)</th>
                                <th className="text-end py-4 px-4 font-bold text-white">الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-slate-50/80">
                                <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(detailRecord.sttl_date_from)}</td>
                                <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(detailRecord.sttl_date_to)}</td>
                                <td className="py-3 px-4 font-bold tabular-nums" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(detailRecord.ct_value)}</td>
                                <td className="py-3 px-4" style={{ color: 'var(--text)' }} dir="ltr">{formatDate(detailRecord.ct_received_date)}</td>
                                <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">{formatNum(detailRecord.sum_acq)}</td>
                                <td className="py-3 px-4">
                                  {detailRecord.match_status === 'matched' ? (
                                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> مطابق</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold"><XCircle className="w-4 h-4" /> غير مطابق</span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-6 mb-6 flex justify-end">
                          <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-24 w-auto object-contain opacity-90" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-4" style={{ maxWidth: '480px' }}>
                        <div
                          className="rounded-2xl overflow-hidden flex flex-col relative"
                          style={{
                            background: 'var(--surface)',
                            border: '2px solid var(--border-card)',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                          }}
                        >
                          <div className="absolute top-0 bottom-0 w-1 rounded-r-full opacity-80" style={{ right: 0, background: detailRecord.match_status === 'matched' ? 'linear-gradient(180deg, #059669 0%, #047857 100%)' : 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' }} aria-hidden />
                          <div className="p-6 flex flex-col gap-4">
                            <h3 className="text-xl font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>
                              CT: {formatDate(detailRecord.sttl_date_from)} → {formatDate(detailRecord.sttl_date_to)}
                            </h3>
                            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(2, 97, 116, 0.04)', border: '1px solid var(--border)' }}>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>قيمة CT</span><span className="tabular-nums font-bold" style={{ color: 'var(--primary-800)' }} dir="ltr">{formatNum(detailRecord.ct_value)} IQD</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>عمولة التحصيل</span><span className="tabular-nums font-medium" dir="ltr">{formatNum(detailRecord.sum_acq)} IQD</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>تاريخ استلام CT</span><span className="tabular-nums" dir="ltr">{formatDate(detailRecord.ct_received_date)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>المستخدم</span><span>{detailRecord.user_name ?? '—'}</span></div>
                              </div>
                            </div>
                            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${detailRecord.match_status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {detailRecord.match_status === 'matched' ? (
                                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> مطابق</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4" /> غير مطابق</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          <img src="/stamp-settlement-reconciliation.png" alt="ختم التسويات" className="h-20 w-auto object-contain opacity-90" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default CtMatching;
