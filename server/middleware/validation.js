const { z } = require('zod');

// Validation schemas
const schemas = {
  login: z.object({
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
  }),

  createUser: z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    role: z.enum(['admin', 'supervisor', 'employee', 'viewer', 'accountant'], {
      errorMap: () => ({ message: 'الدور يجب أن يكون admin أو supervisor أو employee أو viewer أو accountant' }),
    }),
    can_create_ad_hoc: z.boolean().optional(),
    active: z.boolean().optional(),
  }),

  createCategory: z.object({
    name: z.string().min(1, 'اسم الفئة مطلوب'),
    description: z.string().optional(),
    active: z.boolean().optional(),
  }),

  createTemplate: z.object({
    title: z.string().min(1, 'عنوان القالب مطلوب'),
    categoryId: z.number().optional().nullable(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  }),

  createSchedule: z.object({
    templateId: z.number().min(1, 'معرف القالب مطلوب'),
    frequencyType: z.enum(['daily', 'weekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    dayOfWeekSingle: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    dueTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'وقت غير صحيح'),
    graceMinutes: z.number().min(0).optional(),
    defaultAssigneeUserId: z.number().optional().nullable(),
    active: z.boolean().optional(),
  }),

  executeTask: z.object({
    dailyTaskId: z.number().optional().nullable(),
    adHocTaskId: z.number().optional().nullable(),
    resultStatus: z.enum(['completed', 'completed_late', 'skipped', 'cancelled']),
    notes: z.string().optional(),
    durationMinutes: z.number().min(0).optional().nullable(),
  }),

  createAdHocTask: z.object({
    templateId: z.number().optional().nullable(),
    categoryId: z.number().optional().nullable(),
    title: z.string().min(1, 'العنوان مطلوب'),
    description: z.string().optional(),
    beneficiary: z.string().optional(),
    dueDateTime: z.string().optional().nullable(),
  }),
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Schema not found' });
    }

    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'خطأ في التحقق من البيانات',
          details: errors,
        });
      }
      return res.status(500).json({ error: 'خطأ في التحقق' });
    }
  };
};

module.exports = { validate, schemas };
