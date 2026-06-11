import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Pencil, Trash2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { VariantDetail, EvidenceInput } from '@shared/types';
import * as api from '@/utils/api';
import ACMGBadge from '@/components/ACMGBadge';
import StatusBadge from '@/components/StatusBadge';
import { useAuthStore } from '@/hooks/useAuthStore';

const ACMG_CLASSES = ['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign'] as const;

const ACMG_CLASS_COLORS: Record<string, string> = {
  'Pathogenic': 'bg-acmg-pathogenic text-white',
  'Likely Pathogenic': 'bg-acmg-likelyPathogenic text-white',
  'VUS': 'bg-acmg-vus text-white',
  'Likely Benign': 'bg-acmg-likelyBenign text-white',
  'Benign': 'bg-acmg-benign text-white',
};

const EVIDENCE_CATEGORIES = [
  { label: 'Pathogenic Very Strong', codes: ['PVS1'] },
  { label: 'Pathogenic Strong', codes: ['PS1', 'PS2', 'PS3', 'PS4'] },
  { label: 'Pathogenic Moderate', codes: ['PM1', 'PM2', 'PM3', 'PM4', 'PM5', 'PM6'] },
  { label: 'Pathogenic Supporting', codes: ['PP1', 'PP2', 'PP3', 'PP4', 'PP5'] },
  { label: 'Benign Stand-alone', codes: ['BA1'] },
  { label: 'Benign Strong', codes: ['BS1', 'BS2', 'BS3', 'BS4'] },
  { label: 'Benign Supporting', codes: ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7'] },
];

export default function VariantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
    notes: '',
  });
  const [evidences, setEvidences] = useState<EvidenceInput[]>([]);

  // Review form state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [submittingReview, setSubmittingReview] = useState(false);

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
    if (!id || !confirm('Are you sure you want to delete this variant?')) return;
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan border-t-transparent" />
      </div>
    );
  }

  if (!variant) return null;

  const canReview = user?.role === 'admin' || user?.role === 'reviewer';
  const canEdit = user?.role === 'admin' || user?.id === variant.created_by;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/variants')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy">
              {variant.gene} - {variant.cdna_change}
            </h1>
            <p className="text-sm text-gray-500">{variant.protein_change}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={variant.status} />
          <ACMGBadge classification={variant.acmg_class} size="md" />
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); loadVariant(); }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <X size={14} />
                Cancel
              </button>
            </>
          )}
          {user?.role === 'admin' && !editing && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Chromosome" value={variant.chromosome} field="chromosome" editing={editing} form={form} setForm={setForm} />
          <InfoField label="Position" value={variant.position.toLocaleString()} field="position" editing={editing} form={form} setForm={setForm} type="number" />
          <InfoField label="Ref Allele" value={variant.ref_allele} field="ref_allele" editing={editing} form={form} setForm={setForm} />
          <InfoField label="Alt Allele" value={variant.alt_allele} field="alt_allele" editing={editing} form={form} setForm={setForm} />
          <InfoField label="Gene" value={variant.gene} field="gene" editing={editing} form={form} setForm={setForm} />
          <InfoField label="Transcript" value={variant.transcript} field="transcript" editing={editing} form={form} setForm={setForm} />
          <InfoField label="cDNA Change" value={variant.cdna_change} field="cdna_change" editing={editing} form={form} setForm={setForm} />
          <InfoField label="Protein Change" value={variant.protein_change} field="protein_change" editing={editing} form={form} setForm={setForm} />
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Created By</p>
            <p className="font-mono text-sm text-navy">{variant.creatorName}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Notes</p>
          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          ) : (
            <p className="text-sm text-gray-700">{variant.notes || '—'}</p>
          )}
        </div>
      </div>

      {/* ACMG Classification */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy">ACMG Classification</h2>
        <div className="flex flex-wrap gap-2">
          {ACMG_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => editing && setForm((f) => ({ ...f, acmg_class: cls }))}
              disabled={!editing}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                form.acmg_class === cls
                  ? ACMG_CLASS_COLORS[cls]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* ACMG Evidence */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-navy">ACMG Evidence</h2>
        <div className="space-y-6">
          {EVIDENCE_CATEGORIES.map((category) => (
            <div key={category.label}>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">{category.label}</h3>
              <div className="space-y-2">
                {category.codes.map((code) => {
                  const evidence = evidences.find((e) => e.code === code);
                  return (
                    <div key={code} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                      <input
                        type="checkbox"
                        checked={evidence?.checked || false}
                        onChange={() => editing && toggleEvidence(code)}
                        disabled={!editing}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan focus:ring-cyan"
                      />
                      <div className="flex-1">
                        <span className="font-mono text-sm font-semibold text-navy">{code}</span>
                        {editing ? (
                          <textarea
                            value={evidence?.description || ''}
                            onChange={(e) => updateEvidenceDesc(code, e.target.value)}
                            rows={1}
                            placeholder="Description..."
                            className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                          />
                        ) : (
                          evidence?.description && (
                            <p className="mt-0.5 text-xs text-gray-600">{evidence.description}</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reviews */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">Reviews</h2>

          {canReview && variant.status === 'pending' && (
            <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <h3 className="mb-2 text-sm font-medium text-navy">Submit Review</h3>
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setReviewStatus('approved')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    reviewStatus === 'approved'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
                <button
                  onClick={() => setReviewStatus('rejected')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    reviewStatus === 'rejected'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                placeholder="Add review comment..."
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
              />
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}

          {variant.reviews?.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {variant.reviews?.map((review) => (
                <div key={review.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy">{review.reviewerName}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {review.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {review.status}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">History</h2>
          {variant.history?.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No history records</p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
              {variant.history?.map((record) => (
                <div key={record.id} className="relative flex gap-3 pb-4 pl-8">
                  <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-cyan bg-white" />
                  <div>
                    <p className="text-sm font-medium text-navy">{record.action}</p>
                    <p className="text-xs text-gray-600">{record.changes}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {record.userName} · {new Date(record.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
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
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
      ) : (
        <p className="font-mono text-sm text-navy">{value}</p>
      )}
    </div>
  );
}
