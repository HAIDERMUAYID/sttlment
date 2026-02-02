import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface CountUpNumberProps {
  value: number | string;
  duration?: number;
  className?: string;
  decimals?: number;
}

/** عرض رقم متحرك (count-up) باستخدام GSAP */
function CountUpNumber({ value, duration = 1, className = '', decimals = 0 }: CountUpNumberProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef({ num: 0 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const isNum = typeof value === 'number' && !Number.isNaN(value);
    const targetValue = isNum ? value : (typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : 0);
    if (Number.isNaN(targetValue)) {
      el.textContent = String(value);
      return;
    }

    objRef.current.num = objRef.current.num ?? 0;

    gsap.to(objRef.current, {
      num: targetValue,
      duration,
      ease: 'power3.out',
      overwrite: true,
      snap: { num: decimals > 0 ? 1 / Math.pow(10, decimals) : 1 },
      onUpdate: () => {
        const n = objRef.current.num;
        el.textContent = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
      },
    });
    return () => gsap.killTweensOf(objRef.current);
  }, [value, duration, decimals]);

  if (typeof value === 'string' && !/[\d.-]/.test(value)) {
    return <span className={className}>{value}</span>;
  }

  return <span ref={elRef} className={className} />;
}

export default CountUpNumber;
