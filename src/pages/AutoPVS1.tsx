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
  const [genomeBuild, setGenomeBuild] = useState<'GRCh37' | 'GRCh38'>('GRCh37');
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
      const res = await api.analyzeAutoPVS1({
        chromosome: parsed.chr,
        position: parseInt(parsed.pos),
        ref: parsed.ref,
        alt: parsed.alt,
        genome_build: genomeBuild,
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
    setGenomeBuild(entry.input.genomeBuild as 'GRCh37' | 'GRCh38');
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

  const examples = genomeBuild === 'GRCh37' ? EXAMPLES_HG19 : EXAMPLES_HG38;

  return (
    <div className="space-y-6">
      {/* 页面标题 - 使用 font-display (Manrope) 字体，添加入场动画 */}
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-white">{t('autopvs1.title')}</h1>
        <p className="mt-1 text-sm text-base-400">{t('autopvs1.description')}</p>
      </div>

      {/* 搜索区域 - 玻璃态卡片 */}
      <div className="glass p-6 animate-fade-in">
        {/* 基因组版本切换 - 激活态使用 sec 紫罗兰色系 */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-base-400">{t('autopvs1.genomeBuild')}:</span>
          <div className="inline-flex rounded-lg border border-base-600 overflow-hidden">
            <button
              type="button"
              onClick={() => { setGenomeBuild('GRCh37'); setResult(null); }}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                genomeBuild === 'GRCh37'
                  ? 'bg-sec/20 text-sec-light'
                  : 'text-base-300 hover:bg-base-700/50'
              }`}
            >
              GRCh37
            </button>
            <button
              type="button"
              onClick={() => { setGenomeBuild('GRCh38'); setResult(null); }}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l border-base-600 ${
                genomeBuild === 'GRCh38'
                  ? 'bg-sec/20 text-sec-light'
                  : 'text-base-300 hover:bg-base-700/50'
              }`}
            >
              GRCh38
            </button>
          </div>
        </div>

        {/* 搜索框 - 输入框统一深色玻璃风格 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('autopvs1.searchPlaceholder')}
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 pl-10 pr-10 py-2.5 font-mono text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
            {query && (
              <button
                onClick={clearInput}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {/* 分析按钮 - 使用 glow-btn 发光按钮，文字白色 */}
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !query.trim()}
            className="glow-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Zap size={16} />
            )}
            {loading ? t('autopvs1.analyzing') : t('autopvs1.analyze')}
          </button>
        </div>

        {/* 示例链接 - 使用 pos 翠绿色系 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-500">{t('autopvs1.examples')}:</span>
          {examples.map((ex) => (
            <button
              key={ex.label}
              onClick={() => {
                setQuery(ex.query);
                handleAnalyze(ex.query);
              }}
              className="rounded-full border border-base-600 px-3 py-0.5 text-xs font-mono text-pos-light hover:bg-pos/10 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-base-500">{t('autopvs1.pasteHint')}</p>
      </div>

      {/* 错误提示 - 使用 neg 玫瑰红色系 */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-neg/10 px-4 py-3 text-sm text-neg-light animate-fade-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 加载中 - 玻璃态卡片 */}
      {loading && (
        <div className="glass p-12 animate-fade-in">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-action border-t-transparent" />
            <span className="ml-3 text-sm text-base-400">{t('autopvs1.analyzing')}</span>
          </div>
        </div>
      )}

      {/* 结果展示 - 玻璃态卡片布局 */}
      {!loading && result && (
        <div className="space-y-4">
          {/* Variant Info */}
          <div className="glass p-6 animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                {t('autopvs1.variantInfo')} - <span className="text-pos">{genomeBuild === 'GRCh37' ? 'GRCh37/hg19' : 'GRCh38/hg38'}</span>
              </h2>
              {result.autopvs1Url && (
                <a
                  href={result.autopvs1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(result.autopvs1Url, '_blank', 'noopener,noreferrer');
                  }}
                  className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-700/50"
                >
                  <ExternalLink size={12} />
                  {t('autopvs1.openInNewTab')}
                </a>
              )}
            </div>

            {/* 变异类型标题 */}
            {result.variantType && (
              <h3 className="mb-3 text-base font-semibold text-white">
                {translatePVS1Text(result.variantType)}: {result.chromosome}-{result.position}-{result.ref}-{result.alt}
              </h3>
            )}

            {/* 不兼容提示 - 使用 warn 琥珀色系 */}
            {result.incompatible && (
              <div className="mb-4 rounded-lg border border-warn bg-warn/10 p-3">
                <p className="text-sm text-warn">{t('autopvs1.incompatible')}</p>
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

            {/* 外部链接 - 次按钮使用 glass 样式 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.externalLinks.omim && (
                <a href={result.externalLinks.omim} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open(result.externalLinks.omim, '_blank', 'noopener,noreferrer'); }} className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-700/50">
                  OMIM
                </a>
              )}
              {result.externalLinks.clinVar && (
                <a href={result.externalLinks.clinVar} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open(result.externalLinks.clinVar, '_blank', 'noopener,noreferrer'); }} className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-700/50">
                  ClinVar
                </a>
              )}
              {result.externalLinks.gnomAD && (
                <a href={result.externalLinks.gnomAD} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open(result.externalLinks.gnomAD, '_blank', 'noopener,noreferrer'); }} className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-700/50">
                  gnomAD
                </a>
              )}
            </div>
          </div>

          {/* PVS1 Flowchart - 树状结构 */}
          {!result.incompatible && result.flowchartTree.length > 0 && (
            <div className="glass p-6 animate-fade-in">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">{t('autopvs1.flowchart')}</h2>

              {/* Preliminary Decision Path */}
              {result.preliminaryPath && (
                <div className="mb-4 rounded-lg bg-base-800/50 px-4 py-2">
                  <span className="text-sm text-base-400">{t('autopvs1.preliminaryPath')}: </span>
                  <span className="font-mono text-sm font-bold text-white">{result.preliminaryPath}</span>
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
                <div className="mt-4 space-y-2 border-t border-base-700 pt-4">
                  {result.footnotes.map((fn) => (
                    <div key={fn.number} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pos/10 font-bold text-pos-light">
                        {fn.number}
                      </span>
                      <p className="text-base-400">{fn.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 初步强度 - 使用 pos 翠绿色系 */}
              {result.preliminaryStrength && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-pos/10 px-4 py-3">
                  <span className="text-sm font-medium text-base-400">{t('autopvs1.preliminaryStrength')}:</span>
                  <span className="text-base font-bold text-pos-light">{result.preliminaryStrength}</span>
                </div>
              )}
            </div>
          )}

          {/* Disease Mechanism 表格 */}
          {result.diseaseMechanisms.length > 0 && (
            <div className="glass p-6 animate-fade-in">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">{t('autopvs1.diseaseMechanism')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.gene')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.disease')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.inheritance')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.clinicalValidity')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.consideration')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-base-400">{t('autopvs1.adjustedStrength')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.diseaseMechanisms.map((dm, idx) => (
                      <tr key={idx} className="border-b border-base-700/50">
                        <td className="px-3 py-2 font-mono text-xs text-pos">{dm.gene}</td>
                        <td className="px-3 py-2 text-xs text-base-200">{dm.disease}</td>
                        <td className="px-3 py-2 text-xs text-base-200">{dm.inheritance}</td>
                        <td className="px-3 py-2 text-xs text-base-200">{dm.clinicalValidity}</td>
                        <td className="px-3 py-2 text-xs text-base-200">{dm.consideration}</td>
                        <td className="px-3 py-2 text-xs font-bold text-pos-light">{dm.adjustedStrength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 调整后强度 - 使用 pos 翠绿色系 */}
              {result.adjustedStrength && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-pos/10 px-4 py-3">
                  <span className="text-sm font-medium text-base-400">{t('autopvs1.adjustedStrength')}:</span>
                  <span className="text-base font-bold text-pos-light">{result.adjustedStrength}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 查询历史记录 - 玻璃态卡片 */}
      {history.length > 0 && (
        <div className="glass p-6 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
              <History size={18} />
              {t('autopvs1.history')}
            </h2>
            <button
              onClick={clearHistory}
              className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-base-400 hover:bg-neg/10 hover:text-neg-light hover:border-neg"
            >
              <Trash2 size={12} />
              {t('autopvs1.clearHistory')}
            </button>
          </div>

          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg border border-base-700 px-4 py-3 transition-colors hover:bg-base-700/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium text-white">{entry.input.query}</span>
                    <span className="rounded-full bg-base-700 px-1.5 py-0.5 text-xs text-base-300">
                      {entry.input.genomeBuild}
                    </span>
                    {entry.output?.adjustedStrength && (
                      <span className="rounded-full bg-pos/10 px-1.5 py-0.5 text-xs font-medium text-pos-light">
                        {entry.output.adjustedStrength}
                      </span>
                    )}
                    {entry.output?.preliminaryStrength && !entry.output.adjustedStrength && (
                      <span className="rounded-full bg-pos/10 px-1.5 py-0.5 text-xs font-medium text-pos-light">
                        {entry.output.preliminaryStrength}
                      </span>
                    )}
                    {entry.output?.incompatible && (
                      <span className="rounded-full bg-warn/10 px-1.5 py-0.5 text-xs font-medium text-warn">
                        {t('autopvs1.incompatibleShort')}
                      </span>
                    )}
                    {entry.error && (
                      <span className="text-xs text-neg-light">({entry.error})</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-base-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => restoreFromHistory(entry)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-base-400 opacity-0 transition-all hover:bg-pos/10 hover:text-pos group-hover:opacity-100"
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
      <p className="text-xs font-medium text-base-400">{label}</p>
      <p className={`${mono ? 'font-mono' : ''} text-sm ${isLink ? 'font-semibold text-pos' : 'text-white'}`}>{value}</p>
    </div>
  );
}

// PVS1 决策流程中文翻译映射
const PVS1_TRANSLATIONS: Record<string, string> = {
  // 强度等级
  'PVS1': 'PVS1',
  'Very Strong': '极强',
  'Strong': '强',
  'Moderate': '中等',
  'Supporting': '支持',
  // 决策节点常见文本
  'Null variant (nonsense, frameshift, canonical ±1 or 2 splice sites, initiation codon, single or multiexon deletion)': '功能缺失变异（无义、移码、经典±1或2剪接位点、起始密码子、单/多外显子缺失）',
  'Is the variant predicted to cause loss of function (LOF)?': '该变异是否预测导致功能缺失（LOF）？',
  'Is LOF a known mechanism of disease?': '功能缺失是否为已知致病机制？',
  'Is there another mechanism of disease?': '是否存在其他致病机制？',
  'Is the exon critical to protein function?': '该外显子是否对蛋白质功能至关重要？',
  'Is the last exon affected?': '是否影响最后一个外显子？',
  'Is the last exon or exon before the last affected?': '是否影响最后一个外显子或倒数第二个外显子？',
  'Is the penultimate exon affected?': '是否影响倒数第二个外显子？',
  'Is the exon biologically relevant?': '该外显子是否具有生物学相关性？',
  'Are there other transcripts that escape LOF?': '是否存在其他转录本可逃避功能缺失？',
  'Is the variant in a gene where LOF is not a disease mechanism?': '该变异所在基因的功能缺失是否不是致病机制？',
  'Is the variant in a gene where LOF is a disease mechanism?': '该变异所在基因的功能缺失是否为致病机制？',
  'Yes': '是',
  'No': '否',
  'Nonsense': '无义变异',
  'Frameshift': '移码变异',
  'Splice site': '剪接位点变异',
  'Initiation codon': '起始密码子变异',
  'Single/multiexon deletion': '单/多外显子缺失',
  'Missense': '错义变异',
  'Synonymous': '同义变异',
  'Intron': '内含子变异',
  'UTR': 'UTR变异',
  'Upstream': '上游变异',
  'Downstream': '下游变异',
  'Splice Region': '剪接区域变异',
  'Not PVS1': '非PVS1',
  'PVS1_Strong': 'PVS1_强',
  'PVS1_Moderate': 'PVS1_中等',
  'PVS1_Supporting': 'PVS1_支持',
  // 其他常见文本
  'LOF is not a known disease mechanism': '功能缺失不是已知致病机制',
  'LOF is a known mechanism of disease': '功能缺失是已知致病机制',
  'Exon is critical to protein function': '外显子对蛋白质功能至关重要',
  'Exon is not critical to protein function': '外显子对蛋白质功能不至关重要',
  'Other transcripts escape LOF': '其他转录本可逃避功能缺失',
  'No other transcripts escape LOF': '无其他转录本可逃避功能缺失',
  'Last exon affected': '影响最后一个外显子',
  'Last exon or exon before last affected': '影响最后一个或倒数第二个外显子',
  'Penultimate exon affected': '影响倒数第二个外显子',
  'Exon is biologically relevant': '外显子具有生物学相关性',
  'Exon is not biologically relevant': '外显子不具有生物学相关性',
};

function translatePVS1Text(text: string): string {
  // 精确匹配
  if (PVS1_TRANSLATIONS[text]) return PVS1_TRANSLATIONS[text];
  // 部分匹配：检查是否包含已知短语
  let result = text;
  for (const [en, zh] of Object.entries(PVS1_TRANSLATIONS)) {
    if (en.length > 3 && result.includes(en)) {
      result = result.replace(en, zh);
    }
  }
  return result;
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
      <div className={`flex items-start gap-2 py-1 ${isStrength ? 'rounded-lg bg-pos/10 px-3' : ''}`}>
        {!isStrength && depth > 0 && <ChevronRight size={14} className="mt-0.5 flex-shrink-0 text-base-400" />}
        <p className={`text-sm ${isStrength ? 'font-bold text-pos-light' : 'text-base-200'}`}>
          {translatePVS1Text(node.text)}
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
