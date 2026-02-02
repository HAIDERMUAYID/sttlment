import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
        className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center',
        className
      )}
      style={{ borderColor: 'rgba(6, 130, 148, 0.25)', background: 'rgba(255,255,255,0.9)' }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm"
        style={{ borderColor: 'rgba(6, 130, 148, 0.3)', color: '#068294' }}
      >
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-bold" style={{ color: '#2A6E85' }}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm" style={{ color: '#068294' }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 rounded-xl font-semibold"
          style={{ background: '#068294', color: '#fff' }}
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
