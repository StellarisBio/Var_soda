import { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader2, AlertCircle, CheckCircle2, Copy, Check, History, Trash2, RotateCcw, X } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface LiftoverResult {
  chr?: string;
  pos?: number;
  ref?: string;
  alt?: string;
  [key: string]: any;
}

interface LiftoverResponse {
  from: string;
  dest: string;
  variants: LiftoverResult[];
  error?: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  input: { chr: string; pos: string; ref: string; alt: string; from: string; dest: string };
  output: { chr?: string; pos?: number; ref?: string; alt?: string } | null;
  error?: string;
}

const HISTORY_KEY = 'liftover_history';
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

export default function Liftover() {
  const { t } = useI18n();

  // 输入状态
  const [chr, setChr] = useState('');
  const [pos, setPos] = useState('');
  const [ref, setRef] = useState('');
  const [alt, setAlt] = useState('');
  const [fromGenome, setFromGenome] = useState('hg19');
  const [destGenome, setDestGenome] = useState('hg38');

  // 结果状态
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiftoverResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 历史记录
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleLiftover = async () => {
    if (!chr || !pos || !ref || !alt) {
      setError(t('liftover.requiredFields'));
      return;
    }

    if (fromGenome === destGenome) {
      setError(t('liftover.sameGenome'));
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({
        chr,
        pos,
        ref,
        alt,
        from: fromGenome,
        dest: destGenome,
      });

      const res = await fetch(`/api/liftover?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();

      if (!data.success) {
        const errMsg = data.error || t('liftover.failed');
        setError(errMsg);
        // 记录失败历史
        addHistory({ chr, pos, ref, alt, from: fromGenome, dest: destGenome }, null, errMsg);
        return;
      }

      setResult(data.data);
      // 检查是否为空结果（API 返回空对象 {}）
      const outputVariant = data.data?.variants?.[0];
      const isEmpty = !outputVariant || (outputVariant.chr === undefined && outputVariant.pos === undefined);
      if (isEmpty) {
        setError(t('liftover.noResult'));
        addHistory({ chr, pos, ref, alt, from: fromGenome, dest: destGenome }, null, t('liftover.noResult'));
      } else {
        addHistory({ chr, pos, ref, alt, from: fromGenome, dest: destGenome }, outputVariant);
      }
    } catch (err: any) {
      const errMsg = err.message || t('liftover.failed');
      setError(errMsg);
      addHistory({ chr, pos, ref, alt, from: fromGenome, dest: destGenome }, null, errMsg);
    } finally {
      setLoading(false);
    }
  };

  const addHistory = (
    input: { chr: string; pos: string; ref: string; alt: string; from: string; dest: string },
    output: { chr?: string; pos?: number; ref?: string; alt?: string } | null,
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

  const clearHistory = () => {
    setHistory([]);
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setChr(entry.input.chr);
    setPos(entry.input.pos);
    setRef(entry.input.ref);
    setAlt(entry.input.alt);
    setFromGenome(entry.input.from);
    setDestGenome(entry.input.dest);
    setResult(null);
    setError('');
  };

  // 粘贴解析
  const [pasteText, setPasteText] = useState('');

  const parseAndFill = (text: string) => {
    setPasteText(text);
    if (!text.trim()) return;

    // 支持格式: chr22:50523267:C:T, 22:50523267:C:T, chr22-50523267-C-T 等
    const cleaned = text.trim().replace(/^chr/i, '');
    // 用 : 或 - 分割
    const parts = cleaned.split(/[:\-_\s]+/);
    if (parts.length >= 4) {
      setChr(parts[0]);
      setPos(parts[1]);
      setRef(parts[2]);
      setAlt(parts[3]);
    }
  };

  const clearInput = () => {
    setChr('');
    setPos('');
    setRef('');
    setAlt('');
    setPasteText('');
    setResult(null);
    setError('');
  };

  const swapGenomes = () => {
    setFromGenome(destGenome);
    setDestGenome(fromGenome);
    setResult(null);
    setError('');
  };

  const copyResult = () => {
    if (!result?.variants?.length) return;
    const v = result.variants[0];
    const text = `${v.chr || ''}-${v.pos || ''}-${v.ref || ''}-${v.alt || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 基因组版本映射到显示名称
  const genomeLabel = (g: string) => {
    const map: Record<string, string> = {
      'hg19': 'GRCh37/hg19',
      'hg38': 'GRCh38/hg38',
      't2t': 'T2T-CHM13',
    };
    return map[g] || g;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy dark:text-white">{t('liftover.title')}</h1>
      </div>

      {/* 说明 */}
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <p>{t('liftover.description')}</p>
        <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">{t('liftover.poweredBy')}</p>
      </div>

      {/* 输入区域 */}
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy dark:text-white">{t('liftover.inputVariant')}</h2>

        {/* 基因组版本选择 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.sourceGenome')}</label>
            <select
              value={fromGenome}
              onChange={(e) => { setFromGenome(e.target.value); setResult(null); }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
            >
              <option value="hg38">{genomeLabel('hg38')}</option>
              <option value="hg19">{genomeLabel('hg19')}</option>
              <option value="t2t">{genomeLabel('t2t')}</option>
            </select>
          </div>

          <button
            onClick={swapGenomes}
            className="mt-5 rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-cyan dark:hover:text-cyan-400"
            title={t('liftover.swap')}
          >
            <ArrowRightLeft size={18} />
          </button>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.targetGenome')}</label>
            <select
              value={destGenome}
              onChange={(e) => { setDestGenome(e.target.value); setResult(null); }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
            >
              <option value="hg19">{genomeLabel('hg19')}</option>
              <option value="hg38">{genomeLabel('hg38')}</option>
              <option value="t2t">{genomeLabel('t2t')}</option>
            </select>
          </div>
        </div>

        {/* 粘贴输入 */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.pasteInput')}</label>
          <input
            type="text"
            value={pasteText}
            onChange={(e) => parseAndFill(e.target.value)}
            placeholder={t('liftover.pastePlaceholder')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('liftover.pasteHint')}</p>
        </div>

        {/* 变体输入 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.chromosome')} *</label>
            <input
              type="text"
              value={chr}
              onChange={(e) => setChr(e.target.value)}
              placeholder="17"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.position')} *</label>
            <input
              type="number"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="41244651"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.refAllele')} *</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="A"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.altAllele')} *</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="T"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>
        </div>

        {/* 转换按钮 */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleLiftover}
            disabled={loading || !chr || !pos || !ref || !alt}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
            {loading ? t('liftover.converting') : t('liftover.convert')}
          </button>
          <button
            onClick={clearInput}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X size={16} />
            {t('liftover.clearInput')}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 结果区域 */}
      {result && (
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-navy dark:text-white">{t('liftover.result')}</h2>
            {result.variants?.length > 0 && (
              <button
                onClick={copyResult}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? t('liftover.copied') : t('liftover.copy')}
              </button>
            )}
          </div>

          {/* 转换方向 */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {genomeLabel(result.from)}
            </span>
            <ArrowRightLeft size={14} />
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {genomeLabel(result.dest)}
            </span>
          </div>

          {result.error ? (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <AlertCircle size={16} />
              {result.error}
            </div>
          ) : result.variants?.length > 0 ? (
            <div className="space-y-3">
              {result.variants.map((v, i) => (
                <div key={i} className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-400">{t('liftover.success')}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {v.chr !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.chromosome')}</p>
                        <p className="font-mono text-sm text-navy dark:text-white">{v.chr}</p>
                      </div>
                    )}
                    {v.pos !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.position')}</p>
                        <p className="font-mono text-sm text-navy dark:text-white">{Number(v.pos)}</p>
                      </div>
                    )}
                    {v.ref !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.refAllele')}</p>
                        <p className="font-mono text-sm text-navy dark:text-white">{v.ref}</p>
                      </div>
                    )}
                    {v.alt !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.altAllele')}</p>
                        <p className="font-mono text-sm text-navy dark:text-white">{v.alt}</p>
                      </div>
                    )}
                  </div>
                  {/* 显示其他字段 */}
                  {Object.entries(v).filter(([k]) => !['chr', 'pos', 'ref', 'alt'].includes(k)).length > 0 && (
                    <div className="mt-3 border-t border-green-200 dark:border-green-800 pt-3">
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{t('liftover.additionalInfo')}</p>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {Object.entries(v)
                          .filter(([k]) => !['chr', 'pos', 'ref', 'alt'].includes(k))
                          .map(([k, val]) => (
                            <span key={k} className="mr-3">
                              {k}: {String(val)}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {t('liftover.noResult')}
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
              {t('liftover.history')}
            </h2>
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
            >
              <Trash2 size={12} />
              {t('liftover.clearHistory')}
            </button>
          </div>

          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {/* 输入信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium text-navy dark:text-white">
                      {entry.input.chr}:{Number(entry.input.pos)}:{entry.input.ref}:{entry.input.alt}
                    </span>
                    <ArrowRightLeft size={12} className="text-gray-400 dark:text-gray-500" />
                    <span className="font-mono font-medium text-navy dark:text-white">
                      {entry.output
                        ? `${entry.output.chr || ''}:${entry.output.pos ? Number(entry.output.pos) : ''}:${entry.output.ref || ''}:${entry.output.alt || ''}`
                        : '—'}
                    </span>
                    {entry.error && (
                      <span className="text-xs text-red-500 dark:text-red-400">({entry.error})</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {genomeLabel(entry.input.from)}
                    </span>
                    <span>→</span>
                    <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      {genomeLabel(entry.input.dest)}
                    </span>
                    <span className="ml-2">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* 重新查询按钮 */}
                <button
                  onClick={() => restoreFromHistory(entry)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan dark:hover:text-cyan-400 group-hover:opacity-100"
                  title={t('liftover.restore')}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
