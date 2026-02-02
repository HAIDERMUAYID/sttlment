import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAMP_SRC = '/stamp-settlement-reconciliation.png';

interface SettlementStampProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number;
  /** نص مخصص تحت الختم */
  subtitle?: string;
}

export function SettlementStamp({
  show,
  onComplete,
  duration = 2400,
  subtitle = 'تسوية مطابقة',
}: SettlementStampProps) {
  const [visible, setVisible] = useState(show);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setVisible(show);
    setProgress(0);
    if (!show) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / duration) * 100, 100));
    }, 50);
    const t = setTimeout(() => {
      clearInterval(interval);
      setVisible(false);
      onComplete?.();
    }, duration);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md"
          style={{ background: 'rgba(42, 110, 133, 0.35)' }}
          aria-hidden="true"
        >
          {/* حلقة نجاح متحركة */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.15 }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute w-72 h-72 rounded-full border-4 border-emerald-400"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.1 }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute w-64 h-64 rounded-full border-4 border-[#068294]"
          />

          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
              className="relative"
            >
              <img
                src={STAMP_SRC}
                alt="ختم التسوية"
                className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                style={{
                  filter: 'drop-shadow(0 10px 32px rgba(0,0,0,0.35)) drop-shadow(0 0 0 1px rgba(255,255,255,0.1))',
                }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                aria-hidden
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-4 text-xl font-bold text-white drop-shadow-lg"
            >
              {subtitle}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-1 text-sm text-white/80"
            >
              تم حفظ التنفيذ بنجاح
            </motion.p>

            {/* شريط تقدم صغير */}
            <div className="mt-6 w-48 h-1 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
