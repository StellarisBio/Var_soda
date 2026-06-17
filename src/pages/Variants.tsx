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
      const parsed = parseSearch(search);
      const res = await api.getVariants({
        page,
        pageSize,
        chromosome: parsed.chromosome || undefined,
        position: parsed.position || undefined,
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

  // 解析搜索输入，兼容多种染色体位置格式
  const parseSearch = (text: string): { chromosome?: string; position?: number; keyword?: string } => {
    const trimmed = text.trim();
    if (!trimmed) return {};

    // 尝试解析为染色体位置格式: chr17:41244651, 17:41244651, chr17-41244651, 17-41244651 等
    const cleaned = trimmed.replace(/^chr/i, '');
    const match = cleaned.match(/^(\d{1,2}|X|Y|MT?)\s*[:\-_]\s*(\d+)/i);
    if (match) {
      return { chromosome: match[1], position: parseInt(match[2]) };
    }

    // 纯数字可能是位置
    if (/^\d+$/.test(trimmed) && trimmed.length >= 4) {
      return { position: parseInt(trimmed) };
    }

    // 否则作为关键词搜索
    return { keyword: trimmed };
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
    /* 主容器 - 添加入场淡入动画 */
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        {/* 页面标题 - 使用 font-display 字体 */}
        <h1 className="font-display text-2xl font-bold text-base dark:text-white">{t('variants.title')}</h1>
        <div className="flex items-center gap-2">
          {/* 导入按钮 - 玻璃态边框风格，使用 pos 色调 */}
          <button
            onClick={openImportModal}
            className="inline-flex items-center gap-2 rounded-lg border border-pos bg-base-800/50 px-4 py-2 text-sm font-semibold text-pos transition-colors hover:bg-pos/10 dark:text-pos-light dark:border-pos-dark dark:hover:bg-base-700"
          >
            <Upload size={16} />
            {t('variants.batchImport')}
          </button>
          {/* 新建按钮 - 发光按钮样式 */}
          <Link
            to="/variants/new"
            className="glow-btn inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            {t('variants.newVariant')}
          </Link>
        </div>
      </div>

      {/* 搜索栏 - 使用新输入框样式，focus 使用 action 色调 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('variants.searchPlaceholderNew')}
            className="w-full rounded-xl border border-base-700 bg-base-800/50 py-2.5 pl-10 pr-9 text-sm text-white placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white dark:placeholder-base-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-base-400 hover:bg-base-700 hover:text-base-300 dark:hover:bg-base-600 dark:hover:text-base-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {/* 搜索按钮 - 深色风格 */}
        <button
          type="submit"
          className="rounded-lg bg-base px-4 py-2.5 text-sm font-medium text-white hover:bg-base-600 dark:bg-base-600 dark:hover:bg-base-500"
        >
          {t('common.search')}
        </button>
      </form>

      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* GRCh38/GRCh37 切换 - 选中使用 pos 色调 */}
        <div className="flex rounded-lg border border-base-600 dark:border-base-600 overflow-hidden">
          <button
            onClick={() => { setGenomeBuildFilter(genomeBuildFilter === 'GRCh38' ? '' : 'GRCh38'); setPage(1); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              genomeBuildFilter === 'GRCh38'
                ? 'bg-pos text-white'
                : 'bg-base-800/50 text-base-600 hover:bg-base-800 dark:bg-base-800 dark:text-base-300 dark:hover:bg-base-700'
            }`}
          >
            GRCh38
          </button>
          <button
            onClick={() => { setGenomeBuildFilter(genomeBuildFilter === 'GRCh37' ? '' : 'GRCh37'); setPage(1); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-l border-base-600 dark:border-base-600 ${
              genomeBuildFilter === 'GRCh37'
                ? 'bg-pos text-white'
                : 'bg-base-800/50 text-base-600 hover:bg-base-800 dark:bg-base-800 dark:text-base-300 dark:hover:bg-base-700'
            }`}
          >
            GRCh37
          </button>
        </div>
        {/* ACMG 筛选下拉框 - focus 使用 action 色调 */}
        <select
          value={acmgFilter}
          onChange={(e) => { setAcmgFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-base-700 bg-base-800/50 px-3 py-2 text-sm text-white focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white"
        >
          <option value="">{t('variants.allAcmg')}</option>
          {ACMG_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {/* 状态筛选下拉框 - focus 使用 action 色调 */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-base-700 bg-base-800/50 px-3 py-2 text-sm text-white focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white"
        >
          <option value="">{t('variants.allStatus')}</option>
          {STATUS_OPTIONS.filter(Boolean).map((opt) => (
            <option key={opt} value={opt}>{t(`statusBadge.${opt}`)}</option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            value={geneFilter}
            onChange={(e) => setGeneFilter(e.target.value)}
            placeholder={t('variants.filterByGene')}
            className="rounded-xl border border-base-700 bg-base-800/50 px-3 py-2 pr-8 text-sm text-white placeholder-base-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white dark:placeholder-base-400"
          />
          {geneFilter && (
            <button
              type="button"
              onClick={() => { setGeneFilter(''); setPage(1); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-base-400 hover:bg-base-700 hover:text-base-300 dark:hover:bg-base-600 dark:hover:text-base-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 变异表格 - 玻璃态卡片 */}
      <div className="overflow-x-auto glass rounded-2xl animate-fade-in">
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
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-base-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-base-400">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                /* 表格行 - hover 时显示半透明高亮 */
                <tr key={v.id} className="border-b border-base-800/50 transition-colors hover:bg-base-800/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-pos dark:text-pos-light">
                    {v.gene}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/variants/${v.id}`} className="font-mono text-xs font-semibold text-pos-dark hover:underline dark:text-pos-light">
                      {v.chromosome}-{Number(v.position)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.transcript || ''}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded bg-pos/10 px-1.5 py-0.5 font-mono text-xs font-medium text-pos-dark dark:bg-pos/10 dark:text-pos-light">{v.ref_allele}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded bg-neg/10 px-1.5 py-0.5 font-mono text-xs font-medium text-neg-dark dark:bg-neg/10 dark:text-neg-light">{v.alt_allele}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.cdna_change || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-base-600 dark:text-base-400">{v.protein_change || ''}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      (v.genome_build || 'GRCh38') === 'GRCh38'
                        ? 'bg-pos/10 text-pos-dark dark:bg-pos/10 dark:text-pos-light'
                        : 'bg-sec/10 text-sec-dark dark:bg-sec/10 dark:text-sec-light'
                    }`}>
                      {v.genome_build || 'GRCh38'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.evidence_codes && v.evidence_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {v.evidence_codes.map((code) => (
                          <span key={code} className="inline-flex items-center rounded bg-pos/10 px-1.5 py-0.5 font-mono text-xs font-medium text-pos-dark dark:bg-pos/10 dark:text-pos-light">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-base-500 dark:text-base-400">
            {t('variants.showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('variants.of')} {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-base-600 p-2 text-base-600 hover:bg-base-800/30 disabled:opacity-40 dark:border-base-600 dark:text-base-400 dark:hover:bg-base-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm text-base-600 dark:text-base-300">
              {t('variants.page')} {page} {t('variants.pageOf')} {totalPages} {t('variants.pages')}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-base-600 p-2 text-base-600 hover:bg-base-800/30 disabled:opacity-40 dark:border-base-600 dark:text-base-400 dark:hover:bg-base-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 - 玻璃态设计 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={20} className="text-pos" />
                <h3 className="font-display text-lg font-semibold text-base dark:text-white">{t('variants.importTitle')}</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-base-400 hover:bg-base-800 hover:text-base-600 dark:hover:bg-base-700 dark:hover:text-base-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* 说明 - 使用 pos 色系提示框 */}
            <div className="mb-4 rounded-lg bg-pos/10 px-4 py-3 text-sm text-pos-dark dark:bg-pos/10 dark:text-pos-light">
              <p className="mb-1">{t('variants.importHint')}</p>
              <p>{t('variants.importOptionalCols')}</p>
            </div>

            {/* 下载模板链接 */}
            <button
              onClick={downloadTemplate}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-pos hover:underline dark:text-pos-light"
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
                    isDragging ? 'border-pos bg-pos/10 dark:border-pos dark:bg-pos/10' : 'border-base-600 hover:border-pos hover:bg-base-800/30 dark:border-base-600 dark:hover:border-pos dark:hover:bg-base-700'
                  }`}
                >
                  <FileText size={32} className="mx-auto mb-3 text-base-400 dark:text-base-500" />
                  <p className="text-sm text-base-600 dark:text-base-400">{t('variants.dragDrop')}</p>
                  {importFile && (
                    <p className="mt-2 text-sm font-medium text-pos">{importFile.name}</p>
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

            {/* 错误提示 - 使用 neg 色系 */}
            {importError && (
              <div className="mb-4 rounded-lg bg-neg/10 px-4 py-3 text-sm text-neg-light dark:bg-neg/10 dark:text-neg-light">
                {importError}
              </div>
            )}

            {/* 导入结果 - 使用 pos 色系成功提示 */}
            {importResult && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-pos/10 px-4 py-3 dark:bg-pos/10">
                  <CheckCircle size={18} className="text-pos-dark" />
                  <span className="text-sm font-medium text-pos-dark dark:text-pos-light">{t('variants.importSuccess')}</span>
                </div>
                <p className="text-sm text-base-600 dark:text-base-400">
                  {t('variants.importResult')
                    .replace('{total}', String(importResult.total))
                    .replace('{imported}', String(importResult.imported))
                    .replace('{skipped}', String(importResult.skipped))}
                </p>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-base-700 dark:text-base-300">{t('variants.importErrors')}</p>
                    <div className="max-h-40 overflow-y-auto rounded-lg bg-neg/10 p-3 text-xs text-neg-light dark:bg-neg/10 dark:text-neg-light">
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
                  className="glow-btn rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  {t('common.confirm')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="rounded-lg border border-base-600 px-4 py-2 text-sm font-medium text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="glow-btn rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
