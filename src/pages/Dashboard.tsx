import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dna, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import type { DashboardStats, Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/hooks/useI18n';

const ACMG_BAR_COLORS: Record<string, string> = {
  'Pathogenic': 'bg-acmg-pathogenic',
  'Likely Pathogenic': 'bg-acmg-likelyPathogenic',
  'VUS': 'bg-acmg-vus',
  'Likely Benign': 'bg-acmg-likelyBenign',
  'Benign': 'bg-acmg-benign',
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

  const maxDist = stats
    ? Math.max(...Object.values(stats.acmgDistribution), 1)
    : 1;

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
          <div className="space-y-3">
            {stats && Object.entries(stats.acmgDistribution).map(([cls, count]) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-600 dark:text-gray-400">{cls}</span>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-full rounded ${ACMG_BAR_COLORS[cls] || 'bg-gray-400'}`}
                      style={{ width: `${(count / maxDist) * 100}%`, minWidth: count > 0 ? '2rem' : '0' }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                  {count}
                </span>
              </div>
            ))}
            {(!stats || Object.keys(stats.acmgDistribution).length === 0) && (
              <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">{t('common.noData')}</p>
            )}
          </div>
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
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">{t('variants.gene')}</th>
                <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">{t('variants.cdna')}</th>
                <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">{t('variants.protein')}</th>
                <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">{t('variants.acmg')}</th>
                <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">{t('common.status')}</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recentVariants.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="py-3 pr-4">
                    <Link to={`/variants/${v.id}`} className="font-mono font-medium text-cyan dark:text-cyan-400 hover:underline">
                      {v.gene}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{v.cdna_change}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{v.protein_change}</td>
                  <td className="py-3 pr-4"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="py-3 pr-4"><StatusBadge status={v.status} /></td>
                  <td className="py-3 text-xs text-gray-500 dark:text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentVariants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">
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
