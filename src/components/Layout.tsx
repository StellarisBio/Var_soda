import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Dna, Users, LogOut, Menu, ChevronLeft, Languages, UserCircle, User, ArrowRightLeft, Sun, Moon, Zap } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';

// 侧边栏导航项配置 — 每项使用不同的颜色标识
const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/variants', labelKey: 'nav.variants', icon: Dna },
  { to: '/autopvs1', labelKey: 'nav.autopvs1', icon: Zap },
  { to: '/liftover', labelKey: 'nav.liftover', icon: ArrowRightLeft },
  { to: '/users', labelKey: 'nav.users', icon: Users, adminOnly: true },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 管理员过滤：非管理员不显示管理员专属导航项
  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="flex h-screen overflow-hidden bg-base-900">
      {/* 移动端遮罩层 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 — 靛蓝玻璃态 */}
      <aside
        className={`fixed z-40 flex h-full flex-col glass-nav border-r border-nav/20 transition-all duration-300 lg:relative lg:z-auto ${
          collapsed ? 'w-16' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo 区域 — 浮动动画 */}
        <div className="flex h-16 items-center justify-between border-b border-base-700/50 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              {/* DNA 螺旋图标 — 渐变背景 + 浮动 */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-nav to-action animate-float">
                <Dna size={18} className="text-white" />
              </div>
              <h1 className="font-display text-lg font-bold gradient-text">Var_soda</h1>
            </div>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className="hidden rounded-lg p-1.5 text-base-300 hover:bg-base-700/50 hover:text-base-100 lg:block"
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-base-300 hover:bg-base-700/50 hover:text-base-100 lg:hidden"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-nav/15 text-nav-light border border-nav/20'
                    : 'text-base-300 hover:bg-nav/8 hover:text-nav-light border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon size={18} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 底部用户区域 */}
        <div className="border-t border-base-700/50 p-3 space-y-1">
          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-base-300 hover:bg-sec/10 hover:text-sec-light ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <UserCircle size={18} />
            {!collapsed && <span>{t('profile.title')}</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-base-300 hover:bg-neg/10 hover:text-neg-light ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部标题栏 — 玻璃态 */}
        <header className="flex h-16 items-center justify-between border-b border-base-700/50 glass px-4">
          <div className="flex items-center gap-3">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-base-300 hover:bg-base-700/50 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="font-display text-base font-semibold text-base-50">
                {t('common.appName')}
              </span>
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-lg border border-base-700/50 px-2.5 py-1.5 text-xs font-medium text-base-300 hover:bg-base-700/50 hover:text-base-100"
              title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            {/* 语言切换 */}
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 rounded-lg border border-base-700/50 px-2.5 py-1.5 text-xs font-medium text-base-300 hover:bg-base-700/50 hover:text-base-100"
              title={t('common.language')}
            >
              <Languages size={14} />
              {lang === 'zh' ? '中文' : 'EN'}
            </button>
            {/* 用户信息 */}
            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-base-700/50"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-nav/30"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nav/10 text-nav-light">
                  <User size={16} />
                </div>
              )}
              <span className="hidden text-sm font-medium text-base-50 sm:inline">{user?.name}</span>
              <span className="rounded-md bg-sec/10 px-2 py-0.5 text-xs font-medium text-sec-light">
                {t(`roles.${user?.role}`)}
              </span>
            </NavLink>
          </div>
        </header>

        {/* 页面内容区 */}
        <main className="flex-1 overflow-y-auto bg-base-900 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
