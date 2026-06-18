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
    // 根容器：深色 base-900 背景 + overflow-hidden 防止装饰元素溢出 + 入场动画
    <div className="relative flex min-h-screen animate-fade-in items-center justify-center overflow-hidden bg-base-900 px-4">
      {/* ===== 背景装饰元素：6 个绝对定位 SVG，不同颜色与动画营造光谱实验室氛围 ===== */}
      {/* 1. DNA 双螺旋 - nav 靛蓝色 - animate-float 浮动 */}
      <svg className="pointer-events-none absolute left-[-40px] top-[10%] h-64 w-64 animate-float text-nav/10" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <path d="M50 20 Q150 60 50 100 Q150 140 50 180" stroke="currentColor" strokeWidth="3" />
        <path d="M150 20 Q50 60 150 100 Q50 140 150 180" stroke="currentColor" strokeWidth="3" />
        <line x1="50" y1="20" x2="150" y2="20" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="60" x2="150" y2="60" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="100" x2="150" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="140" x2="150" y2="140" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="180" x2="150" y2="180" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* 2. 六边形分子结构 - action 电蓝色 - animate-float-slow 缓慢浮动 */}
      <svg className="pointer-events-none absolute right-[-30px] top-[15%] h-48 w-48 animate-float-slow text-action/10" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" stroke="currentColor" strokeWidth="2" />
        <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* 3. 嵌套三角形 - info 青色 - animate-drift 漂移 */}
      <svg className="pointer-events-none absolute bottom-[15%] left-[5%] h-40 w-40 animate-drift text-info/10" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <polygon points="50,10 90,85 10,85" stroke="currentColor" strokeWidth="2" />
        <polygon points="50,30 75,75 25,75" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* 4. 嵌套菱形 - sec 紫罗兰 - animate-float 浮动 */}
      <svg className="pointer-events-none absolute bottom-[10%] right-[5%] h-44 w-44 animate-float text-sec/10" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <polygon points="50,5 95,50 50,95 5,50" stroke="currentColor" strokeWidth="2" />
        <polygon points="50,25 75,50 50,75 25,50" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* 5. 同心圆波纹 - hi 粉色 - animate-float-slow 缓慢浮动 */}
      <svg className="pointer-events-none absolute left-[8%] top-[45%] h-32 w-32 animate-float-slow text-hi/10" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* 6. 分子点阵 - pos 翠绿 - animate-drift 漂移 */}
      <svg className="pointer-events-none absolute right-[10%] top-[50%] h-36 w-36 animate-drift text-pos/10" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="4" fill="currentColor" />
        <circle cx="50" cy="20" r="4" fill="currentColor" />
        <circle cx="80" cy="20" r="4" fill="currentColor" />
        <circle cx="20" cy="50" r="4" fill="currentColor" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
        <circle cx="80" cy="50" r="4" fill="currentColor" />
        <circle cx="20" cy="80" r="4" fill="currentColor" />
        <circle cx="50" cy="80" r="4" fill="currentColor" />
        <circle cx="80" cy="80" r="4" fill="currentColor" />
        <line x1="20" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="50" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="80" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="20" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="80" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="20" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="50" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="80" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Language & Theme toggle - 页面右上角，使用玻璃态按钮，z-10 确保在装饰元素之上 */}
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          onClick={toggleTheme}
          className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-base-100 transition-colors hover:border-action"
          title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
        </button>
        <button
          onClick={toggleLang}
          className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-base-100 transition-colors hover:border-action"
        >
          {lang === 'zh' ? '中文' : 'EN'} / {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo 区域：DNA 图标用 from-nav to-action 渐变背景包裹 + animate-float 浮动 + gradient-text 渐变文字 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-action to-info p-4">
            <Dna size={40} className="text-white" />
          </div>
          <h1 className="gradient-text font-display text-3xl font-bold">
            Var_soda
          </h1>
          <p className="mt-2 text-base-300">{t('auth.subtitle')}</p>
        </div>

        {/* 登录卡片：使用 glass 玻璃态效果 */}
        <div className="glass rounded-xl p-8 shadow-xl">
          <h2 className="font-display mb-6 text-xl font-semibold text-base-100">{t('auth.signIn')}</h2>

          {/* 登录方式 Tab - 激活态 bg-nav/20 text-nav-light，非激活态 text-base-400 */}
          <div className="mb-6 flex rounded-lg bg-base-800/50 p-1">
            <button
              type="button"
              onClick={() => { setLoginTab('email'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                loginTab === 'email' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
              }`}
            >
              <Mail size={16} />
              {t('auth.loginByEmail')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginTab('phone'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                loginTab === 'phone' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
              }`}
            >
              <Smartphone size={16} />
              {t('auth.loginByPhone')}
            </button>
          </div>

          {/* 错误提示 - bg-neg/10 text-neg-light */}
          {error && (
            <div className="mb-4 rounded-lg bg-neg/10 px-4 py-3 text-sm text-neg-light">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginTab === 'email' ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                      placeholder={t('auth.emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200"
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* 忘记密码 - pos-light 链接 */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openResetModal}
                    className="text-sm font-medium text-action-light hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.phone')}</label>
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                      className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                      placeholder={t('auth.phonePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.verificationCode')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Send size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                      <input
                        type="text"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm tracking-widest text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                        placeholder={t('auth.verificationCodePlaceholder')}
                      />
                    </div>
                    {/* 发送验证码按钮 - 次按钮 glass border-base-600 */}
                    <button
                      type="button"
                      onClick={handleSendPhoneCode}
                      disabled={phoneCodeCountdown > 0 || phoneCodeSending || !phone}
                      className="glass shrink-0 rounded-xl border-base-600 px-4 py-2.5 text-sm font-medium text-base-100 transition-colors hover:border-action disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
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

            {/* 主提交按钮 - glow-btn text-white */}
            <button
              type="submit"
              disabled={loading}
              className="glow-btn w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-base-400">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-action-light hover:underline">
              {t('auth.goToRegister')}
            </Link>
          </p>
        </div>
      </div>

      {/* 重置密码弹窗 - 使用 glass 玻璃态卡片 */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-action-light" />
                <h3 className="font-display text-lg font-semibold text-base-100">{t('auth.resetPasswordTitle')}</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="rounded-lg p-1 text-base-400 hover:bg-base-700 hover:text-base-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* 重置方式 Tab - 激活态 bg-nav/20 text-nav-light */}
            <div className="mb-4 flex rounded-lg bg-base-800/50 p-1">
              <button
                type="button"
                onClick={() => { setResetType('email'); setResetError(''); setCodeCountdown(0); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  resetType === 'email' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
                }`}
              >
                <Mail size={14} />
                {t('auth.resetByEmail')}
              </button>
              <button
                type="button"
                onClick={() => { setResetType('phone'); setResetError(''); setCodeCountdown(0); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  resetType === 'phone' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
                }`}
              >
                <Smartphone size={14} />
                {t('auth.resetByPhone')}
              </button>
            </div>

            <p className="mb-4 text-sm text-base-400">
              {resetType === 'email' ? t('auth.resetPasswordDesc') : t('auth.resetPasswordDescPhone')}
            </p>

            {resetSuccess ? (
              <div className="space-y-4">
                {/* 成功提示 - bg-pos/10 text-pos-light */}
                <div className="rounded-lg bg-action/10 px-4 py-3 text-sm text-action-light">
                  {t('auth.resetSuccess')}
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setPassword('');
                  }}
                  className="glow-btn w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 错误提示 - bg-neg/10 text-neg-light */}
                {resetError && (
                  <div className="rounded-lg bg-neg/10 px-4 py-3 text-sm text-neg-light">
                    {resetError}
                  </div>
                )}

                {resetType === 'email' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.email')}</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                        placeholder={t('auth.emailPlaceholder')}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.phone')}</label>
                    <div className="relative">
                      <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                      <input
                        type="tel"
                        value={resetPhone}
                        onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        required
                        className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                        placeholder={t('auth.phonePlaceholder')}
                      />
                    </div>
                  </div>
                )}

                {/* 验证码 */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.verificationCode')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Send size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                      <input
                        type="text"
                        value={resetVerificationCode}
                        onChange={(e) => setResetVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm tracking-widest text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                        placeholder={t('auth.verificationCodePlaceholder')}
                      />
                    </div>
                    {/* 发送验证码按钮 - 次按钮 glass border-base-600 */}
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      disabled={codeCountdown > 0 || codeSending || (!resetEmail && resetType === 'email') || (!resetPhone && resetType === 'phone')}
                      className="glass shrink-0 rounded-xl border-base-600 px-4 py-2.5 text-sm font-medium text-base-100 transition-colors hover:border-action disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
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
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.newPassword')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                      placeholder={t('auth.newPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200"
                    >
                      {showResetNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.confirmNewPassword')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                      placeholder={t('auth.confirmNewPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200"
                    >
                      {showResetConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* 主提交按钮 - glow-btn text-white */}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="glow-btn w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
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
