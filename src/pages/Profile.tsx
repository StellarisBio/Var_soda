import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Mail, Lock, Eye, EyeOff, Shield, Camera } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import * as api from '@/utils/api';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useI18n();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 基本信息
  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 头像上传
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 修改密码
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setInstitution(user.institution || '');
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setProfileMsg(null);
    try {
      const res = await api.uploadAvatar(file);
      useAuthStore.setState({ user: res.data.user });
      setProfileMsg({ type: 'success', text: t('profile.avatarUploaded') });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || t('profile.avatarUploadFailed') });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!name.trim()) {
      setProfileMsg({ type: 'error', text: t('profile.nameRequired') });
      return;
    }

    setProfileSaving(true);
    try {
      const res = await api.updateProfile({ name: name.trim(), institution: institution.trim() || undefined });
      // 更新 auth store 中的用户信息
      useAuthStore.setState({ user: res.data });
      setProfileMsg({ type: 'success', text: t('profile.profileSaved') });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: t('auth.minPassword') });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: t('profile.passwordMismatch') });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: t('profile.passwordChanged') });
      // 密码修改成功后退出登录
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || t('profile.currentPasswordWrong') });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('profile.title')}</h1>

      {/* 基本信息 */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('profile.basicInfo')}</h2>

        {profileMsg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {profileMsg.text}
          </div>
        )}

        {/* 头像上传 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-50 text-cyan dark:bg-cyan-900/30 dark:text-cyan-400">
                <User size={36} />
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-cyan text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50"
              title={t('profile.changeAvatar')}
            >
              <Camera size={14} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-navy dark:text-white">{t('profile.avatar')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('profile.avatarHint')}</p>
            {avatarUploading && (
              <p className="mt-1 text-xs text-cyan dark:text-cyan-400">{t('common.loading')}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.email')}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.name')} *</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.institution')}</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.role')}</label>
            <div className="relative">
              <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
              <input
                type="text"
                value={t(`roles.${user?.role}`)}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-lg bg-cyan px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
          >
            {profileSaving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        </form>
      </div>

      {/* 修改密码 */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('profile.changePassword')}</h2>

        {passwordMsg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.currentPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                placeholder={t('profile.currentPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.newPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                placeholder={t('profile.newPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.confirmNewPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                placeholder={t('profile.confirmNewPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-600 disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
          >
            {passwordSaving ? t('profile.changing') : t('profile.changePasswordBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
