import { useState, useEffect } from 'react';
import { Zap, ExternalLink, AlertCircle, X, History, Trash2, RotateCcw, Search, ChevronRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import * as api from '@/utils/api';
import type { PVS1AnalysisResult, PVS1FlowchartNode } from '@shared/types';

interface HistoryEntry {
  id: string;
  timestamp: number;
  input: { query: string; genomeBuild: string };
  output: PVS1AnalysisResult | null;
  error?: string;
}

const HISTORY_KEY = 'autopvs1_history';
const MAX_HISTORY = 10;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

// 示例变异
const EXAMPLES_HG19 = [
  { label: 'X-82763936-A-T', query: 'X-82763936-A-T' },
  { label: '2-48033984-G-GGATT', query: '2-48033984-G-GGATT' },
  { label: '13-113803407-G-A', query: '13-113803407-G-A' },
];
const EXAMPLES_HG38 = [
  { label: 'X-83508928-A-T', query: 'X-83508928-A-T' },
  { label: '2-47806845-G-GGATT', query: '2-47806845-G-GGATT' },
  { label: '13-114138251-G-A', query: '13-114138251-G-A' },
];

export default function AutoPVS1() {
  const { t } = useI18n();

  const [query, setQuery] = useState('');
  const [genomeBuild, setGenomeBuild] = useState<'hg19' | 'hg38'>('hg19');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PVS1AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // 解析查询字符串，支持多种格式
  function parseQuery(q: string): { chr: string; pos: string; ref: string; alt: string } | null {
    const cleaned = q.trim().replace(/^chr/i, '');
    // 格式: chr-pos-ref-alt 或 chr:pos:ref:alt
    const parts = cleaned.split(/[:\-_\s]+/);
    if (parts.length >= 4) {
      return { chr: parts[0], pos: parts[1], ref: parts[2], alt: parts[3] };
    }
    return null;
  }

  const handleAnalyze = async (queryStr?: string) => {
    const q = (queryStr ?? query).trim();
    if (!q) {
      setError(t('autopvs1.requiredFields'));
      return;
    }

    const parsed = parseQuery(q);
    if (!parsed) {
      setError(t('autopvs1.invalidFormat'));
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const grchBuild = genomeBuild === 'hg19' ? 'GRCh37' : 'GRCh38';
      const res = await api.analyzeAutoPVS1({
        chromosome: parsed.chr,
        position: parseInt(parsed.pos),
        ref: parsed.ref,
        alt: parsed.alt,
        genome_build: grchBuild,
      });
      setResult(res.data);
      addHistory({ query: q, genomeBuild }, res.data);
    } catch (err: any) {
      const errMsg = err.message || t('autopvs1.analysisFailed');
      setError(errMsg);
      addHistory({ query: q, genomeBuild }, null, errMsg);
    } finally {
      setLoading(false);
    }
  };

  const addHistory = (
    input: { query: string; genomeBuild: string },
    output: PVS1AnalysisResult | null,
    errMsg?: string
  ) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      input,
      output,
      error: errMsg,
    };
    setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const clearHistory = () => setHistory([]);

  const restoreFromHistory = (entry: HistoryEntry) => {
    setQuery(entry.input.query);
    setGenomeBuild(entry.input.genomeBuild as 'hg19' | 'hg38');
    setResult(entry.output);
    setError(entry.error || '');
  };

  const clearInput = () => {
    setQuery('');
    setResult(null);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const examples = genomeBuild === 'hg19' ? EXAMPLES_HG19 : EXAMPLES_HG38;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('autopvs1.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('autopvs1.description')}</p>
      </div>

      {/* 搜索区域 - 仿 AutoPVS1 官网 */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        {/* 基因组版本切换 */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.genomeBuild')}:</span>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => { setGenomeBuild('hg19'); setResult(null); }}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                genomeBuild === 'hg19'
                  ? 'bg-cyan text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              hg19
            </button>
            <button
              type="button"
              onClick={() => { setGenomeBuild('hg38'); setResult(null); }}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-300 dark:border-gray-600 ${
                genomeBuild === 'hg38'
                  ? 'bg-cyan text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              hg38
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('autopvs1.searchPlaceholder')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 pl-10 pr-10 py-2.5 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
            {query && (
              <button
                onClick={clearInput}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Zap size={16} />
            )}
            {loading ? t('autopvs1.analyzing') : t('autopvs1.analyze')}
          </button>
        </div>

        {/* 示例链接 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('autopvs1.examples')}:</span>
          {examples.map((ex) => (
            <button
              key={ex.label}
              onClick={() => {
                setQuery(ex.query);
                handleAnalyze(ex.query);
              }}
              className="rounded-full border border-gray-200 dark:border-gray-600 px-3 py-0.5 text-xs font-mono text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/30 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('autopvs1.pasteHint')}</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="rounded-xl bg-white p-12 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">{t('autopvs1.analyzing')}</span>
          </div>
        </div>
      )}

      {/* 结果展示 - 仿 AutoPVS1 官网布局 */}
      {!loading && result && (
        <div className="space-y-4">
          {/* Variant Info */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-navy dark:text-white">
                {t('autopvs1.variantInfo')} - <span className="text-cyan">{genomeBuild}</span>
              </h2>
              {result.autopvs1Url && (
                <a
                  href={result.autopvs1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ExternalLink size={12} />
                  {t('autopvs1.openInNewTab')}
                </a>
              )}
            </div>

            {/* 变异类型标题 */}
            {result.variantType && (
              <h3 className="mb-3 text-base font-semibold text-navy dark:text-white">
                {result.variantType}: {result.chromosome}-{result.position}-{result.ref}-{result.alt}
              </h3>
            )}

            {/* 不兼容提示 */}
            {result.incompatible && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/30">
                <p className="text-sm text-amber-800 dark:text-amber-300">{t('autopvs1.incompatible')}</p>
              </div>
            )}

            {/* 变异信息网格 */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.gene && (
                <InfoItem label={t('autopvs1.gene')} value={result.gene} isLink />
              )}
              {result.pli !== null && (
                <InfoItem label={t('autopvs1.pli')} value={String(result.pli)} />
              )}
              {result.haploinsufficiency && (
                <InfoItem label={t('autopvs1.haploinsufficiency')} value={result.haploinsufficiency} />
              )}
              {result.chgvs && (
                <InfoItem label={t('autopvs1.chgvs')} value={result.chgvs} mono />
              )}
              {result.phgvs && (
                <InfoItem label={t('autopvs1.phgvs')} value={result.phgvs} mono />
              )}
              {result.exon && (
                <InfoItem label={t('autopvs1.exon')} value={result.exon} />
              )}
              {result.intron && (
                <InfoItem label={t('autopvs1.intron')} value={result.intron} />
              )}
            </div>

            {/* 外部链接 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.externalLinks.omim && (
                <a href={result.externalLinks.omim} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                  OMIM
                </a>
              )}
              {result.externalLinks.clinVar && (
                <a href={result.externalLinks.clinVar} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                  ClinVar
                </a>
              )}
              {result.externalLinks.gnomAD && (
                <a href={result.externalLinks.gnomAD} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                  gnomAD
                </a>
              )}
            </div>
          </div>

          {/* PVS1 Flowchart - 树状结构 */}
          {!result.incompatible && result.flowchartTree.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('autopvs1.flowchart')}</h2>

              {/* Preliminary Decision Path */}
              {result.preliminaryPath && (
                <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('autopvs1.preliminaryPath')}: </span>
                  <span className="font-mono text-sm font-bold text-navy dark:text-white">{result.preliminaryPath}</span>
                </div>
              )}

              {/* 树状流程图 */}
              <div className="overflow-x-auto">
                <div className="min-w-fit">
                  {result.flowchartTree.map((node, idx) => (
                    <FlowchartNode key={idx} node={node} depth={0} isLast={idx === result.flowchartTree.length - 1} />
                  ))}
                </div>
              </div>

              {/* 脚注 */}
              {result.footnotes.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                  {result.footnotes.map((fn) => (
                    <div key={fn.number} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                        {fn.number}
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">{fn.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 初步强度 */}
              {result.preliminaryStrength && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-50 px-4 py-3 dark:bg-cyan-900/20">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('autopvs1.preliminaryStrength')}:</span>
                  <span className="text-base font-bold text-cyan-700 dark:text-cyan-400">{result.preliminaryStrength}</span>
                </div>
              )}
            </div>
          )}

          {/* Disease Mechanism 表格 */}
          {result.diseaseMechanisms.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('autopvs1.diseaseMechanism')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.gene')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.disease')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.inheritance')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.clinicalValidity')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.consideration')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('autopvs1.adjustedStrength')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.diseaseMechanisms.map((dm, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-3 py-2 font-mono text-xs text-cyan dark:text-cyan-400">{dm.gene}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{dm.disease}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{dm.inheritance}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{dm.clinicalValidity}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{dm.consideration}</td>
                        <td className="px-3 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-400">{dm.adjustedStrength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 调整后强度 */}
              {result.adjustedStrength && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('autopvs1.adjustedStrength')}:</span>
                  <span className="text-base font-bold text-blue-700 dark:text-blue-400">{result.adjustedStrength}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 查询历史记录 */}
      {history.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-navy dark:text-white">
              <History size={18} />
              {t('autopvs1.history')}
            </h2>
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
            >
              <Trash2 size={12} />
              {t('autopvs1.clearHistory')}
            </button>
          </div>

          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium text-navy dark:text-white">{entry.input.query}</span>
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {entry.input.genomeBuild}
                    </span>
                    {entry.output?.adjustedStrength && (
                      <span className="rounded-full bg-cyan-50 px-1.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                        {entry.output.adjustedStrength}
                      </span>
                    )}
                    {entry.output?.preliminaryStrength && !entry.output.adjustedStrength && (
                      <span className="rounded-full bg-cyan-50 px-1.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                        {entry.output.preliminaryStrength}
                      </span>
                    )}
                    {entry.output?.incompatible && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {t('autopvs1.incompatibleShort')}
                      </span>
                    )}
                    {entry.error && (
                      <span className="text-xs text-red-500 dark:text-red-400">({entry.error})</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => restoreFromHistory(entry)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan dark:hover:text-cyan-400 group-hover:opacity-100"
                  title={t('autopvs1.restore')}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 信息项组件
function InfoItem({ label, value, mono, isLink }: { label: string; value: string; mono?: boolean; isLink?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`${mono ? 'font-mono' : ''} text-sm ${isLink ? 'font-semibold text-cyan dark:text-cyan-400' : 'text-navy dark:text-white'}`}>{value}</p>
    </div>
  );
}

// 递归渲染流程图节点
function FlowchartNode({ node, depth, isLast }: { node: PVS1FlowchartNode; depth: number; isLast: boolean }) {
  // 判断是否是最终强度节点
  const strengthValues = ['PVS1', 'Very Strong', 'Strong', 'Moderate', 'Supporting']
  const isStrength = strengthValues.some(s => node.text.toLowerCase() === s.toLowerCase())

  return (
    <div className="relative" style={{ paddingLeft: depth > 0 ? '24px' : '0' }}>
      {/* 连接线 */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
          style={{ left: '-12px' }}
        />
      )}
      {depth > 0 && (
        <div
          className="absolute h-px bg-gray-300 dark:bg-gray-600"
          style={{ left: '-12px', top: '14px', width: '12px' }}
        />
      )}
      {/* 节点内容 */}
      <div className={`flex items-start gap-2 py-1 ${isStrength ? 'rounded-lg bg-cyan-50 dark:bg-cyan-900/20 px-3' : ''}`}>
        {!isStrength && depth > 0 && <ChevronRight size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />}
        <p className={`text-sm ${isStrength ? 'font-bold text-cyan-700 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {node.text}
        </p>
      </div>
      {/* 子节点 */}
      {node.children && node.children.length > 0 && (
        <div className="relative">
          {node.children.map((child, idx) => (
            <FlowchartNode key={idx} node={child} depth={depth + 1} isLast={idx === node.children.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
