import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#BBBCC0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-6 max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-8"
        >
          <h1 className="text-9xl font-bold mb-4" style={{ color: '#068294' }}>
            404
          </h1>
          <div className="h-1 w-24 mx-auto rounded-full" style={{ background: '#068294' }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
            الصفحة غير موجودة
          </h2>
          <p className="text-lg mb-8" style={{ color: '#444' }}>
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4 justify-center"
        >
          <Link to="/dashboard">
            <Button
              style={{
                background: '#068294',
                color: '#ffffff',
                border: 'none',
              }}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              <span>العودة للوحة التحكم</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            style={{
              borderColor: '#068294',
              color: '#068294',
            }}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للخلف</span>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
