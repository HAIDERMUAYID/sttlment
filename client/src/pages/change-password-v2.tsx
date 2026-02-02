import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Lock, Eye, EyeOff, Upload, X, User, Camera } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

export function ChangePasswordV2() {
  const { toast } = useToast();
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user data to get latest avatar
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get('/auth/verify');
      return response.data.user;
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'جميع الحقول مطلوبة',
        variant: 'destructive',
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة وتأكيدها غير متطابقين',
        variant: 'destructive',
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast({
        title: 'نجح',
        description: 'تم تغيير كلمة المرور بنجاح',
      });
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'خطأ',
        description: 'نوع الملف غير مدعوم. يُسمح فقط بملفات الصور (JPEG, PNG, GIF, WEBP)',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف كبير جداً. الحد الأقصى هو 5MB',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser({ avatarUrl: response.data.avatar_url });
      refetchUser();

      toast({
        title: 'نجح',
        description: 'تم رفع الصورة الشخصية بنجاح',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ في رفع الصورة',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      // إعادة تعيين قيمة الـ input للسماح برفع نفس الملف مرة أخرى
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await api.delete('/users/avatar');
      updateUser({ avatarUrl: null });
      refetchUser();

      toast({
        title: 'نجح',
        description: 'تم حذف الصورة الشخصية بنجاح',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.error || 'حدث خطأ في حذف الصورة',
        variant: 'destructive',
      });
    }
  };

  const avatarUrl = currentUser?.avatarUrl || user?.avatarUrl;
  const displayAvatarUrl = avatarUrl ? `${window.location.origin}${avatarUrl}` : null;

  return (
    <div className="min-h-screen p-6 md:p-8" dir="rtl" style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-header-teal rounded-xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(2, 97, 116, 0.35)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold m-0 text-white">الإعدادات الشخصية</h1>
              <p className="text-sm opacity-95 mt-1 m-0 text-white">إدارة الصورة الشخصية وكلمة المرور</p>
            </div>
          </div>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl p-6 border-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
            </div>
            <h2 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>الصورة الشخصية</h2>
          </div>
          <div className="flex items-center gap-6">
            <Avatar
              src={displayAvatarUrl}
              alt={user?.name || ''}
              size="xl"
            />
            <div className="flex-1 space-y-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 text-[var(--primary-600)] hover:bg-[#eef9fb] hover:border-[#026174]"
                  style={{ borderColor: 'var(--primary-600)' }}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  {uploadingAvatar ? 'جاري الرفع...' : 'رفع صورة جديدة'}
                </Button>
              </div>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarDelete}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <X className="h-4 w-4 ml-2" />
                  حذف الصورة
                </Button>
              )}
              <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                يُسمح بملفات الصور (JPEG, PNG, GIF, WEBP) بحد أقصى 5MB
              </p>
            </div>
          </div>
        </motion.div>

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl p-6 border-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2, 97, 116, 0.1)' }}>
              <Lock className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
            </div>
            <h2 className="text-base font-bold m-0" style={{ color: 'var(--text-strong)' }}>تغيير كلمة المرور</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold block" style={{ color: 'var(--text-strong)' }}>كلمة المرور الحالية *</label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, currentPassword: e.target.value })
                  }
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                  className="border-2 border-[#b8dce2] focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold block" style={{ color: 'var(--text-strong)' }}>كلمة المرور الجديدة *</label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  className="border-2 border-[#b8dce2] focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                يجب أن تكون 6 أحرف على الأقل
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold block" style={{ color: 'var(--text-strong)' }}>تأكيد كلمة المرور الجديدة *</label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  required
                  className="border-2 border-[#b8dce2] focus:border-[#026174] focus:ring-2 focus:ring-[#026174]/20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-white border-0"
              style={{ background: 'linear-gradient(135deg, #026174 0%, #068294 100%)', boxShadow: '0 4px 12px rgba(2, 97, 116, 0.35)' }}
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تغيير كلمة المرور'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
