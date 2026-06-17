import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dna, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import type { DashboardStats, Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/hooks/useI18n';

const ACMG_PIE_COLORS: Record<string, string> = {
  'Pathogenic': '#dc2626',
  'Likely Pathogenic': '#ea580c',
  'VUS': '#ca8a04',
  'Likely Benign': '#2563eb',
  'Benign': '#16a34a',
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('dashboard.title')}</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Dna size={24} />}
          label={t('dashboard.totalVariants')}
          value={stats?.totalVariants ?? 0}
          color="bg-cyan-50 text-cyan dark:bg-cyan-900/30 dark:text-cyan-400"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label={t('dashboard.monthlyNew')}
          value={stats?.monthlyNew ?? 0}
          color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={<Clock size={24} />}
          label={t('dashboard.pendingReview')}
          value={stats?.pendingReview ?? 0}
          color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
        />
        <StatCard
          icon={<AlertCircle size={24} />}
          label={t('dashboard.pathogenic')}
          value={stats?.acmgDistribution?.['Pathogenic'] ?? 0}
          color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ACMG Distribution */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">{cls}</span>
                    <span className="ml-auto font-mono text-sm font-medium text-gray-700 dark:text-gray-300">{stats.acmgDistribution[cls] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">{t('common.noData')}</p>
          )}
        </div>

        {/* Pending Review */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">
            {t('dashboard.pendingReviewTitle')}
          </h2>
          {pendingVariants.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">{t('dashboard.noPending')}</p>
          ) : (
            <div className="space-y-3">
              {pendingVariants.map((v) => (
                <Link
                  key={v.id}
                  to={`/variants/${v.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div>
                    <span className="font-mono text-sm font-medium text-navy dark:text-white">{v.gene}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{v.cdna_change}</span>
                  </div>
                  <ACMGBadge classification={v.acmg_class} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Variants */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('dashboard.recentVariants')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.gene')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.chrPos')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.transcript')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.refAllele')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.altAllele')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.cdna')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.protein')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.genomeBuild')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.acmgEvidence')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.acmg')}</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentVariants.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-cyan dark:text-cyan-400">
                    {v.gene}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/variants/${v.id}`} className="font-mono text-xs font-semibold text-green-600 hover:underline dark:text-green-400">
                      {v.chromosome}-{Number(v.position)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{v.transcript || ''}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{v.ref_allele}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 font-mono text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">{v.alt_allele}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{v.cdna_change || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{v.protein_change || ''}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      (v.genome_build || 'GRCh38') === 'GRCh38'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {v.genome_build || 'GRCh38'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.evidence_codes && v.evidence_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {v.evidence_codes.map((code) => (
                          <span key={code} className="inline-flex items-center rounded bg-cyan-50 px-1.5 py-0.5 font-mono text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
              {recentVariants.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
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

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>{icon}</div>
      <p className="font-mono text-2xl font-bold text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
