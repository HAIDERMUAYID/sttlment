import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const LOGO_SRC = '/logo.png';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showFallback?: boolean;
  /** حلقة توهج خفيفة حول الشعار */
  showRing?: boolean;
  /** على خلفية داكنة (تيل): إطار أبيض وظل أوضح لبروز الشعار */
  onDarkBackground?: boolean;
}

const sizes = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-16 h-16' };
const ringSizes = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-20 h-20' };

export function CompanyLogo({
  className,
  size = 'md',
  animated = true,
  showFallback = true,
  showRing = false,
  onDarkBackground = false,
}: CompanyLogoProps) {
  const [error, setError] = useState(false);

  const content = (
    <>
      {!error ? (
        <img
          src={LOGO_SRC}
          alt="شعار الشركة"
          className={cn('w-[70%] h-[70%] object-contain select-none pointer-events-none', onDarkBackground && 'drop-shadow-sm')}
          onError={() => setError(true)}
        />
      ) : showFallback ? (
        <span
          className={cn('font-bold select-none', onDarkBackground ? 'text-white' : 'text-slate-600')}
          style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '1.25rem' : '1rem' }}
        >
          ن
        </span>
      ) : null}
    </>
  );

  const boxClasses = cn(
    'rounded-xl overflow-hidden flex items-center justify-center bg-white',
    sizes[size],
    onDarkBackground ? 'border-0' : 'border border-slate-200',
    className
  );

  const boxShadow = onDarkBackground
    ? '0 4px 16px rgba(0,0,0,0.15)'
    : '0 2px 12px rgba(6, 130, 148, 0.15)';

  const box = (
    <div className={boxClasses} style={{ boxShadow }}>
      {content}
    </div>
  );

  if (!animated) return box;

  const shadowCycle = onDarkBackground
    ? [
        '0 4px 16px rgba(0,0,0,0.12)',
        '0 8px 24px rgba(0,0,0,0.18), 0 0 24px rgba(255,255,255,0.08)',
        '0 4px 16px rgba(0,0,0,0.12)',
      ]
    : [
        '0 2px 12px rgba(6, 130, 148, 0.2)',
        '0 8px 28px rgba(6, 130, 148, 0.35), 0 0 16px rgba(6, 130, 148, 0.2)',
        '0 2px 12px rgba(6, 130, 148, 0.2)',
      ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative inline-flex items-center justify-center"
    >
      {/* حلقة توهج مستمرة — بدون حدود، توهج فقط */}
      <motion.div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-0 pointer-events-none',
          ringSizes[size]
        )}
        style={{
          boxShadow: onDarkBackground ? '0 0 24px rgba(255,255,255,0.15)' : '0 0 20px rgba(6, 130, 148, 0.2)',
        }}
        animate={{
          scale: [1, 1.25, 1.4, 1.25, 1],
          opacity: [0.4, 0.7, 0.35, 0.6, 0.4],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      />
      {/* توهج ثانوي — إيقاع مختلف، بدون حدود */}
      <motion.div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-0 pointer-events-none',
          ringSizes[size]
        )}
        style={{
          boxShadow: onDarkBackground ? '0 0 16px rgba(255,255,255,0.1)' : '0 0 14px rgba(6, 130, 148, 0.15)',
        }}
        animate={{
          scale: [1.1, 1.35, 1.1],
          opacity: [0.25, 0.5, 0.25],
        }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      />
      {/* الشعار — نبض خفيف مستمر، بدون حدود */}
      <motion.div
        className={cn(
          'relative rounded-xl flex items-center justify-center bg-white',
          sizes[size],
          onDarkBackground ? 'border-0' : 'border border-slate-200'
        )}
        animate={{
          scale: [1, 1.05, 1.08, 1.05, 1],
          boxShadow: shadowCycle,
        }}
        transition={{
          scale: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
          boxShadow: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
