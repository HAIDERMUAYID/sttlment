/**
 * Theme tokens — Enterprise / Medical UI
 * Palette: #09637E, #088395, #068294, #026174, #7AB2B2, #EBF4F6
 */

export const loginTheme = {
  /** Primary teal — أغمق */
  primary: '#026174',
  primaryHover: '#034a58',
  primaryMuted: 'rgba(2, 97, 116, 0.12)',

  /** Accent — أفتح */
  accent: '#068294',
  accentHover: '#056a7a',
  accentLight: '#088395',
  accentLighter: '#09637E',

  /** Secondary / soft */
  secondary: '#7AB2B2',
  secondaryMuted: 'rgba(122, 178, 178, 0.2)',

  /** Backgrounds — تدرج teal واضح (بدون رمادي) */
  surface: '#c5e8ec',
  surfaceGradient: 'linear-gradient(165deg, #a8dde4 0%, #c5e8ec 35%, #d8f2f5 70%, #e8f8fa 100%)',
  surfaceCard: 'rgba(255, 255, 255, 0.92)',
  surfaceCardBorder: 'rgba(255, 255, 255, 0.6)',

  /** Text */
  text: '#0f172a',
  textMuted: '#2d5f6f',
  textOnPrimary: '#ffffff',

  /** Form / inputs — بدل الرمادي */
  inputBg: '#ffffff',
  inputBorder: 'rgba(2, 97, 116, 0.2)',
  inputIcon: '#068294',
  linkMuted: '#056a7a',

  /** States */
  error: '#dc2626',
  errorMuted: 'rgba(220, 38, 38, 0.12)',
  success: '#16a34a',
  successMuted: 'rgba(22, 163, 74, 0.12)',

  /** Focus / ring (accessibility) */
  ring: 'rgba(2, 97, 116, 0.45)',
  ringOffset: '#ffffff',

  /** Border */
  border: 'rgba(2, 97, 116, 0.22)',
  borderFocus: '#026174',
} as const;

export type LoginTheme = typeof loginTheme;
