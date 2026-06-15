import { useEffect, useState } from 'react';
import { Shield, UserCheck, UserX } from 'lucide-react';
import type { User } from '@shared/types';
import * as api from '@/utils/api';
import { useI18n } from '@/hooks/useI18n';

const ROLE_OPTIONS = ['admin', 'reviewer', 'analyst'];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  reviewer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  analyst: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await api.updateUser(userId, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: role as User['role'] } : u))
      );
    } catch {
      // handle error
    }
  };

  const handleToggleActive = async (userId: number, currentActive: number) => {
    try {
      const newActive = currentActive ? 0 : 1;
      await api.updateUser(userId, { is_active: newActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newActive } : u))
      );
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('users.title')}</h1>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          {t('users.adminOnly')}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('users.name')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('users.email')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('users.institution')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('users.role')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('users.status')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  {t('users.noUsers')}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-navy dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.institution || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      } border-0 focus:outline-none focus:ring-2 focus:ring-cyan`}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {t(`roles.${role}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {u.is_active ? (
                        <>
                          <UserCheck size={12} />
                          {t('users.active')}
                        </>
                      ) : (
                        <>
                          <UserX size={12} />
                          {t('users.inactive')}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        u.is_active
                          ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30'
                          : 'border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30'
                      }`}
                    >
                      <Shield size={12} />
                      {u.is_active ? t('users.deactivate') : t('users.activate')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
