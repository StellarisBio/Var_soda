import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Dna, Users, LogOut, Menu, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/variants', label: 'Variants', icon: Dna },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
              WES<span className="text-cyan">DB</span>
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
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-navy-400 p-3">
          {!collapsed && user && (
            <div className="mb-2 px-2">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-navy-200">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-100 transition-colors hover:bg-navy-400 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu size={22} />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <Dna size={20} className="text-cyan" />
            <span className="font-serif text-lg font-semibold text-navy">
              WES Variant Database
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-bg p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
