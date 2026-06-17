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
      {/* 页面标题 - 使用 font-display (Manrope) 字体 */}
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-white">{t('liftover.title')}</h1>
      </div>

      {/* 说明 - 使用 pos 翠绿色系信息提示 */}
      <div className="glass rounded-xl border-pos/10 p-4 text-sm text-pos-light animate-fade-in">
        <p>{t('liftover.description')}</p>
        <p className="mt-1 text-xs text-pos-dark">{t('liftover.poweredBy')}</p>
      </div>

      {/* 输入区域 - 玻璃态卡片 */}
      <div className="glass p-6 animate-fade-in">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">{t('liftover.inputVariant')}</h2>

        {/* 基因组版本选择 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.sourceGenome')}</label>
            <select
              value={fromGenome}
              onChange={(e) => { setFromGenome(e.target.value); setResult(null); }}
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            >
              <option value="hg38">{genomeLabel('hg38')}</option>
              <option value="hg19">{genomeLabel('hg19')}</option>
              <option value="t2t">{genomeLabel('t2t')}</option>
            </select>
          </div>

          <button
            onClick={swapGenomes}
            className="glass border-base-600 mt-5 rounded-lg p-2 text-base-400 transition-colors hover:bg-base-700/50 hover:text-pos"
            title={t('liftover.swap')}
          >
            <ArrowRightLeft size={18} />
          </button>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.targetGenome')}</label>
            <select
              value={destGenome}
              onChange={(e) => { setDestGenome(e.target.value); setResult(null); }}
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            >
              <option value="hg19">{genomeLabel('hg19')}</option>
              <option value="hg38">{genomeLabel('hg38')}</option>
              <option value="t2t">{genomeLabel('t2t')}</option>
            </select>
          </div>
        </div>

        {/* 粘贴输入 - 统一输入框样式 */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.pasteInput')}</label>
          <input
            type="text"
            value={pasteText}
            onChange={(e) => parseAndFill(e.target.value)}
            placeholder={t('liftover.pastePlaceholder')}
            className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 px-3 py-2 font-mono text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
          />
          <p className="mt-1 text-xs text-base-500">{t('liftover.pasteHint')}</p>
        </div>

        {/* 变异输入 - 四个字段网格 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.chromosome')} *</label>
            <input
              type="text"
              value={chr}
              onChange={(e) => setChr(e.target.value)}
              placeholder="17"
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.position')} *</label>
            <input
              type="number"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="41244651"
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.refAllele')} *</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="A"
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 px-3 py-2 font-mono text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-base-400">{t('liftover.altAllele')} *</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="T"
              className="w-full rounded-xl border border-base-700 bg-base-800/50 text-white placeholder-base-500 px-3 py-2 font-mono text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>
        </div>

        {/* 转换按钮 - 主按钮 glow-btn，次按钮 glass */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleLiftover}
            disabled={loading || !chr || !pos || !ref || !alt}
            className="glow-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
            {loading ? t('liftover.converting') : t('liftover.convert')}
          </button>
          <button
            onClick={clearInput}
            className="glass border-base-600 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-base-300 transition-colors hover:bg-base-700/50"
          >
            <X size={16} />
            {t('liftover.clearInput')}
          </button>
        </div>
      </div>

      {/* 错误提示 - 使用 neg 玫瑰红色系 */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-neg/10 px-4 py-3 text-sm text-neg-light animate-fade-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 结果区域 - 玻璃态卡片 */}
      {result && (
        <div className="glass p-6 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">{t('liftover.result')}</h2>
            {result.variants?.length > 0 && (
              <button
                onClick={copyResult}
                className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-base-300 hover:bg-base-700/50"
              >
                {copied ? <Check size={14} className="text-pos" /> : <Copy size={14} />}
                {copied ? t('liftover.copied') : t('liftover.copy')}
              </button>
            )}
          </div>

          {/* 转换方向 - 使用 base/pos 色系标签 */}
          <div className="mb-4 flex items-center gap-2 text-sm text-base-400">
            <span className="rounded-full bg-base-700 px-2 py-0.5 text-xs font-medium text-pos-light">
              {genomeLabel(result.from)}
            </span>
            <ArrowRightLeft size={14} />
            <span className="rounded-full bg-base-700 px-2 py-0.5 text-xs font-medium text-pos-light">
              {genomeLabel(result.dest)}
            </span>
          </div>

          {result.error ? (
            <div className="flex items-center gap-2 rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
              <AlertCircle size={16} />
              {result.error}
            </div>
          ) : result.variants?.length > 0 ? (
            <div className="space-y-3">
              {/* 成功结果 - 使用 pos 翠绿色系 */}
              {result.variants.map((v, i) => (
                <div key={i} className="rounded-lg border border-pos-dark bg-pos/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-pos" />
                    <span className="text-sm font-medium text-pos-light">{t('liftover.success')}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {v.chr !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-base-400">{t('liftover.chromosome')}</p>
                        <p className="font-mono text-sm text-white">{v.chr}</p>
                      </div>
                    )}
                    {v.pos !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-base-400">{t('liftover.position')}</p>
                        <p className="font-mono text-sm text-white">{Number(v.pos)}</p>
                      </div>
                    )}
                    {v.ref !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-base-400">{t('liftover.refAllele')}</p>
                        <p className="font-mono text-sm text-white">{v.ref}</p>
                      </div>
                    )}
                    {v.alt !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-base-400">{t('liftover.altAllele')}</p>
                        <p className="font-mono text-sm text-white">{v.alt}</p>
                      </div>
                    )}
                  </div>
                  {/* 显示其他字段 */}
                  {Object.entries(v).filter(([k]) => !['chr', 'pos', 'ref', 'alt'].includes(k)).length > 0 && (
                    <div className="mt-3 border-t border-pos-dark pt-3">
                      <p className="mb-1 text-xs font-medium text-base-400">{t('liftover.additionalInfo')}</p>
                      <div className="text-xs text-base-400">
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
            <div className="rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
              {t('liftover.noResult')}
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
              {t('liftover.history')}
            </h2>
            <button
              onClick={clearHistory}
              className="glass border-base-600 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-base-400 hover:bg-neg/10 hover:text-neg-light hover:border-neg"
            >
              <Trash2 size={12} />
              {t('liftover.clearHistory')}
            </button>
          </div>

          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg border border-base-700 px-4 py-3 transition-colors hover:bg-base-700/30"
              >
                {/* 输入信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium text-white">
                      {entry.input.chr}:{Number(entry.input.pos)}:{entry.input.ref}:{entry.input.alt}
                    </span>
                    <ArrowRightLeft size={12} className="text-base-500" />
                    <span className="font-mono font-medium text-white">
                      {entry.output
                        ? `${entry.output.chr || ''}:${entry.output.pos ? Number(entry.output.pos) : ''}:${entry.output.ref || ''}:${entry.output.alt || ''}`
                        : '—'}
                    </span>
                    {entry.error && (
                      <span className="text-xs text-neg-light">({entry.error})</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-base-500">
                    <span className="rounded-full bg-base-700 px-1.5 py-0.5 text-pos-light">
                      {genomeLabel(entry.input.from)}
                    </span>
                    <span>→</span>
                    <span className="rounded-full bg-base-700 px-1.5 py-0.5 text-pos-light">
                      {genomeLabel(entry.input.dest)}
                    </span>
                    <span className="ml-2">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* 重新查询按钮 */}
                <button
                  onClick={() => restoreFromHistory(entry)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-base-400 opacity-0 transition-all hover:bg-pos/10 hover:text-pos group-hover:opacity-100"
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
