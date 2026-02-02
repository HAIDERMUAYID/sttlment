import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion';
import { Hash } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function AnimatedKpiNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useMotionValueEvent(rounded, 'change', setDisplay);
  useEffect(() => {
    const c = animate(count, value, { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] });
    return () => c.stop();
  }, [value, count]);
  return <span>{display}</span>;
}

export interface KpiItem {
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  glow: string;
  gradient: string;
  /** When provided, displays formatted string instead of animated number (e.g. for amounts) */
  formatDisplay?: (v: number) => string;
}

interface KpiCardsProps {
  items: KpiItem[];
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {items.map((item, idx) => {
        const Icon = item.Icon ?? Hash;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: idx * 0.08,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="group relative overflow-hidden rounded-2xl cursor-default"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
              border: '2px solid var(--border-card)',
            }}
            whileHover={{
              y: -8,
              scale: 1.04,
              boxShadow: `0 24px 48px rgba(15,23,42,0.15), 0 0 0 1px rgba(0,0,0,0.06), 0 0 40px ${item.glow}`,
              transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
          >
            <motion.div
              className="absolute top-0 right-0 left-0 h-1 opacity-80"
              style={{ background: item.gradient, transformOrigin: 'right' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.08 + 0.2, duration: 0.5, ease: 'easeOut' }}
            />
            <div className="card-shine-hover absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: 0 }} />
            <motion.div
              className="absolute inset-y-0 start-0 w-1 rounded-s-2xl group-hover:w-1.5 transition-all duration-300"
              style={{ background: item.gradient, boxShadow: `0 0 12px ${item.glow}` }}
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }}
            />
            <div className="p-5 flex items-center gap-4 relative z-10">
              <motion.div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(145deg, ${item.color}18 0%, ${item.color}08 100%)`,
                  boxShadow: `inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 12px ${item.color}30`,
                }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.12, rotate: 6 }}
              >
                <Icon className="w-6 h-6" style={{ color: item.color }} strokeWidth={2.5} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold m-0 mb-1 tracking-wide uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{item.label}</p>
                <p className="text-xl font-extrabold m-0 leading-tight tabular-nums" style={{ color: 'var(--text-strong)' }} dir="ltr">
                  {item.formatDisplay ? item.formatDisplay(item.value) : <AnimatedKpiNumber value={item.value} />}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
