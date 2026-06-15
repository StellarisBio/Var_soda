import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Dna, Eye, EyeOff, X, KeyRound, Send, Smartphone, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import * as api from '@/utils/api';

type LoginTab = 'email' | 'phone';
type ResetType = 'email' | 'phone';

export default function Login() {
  const [loginTab, setLoginTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginByPhone } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // 手机验证码倒计时
  const [phoneCodeCountdown, setPhoneCodeCountdown] = useState(0);
  const [phoneCodeSending, setPhoneCodeSending] = useState(false);

  useEffect(() => {
    if (phoneCodeCountdown <= 0) return;
    const timer = setTimeout(() => setPhoneCodeCountdown(phoneCodeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [phoneCodeCountdown]);

  const handleSendPhoneCode = useCallback(async () => {
    if (!phone) {
      setError(t('auth.pleaseEnterPhone'));
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError(t('auth.phoneInvalid'));
      return;
    }
    setPhoneCodeSending(true);
    setError('');
    try {
      const res = await api.sendVerificationCode(phone, 'phone', 'login');
      setPhoneCodeCountdown(60);
      if (res.devCode) {
        setPhoneCode(res.devCode);
      }
    } catch (err: any) {
      setError(err.message || t('auth.codeSendFailed'));
    } finally {
      setPhoneCodeSending(false);
    }
  }, [phone, t]);

  // 忘记密码弹窗状态
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<ResetType>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetVerificationCode, setResetVerificationCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // 重置密码验证码倒计时
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeSending, setCodeSending] = useState(false);

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  const handleSendResetCode = useCallback(async () => {
    const target = resetType === 'email' ? resetEmail : resetPhone;
    if (!target) {
      setResetError(resetType === 'email' ? t('auth.pleaseEnterEmail') : t('auth.pleaseEnterPhone'));
      return;
    }
    if (resetType === 'phone' && !/^1[3-9]\d{9}$/.test(resetPhone)) {
      setResetError(t('auth.phoneInvalid'));
      return;
    }
    setCodeSending(true);
    setResetError('');
    try {
      const res = await api.sendVerificationCode(target, resetType, 'reset_password');
      setCodeCountdown(60);
      if (res.devCode) {
        setResetVerificationCode(res.devCode);
      }
    } catch (err: any) {
      setResetError(err.message || t('auth.codeSendFailed'));
    } finally {
      setCodeSending(false);
    }
  }, [resetType, resetEmail, resetPhone, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginTab === 'email') {
        await login(email, password);
      } else {
        if (!phoneCode) {
          setError(t('auth.codeRequired'));
          setLoading(false);
          return;
        }
        await loginByPhone(phone, phoneCode);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    if (!resetVerificationCode) {
      setResetError(t('auth.codeRequired'));
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError(t('auth.minPassword'));
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError(t('auth.passwordMismatch'));
      return;
    }

    setResetLoading(true);
    try {
      const target = resetType === 'email' ? resetEmail : resetPhone;
      await api.resetPassword({
        target,
        type: resetType,
        newPassword: resetNewPassword,
        verificationCode: resetVerificationCode,
      });
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || t('auth.resetFailed'));
    } finally {
      setResetLoading(false);
    }
  };

  const openResetModal = () => {
    setResetEmail(email);
    setResetPhone('');
    setResetVerificationCode('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
    setCodeCountdown(0);
    setShowResetModal(true);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-navy via-navy-600 to-navy-800 px-4">
      {/* Language & Theme toggle - 页面右上角 */}
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
        </button>
        <button
          onClick={toggleLang}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          {lang === 'zh' ? '中文' : 'EN'} / {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-cyan/10 p-4">
            <Dna size={40} className="text-cyan" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white">
            WES<span className="text-cyan">DB</span>
          </h1>
          <p className="mt-2 text-navy-200">{t('auth.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <h2 className="mb-6 font-serif text-xl font-semibold text-navy dark:text-white">{t('auth.signIn')}</h2>

          {/* 登录方式 Tab */}
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            <button
              type="button"
              onClick={() => { setLoginTab('email'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                loginTab === 'email' ? 'bg-white text-navy shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Mail size={16} />
              {t('auth.loginByEmail')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginTab('phone'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                loginTab === 'phone' ? 'bg-white text-navy shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Smartphone size={16} />
              {t('auth.loginByPhone')}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginTab === 'email' ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                      placeholder={t('auth.emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* 忘记密码 */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openResetModal}
                    className="text-sm font-medium text-cyan hover:underline dark:text-cyan-400"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.phone')}</label>
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                      placeholder={t('auth.phonePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.verificationCode')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Send size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm tracking-widest focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                        placeholder={t('auth.verificationCodePlaceholder')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendPhoneCode}
                      disabled={phoneCodeCountdown > 0 || phoneCodeSending || !phone}
                      className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-600 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {phoneCodeSending
                        ? '...'
                        : phoneCodeCountdown > 0
                          ? `${phoneCodeCountdown}${t('auth.secondsLater')}`
                          : t('auth.sendCode')}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-cyan hover:underline dark:text-cyan-400">
              {t('auth.goToRegister')}
            </Link>
          </p>
        </div>
      </div>

      {/* 重置密码弹窗 */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-cyan" />
                <h3 className="font-serif text-lg font-semibold text-navy dark:text-white">{t('auth.resetPasswordTitle')}</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* 重置方式 Tab */}
            <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => { setResetType('email'); setResetError(''); setCodeCountdown(0); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  resetType === 'email' ? 'bg-white text-navy shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Mail size={14} />
                {t('auth.resetByEmail')}
              </button>
              <button
                type="button"
                onClick={() => { setResetType('phone'); setResetError(''); setCodeCountdown(0); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  resetType === 'phone' ? 'bg-white text-navy shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Smartphone size={14} />
                {t('auth.resetByPhone')}
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {resetType === 'email' ? t('auth.resetPasswordDesc') : t('auth.resetPasswordDescPhone')}
            </p>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {t('auth.resetSuccess')}
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setPassword('');
                  }}
                  className="w-full rounded-lg bg-cyan py-2.5 text-sm font-semibold text-white hover:bg-cyan-600"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {resetError}
                  </div>
                )}

                {resetType === 'email' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                        placeholder={t('auth.emailPlaceholder')}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.phone')}</label>
                    <div className="relative">
                      <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="tel"
                        value={resetPhone}
                        onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                        placeholder={t('auth.phonePlaceholder')}
                      />
                    </div>
                  </div>
                )}

                {/* 验证码 */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.verificationCode')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Send size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={resetVerificationCode}
                        onChange={(e) => setResetVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-4 text-sm tracking-widest focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                        placeholder={t('auth.verificationCodePlaceholder')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      disabled={codeCountdown > 0 || codeSending || (!resetEmail && resetType === 'email') || (!resetPhone && resetType === 'phone')}
                      className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-600 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {codeSending
                        ? '...'
                        : codeCountdown > 0
                          ? `${codeCountdown}${t('auth.secondsLater')}`
                          : t('auth.sendCode')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.newPassword')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                      placeholder={t('auth.newPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showResetNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.confirmNewPassword')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
                      placeholder={t('auth.confirmNewPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showResetConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full rounded-lg bg-cyan py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
                >
                  {resetLoading ? t('auth.resetting') : t('auth.resetPassword')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
