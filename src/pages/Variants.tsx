import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight, Upload, X, FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { Variant } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/hooks/useI18n';

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
  const [genomeBuildFilter, setGenomeBuildFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  // 批量导入状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number; skipped: number; total: number;
    errors: { row: number; reason: string }[];
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVariants();
  }, [page, acmgFilter, statusFilter, genomeBuildFilter]);

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
        genomeBuild: genomeBuildFilter || undefined,
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

  // 批量导入
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const res = await api.importVariants(importFile);
      setImportResult(res.data);
      loadVariants();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      setImportFile(file);
      setImportResult(null);
      setImportError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
      setImportError('');
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError('');
    setShowImportModal(true);
  };

  const downloadTemplate = () => {
    const csv = 'chromosome,position,ref_allele,alt_allele,gene,transcript,cdna_change,protein_change,acmg_class,genome_build,notes\n17,41244651,A,T,BRCA1,NM_007294.3,c.5266dupC,p.Gln1756Profs,Pathogenic,GRCh38,Example variant\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variant_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('variants.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openImportModal}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan bg-white px-4 py-2 text-sm font-semibold text-cyan transition-colors hover:bg-cyan-50 dark:bg-gray-800 dark:text-cyan-400 dark:border-cyan-800 dark:hover:bg-gray-700"
          >
            <Upload size={16} />
            {t('variants.batchImport')}
          </button>
          <Link
            to="/variants/new"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
          >
            <Plus size={16} />
            {t('variants.newVariant')}
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('variants.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-600 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          {t('common.search')}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* GRCh38/GRCh37 切换 */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            onClick={() => { setGenomeBuildFilter(genomeBuildFilter === 'GRCh38' ? '' : 'GRCh38'); setPage(1); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              genomeBuildFilter === 'GRCh38'
                ? 'bg-cyan text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            GRCh38
          </button>
          <button
            onClick={() => { setGenomeBuildFilter(genomeBuildFilter === 'GRCh37' ? '' : 'GRCh37'); setPage(1); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-l border-gray-300 dark:border-gray-600 ${
              genomeBuildFilter === 'GRCh37'
                ? 'bg-cyan text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            GRCh37
          </button>
        </div>
        <select
          value={acmgFilter}
          onChange={(e) => { setAcmgFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">{t('variants.allAcmg')}</option>
          {ACMG_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">{t('variants.allStatus')}</option>
          {STATUS_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{t(`statusBadge.${opt}`)}</option>
          ))}
        </select>
        <input
          type="text"
          value={geneFilter}
          onChange={(e) => setGeneFilter(e.target.value)}
          placeholder={t('variants.filterByGene')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.gene')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.cdna')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.protein')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.chrPos')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.genomeBuild')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('variants.acmg')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('common.status')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('common.createdBy')}</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('common.date')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <Link to={`/variants/${v.id}`} className="font-mono font-medium text-cyan hover:underline dark:text-cyan-400">
                      {v.gene}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{v.cdna_change || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{v.protein_change || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {v.chromosome}:{Number(v.position)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      (v.genome_build || 'GRCh38') === 'GRCh38'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {v.genome_build || 'GRCh38'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ACMGBadge classification={v.acmg_class} /></td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.creatorName || ''}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-500">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('variants.showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('variants.of')} {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm text-gray-600 dark:text-gray-300">
              {t('variants.page')} {page} {t('variants.pageOf')} {totalPages} {t('variants.pages')}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={20} className="text-cyan" />
                <h3 className="font-serif text-lg font-semibold text-navy dark:text-white">{t('variants.importTitle')}</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* 说明 */}
            <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <p className="mb-1">{t('variants.importHint')}</p>
              <p>{t('variants.importOptionalCols')}</p>
            </div>

            {/* 下载模板 */}
            <button
              onClick={downloadTemplate}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan hover:underline dark:text-cyan-400"
            >
              <Download size={14} />
              {t('variants.downloadTemplate')}
            </button>

            {/* 文件拖拽区域 */}
            {!importResult && (
              <>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragging ? 'border-cyan bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-900/30' : 'border-gray-300 hover:border-cyan hover:bg-gray-50 dark:border-gray-600 dark:hover:border-cyan-600 dark:hover:bg-gray-700'
                  }`}
                >
                  <FileText size={32} className="mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('variants.dragDrop')}</p>
                  {importFile && (
                    <p className="mt-2 text-sm font-medium text-cyan">{importFile.name}</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}

            {/* 错误提示 */}
            {importError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {importError}
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/30">
                  <CheckCircle size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('variants.importSuccess')}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('variants.importResult')
                    .replace('{total}', String(importResult.total))
                    .replace('{imported}', String(importResult.imported))
                    .replace('{skipped}', String(importResult.skipped))}
                </p>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('variants.importErrors')}</p>
                    <div className="max-h-40 overflow-y-auto rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {importResult.errors.map((err, i) => (
                        <div key={i}>第 {err.row} 行: {err.reason}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 按钮 */}
            <div className="flex justify-end gap-2">
              {importResult ? (
                <button
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
                >
                  {t('common.confirm')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? t('variants.importing') : t('variants.importBtn')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
