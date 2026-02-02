import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ListTodo,
  Calendar,
  FileText,
  FolderTree,
  Landmark,
  Banknote,
  FileStack,
  BarChart3,
  Users,
  ClipboardList,
  Tv,
  Settings,
  Key,
} from 'lucide-react';

export interface PermissionDef {
  id: number;
  page_key: string;
  page_label_ar: string;
  page_path: string;
  actions: { key: string; label_ar: string }[];
  sort_order: number;
}

const PAGE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  schedules: Calendar,
  templates: FileText,
  categories: FolderTree,
  rtgs: Landmark,
  government_settlements: Banknote,
  ct_matching: FileStack,
  merchant_disbursements: Banknote,
  reports: BarChart3,
  attendance: ClipboardList,
  merchants: Landmark,
  users: Users,
  audit_log: FileText,
  tv_settings: Tv,
  rtgs_settings: Settings,
  change_password: Key,
};

const GROUP_LABELS: Record<string, string> = {
  main: 'القسم الرئيسي وإدارة المهام',
  reports: 'التقارير والتحليلات',
  admin: 'الإدارة والإعدادات',
};

function getGroup(pageKey: string): string {
  if (['dashboard', 'tasks', 'schedules', 'templates', 'categories'].includes(pageKey)) return 'main';
  if (['rtgs', 'government_settlements', 'ct_matching', 'merchant_disbursements', 'reports'].includes(pageKey)) return 'reports';
  return 'admin';
}

export type PermissionsMap = Record<string, Record<string, boolean>>;

export interface PermissionTreeProps {
  definitions: PermissionDef[];
  value: PermissionsMap;
  onChange: (value: PermissionsMap) => void;
  maxHeight?: string;
  excludePageKeys?: string[];
}

export function PermissionTree({
  definitions,
  value,
  onChange,
  maxHeight = '400px',
  excludePageKeys = ['change_password'],
}: PermissionTreeProps) {
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const togglePage = (pageKey: string) => {
    setExpandedPages((p) => ({ ...p, [pageKey]: !p[pageKey] }));
  };

  const toggleAction = (pageKey: string, actionKey: string, checked: boolean) => {
    onChange({
      ...value,
      [pageKey]: { ...(value[pageKey] || {}), [actionKey]: checked },
    });
  };

  const selectAllPage = (pageKey: string, checked: boolean) => {
    const def = definitions.find((d) => d.page_key === pageKey);
    if (!def) return;
    const updates: Record<string, boolean> = {};
    def.actions.forEach((a) => { updates[a.key] = checked; });
    onChange({
      ...value,
      [pageKey]: { ...(value[pageKey] || {}), ...updates },
    });
  };

  const sortedDefs = definitions
    .filter((d) => !excludePageKeys.includes(d.page_key))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const byGroup = sortedDefs.reduce<Record<string, PermissionDef[]>>((acc, def) => {
    const g = getGroup(def.page_key);
    if (!acc[g]) acc[g] = [];
    acc[g].push(def);
    return acc;
  }, {});
  const groupOrder = ['main', 'reports', 'admin'];

  return (
    <div
      className="rounded-xl border-2 overflow-y-auto"
      style={{
        borderColor: '#e2e8f0',
        background: '#fafbfc',
        maxHeight,
      }}
    >
      <div className="p-4 space-y-6">
        {groupOrder.map((groupKey) => {
          const defs = byGroup[groupKey];
          if (!defs?.length) return null;
          const label = GROUP_LABELS[groupKey] || groupKey;
          return (
            <div key={groupKey}>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: '#64748b' }}>
                {label}
              </h3>
              <div className="space-y-2">
                {defs.map((def) => {
                  const expanded = expandedPages[def.page_key] !== false;
                  const pagePerms = value[def.page_key] || {};
                  const actions = Array.isArray(def.actions) ? def.actions : [];
                  const allChecked = actions.length > 0 && actions.every((a) => pagePerms[a.key] === true);
                  const someChecked = actions.some((a) => pagePerms[a.key] === true);
                  const Icon = PAGE_ICONS[def.page_key];
                  return (
                    <div
                      key={def.page_key}
                      className="rounded-lg overflow-hidden border-2 transition-colors"
                      style={{
                        borderColor: someChecked ? 'rgba(6, 130, 148, 0.3)' : '#e2e8f0',
                        background: expanded ? '#fff' : (someChecked ? 'rgba(6, 130, 148, 0.04)' : '#fff'),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => togglePage(def.page_key)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-right border-0 cursor-pointer transition-colors hover:opacity-90 text-sm"
                        style={{
                          background: someChecked ? 'linear-gradient(90deg, rgba(6, 130, 148, 0.06) 0%, transparent 100%)' : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(6, 130, 148, 0.1)', color: '#026174' }}
                            >
                              <Icon size={16} />
                            </div>
                          )}
                          <span className="font-semibold" style={{ color: 'var(--text-strong)' }}>
                            {def.page_label_ar}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {someChecked && (
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(6, 130, 148, 0.15)', color: '#0d9488' }}
                            >
                              {actions.filter((a) => pagePerms[a.key]).length}/{actions.length}
                            </span>
                          )}
                          {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                        </div>
                      </button>
                      {expanded && (
                        <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: '#f1f5f9', background: '#fff' }}>
                          <label className="flex items-center gap-2 mb-3 py-1.5 cursor-pointer select-none" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => {
                                if (el) (el as HTMLInputElement).indeterminate = someChecked && !allChecked;
                              }}
                              onChange={(e) => selectAllPage(def.page_key, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-2 cursor-pointer accent-[#026174]"
                              style={{ borderColor: '#94a3b8' }}
                            />
                            <span className="text-xs font-bold" style={{ color: '#475569' }}>
                              تحديد الكل
                            </span>
                          </label>
                          <div className="grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                            {actions.map((action) => (
                              <label key={action.key} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                                <input
                                  type="checkbox"
                                  checked={pagePerms[action.key] === true}
                                  onChange={(e) => toggleAction(def.page_key, action.key, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-2 cursor-pointer accent-[#026174]"
                                  style={{ borderColor: '#94a3b8' }}
                                />
                                <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                                  {action.label_ar}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
