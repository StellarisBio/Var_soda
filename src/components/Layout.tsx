import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Dna, Users, LogOut, Menu, ChevronLeft, Languages, UserCircle, User, ArrowRightLeft, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/variants', labelKey: 'nav.variants', icon: Dna },
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

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 flex h-full flex-col bg-navy transition-all duration-300 lg:relative lg:z-auto ${
          collapsed ? 'w-16' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between border-b border-navy-400 px-4">
          {!collapsed && (
            <h1 className="font-serif text-lg font-bold text-white">
              {t('common.appNameShort')}
            </h1>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className="hidden rounded p-1 text-navy-200 hover:bg-navy-400 hover:text-white lg:block"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-navy-200 hover:bg-navy-400 hover:text-white lg:hidden"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan text-white'
                    : 'text-navy-100 hover:bg-navy-400 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon size={20} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-navy-400 p-3">
          {!collapsed && user && (
            <div className="mb-2 px-2">
            </div>
          )}
          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-100 transition-colors hover:bg-navy-400 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <UserCircle size={18} />
            {!collapsed && <span>{t('profile.title')}</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-100 transition-colors hover:bg-navy-400 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Menu size={22} />
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              <Dna size={20} className="text-cyan" />
              <span className="font-serif text-lg font-semibold text-navy dark:text-white">
                {t('common.appName')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
            </button>
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title={t('common.language')}
            >
              <Languages size={16} />
              {lang === 'zh' ? '中文' : 'EN'}
            </button>
            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-cyan-100 dark:ring-cyan-800"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-cyan dark:bg-cyan-900 dark:text-cyan-300">
                  <User size={18} />
                </div>
              )}
              <span className="hidden text-sm font-medium text-navy sm:inline dark:text-white">{user?.name}</span>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                {t(`roles.${user?.role}`)}
              </span>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-bg p-4 lg:p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
