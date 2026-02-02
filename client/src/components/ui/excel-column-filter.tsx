import * as React from 'react';
import { Search, ArrowDownAZ, ArrowUpAZ, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExcelColumnFilterProps {
  columnKey: string;
  columnLabel: string;
  options: string[];
  value: string; // comma-separated selected values, empty = all
  onChange: (value: string) => void;
  sortDirection: 'asc' | 'desc' | null;
  onSortChange: (dir: 'asc' | 'desc' | null) => void;
  trigger: React.ReactNode;
  className?: string;
}

const FILTER_CONDITIONS = [
  { value: 'contains', label: 'يحتوي على' },
  { value: 'equals', label: 'يساوي' },
  { value: 'startsWith', label: 'يبدأ بـ' },
];

export function ExcelColumnFilter({
  columnKey,
  columnLabel,
  options,
  value,
  onChange,
  sortDirection,
  onSortChange,
  trigger,
  className,
}: ExcelColumnFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [condition, setCondition] = React.useState('contains');
  const [autoApply, setAutoApply] = React.useState(true);
  const [draft, setDraft] = React.useState(value);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value, open]);

  const selectedSet = React.useMemo(() => {
    const s = (draft || '').split(',').map((x) => x.trim()).filter(Boolean);
    return new Set(s);
  }, [draft]);

  const filteredOptions = React.useMemo(() => {
    let list = options;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((opt) => {
        const v = (opt || '').toLowerCase();
        if (condition === 'contains') return v.includes(q);
        if (condition === 'equals') return v === q;
        if (condition === 'startsWith') return v.startsWith(q);
        return v.includes(q);
      });
    }
    return list;
  }, [options, search, condition]);

  const selectAllChecked =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => selectedSet.has(opt));
  const selectAllIndeterminate =
    filteredOptions.some((opt) => selectedSet.has(opt)) && !selectAllChecked;

  React.useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectAllIndeterminate;
  }, [selectAllIndeterminate]);

  const toggleOption = (opt: string) => {
    const next = new Set(selectedSet);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    const arr = options.filter((o) => next.has(o));
    const newVal = arr.join(',');
    setDraft(newVal);
    if (autoApply) onChange(newVal);
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      const next = new Set(selectedSet);
      filteredOptions.forEach((o) => next.delete(o));
      const arr = options.filter((o) => next.has(o));
      const newVal = arr.join(',');
      setDraft(newVal);
      if (autoApply) onChange(newVal);
    } else {
      const next = new Set(selectedSet);
      filteredOptions.forEach((o) => next.add(o));
      const arr = options.filter((o) => next.has(o));
      const newVal = arr.join(',');
      setDraft(newVal);
      if (autoApply) onChange(newVal);
    }
  };

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setDraft('');
    onChange('');
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <>
          <div
            className="absolute z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl py-3 min-w-[280px] max-w-[320px]"
            style={{ left: 0, top: '100%' }}
          >
            {/* فرز */}
            <div className="px-3 mb-2">
              <p className="text-xs font-bold text-slate-600 mb-1.5">فرز</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSortChange(sortDirection === 'desc' ? null : 'desc')
                  }
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    sortDirection === 'desc'
                      ? 'bg-[#026174] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                  تنازلي
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSortChange(sortDirection === 'asc' ? null : 'asc')
                  }
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    sortDirection === 'asc'
                      ? 'bg-[#026174] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  <ArrowUpAZ className="w-3.5 h-3.5" />
                  تصاعدي
                </button>
              </div>
            </div>

            {/* تصفية — بحث */}
            <div className="px-3 mb-2">
              <p className="text-xs font-bold text-slate-600 mb-1.5">تصفية</p>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="بحث"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pr-8 pl-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#026174]/30 focus:border-[#026174]"
                  />
                </div>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#026174]/30"
                >
                  {FILTER_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* قائمة الاختيار */}
            <div className="px-3 mb-2">
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    checked={selectAllChecked}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#026174] focus:ring-[#026174]"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    تحديد الكل
                  </span>
                </label>
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    لا توجد نتائج
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(opt)}
                        onChange={() => toggleOption(opt)}
                        className="rounded border-slate-300 text-[#026174] focus:ring-[#026174]"
                      />
                      <span className="truncate text-slate-800">{opt || '-'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* أزرار */}
            <div className="px-3 flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="rounded border-slate-300 text-[#026174] focus:ring-[#026174]"
                />
                <span className="text-xs text-slate-600">تطبيق تلقائي</span>
              </label>
              <div className="flex gap-1.5 ms-auto">
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #026174, #068294)' }}
                >
                  تطبيق عامل التصفية
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  إلغاء تحديد عامل التصفية
                </button>
              </div>
            </div>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        </>
      )}
    </div>
  );
}
