import * as React from 'react';
import { cn } from '@/lib/utils';

const INPUT_ERROR_BORDER = 'rgba(220, 38, 38, 0.6)';
const INPUT_BORDER = 'rgba(2, 97, 116, 0.25)';
const INPUT_FOCUS_RING = '0 0 0 2px rgba(2, 97, 116, 0.25)';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** عند true يظهر الحقل بحالة خطأ (حد أحمر + aria-invalid) */
  error?: boolean;
  /** id لعنصر رسالة الخطأ لربط aria-describedby */
  errorId?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, error, errorId, onFocus, onBlur, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = error ? INPUT_ERROR_BORDER : '#068294';
      e.target.style.boxShadow = error ? 'none' : INPUT_FOCUS_RING;
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = error ? INPUT_ERROR_BORDER : INPUT_BORDER;
      e.target.style.boxShadow = 'none';
      onBlur?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#026174]/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
          className
        )}
        style={{
          borderColor: error ? INPUT_ERROR_BORDER : INPUT_BORDER,
          background: '#ffffff',
          color: '#0f172a',
          ...(style || {}),
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
