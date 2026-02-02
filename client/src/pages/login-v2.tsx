import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { loginFormSchema, type LoginFormValues } from '@/lib/login-schema';
import { loginTheme } from '@/lib/theme-tokens';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, Info, Sparkles, LayoutDashboard, Users, FileCheck, BarChart3, Calendar, Shield, Building2, Target, ClipboardList, MessageCircle } from 'lucide-react';

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export function LoginV2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const [knowMoreOpen, setKnowMoreOpen] = useState(false);
  const [knowMoreSlide, setKnowMoreSlide] = useState(0);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const KNOW_MORE_SLIDES = 5;
  const KNOW_MORE_DURATION_MS = 5500;
  const ADMIN_WHATSAPP = '9647714383663';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    document.body.classList.add('login-page-active');
    return () => document.body.classList.remove('login-page-active');
  }, []);

  useEffect(() => {
    if (!knowMoreOpen) return;
    setKnowMoreSlide(0);
    const t = setInterval(() => {
      setKnowMoreSlide((prev) => (prev + 1) % KNOW_MORE_SLIDES);
    }, KNOW_MORE_DURATION_MS);
    return () => clearInterval(t);
  }, [knowMoreOpen]);

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    setSubmitState('loading');
    try {
      const response = await api.post('/auth/login', data);
      const { user, token } = response.data;
      setAuth(user, token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setSubmitState('success');
      toast({ title: 'تم تسجيل الدخول بنجاح', variant: 'success' });
      await new Promise((r) => setTimeout(r, 400));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setSubmitState('error');
      const msg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK' ? 'لا يمكن الاتصال بالخادم' : 'حدث خطأ أثناء تسجيل الدخول');
      setApiError(msg);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
      await new Promise((r) => setTimeout(r, 800));
      setSubmitState('idle');
    }
  };

  return (
    <div
      className="login-page-root min-h-screen flex flex-col font-arabic"
      dir="rtl"
      style={{
        fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
        background: loginTheme.surfaceGradient,
      }}
    >
      <div className="flex-1 flex items-center justify-center md:p-6 w-full min-h-0">
        <div className="w-full flex flex-col md:flex-row md:max-w-5xl md:min-h-[580px] md:rounded-2xl md:overflow-hidden md:shadow-2xl">
        {/* Right panel — العلامة التجارية + تدرج متحرك */}
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex md:w-[45%] lg:w-[50%] flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
          style={{
            background: `linear-gradient(165deg, ${loginTheme.primary} 0%, ${loginTheme.accentLight} 45%, ${loginTheme.accent} 100%)`,
            boxShadow: '4px 0 24px rgba(2, 97, 116, 0.2)',
          }}
        >
          {/* لمعان خفيف متحرك */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.12) 0%, transparent 45%)',
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* دوائر متحركة في الزاوية */}
          <motion.div
            className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.12]"
            style={{ background: 'white' }}
            animate={{
              x: ['-30%', '-25%', '-30%'],
              y: ['30%', '25%', '30%'],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[28rem] h-[28rem] rounded-full opacity-[0.08]"
            style={{ background: 'white' }}
            animate={{
              x: ['-20%', '-15%', '-20%'],
              y: ['20%', '18%', '20%'],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* أشكال منحنية شفافة — كالعرض التقديمي */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden
          >
            <div
              className="absolute -bottom-1/4 -right-1/4 w-[90%] h-[80%] rounded-full opacity-[0.12]"
              style={{ background: 'rgba(255,255,255,0.4)' }}
            />
            <div
              className="absolute -top-1/4 -left-1/4 w-[50%] h-[60%] rounded-full opacity-[0.08]"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
          </div>

          <div className="relative z-10">
            {/* شعار الشركة — خلفية بيضاء لوضوح أفضل + متحرك */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -5, 0],
              }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 0.4 },
                y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="mb-10 inline-block rounded-2xl px-6 py-4 shadow-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              }}
            >
              <img
                src="/logo.png"
                alt="شعار شركة الساقي لخدمات الدفع الالكتروني"
                className="h-20 w-auto object-contain select-none max-w-[260px]"
                style={{ filter: 'contrast(1.05)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight drop-shadow-sm"
            >
              نظام ادارة المهام
            </motion.h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-white text-base lg:text-lg max-w-sm space-y-1.5"
            >
              <p className="m-0 font-semibold text-white drop-shadow-sm">شركة الساقي لخدمات الدفع الالكتروني</p>
              <p className="m-0 text-white/90 text-sm lg:text-base">قسم التسويات والمطابقة</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="relative z-10"
          >
            <Dialog open={knowMoreOpen} onOpenChange={setKnowMoreOpen}>
              <DialogTrigger asChild>
                <motion.button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white border border-white/40 bg-white/15 hover:bg-white/25 transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="اعرف المزيد عن النظام"
                >
                  <Info className="w-4 h-4" />
                  اعرف المزيد
                </motion.button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-2xl p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl" style={{ border: 'none', boxShadow: '0 25px 50px -12px rgba(2, 97, 116, 0.2), 0 0 0 1px rgba(6, 130, 148, 0.1)' }}>
                {/* رأس ثابت — شعار + عنوان رسمي (بدون عبارة عرض تقديمي) */}
                <header
                  className="relative px-6 sm:px-8 pt-6 pb-5 pr-14 sm:pr-16 text-right flex-shrink-0"
                  style={{ background: `linear-gradient(165deg, ${loginTheme.primary} 0%, ${loginTheme.accentLight} 45%, ${loginTheme.accent} 100%)` }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_0%,transparent_50%)]" aria-hidden />
                  <div className="relative flex items-center gap-4">
                    <div className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.95)', width: 56, height: 56 }}>
                      <img src="/logo.png" alt="" className="w-full h-full object-contain p-1.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl sm:text-2xl font-bold text-white m-0 tracking-tight">عن النظام</DialogTitle>
                      <p className="text-white/90 text-sm mt-0.5">نظام إدارة المهام والحضور — قسم التسويات والمطابقة</p>
                    </div>
                  </div>
                </header>

                {/* منطقة الشرائح — تقليب تلقائي */}
                <div className="flex-1 min-h-[320px] overflow-hidden relative px-6 sm:px-8 py-6 border-t" style={{ background: '#fff', borderColor: loginTheme.inputBorder }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {knowMoreSlide === 0 && (
                      <motion.div
                        key="slide-0"
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -48 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8 py-6 text-right"
                      >
                        <p className="text-base sm:text-lg leading-relaxed m-0" style={{ color: loginTheme.text }}>
                          <strong>نظام إدارة المهام والحضور</strong> منصة رسمية تابعة لـ <strong>قسم التسويات والمطابقة</strong> في شركة الساقي لخدمات الدفع الإلكتروني،
                          وتُعنى بتوحيد إدارة المهام، الحضور، التسويات المالية، ومطابقة العمليات مع أنظمة الدفع الإلكتروني.
                        </p>
                      </motion.div>
                    )}
                    {knowMoreSlide === 1 && (
                      <motion.div
                        key="slide-1"
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -48 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 overflow-y-auto px-6 sm:px-8 py-6"
                      >
                        <h3 className="text-sm font-bold uppercase tracking-wide m-0 mb-3 flex items-center gap-2" style={{ color: loginTheme.primary }}>
                          <Target className="w-4 h-4" />
                          مميزات النظام
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: ClipboardList, title: 'إدارة المهام', desc: 'تتبع المهام والجداول والقوالب' },
                            { icon: Calendar, title: 'الحضور والجداول', desc: 'تسجيل الحضور وجداول الدوريات' },
                            { icon: FileCheck, title: 'التسويات والمطابقة', desc: 'RTGS، التسويات الحكومية، مطابقة RRN' },
                            { icon: BarChart3, title: 'التقارير', desc: 'تقارير أداء وإحصائيات ولوحات تحكم' },
                            { icon: Users, title: 'الصلاحيات', desc: 'مدير، مشرف، موظف — صلاحيات مرنة' },
                            { icon: Shield, title: 'التكامل', desc: 'تكامل مع أنظمة الدفع الإلكتروني' },
                          ].map((item, i) => (
                            <motion.div
                              key={item.title}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.3 }}
                              className="flex items-start gap-3 p-4 rounded-xl border text-right"
                              style={{ borderColor: loginTheme.inputBorder, background: loginTheme.primaryMuted }}
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.9)', color: loginTheme.accent }}>
                                <item.icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm m-0" style={{ color: loginTheme.text }}>{item.title}</p>
                                <p className="text-xs leading-relaxed m-0 mt-0.5" style={{ color: loginTheme.textMuted }}>{item.desc}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {knowMoreSlide === 2 && (
                      <motion.div
                        key="slide-2"
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -48 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 overflow-y-auto px-6 sm:px-8 py-6"
                      >
                        <h3 className="text-sm font-bold uppercase tracking-wide m-0 mb-3 flex items-center gap-2" style={{ color: loginTheme.primary }}>
                          <LayoutDashboard className="w-4 h-4" />
                          الوحدات والخدمات
                        </h3>
                        <ul className="list-none p-0 m-0 space-y-2.5 text-right">
                          {['لوحة التحكم والمؤشرات', 'المهام والجداول والقوالب', 'الحضور وجداول الدوريات', 'التسويات الحكومية و RTGS', 'مطابقة RRN والتصدير', 'التقارير والإحصائيات'].map((label, i) => (
                            <motion.li
                              key={label}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.3 }}
                              className="flex items-center gap-2 text-sm"
                              style={{ color: loginTheme.textMuted }}
                            >
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: loginTheme.success }} />
                              {label}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                    {knowMoreSlide === 3 && (
                      <motion.div
                        key="slide-3"
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -48 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8 py-6"
                      >
                        <h3 className="text-sm font-bold uppercase tracking-wide m-0 mb-4 flex items-center gap-2" style={{ color: loginTheme.primary }}>
                          <Shield className="w-4 h-4" />
                          صلاحيات المستخدمين
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {['مدير النظام', 'مشرف', 'موظف'].map((role, i) => (
                            <motion.span
                              key={role}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1, duration: 0.3 }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                              style={{ background: loginTheme.secondaryMuted, color: loginTheme.accent }}
                            >
                              <Users className="w-4 h-4" />
                              {role}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {knowMoreSlide === 4 && (
                      <motion.div
                        key="slide-4"
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -48 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 py-6 text-center"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full max-w-md mx-auto">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.35 }}
                            className="flex-shrink-0 rounded-xl overflow-hidden shadow-md border"
                            style={{ borderColor: loginTheme.inputBorder, width: 100, height: 100 }}
                          >
                            <img src="/logo.png" alt="شعار الشركة" className="w-full h-full object-contain p-2 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold m-0" style={{ color: loginTheme.primary }}>شركة الساقي لخدمات الدفع الإلكتروني</p>
                            <p className="text-sm mt-1.5 m-0 font-medium" style={{ color: loginTheme.textMuted }}>قسم التسويات والمطابقة</p>
                          </div>
                        </div>
                        <motion.div
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.4 }}
                          className="mt-8 flex justify-center"
                          aria-hidden
                        >
                          <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0" style={{ filter: 'drop-shadow(0 2px 8px rgba(2,97,116,0.2))' }}>
                            <circle cx="60" cy="60" r="54" fill="none" stroke={loginTheme.primary} strokeWidth="3" />
                            <circle cx="60" cy="60" r="46" fill="none" stroke={loginTheme.accent} strokeWidth="1.5" opacity={0.8} />
                            <circle cx="60" cy="60" r="22" fill="none" stroke={loginTheme.primary} strokeWidth="1.5" opacity={0.5} />
                            <text x="60" y="56" textAnchor="middle" fill={loginTheme.primary} style={{ fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 11, fontWeight: 700 }}>شركة الساقي</text>
                            <text x="60" y="68" textAnchor="middle" fill={loginTheme.accent} style={{ fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 9 }}>الدفع الإلكتروني</text>
                          </svg>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* شريط تقدم + نقاط الشرائح */}
                <div className="flex-shrink-0 px-6 sm:px-8 pb-6 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: loginTheme.primaryMuted }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: loginTheme.accent }}
                        initial={{ width: 0 }}
                        animate={{ width: `${((knowMoreSlide + 1) / KNOW_MORE_SLIDES) * 100}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {Array.from({ length: KNOW_MORE_SLIDES }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setKnowMoreSlide(i)}
                          className="w-2.5 h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                          style={{
                            background: i === knowMoreSlide ? loginTheme.accent : loginTheme.primaryMuted,
                            transform: i === knowMoreSlide ? 'scale(1.2)' : 'scale(1)',
                          }}
                          aria-label={`الشريحة ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </motion.aside>

        {/* Left panel — نموذج تسجيل الدخول (خلفية بيضاء) */}
        <motion.main
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white min-h-screen md:min-h-0"
        >
        <div className="w-full max-w-[400px]">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="text-2xl font-bold mb-1"
            style={{ color: loginTheme.text }}
          >
            مرحباً بعودتك
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="text-base mb-8"
            style={{ color: loginTheme.textMuted }}
          >
            تسجيل الدخول للمتابعة
          </motion.p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="space-y-1.5"
            >
              <label
                htmlFor="login-email"
                className="text-sm font-medium block"
                style={{ color: loginTheme.text }}
              >
                البريد الإلكتروني
              </label>
              <motion.div
                className="relative"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Mail
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  style={{ color: loginTheme.inputIcon }}
                  aria-hidden
                />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@company.com"
                  error={!!errors.email}
                  errorId="login-email-error"
                  className="pr-11 h-12 rounded-xl border text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#026174]/40 disabled:opacity-60"
                  style={{
                    color: loginTheme.text,
                    borderColor: loginTheme.inputBorder,
                    background: loginTheme.inputBg,
                  }}
                  disabled={submitState === 'loading'}
                  {...register('email')}
                />
              </motion.div>
              <AnimatePresence mode="wait">
                {errors.email?.message && (
                  <motion.p
                    id="login-email-error"
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm"
                    style={{ color: loginTheme.error }}
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="space-y-1.5"
            >
              <label
                htmlFor="login-password"
                className="text-sm font-medium block"
                style={{ color: loginTheme.text }}
              >
                كلمة المرور
              </label>
              <motion.div
                className="relative"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Lock
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  style={{ color: loginTheme.inputIcon }}
                  aria-hidden
                />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  error={!!errors.password}
                  errorId="login-password-error"
                  className="pr-11 pl-12 h-12 rounded-xl border text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#026174]/40 disabled:opacity-60"
                  style={{
                    color: loginTheme.text,
                    borderColor: loginTheme.inputBorder,
                    background: loginTheme.inputBg,
                  }}
                  disabled={submitState === 'loading'}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg hover:opacity-80"
                  style={{ color: loginTheme.inputIcon }}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              </motion.div>
              <AnimatePresence mode="wait">
                {errors.password?.message && (
                  <motion.p
                    id="login-password-error"
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm"
                    style={{ color: loginTheme.error }}
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-center py-1"
                  style={{ color: loginTheme.error }}
                >
                  {apiError}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
            >
              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#026174]/40 shadow-md hover:shadow-lg"
                style={{
                  background: loginTheme.primary,
                  color: loginTheme.textOnPrimary,
                  boxShadow: '0 4px 14px rgba(2, 97, 116, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (submitState !== 'loading' && submitState !== 'success') {
                    e.currentTarget.style.background = loginTheme.primaryHover;
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(2, 97, 116, 0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = loginTheme.primary;
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 97, 116, 0.3)';
                }}
                disabled={submitState === 'loading' || submitState === 'success'}
                aria-busy={submitState === 'loading'}
                aria-live="polite"
              >
                <AnimatePresence mode="wait">
                  {submitState === 'loading' && (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Loader2 className="w-5 h-5 shrink-0 animate-spin" aria-hidden />
                      جاري التحقق...
                    </motion.span>
                  )}
                  {submitState === 'success' && (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden />
                      تم تسجيل الدخول
                    </motion.span>
                  )}
                  {(submitState === 'idle' || submitState === 'error') && (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <LogIn className="w-5 h-5 shrink-0" aria-hidden />
                      تسجيل الدخول
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="text-center"
            >
              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <button
                  type="button"
                  className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#026174]/40 rounded px-1"
                  style={{ color: loginTheme.linkMuted }}
                  onClick={() => setForgotPasswordOpen(true)}
                  aria-label="نسيت كلمة المرور"
                >
                  نسيت كلمة المرور؟
                </button>
                <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-xl" dir="rtl" style={{ border: 'none', boxShadow: '0 20px 40px -12px rgba(2, 97, 116, 0.2)' }}>
                  <div className="px-6 sm:px-8 pt-6 pb-5 text-right" style={{ background: `linear-gradient(135deg, ${loginTheme.primary} 0%, ${loginTheme.accent} 100%)` }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-white m-0">استعادة كلمة المرور</DialogTitle>
                        <DialogDescription asChild>
                          <p className="text-white/90 text-sm mt-0.5 m-0">تواصل مع مدير النظام</p>
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 sm:px-8 py-6 space-y-5">
                    <p className="text-sm text-right m-0" style={{ color: loginTheme.textMuted }}>
                      لاستعادة كلمة المرور أو أي استفسار، يرجى التواصل مع مدير النظام عبر الزر أدناه.
                    </p>
                    <div className="rounded-xl p-4 text-right" style={{ background: loginTheme.primaryMuted, borderColor: loginTheme.inputBorder, borderWidth: 1 }}>
                      <p className="text-xs m-0 uppercase tracking-wide" style={{ color: loginTheme.textMuted }}>مدير النظام</p>
                      <p className="text-base font-semibold mt-1 m-0" style={{ color: loginTheme.primary }}>السيد حيدر الحكيم</p>
                    </div>
                    <a
                      href={`https://wa.me/${ADMIN_WHATSAPP}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-95 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]/50"
                      style={{ background: '#25D366', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)' }}
                    >
                      <MessageCircle className="w-5 h-5" />
                      التواصل عبر واتساب
                    </a>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          </form>
        </div>
        </motion.main>
        </div>
      </div>
      <footer
        className="flex-shrink-0 text-center py-3 px-4 text-sm"
        style={{ color: loginTheme.textMuted }}
        dir="rtl"
      >
        جميع الحقوق محفوظة لقسم التسويات — شركة الساقي للدفع الألكتروني © 2026
      </footer>
    </div>
  );
}
