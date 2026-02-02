import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, 'أدخل البريد الإلكتروني')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string().min(1, 'أدخل كلمة المرور'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
