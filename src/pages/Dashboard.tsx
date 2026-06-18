import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dna, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import type { DashboardStats, Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/hooks/useI18n';

const ACMG_PIE_COLORS: Record<string, string> = {
  'Pathogenic': '#FF6B6B',
  'Likely Pathogenic': '#FFB627',
  'VUS': '#7C8AFF',
  'Likely Benign': '#06D6A0',
  'Benign': '#5B9CF6',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVariants, setRecentVariants] = useState<Variant[]>([]);
  const [pendingVariants, setPendingVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, recentRes, pendingRes] = await Promise.all([
        api.getDashboardStats(),
        api.getVariants({ page: 1, pageSize: 10 }),
        api.getVariants({ status: 'pending', pageSize: 10 }),
      ]);
      setStats(statsRes.data);
      setRecentVariants(recentRes.data.data);
      setPendingVariants(pendingRes.data.data);
    } catch {
      // Stats may not be available yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        {/* 加载旋转动画 - 使用 pos 主色调（光谱绿） */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pos border-t-transparent" />
      </div>
    );
  }

  return (
    /* 主容器 - 添加入场淡入动画 */
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 - 使用 font-display (Manrope) 字体 */}
      <h1 className="font-display text-2xl font-bold text-base dark:text-white">{t('dashboard.title')}</h1>

      {/* 统计卡片 - 玻璃态设计，每个使用不同分类色调 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 总变异数 - 信息色调(青) */}
        <StatCard
          icon={<Dna size={24} />}
          label={t('dashboard.totalVariants')}
          value={stats?.totalVariants ?? 0}
          glassClass="glass-info"
          iconColor="bg-info/10 text-info"
        />
        {/* 月度新增 - 成功色调(绿) */}
        <StatCard
          icon={<TrendingUp size={24} />}
          label={t('dashboard.monthlyNew')}
          value={stats?.monthlyNew ?? 0}
          glassClass="glass-pos"
          iconColor="bg-pos/10 text-pos"
        />
        {/* 待审核 - 警告色调(琥珀) */}
        <StatCard
          icon={<Clock size={24} />}
          label={t('dashboard.pendingReview')}
          value={stats?.pendingReview ?? 0}
          glassClass="glass-warn"
          iconColor="bg-warn/10 text-warn"
        />
        {/* 致病变异 - 危险色调(红) */}
        <StatCard
          icon={<AlertCircle size={24} />}
          label={t('dashboard.pathogenic')}
          value={stats?.acmgDistribution?.['Pathogenic'] ?? 0}
          glassClass="glass-neg"
          iconColor="bg-neg/10 text-neg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ACMG 分布 - 玻璃态卡片 */}
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">
            {t('dashboard.acmgDistribution')}
          </h2>
          {stats ? (
            <div className="flex items-center gap-6">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="h-48 w-48 flex-shrink-0">
                {(() => {
                  const allClasses = ['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign']
                  const total = allClasses.reduce((sum, cls) => sum + (stats.acmgDistribution[cls] || 0), 0)
                  if (total === 0) return <circle cx="0" cy="0" r="1" fill="#e5e7eb" />
                  let cumulative = 0
                  return allClasses.map((cls) => {
                    const count = stats.acmgDistribution[cls] || 0
                    if (count === 0) return null
                    const fraction = count / total
                    const startAngle = cumulative / total * 2 * Math.PI - Math.PI / 2
                    cumulative += count
                    const endAngle = cumulative / total * 2 * Math.PI - Math.PI / 2
                    // 单扇区占满整个圆
                    if (fraction >= 1 - 1e-9) {
                      return <circle key={cls} cx="0" cy="0" r="1" fill={ACMG_PIE_COLORS[cls]} />
                    }
                    const largeArc = fraction > 0.5 ? 1 : 0
                    const x1 = Math.cos(startAngle)
                    const y1 = Math.sin(startAngle)
                    const x2 = Math.cos(endAngle)
                    const y2 = Math.sin(endAngle)
                    return (
                      <path
                        key={cls}
                        d={`M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={ACMG_PIE_COLORS[cls]}
                      />
                    )
                  })
                })()}
              </svg>
              <div className="flex-1 space-y-2">
                {['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign'].map((cls) => (
                  <div key={cls} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: ACMG_PIE_COLORS[cls] }}
                    />
                    <span className="text-sm text-base-600 dark:text-base-400">{cls}</span>
                    <span className="ml-auto font-mono text-sm font-medium text-base-700 dark:text-base-300">{stats.acmgDistribution[cls] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-base-400 dark:text-base-500">{t('common.noData')}</p>
          )}
        </div>

        {/* 待审核 - 玻璃态卡片 */}
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">
            {t('dashboard.pendingReviewTitle')}
          </h2>
          {pendingVariants.length === 0 ? (
            <p className="py-4 text-center text-sm text-base-400 dark:text-base-500">{t('dashboard.noPending')}</p>
          ) : (
            <div className="space-y-3">
              {pendingVariants.map((v) => (
                <Link
                  key={v.id}
                  to={`/variants/${v.id}`}
                  className="flex items-center justify-between rounded-lg border border-base-800 p-3 transition-colors hover:bg-base-800/30 dark:border-base-700 dark:hover:bg-base-700"
                >
                  <div>
                    <span className="font-mono text-sm font-medium text-base dark:text-white">{v.gene}</span>
                    <span className="ml-2 text-xs text-base-500 dark:text-base-400">{v.cdna_change}</span>
                  </div>
                  <ACMGBadge classification={v.acmg_class} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 最近变异 - 玻璃态卡片 */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('dashboard.recentVariants')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              {/* 表头 - 深色半透明背景 */}
              <tr className="border-b border-base-700 bg-base-800/50">
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.gene')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.chrPos')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.transcript')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.refAllele')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.altAllele')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.cdna')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.protein')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.genomeBuild')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.acmgEvidence')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('variants.acmg')}</th>
                <th className="px-4 py-3 font-medium text-base-500 dark:text-base-400">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentVariants.map((v) => (
                /* 表格行 - hover 时显示半透明高亮 */
                <tr key={v.id} className="border-b border-base-800/50 transition-colors hover:bg-base-800/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#5B9CF6' }}>
                    {v.gene}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/variants/${v.id}`} className="font-mono text-xs font-semibold text-pos-dark hover:underline dark:text-pos-light">
                      {v.chromosome}-{Number(v.position)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.transcript || ''}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-medium" style={{backgroundColor: 'rgba(91,156,246,0.1)', color: '#5B9CF6'}}>{v.ref_allele}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded bg-neg/10 px-1.5 py-0.5 font-mono text-xs font-medium text-neg-dark dark:bg-neg/10 dark:text-neg-light">{v.alt_allele}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.cdna_change || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.protein_change || ''}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      (v.genome_build || 'GRCh38') === 'GRCh38'
                        ? 'bg-warn/10 text-warn-dark dark:bg-warn/10 dark:text-warn-light'
                        : 'bg-neg/10 text-neg-dark dark:bg-neg/10 dark:text-neg-light'
                    }`} style={(v.genome_build || 'GRCh38') === 'GRCh38' ? {backgroundColor: 'rgba(91,156,246,0.1)', color: '#5B9CF6'} : {backgroundColor: 'rgba(255,182,39,0.1)', color: '#FFB627'}}>
                      {v.genome_build || 'GRCh38'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.evidence_codes && v.evidence_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {v.evidence_codes.map((code) => (
                          <span key={code} className="inline-flex items-center rounded bg-action/10 px-1.5 py-0.5 font-mono text-xs font-medium text-action-dark dark:bg-action/10 dark:text-action-light">
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-base-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
              {recentVariants.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-base-400 dark:text-base-500">
                    {t('dashboard.noVariants')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* 统计卡片组件 - 临床青蓝毛玻璃，顶部强调色条 + 悬浮发光 */
function StatCard({
  icon,
  label,
  value,
  glassClass,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  glassClass: string;
  iconColor: string;
}) {
  return (
    <div className={`${glassClass} relative overflow-hidden rounded-2xl p-5 animate-fade-in transition-all hover:-translate-y-0.5 hover:border-action/40`}>
      {/* 顶部强调色条 */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-action to-transparent opacity-50" />
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${iconColor}`}>{icon}</div>
      <p className="font-mono text-2xl font-bold text-base dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-base-500 dark:text-base-400">{label}</p>
    </div>
  );
}
