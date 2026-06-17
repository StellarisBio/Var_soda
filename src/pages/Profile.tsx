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
    // 页面根容器 - 添加入场动画，居中布局
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      {/* 页面标题 - 使用 font-display (Manrope) 字体 */}
      <h1 className="font-display text-2xl font-bold text-base-100 dark:text-white">{t('profile.title')}</h1>

      {/* 基本信息 - 使用 glass 玻璃态卡片 */}
      <div className="glass rounded-xl p-6">
        {/* 卡片标题 - font-display 字体 */}
        <h2 className="mb-4 font-display text-lg font-semibold text-base-100 dark:text-white">{t('profile.basicInfo')}</h2>

        {/* 消息提示 - helix→pos(翠绿), coral→neg(玫瑰红) 颜色映射 */}
        {profileMsg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${profileMsg.type === 'success' ? 'bg-pos/10 text-pos dark:bg-pos/20 dark:text-pos-light' : 'bg-neg/10 text-neg dark:bg-neg/20 dark:text-neg-light'}`}>
            {profileMsg.text}
          </div>
        )}

        {/* 头像上传区域 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            {user?.avatar ? (
              // 用户头像 - ring-base-700 边框
              <img
                src={user.avatar}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-base-700 dark:ring-base-600"
              />
            ) : (
              // 默认头像 - helix→pos(翠绿) 颜色映射
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pos/10 text-pos dark:bg-pos/20 dark:text-pos-light">
                <User size={36} />
              </div>
            )}
            {/* 头像上传按钮 - 使用 glow-btn 发光按钮类 */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full glow-btn text-base-900 disabled:opacity-50"
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
            {/* 头像标签 - navy→base 颜色映射 */}
            <p className="text-sm font-medium text-base-100 dark:text-white">{t('profile.avatar')}</p>
            {/* 提示文字 - gray-400→base-400 颜色映射 */}
            <p className="text-xs text-base-400 dark:text-base-500">{t('profile.avatarHint')}</p>
            {/* 加载状态 - cyan→helix→pos 颜色映射 */}
            {avatarUploading && (
              <p className="mt-1 text-xs text-pos dark:text-pos-light">{t('common.loading')}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* 邮箱字段 - 禁用状态 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.email')}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-600" />
              {/* 禁用输入框 - bg-base-800/50 border-base-700 符合新设计规范 */}
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-400"
              />
            </div>
          </div>

          {/* 姓名字段 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.name')} *</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
              {/* 输入框 - focus:border-action focus:ring-2 focus:ring-action/20 符合新设计规范 */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-500 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </div>
          </div>

          {/* 机构字段 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.institution')}</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-500 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </div>
          </div>

          {/* 角色字段 - 禁用状态 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.role')}</label>
            <div className="relative">
              <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-600" />
              <input
                type="text"
                value={t(`roles.${user?.role}`)}
                disabled
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-400"
              />
            </div>
          </div>

          {/* 保存按钮 - 使用 glow-btn 发光按钮类 */}
          <button
            type="submit"
            disabled={profileSaving}
            className="glow-btn rounded-xl px-6 py-2.5 text-sm font-semibold text-base-900 disabled:opacity-50"
          >
            {profileSaving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        </form>
      </div>

      {/* 修改密码 - 使用 glass 玻璃态卡片 */}
      <div className="glass rounded-xl p-6">
        {/* 卡片标题 - font-display 字体 */}
        <h2 className="mb-4 font-display text-lg font-semibold text-base-100 dark:text-white">{t('profile.changePassword')}</h2>

        {/* 消息提示 - helix→pos(翠绿), coral→neg(玫瑰红) 颜色映射 */}
        {passwordMsg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${passwordMsg.type === 'success' ? 'bg-pos/10 text-pos dark:bg-pos/20 dark:text-pos-light' : 'bg-neg/10 text-neg dark:bg-neg/20 dark:text-neg-light'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* 当前密码字段 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.currentPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-500 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                placeholder={t('profile.currentPasswordPlaceholder')}
              />
              {/* 密码显示/隐藏按钮 */}
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200 dark:hover:text-base-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 新密码字段 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.newPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-500 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                placeholder={t('profile.newPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200 dark:hover:text-base-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 确认新密码字段 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-base-300 dark:text-base-300">{t('profile.confirmNewPassword')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
              <input
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-500 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                placeholder={t('profile.confirmNewPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200 dark:hover:text-base-300"
              >
                {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 修改密码按钮 - navy→base 颜色映射 */}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-xl bg-base-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-base-600 disabled:opacity-50"
          >
            {passwordSaving ? t('profile.changing') : t('profile.changePasswordBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
