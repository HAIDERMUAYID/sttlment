import { useEffect, useRef, useState } from 'react';
import { loginTheme } from '@/lib/theme-tokens';

/**
 * خلفية تسجيل الدخول: Aurora / gradient mesh + noise + radial spotlight (اختياري يتبع الماوس)
 */
export function LoginBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* Base gradient mesh / aurora */}
      <div
        className="absolute inset-0 opacity-[0.92]"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 20% 20%, ${loginTheme.accentLighter}18 0%, transparent 50%),
            radial-gradient(ellipse 80% 100% at 80% 80%, ${loginTheme.secondary}14 0%, transparent 45%),
            radial-gradient(ellipse 90% 70% at 50% 50%, ${loginTheme.accent}0c 0%, transparent 55%),
            linear-gradient(165deg, ${loginTheme.surface} 0%, #f0f7f8 40%, #e8f2f3 100%)
          `,
        }}
      />

      {/* Subtle radial spotlight following mouse */}
      <div
        className="absolute inset-0 opacity-40 transition-opacity duration-700"
        style={{
          background: `radial-gradient(
            circle 35vmax at ${mouse.x * 100}% ${mouse.y * 100}%,
            rgba(255,255,255,0.25) 0%,
            transparent 55%
          )`,
        }}
      />

      {/* Noise / grain — very subtle */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
