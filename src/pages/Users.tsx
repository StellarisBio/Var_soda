import { useEffect, useState } from 'react';
import { Shield, UserCheck, UserX } from 'lucide-react';
import type { User } from '@shared/types';
import * as api from '@/utils/api';
import { useI18n } from '@/hooks/useI18n';

const ROLE_OPTIONS = ['admin', 'reviewer', 'analyst'];

// 角色标签颜色映射 - 使用 Spectral Lab 光谱实验室配色
// admin→nav(靛蓝), reviewer→sec(紫罗兰), analyst→info(青色)
const ROLE_COLORS: Record<string, string> = {
  // admin 使用 nav 色（靛蓝系）
  admin: 'bg-nav/10 text-nav dark:bg-nav/20 dark:text-nav-light',
  // reviewer 使用 sec 色（紫罗兰系），对应 viewer 规则
  reviewer: 'bg-sec/10 text-sec dark:bg-sec/20 dark:text-sec-light',
  // analyst 使用 info 色（青色系）
  analyst: 'bg-info/10 text-info dark:bg-info/20 dark:text-info-light',
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
    // 页面根容器 - 添加入场动画
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        {/* 页面标题 - 使用 font-display (Manrope) 字体，base-100 在深色背景下可见 */}
        <h1 className="font-display text-2xl font-bold text-base-100 dark:text-white">{t('users.title')}</h1>
        {/* 管理员专属标签 - admin 使用 nav 色（靛蓝系） */}
        <span className="rounded-full bg-nav/10 px-3 py-1 text-xs font-medium text-nav dark:bg-nav/20 dark:text-nav-light">
          {t('users.adminOnly')}
        </span>
      </div>

      {/* 用户表格 - 使用 glass 玻璃态卡片效果 */}
      <div className="glass overflow-x-auto rounded-xl">
        <table className="w-full text-left text-sm">
          <thead>
            {/* 表头行 - 深色主题：base-800/50 半透明背景，base-700 边框 */}
            <tr className="border-b border-base-700 bg-base-800/50">
              {/* 表头单元格 - base-400 文字颜色 */}
              <th className="px-4 py-3 font-medium text-base-400">{t('users.name')}</th>
              <th className="px-4 py-3 font-medium text-base-400">{t('users.email')}</th>
              <th className="px-4 py-3 font-medium text-base-400">{t('users.institution')}</th>
              <th className="px-4 py-3 font-medium text-base-400">{t('users.role')}</th>
              <th className="px-4 py-3 font-medium text-base-400">{t('users.status')}</th>
              <th className="px-4 py-3 font-medium text-base-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // 加载状态 - base-400 文字颜色
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-base-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              // 空状态 - base-400 文字颜色
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-base-400">
                  {t('users.noUsers')}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                // 表格数据行 - hover:bg-base-800/30 符合新设计规范
                <tr key={u.id} className="border-b border-base-700/50 transition-colors hover:bg-base-800/30">
                  {/* 用户名 - base-100 文字颜色，font-medium */}
                  <td className="px-4 py-3 font-medium text-base-100 dark:text-white">{u.name}</td>
                  {/* 邮箱 - base-300 文字颜色 */}
                  <td className="px-4 py-3 text-base-300 dark:text-base-400">{u.email}</td>
                  {/* 机构 - base-300 文字颜色 */}
                  <td className="px-4 py-3 text-base-300 dark:text-base-400">{u.institution || '—'}</td>
                  <td className="px-4 py-3">
                    {/* 角色选择器 - focus:ring-action 发光效果 */}
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ROLE_COLORS[u.role] || 'bg-base-800 text-base-200 dark:bg-base-700 dark:text-base-300'
                      } border-0 focus:outline-none focus:ring-2 focus:ring-action`}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {t(`roles.${role}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {/* 状态标签 - helix→pos(翠绿), coral→neg(玫瑰红) 颜色映射 */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? 'bg-pos/10 text-pos dark:bg-pos/20 dark:text-pos-light'
                          : 'bg-neg/10 text-neg dark:bg-neg/20 dark:text-neg-light'
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
                    {/* 操作按钮 - helix→pos(翠绿), coral→neg(玫瑰红) 颜色映射 */}
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        u.is_active
                          ? 'border border-neg/30 text-neg hover:bg-neg/10 dark:border-neg/40 dark:text-neg-light dark:hover:bg-neg/20'
                          : 'border border-pos/30 text-pos hover:bg-pos/10 dark:border-pos/40 dark:text-pos-light dark:hover:bg-pos/20'
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
