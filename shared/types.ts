export interface User {
  id: number;
  email: string;
  name: string;
  institution?: string;
  role: 'admin' | 'reviewer' | 'analyst';
  avatar?: string;
  is_active: number; // SQLite INTEGER 0/1
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: number;
  chromosome: string;
  position: number;
  ref_allele: string;
  alt_allele: string;
  gene: string;
  transcript: string;
  cdna_change: string;
  protein_change: string;
  acmg_class: 'Pathogenic' | 'Likely Pathogenic' | 'VUS' | 'Likely Benign' | 'Benign';
  genome_build: 'GRCh37' | 'GRCh38';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  creatorName: string;
  evidence_codes?: string[];
  pvs1_result?: string; // JSON string of PVS1 analysis result
  created_at: string;
  updated_at: string;
}

export interface ACMGEvidence {
  id: number;
  variant_id: number;
  code: string;
  checked: number; // SQLite INTEGER 0/1
  description: string;
}

export interface Review {
  id: number;
  variant_id: number;
  reviewer_id: number;
  reviewerName: string;
  status: 'approved' | 'rejected';
  comment: string;
  created_at: string;
}

export interface HistoryRecord {
  id: number;
  variant_id: number;
  user_id: number;
  userName: string;
  action: string;
  changes: string;
  created_at: string;
}

export interface VariantDetail extends Variant {
  evidences: ACMGEvidence[];
  reviews: Review[];
  history: HistoryRecord[];
}

export interface DashboardStats {
  totalVariants: number;
  monthlyNew: number;
  pendingReview: number;
  acmgDistribution: Record<string, number>;
}

export interface PVS1DiseaseMechanism {
  gene: string;
  disease: string;
  inheritance: string;
  clinicalValidity: string;
  consideration: string;
  adjustedStrength: string;
}

export interface PVS1FlowchartNode {
  text: string;
  children: PVS1FlowchartNode[];
}

export interface PVS1Footnote {
  number: number;
  text: string;
}

export interface PVS1AnalysisResult {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  genomeBuild: string;
  variantType: string | null;
  gene: string | null;
  pli: number | null;
  haploinsufficiency: string | null;
  chgvs: string | null;
  phgvs: string | null;
  exon: string | null;
  intron: string | null;
  incompatible: boolean;
  incompatibilityMessage: string | null;
  preliminaryPath: string | null;
  preliminaryStrength: string | null;
  adjustedStrength: string | null;
  flowchartTree: PVS1FlowchartNode[];
  footnotes: PVS1Footnote[];
  diseaseMechanisms: PVS1DiseaseMechanism[];
  externalLinks: Record<string, string>;
  autopvs1Url: string;
}

export interface EvidenceInput {
  code: string;
  checked: boolean;
  description: string;
}

export interface AuthPayload {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'reviewer' | 'analyst';
}

export type UserPublic = Omit<User, 'is_active'> & { is_active: number };

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
