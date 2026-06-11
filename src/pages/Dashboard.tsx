import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dna, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import type { DashboardStats, Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';

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
      <h1 className="font-serif text-2xl font-bold text-navy">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Dna size={24} />}
          label="Total Variants"
          value={stats?.totalVariants ?? 0}
          color="bg-cyan-50 text-cyan"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label="Monthly New"
          value={stats?.monthlyNew ?? 0}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Clock size={24} />}
          label="Pending Review"
          value={stats?.pendingReview ?? 0}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={<AlertCircle size={24} />}
          label="Pathogenic"
          value={stats?.acmgDistribution?.['Pathogenic'] ?? 0}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ACMG Distribution */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">
            ACMG Classification Distribution
          </h2>
          <div className="space-y-3">
            {stats && Object.entries(stats.acmgDistribution).map(([cls, count]) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-600">{cls}</span>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded bg-gray-100">
                    <div
                      className={`h-full rounded ${ACMG_BAR_COLORS[cls] || 'bg-gray-400'}`}
                      style={{ width: `${(count / maxDist) * 100}%`, minWidth: count > 0 ? '2rem' : '0' }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right font-mono text-sm font-medium text-gray-700">
                  {count}
                </span>
              </div>
            ))}
            {(!stats || Object.keys(stats.acmgDistribution).length === 0) && (
              <p className="py-4 text-center text-sm text-gray-400">No data available</p>
            )}
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">
            Pending Review
          </h2>
          {pendingVariants.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No pending variants</p>
          ) : (
            <div className="space-y-3">
              {pendingVariants.map((v) => (
                <Link
                  key={v.id}
                  to={`/variants/${v.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <span className="font-mono text-sm font-medium text-navy">{v.gene}</span>
                    <span className="ml-2 text-xs text-gray-500">{v.cdna_change}</span>
                  </div>
                  <ACMGBadge classification={v.acmg_class} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Variants */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy">Recent Variants</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 font-medium text-gray-500">Gene</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">cDNA</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Protein</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">ACMG</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Status</th>
                <th className="pb-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentVariants.map((v) => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4">
                    <Link to={`/variants/${v.id}`} className="font-mono font-medium text-cyan hover:underline">
                      {v.gene}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-600">{v.cdna_change}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-600">{v.protein_change}</td>
                  <td className="py-3 pr-4"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="py-3 pr-4"><StatusBadge status={v.status} /></td>
                  <td className="py-3 text-xs text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentVariants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No variants found
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
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>{icon}</div>
      <p className="font-mono text-2xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
