import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Pencil, Trash2, ArrowLeft, CheckCircle, XCircle, Zap, ExternalLink, Bookmark } from 'lucide-react';
import type { VariantDetail, EvidenceInput, PVS1AnalysisResult, PVS1FlowchartNode } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useI18n } from '@/hooks/useI18n';

const ACMG_CLASSES = ['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign'] as const;

/* ACMG 分类按钮渐变色 - 使用 CSS 中定义的渐变类 */
const ACMG_CLASS_COLORS: Record<string, string> = {
  'Pathogenic': 'acmg-pathogenic text-white',
  'Likely Pathogenic': 'acmg-likely-pathogenic text-white',
  'VUS': 'acmg-vus text-white',
  'Likely Benign': 'acmg-likely-benign text-white',
  'Benign': 'acmg-benign text-white',
};

const EVIDENCE_CATEGORIES = [
  { labelKey: 'variantDetail.pathogenicVeryStrong', codes: ['PVS1'] },
  { labelKey: 'variantDetail.pathogenicStrong', codes: ['PS1', 'PS2', 'PS3', 'PS4'] },
  { labelKey: 'variantDetail.pathogenicModerate', codes: ['PM1', 'PM2', 'PM3', 'PM4', 'PM5', 'PM6'] },
  { labelKey: 'variantDetail.pathogenicSupporting', codes: ['PP1', 'PP2', 'PP3', 'PP4', 'PP5'] },
  { labelKey: 'variantDetail.benignStandalone', codes: ['BA1'] },
  { labelKey: 'variantDetail.benignStrong', codes: ['BS1', 'BS2', 'BS3', 'BS4'] },
  { labelKey: 'variantDetail.benignSupporting', codes: ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7'] },
];

export default function VariantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    chromosome: '',
    position: 0,
    ref_allele: '',
    alt_allele: '',
    gene: '',
    transcript: '',
    cdna_change: '',
    protein_change: '',
    acmg_class: 'VUS' as string,
    genome_build: 'GRCh38' as string,
    notes: '',
  });
  const [evidences, setEvidences] = useState<EvidenceInput[]>([]);

  // Review form state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // AutoPVS1 state
  const [pvs1Result, setPvs1Result] = useState<PVS1AnalysisResult | null>(null);
  const [pvs1Analyzing, setPvs1Analyzing] = useState(false);
  const [pvs1Saving, setPvs1Saving] = useState(false);
  const [pvs1Error, setPvs1Error] = useState<string | null>(null);

  useEffect(() => {
    loadVariant();
  }, [id]);

  const loadVariant = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getVariant(Number(id));
      const data = res.data;
      setVariant(data);
      setForm({
        chromosome: data.chromosome,
        position: data.position,
        ref_allele: data.ref_allele,
        alt_allele: data.alt_allele,
        gene: data.gene,
        transcript: data.transcript,
        cdna_change: data.cdna_change,
        protein_change: data.protein_change,
        acmg_class: data.acmg_class,
        genome_build: data.genome_build || 'GRCh38',
        notes: data.notes || '',
      });
      setEvidences(
        EVIDENCE_CATEGORIES.flatMap((cat) => cat.codes).map((code) => {
          const existing = data.evidences?.find((e) => e.code === code);
          return {
            code,
            checked: existing ? !!existing.checked : false,
            description: existing?.description || '',
          };
        })
      );
      // 加载已保存的 PVS1 结果
      if (data.pvs1_result) {
        try {
          setPvs1Result(JSON.parse(data.pvs1_result));
        } catch { /* ignore parse error */ }
      } else {
        setPvs1Result(null);
      }
    } catch {
      navigate('/variants');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.updateVariant(Number(id), {
        ...form,
        evidences,
      });
      setEditing(false);
      loadVariant();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    try {
      await api.deleteVariant(Number(id));
      navigate('/variants');
    } catch {
      // handle error
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    setSubmittingReview(true);
    try {
      await api.reviewVariant(Number(id), {
        status: reviewStatus,
        comment: reviewComment,
      });
      setReviewComment('');
      loadVariant();
    } catch {
      // handle error
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleEvidence = (code: string) => {
    setEvidences((prev) =>
      prev.map((e) => (e.code === code ? { ...e, checked: !e.checked } : e))
    );
  };

  const updateEvidenceDesc = (code: string, description: string) => {
    setEvidences((prev) =>
      prev.map((e) => (e.code === code ? { ...e, description } : e))
    );
  };

  const handleAutoPVS1Analyze = async () => {
    if (!variant) return;
    setPvs1Analyzing(true);
    setPvs1Error(null);
    try {
      const res = await api.analyzeAutoPVS1({
        chromosome: variant.chromosome,
        position: variant.position,
        ref: variant.ref_allele,
        alt: variant.alt_allele,
        genome_build: variant.genome_build || 'GRCh38',
      });
      setPvs1Result(res.data);
    } catch (err: any) {
      setPvs1Error(err.message || t('autopvs1.analysisFailed'));
    } finally {
      setPvs1Analyzing(false);
    }
  };

  const handleSavePVS1Result = async () => {
    if (!variant || !pvs1Result) return;
    setPvs1Saving(true);
    try {
      await api.savePVS1Result(variant.id, pvs1Result);
      loadVariant();
    } catch {
      // handle error
    } finally {
      setPvs1Saving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        {/* 加载旋转动画 - 使用 pos 主色调（光谱绿） */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pos border-t-transparent" />
      </div>
    );
  }

  if (!variant) return null;

  const canReview = user?.role === 'admin' || user?.role === 'reviewer';
  const canEdit = user?.role === 'admin' || user?.id === variant.created_by;

  return (
    /* 主容器 - 添加入场淡入动画 */
    <div className="space-y-6 animate-fade-in">
      {/* 顶部固定栏 - 深色背景 */}
      <div className="sticky top-[-1rem] z-10 -mx-4 -mt-4 mb-6 border-b border-base-700 bg-base-900 px-4 pb-4 pt-4 dark:border-base-700 dark:bg-base-900 lg:-mx-6 lg:-mt-6 lg:top-[-1.5rem] lg:px-6 lg:pt-6">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/variants')}
            className="rounded-lg p-2 text-base-500 hover:bg-base-800 dark:text-base-400 dark:hover:bg-base-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            {/* 标题 - 使用 font-display 字体 */}
            <h1 className="font-display text-2xl font-bold text-base dark:text-white">
              {variant.gene} - {variant.cdna_change || ''}
            </h1>
            <p className="text-sm text-base-500 dark:text-base-400">{variant.protein_change || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={variant.status} />
          <ACMGBadge classification={variant.acmg_class} size="md" />
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-2 text-sm text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700"
            >
              <Pencil size={14} />
              {t('common.edit')}
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="glow-btn inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button
                onClick={() => { setEditing(false); loadVariant(); }}
                className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-2 text-sm text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700"
              >
                <X size={14} />
                {t('common.cancel')}
              </button>
            </>
          )}
          {user?.role === 'admin' && !editing && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-neg-light px-3 py-2 text-sm text-neg-dark hover:bg-neg/10 dark:border-neg-dark dark:text-neg-light dark:hover:bg-neg/10"
            >
              <Trash2 size={14} />
              {t('common.delete')}
            </button>
          )}
        </div>
        </div>
      </div>

      {/* 基本信息 - 玻璃态卡片 */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('variantDetail.basicInfo')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label={t('variantDetail.chromosome')} value={variant.chromosome} field="chromosome" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.position')} value={String(variant.position)} field="position" editing={editing} form={form} setForm={setForm} type="number" />
          <InfoField label={t('variantDetail.refAllele')} value={variant.ref_allele} field="ref_allele" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.altAllele')} value={variant.alt_allele} field="alt_allele" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.gene')} value={variant.gene} field="gene" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.transcript')} value={variant.transcript || ''} field="transcript" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.cdnaChange')} value={variant.cdna_change || ''} field="cdna_change" editing={editing} form={form} setForm={setForm} />
          <InfoField label={t('variantDetail.proteinChange')} value={variant.protein_change || ''} field="protein_change" editing={editing} form={form} setForm={setForm} />
          <div>
            <p className="mb-1 text-xs font-medium text-base-500 dark:text-base-400">{t('variantDetail.genomeBuild')}</p>
            {editing ? (
              <div className="flex rounded-lg border border-base-600 dark:border-base-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setForm((f: any) => ({ ...f, genome_build: 'GRCh38' }))}
                  className={`flex-1 px-3 py-1.5 text-sm font-semibold transition-colors ${
                    form.genome_build === 'GRCh38'
                      ? 'bg-pos text-white'
                      : 'bg-base-800/50 text-base-600 hover:bg-base-800 dark:bg-base-700 dark:text-base-300 dark:hover:bg-base-600'
                  }`}
                >
                  GRCh38
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f: any) => ({ ...f, genome_build: 'GRCh37' }))}
                  className={`flex-1 px-3 py-1.5 text-sm font-semibold transition-colors border-l border-base-600 dark:border-base-600 ${
                    form.genome_build === 'GRCh37'
                      ? 'bg-pos text-white'
                      : 'bg-base-800/50 text-base-600 hover:bg-base-800 dark:bg-base-700 dark:text-base-300 dark:hover:bg-base-600'
                  }`}
                >
                  GRCh37
                </button>
              </div>
            ) : (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                (variant.genome_build || 'GRCh38') === 'GRCh38'
                  ? 'bg-pos/10 text-pos-dark dark:bg-pos/10 dark:text-pos-light'
                  : 'bg-sec/10 text-sec-dark dark:bg-sec/10 dark:text-sec-light'
              }`}>
                {variant.genome_build || 'GRCh38'}
              </span>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-base-500 dark:text-base-400">{t('common.createdBy')}</p>
            <p className="font-mono text-sm text-base dark:text-white">{variant.creatorName || ''}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-base-500 dark:text-base-400">{t('common.notes')}</p>
          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-base-700 bg-base-800/50 px-3 py-2 text-sm text-white focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white dark:focus:border-action dark:focus:ring-action/20"
            />
          ) : (
            <p className="text-sm text-base-700 dark:text-base-300">{variant.notes || '—'}</p>
          )}
        </div>
      </div>

      {/* ACMG 分类 - 玻璃态卡片 */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('variantDetail.acmgClassification')}</h2>
        <div className="flex flex-wrap gap-2">
          {ACMG_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => editing && setForm((f) => ({ ...f, acmg_class: cls }))}
              disabled={!editing}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                form.acmg_class === cls
                  ? ACMG_CLASS_COLORS[cls]
                  : 'bg-base-800 text-base-600 hover:bg-base-700 dark:bg-base-700 dark:text-base-300 dark:hover:bg-base-600'
              } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* ACMG 证据 - 玻璃态卡片 */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('variantDetail.acmgEvidence')}</h2>
        <div className="space-y-6">
          {EVIDENCE_CATEGORIES.map((category) => (
            <div key={category.labelKey}>
              <h3 className="mb-2 text-sm font-semibold text-base-700 dark:text-base-300">{t(category.labelKey)}</h3>
              <div className="space-y-2">
                {category.codes.map((code) => {
                  const evidence = evidences.find((e) => e.code === code);
                  return (
                    <div key={code} className="flex items-start gap-3 rounded-lg border border-base-800 dark:border-base-700 p-3">
                      <input
                        type="checkbox"
                        checked={evidence?.checked || false}
                        onChange={() => editing && toggleEvidence(code)}
                        disabled={!editing}
                        className="mt-0.5 h-4 w-4 rounded border-base-600 text-pos focus:ring-pos"
                      />
                      <div className="flex-1">
                        <span className="font-mono text-sm font-semibold text-base dark:text-white">{code}</span>
                        {editing ? (
                          <textarea
                            value={evidence?.description || ''}
                            onChange={(e) => updateEvidenceDesc(code, e.target.value)}
                            rows={1}
                            placeholder={t('variantDetail.descriptionPlaceholder')}
                            className="mt-1 w-full rounded border border-base-700 bg-base-800/50 px-2 py-1 text-xs text-white focus:border-action focus:outline-none focus:ring-1 focus:ring-action/20 dark:border-base-700 dark:bg-base-800/50 dark:text-white dark:placeholder-base-400"
                          />
                        ) : (
                          evidence?.description && (
                            <p className="mt-0.5 text-xs text-base-600 dark:text-base-400">{evidence.description}</p>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AutoPVS1 分析 - 玻璃态卡片 */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-base dark:text-white">{t('autopvs1.title')}</h2>
            <p className="mt-0.5 text-xs text-base-500 dark:text-base-400">{t('autopvs1.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            {pvs1Result && (
              <button
                onClick={handleSavePVS1Result}
                disabled={pvs1Saving}
                className="inline-flex items-center gap-1 rounded-lg border border-pos-light px-3 py-2 text-sm font-medium text-pos-dark hover:bg-pos/10 disabled:opacity-50 dark:border-pos-dark dark:text-pos-light dark:hover:bg-pos/10"
              >
                <Bookmark size={14} />
                {pvs1Saving ? t('autopvs1.saving') : t('autopvs1.saveResult')}
              </button>
            )}
            {/* 分析按钮 - 发光渐变样式 */}
            <button
              onClick={handleAutoPVS1Analyze}
              disabled={pvs1Analyzing}
              className="glow-btn inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Zap size={14} />
              {pvs1Analyzing ? t('autopvs1.analyzing') : t('autopvs1.analyze')}
            </button>
          </div>
        </div>

        {/* 错误提示 - 使用 neg 色系 */}
        {pvs1Error && (
          <div className="mb-4 rounded-lg border border-neg-light bg-neg/10 p-3 text-sm text-neg-light dark:border-neg-dark dark:bg-neg/10 dark:text-neg-light">
            {pvs1Error}
          </div>
        )}

        {pvs1Analyzing && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pos border-t-transparent" />
            <span className="ml-3 text-sm text-base-500 dark:text-base-400">{t('autopvs1.analyzing')}</span>
          </div>
        )}

        {!pvs1Analyzing && !pvs1Result && !pvs1Error && (
          <p className="py-8 text-center text-sm text-base-400 dark:text-base-500">{t('autopvs1.noResult')}</p>
        )}

        {pvs1Result && !pvs1Analyzing && (
          <div className="space-y-5">
            {/* 不兼容警告 - 使用 warn 色系 */}
            {pvs1Result.incompatible && (
              <div className="rounded-lg border border-warn-light bg-warn/10 p-4 dark:border-warn-dark dark:bg-warn/10">
                <p className="text-sm font-medium text-warn-dark dark:text-warn-light">{t('autopvs1.incompatible')}</p>
              </div>
            )}

            {/* 变异信息 */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-base-700 dark:text-base-300">{t('autopvs1.variantInfo')}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pvs1Result.variantType && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.variantType')}</p>
                    <p className="font-mono text-sm font-semibold text-base dark:text-white">{pvs1Result.variantType}</p>
                  </div>
                )}
                {pvs1Result.gene && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.gene')}</p>
                    <p className="font-mono text-sm font-semibold text-pos dark:text-pos-light">{pvs1Result.gene}</p>
                  </div>
                )}
                {pvs1Result.pli !== null && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.pli')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.pli}</p>
                  </div>
                )}
                {pvs1Result.haploinsufficiency && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.haploinsufficiency')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.haploinsufficiency}</p>
                  </div>
                )}
                {pvs1Result.chgvs && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.chgvs')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.chgvs}</p>
                  </div>
                )}
                {pvs1Result.phgvs && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.phgvs')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.phgvs}</p>
                  </div>
                )}
                {pvs1Result.exon && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.exon')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.exon}</p>
                  </div>
                )}
                {pvs1Result.intron && (
                  <div>
                    <p className="text-xs text-base-500 dark:text-base-400">{t('autopvs1.intron')}</p>
                    <p className="font-mono text-sm text-base dark:text-white">{pvs1Result.intron}</p>
                  </div>
                )}
              </div>
            </div>

            {/* PVS1 流程图 */}
            {!pvs1Result.incompatible && pvs1Result.flowchartTree.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-base-700 dark:text-base-300">{t('autopvs1.flowchart')}</h3>
                <div className="rounded-lg border border-base-800 dark:border-base-700 p-4">
                  {pvs1Result.preliminaryPath && (
                    <div className="mb-3 rounded bg-base-800/50 dark:bg-base-700/50 px-3 py-1.5">
                      <span className="text-xs text-base-600 dark:text-base-400">{t('autopvs1.preliminaryPath')}: </span>
                      <span className="font-mono text-xs font-bold text-base dark:text-white">{pvs1Result.preliminaryPath}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {pvs1Result.flowchartTree.map((node, idx) => (
                      <FlowchartNodeInline key={idx} node={node} depth={0} />
                    ))}
                  </div>
                  {pvs1Result.footnotes.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-base-800 dark:border-base-700 pt-3">
                      {pvs1Result.footnotes.map((fn) => (
                        <div key={fn.number} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-pos/10 font-bold text-pos-dark dark:bg-pos/10 dark:text-pos-light">
                            {fn.number}
                          </span>
                          <p className="text-base-600 dark:text-base-400">{fn.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {pvs1Result.preliminaryStrength && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-pos/10 px-3 py-2 dark:bg-pos/10">
                      <span className="text-xs font-medium text-base-600 dark:text-base-400">{t('autopvs1.preliminaryStrength')}:</span>
                      <span className="text-sm font-bold text-pos-dark dark:text-pos-light">{pvs1Result.preliminaryStrength}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 疾病机制表格 */}
            {pvs1Result.diseaseMechanisms.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-base-700 dark:text-base-300">{t('autopvs1.diseaseMechanism')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-base-700 dark:border-base-700">
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.gene')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.disease')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.inheritance')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.clinicalValidity')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.consideration')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-base-500 dark:text-base-400">{t('autopvs1.adjustedStrength')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pvs1Result.diseaseMechanisms.map((dm, idx) => (
                        <tr key={idx} className="border-b border-base-800/50 dark:border-base-700/50">
                          <td className="px-3 py-2 font-mono text-xs text-pos dark:text-pos-light">{dm.gene}</td>
                          <td className="px-3 py-2 text-xs text-base-700 dark:text-base-300">{dm.disease}</td>
                          <td className="px-3 py-2 text-xs text-base-700 dark:text-base-300">{dm.inheritance}</td>
                          <td className="px-3 py-2 text-xs text-base-700 dark:text-base-300">{dm.clinicalValidity}</td>
                          <td className="px-3 py-2 text-xs text-base-700 dark:text-base-300">{dm.consideration}</td>
                          <td className="px-3 py-2 text-xs font-bold text-pos-dark dark:text-pos-light">{dm.adjustedStrength}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pvs1Result.adjustedStrength && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-pos/10 px-3 py-2 dark:bg-pos/10">
                    <span className="text-xs font-medium text-base-600 dark:text-base-400">{t('autopvs1.adjustedStrength')}:</span>
                    <span className="text-sm font-bold text-pos-dark dark:text-pos-light">{pvs1Result.adjustedStrength}</span>
                  </div>
                )}
              </div>
            )}

            {/* 外部链接 */}
            <div className="flex flex-wrap gap-3">
              {pvs1Result.autopvs1Url && (
                <a
                  href={pvs1Result.autopvs1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-1.5 text-xs font-medium text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700"
                >
                  <ExternalLink size={12} />
                  {t('autopvs1.openInNewTab')}
                </a>
              )}
              {pvs1Result.externalLinks.gnomAD && (
                <a href={pvs1Result.externalLinks.gnomAD} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-1.5 text-xs font-medium text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700">
                  gnomAD
                </a>
              )}
              {pvs1Result.externalLinks.clinVar && (
                <a href={pvs1Result.externalLinks.clinVar} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-1.5 text-xs font-medium text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700">
                  ClinVar
                </a>
              )}
              {pvs1Result.externalLinks.omim && (
                <a href={pvs1Result.externalLinks.omim} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-base-600 px-3 py-1.5 text-xs font-medium text-base-700 hover:bg-base-800/30 dark:border-base-600 dark:text-base-300 dark:hover:bg-base-700">
                  OMIM
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 审核记录 - 玻璃态卡片 */}
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('variantDetail.reviews')}</h2>

          {canReview && variant.status === 'pending' && (
            <div className="mb-4 rounded-lg border border-pos-light bg-pos/10 p-4 dark:border-pos-dark dark:bg-pos/10">
              <h3 className="mb-2 text-sm font-medium text-base dark:text-white">{t('variantDetail.submitReview')}</h3>
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setReviewStatus('approved')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    reviewStatus === 'approved'
                      ? 'bg-pos-dark text-white'
                      : 'bg-base-800 text-base-600 hover:bg-base-700 dark:bg-base-700 dark:text-base-300 dark:hover:bg-base-600'
                  }`}
                >
                  <CheckCircle size={14} />
                  {t('variantDetail.approve')}
                </button>
                <button
                  onClick={() => setReviewStatus('rejected')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    reviewStatus === 'rejected'
                      ? 'bg-neg-dark text-white'
                      : 'bg-base-800 text-base-600 hover:bg-base-700 dark:bg-base-700 dark:text-base-300 dark:hover:bg-base-600'
                  }`}
                >
                  <XCircle size={14} />
                  {t('variantDetail.reject')}
                </button>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                placeholder={t('variantDetail.addComment')}
                className="mb-2 w-full rounded-xl border border-base-700 bg-base-800/50 px-3 py-2 text-sm text-white focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white"
              />
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="glow-btn rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submittingReview ? t('variantDetail.submitting') : t('variantDetail.submitReview')}
              </button>
            </div>
          )}

          {variant.reviews?.length === 0 ? (
            <p className="py-4 text-center text-sm text-base-400 dark:text-base-500">{t('variantDetail.noReviews')}</p>
          ) : (
            <div className="space-y-3">
              {variant.reviews?.map((review) => (
                <div key={review.id} className="rounded-lg border border-base-800 dark:border-base-700 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-base dark:text-white">{review.reviewerName || ''}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.status === 'approved'
                          ? 'bg-pos/10 text-pos-dark dark:bg-pos/10 dark:text-pos-light'
                          : 'bg-neg/10 text-neg-dark dark:bg-neg/10 dark:text-neg-light'
                      }`}
                    >
                      {review.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {t(`statusBadge.${review.status}`)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-base-600 dark:text-base-400">{review.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-base-400 dark:text-base-500">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 历史记录 - 玻璃态卡片 */}
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="mb-4 font-display text-lg font-semibold text-base dark:text-white">{t('variantDetail.history')}</h2>
          {variant.history?.length === 0 ? (
            <p className="py-4 text-center text-sm text-base-400 dark:text-base-500">{t('variantDetail.noHistory')}</p>
          ) : (
            <div className="relative space-y-0">
              {/* 时间线竖线 */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-base-700 dark:bg-base-600" />
              {variant.history?.map((record) => (
                <div key={record.id} className="relative flex gap-3 pb-4 pl-8">
                  {/* 时间线节点 - pos 色彩 */}
                  <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-pos bg-base-800 dark:bg-base-800" />
                  <div>
                    <p className="text-sm font-medium text-base dark:text-white">{record.action}</p>
                    <p className="text-xs text-base-600 dark:text-base-400">
                      {record.changes
                        ? (Array.isArray(record.changes)
                            ? record.changes.join(', ')
                            : typeof record.changes === 'string'
                              ? (() => { try { const parsed = JSON.parse(record.changes); return Array.isArray(parsed) ? parsed.join(', ') : String(record.changes); } catch { return String(record.changes); } })()
                              : String(record.changes))
                        : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-base-400 dark:text-base-500">
                      {(record.userName || '')} · {new Date(record.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmModal
        open={showDeleteConfirm}
        message={t('variantDetail.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

/* 信息字段组件 - 编辑/查看模式切换 */
function InfoField({
  label,
  value,
  field,
  editing,
  form,
  setForm,
  type = 'text',
}: {
  label: string;
  value: string;
  field: string;
  editing: boolean;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  type?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-base-500 dark:text-base-400">{label}</p>
      {editing ? (
        <input
          type={type}
          value={form[field]}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              [field]: type === 'number' ? Number(e.target.value) : e.target.value,
            }))
          }
          className="w-full rounded-xl border border-base-700 bg-base-800/50 px-3 py-1.5 text-sm text-white focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 dark:text-white dark:focus:border-action dark:focus:ring-action/20"
        />
      ) : (
        <p className="font-mono text-sm text-base dark:text-white">{value}</p>
      )}
    </div>
  );
}

// 递归渲染流程图节点（内联版）
function FlowchartNodeInline({ node, depth }: { node: PVS1FlowchartNode; depth: number }) {
  const strengthValues = ['PVS1', 'Very Strong', 'Strong', 'Moderate', 'Supporting']
  const isStrength = strengthValues.some(s => node.text.toLowerCase() === s.toLowerCase())

  return (
    <div style={{ paddingLeft: depth > 0 ? '20px' : '0' }}>
      <div className={`flex items-start gap-2 py-0.5 ${isStrength ? 'rounded bg-pos/10 dark:bg-pos/10 px-2' : ''}`}>
        {!isStrength && depth > 0 && <span className="mt-1 text-base-400">·</span>}
        <p className={`text-xs ${isStrength ? 'font-bold text-pos-dark dark:text-pos-light' : 'text-base-700 dark:text-base-300'}`}>
          {node.text}
        </p>
      </div>
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child, idx) => (
            <FlowchartNodeInline key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
