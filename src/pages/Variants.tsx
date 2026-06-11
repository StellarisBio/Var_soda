import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';

const ACMG_OPTIONS = ['', 'Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign'];
const STATUS_OPTIONS = ['', 'pending', 'approved', 'rejected'];

export default function Variants() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [acmgFilter, setAcmgFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [geneFilter, setGeneFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVariants();
  }, [page, acmgFilter, statusFilter]);

  const loadVariants = async () => {
    setLoading(true);
    try {
      const res = await api.getVariants({
        page,
        pageSize,
        search: search || undefined,
        acmgClass: acmgFilter || undefined,
        status: statusFilter || undefined,
        gene: geneFilter || undefined,
      });
      setVariants(res.data.data);
      setTotal(res.data.total);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadVariants();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Variants</h1>
        <Link
          to="/variants/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
        >
          <Plus size={16} />
          New Variant
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by gene, cDNA, protein change..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-600"
        >
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={acmgFilter}
          onChange={(e) => { setAcmgFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <option value="">All ACMG Classes</option>
          {ACMG_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
        <input
          type="text"
          value={geneFilter}
          onChange={(e) => setGeneFilter(e.target.value)}
          placeholder="Filter by gene"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-500">Gene</th>
              <th className="px-4 py-3 font-medium text-gray-500">cDNA</th>
              <th className="px-4 py-3 font-medium text-gray-500">Protein</th>
              <th className="px-4 py-3 font-medium text-gray-500">Chr:Pos</th>
              <th className="px-4 py-3 font-medium text-gray-500">ACMG</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Created By</th>
              <th className="px-4 py-3 font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No variants found
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/variants/${v.id}`} className="font-mono font-medium text-cyan hover:underline">
                      {v.gene}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.cdna_change}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.protein_change}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {v.chromosome}:{v.position.toLocaleString()}
                  </td>
                  <td className="px-4 py-3"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{v.creatorName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
