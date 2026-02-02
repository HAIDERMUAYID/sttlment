import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#BBBCC0' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#068294' }} />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium"
          style={{ color: '#444' }}
        >
          جاري تحميل الصفحة...
        </motion.p>
      </motion.div>
    </div>
  );
}
