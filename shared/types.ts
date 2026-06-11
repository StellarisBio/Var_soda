export interface User {
  id: number;
  email: string;
  name: string;
  institution?: string;
  role: 'admin' | 'reviewer' | 'analyst';
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
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  creatorName: string;
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
