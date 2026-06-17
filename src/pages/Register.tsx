import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Dna, Eye, EyeOff, Send, Smartphone, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import * as api from '@/utils/api';

type RegisterTab = 'email' | 'phone';

export default function Register() {
  const [registerTab, setRegisterTab] = useState<RegisterTab>('email');
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    institution: '',
    verificationCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // 验证码倒计时
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeSending, setCodeSending] = useState(false);

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  const handleSendCode = useCallback(async () => {
    const target = registerTab === 'email' ? form.email : form.phone;
    if (!target) {
      setError(registerTab === 'email' ? t('auth.pleaseEnterEmail') : t('auth.pleaseEnterPhone'));
      return;
    }
    if (registerTab === 'phone' && !/^1[3-9]\d{9}$/.test(form.phone)) {
      setError(t('auth.phoneInvalid'));
      return;
    }
    setCodeSending(true);
    setError('');
    try {
      const res = await api.sendVerificationCode(target, registerTab, 'register');
      setCodeCountdown(60);
      // 开发模式：自动填入验证码
      if (res.devCode) {
        setForm((prev) => ({ ...prev, verificationCode: res.devCode! }));
      }
    } catch (err: any) {
      setError(err.message || t('auth.codeSendFailed'));
    } finally {
      setCodeSending(false);
    }
  }, [registerTab, form.email, form.phone, t]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.verificationCode) {
      setError(t('auth.codeRequired'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.minPassword'));
      return;
    }

    setLoading(true);
    try {
      await register({
        email: registerTab === 'email' ? form.email : undefined,
        phone: registerTab === 'phone' ? form.phone : undefined,
        password: form.password,
        name: form.name,
        institution: form.institution || undefined,
        verificationCode: form.verificationCode,
        verificationType: registerTab,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 根容器：深色 base-900 背景 + 入场动画
    <div className="relative flex min-h-screen animate-fade-in items-center justify-center bg-base-900 px-4 py-8">
      {/* Language & Theme toggle - 页面右上角，使用玻璃态按钮，z-10 确保层级 */}
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
          <div className="mb-4 inline-flex animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-nav to-action p-4">
            <Dna size={40} className="text-white" />
          </div>
          <h1 className="gradient-text font-display text-3xl font-bold">
            Var_soda
          </h1>
          <p className="mt-2 text-base-300">{t('auth.createSubtitle')}</p>
        </div>

        {/* 注册卡片：使用 glass 玻璃态效果 */}
        <div className="glass rounded-xl p-8 shadow-xl">
          <h2 className="font-display mb-6 text-xl font-semibold text-base-100">{t('auth.register')}</h2>

          {/* 注册方式 Tab - 激活态 bg-nav/20 text-nav-light，非激活态 text-base-400 */}
          <div className="mb-6 flex rounded-lg bg-base-800/50 p-1">
            <button
              type="button"
              onClick={() => { setRegisterTab('email'); setError(''); setCodeCountdown(0); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                registerTab === 'email' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
              }`}
            >
              <Mail size={16} />
              {t('auth.registerByEmail')}
            </button>
            <button
              type="button"
              onClick={() => { setRegisterTab('phone'); setError(''); setCodeCountdown(0); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                registerTab === 'phone' ? 'bg-nav/20 text-nav-light shadow-sm' : 'text-base-400 hover:text-base-200'
              }`}
            >
              <Smartphone size={16} />
              {t('auth.registerByPhone')}
            </button>
          </div>

          {/* 错误提示 - bg-neg/10 text-neg-light */}
          {error && (
            <div className="mb-4 rounded-lg bg-neg/10 px-4 py-3 text-sm text-neg-light">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.fullName')}</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>
            </div>

            {registerTab === 'email' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.email')}</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
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
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
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
                    value={form.verificationCode}
                    onChange={(e) => updateField('verificationCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm tracking-widest text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                    placeholder={t('auth.verificationCodePlaceholder')}
                  />
                </div>
                {/* 发送验证码按钮 - 次按钮 glass border-base-600 */}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={codeCountdown > 0 || codeSending || (registerTab === 'email' ? !form.email : !form.phone)}
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
              <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.institution')}</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                <input
                  type="text"
                  value={form.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-4 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  placeholder={t('auth.institutionPlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
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

            <div>
              <label className="mb-1 block text-sm font-medium text-base-300">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  required
                  className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-10 text-sm text-base-100 placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200"
                  title={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 主提交按钮 - glow-btn text-white */}
            <button
              type="submit"
              disabled={loading}
              className="glow-btn w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-base-400">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-pos-light hover:underline">
              {t('auth.goToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
