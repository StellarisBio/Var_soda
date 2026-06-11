import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import type { EvidenceInput } from '@shared/types';
import * as api from '@/utils/api';

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

export default function VariantNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const [evidences, setEvidences] = useState<EvidenceInput[]>(
    EVIDENCE_CATEGORIES.flatMap((cat) => cat.codes).map((code) => ({
      code,
      checked: false,
      description: '',
    }))
  );

  const updateField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.gene || !form.chromosome || !form.ref_allele || !form.alt_allele) {
      setError('Please fill in all required fields (Gene, Chromosome, Ref Allele, Alt Allele)');
      return;
    }

    setSaving(true);
    try {
      await api.createVariant({
        chromosome: form.chromosome,
        position: form.position,
        ref_allele: form.ref_allele,
        alt_allele: form.alt_allele,
        gene: form.gene,
        transcript: form.transcript,
        cdna_change: form.cdna_change,
        protein_change: form.protein_change,
        acmg_class: form.acmg_class,
        notes: form.notes || undefined,
        evidences,
      });
      navigate('/variants');
    } catch (err: any) {
      setError(err.message || 'Failed to create variant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">New Variant</h1>
        <button
          onClick={() => navigate('/variants')}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <X size={14} />
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Chromosome *</label>
              <input
                type="text"
                value={form.chromosome}
                onChange={(e) => updateField('chromosome', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="e.g. 17"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Position *</label>
              <input
                type="number"
                value={form.position || ''}
                onChange={(e) => updateField('position', Number(e.target.value))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="Genomic position"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Ref Allele *</label>
              <input
                type="text"
                value={form.ref_allele}
                onChange={(e) => updateField('ref_allele', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="A"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Alt Allele *</label>
              <input
                type="text"
                value={form.alt_allele}
                onChange={(e) => updateField('alt_allele', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="T"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Gene *</label>
              <input
                type="text"
                value={form.gene}
                onChange={(e) => updateField('gene', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="BRCA1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Transcript</label>
              <input
                type="text"
                value={form.transcript}
                onChange={(e) => updateField('transcript', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="NM_007294.3"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">cDNA Change</label>
              <input
                type="text"
                value={form.cdna_change}
                onChange={(e) => updateField('cdna_change', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="c.5266dupC"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Protein Change</label>
              <input
                type="text"
                value={form.protein_change}
                onChange={(e) => updateField('protein_change', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                placeholder="p.Gln1756Profs"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* ACMG Classification */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-lg font-semibold text-navy">ACMG Classification</h2>
          <div className="flex flex-wrap gap-2">
            {ACMG_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => updateField('acmg_class', cls)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  form.acmg_class === cls
                    ? ACMG_CLASS_COLORS[cls]
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
                          onChange={() => toggleEvidence(code)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan focus:ring-cyan"
                        />
                        <div className="flex-1">
                          <span className="font-mono text-sm font-semibold text-navy">{code}</span>
                          <textarea
                            value={evidence?.description || ''}
                            onChange={(e) => updateEvidenceDesc(code, e.target.value)}
                            rows={1}
                            placeholder="Description..."
                            className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Creating...' : 'Create Variant'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/variants')}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
