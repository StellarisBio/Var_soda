import type { User, Variant, VariantDetail, DashboardStats, EvidenceInput } from '@shared/types';

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(email: string, password: string): Promise<{ success: boolean; data: { token: string; user: User } }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  institution?: string;
}): Promise<{ success: boolean; data: { token: string; user: User } }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<{ success: boolean; data: User }> {
  return request('/auth/me');
}

// Variants
export async function getVariants(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  acmgClass?: string;
  status?: string;
  gene?: string;
}): Promise<{ success: boolean; data: { total: number; page: number; pageSize: number; data: Variant[] } }> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return request(`/variants${qs ? `?${qs}` : ''}`);
}

export async function getVariant(id: number): Promise<{ success: boolean; data: VariantDetail }> {
  return request(`/variants/${id}`);
}

export async function createVariant(data: {
  chromosome: string;
  position: number;
  ref_allele: string;
  alt_allele: string;
  gene: string;
  transcript: string;
  cdna_change: string;
  protein_change: string;
  acmg_class: string;
  notes?: string;
  evidences: EvidenceInput[];
}): Promise<{ success: boolean; data: Variant }> {
  return request('/variants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVariant(
  id: number,
  data: {
    chromosome?: string;
    position?: number;
    ref_allele?: string;
    alt_allele?: string;
    gene?: string;
    transcript?: string;
    cdna_change?: string;
    protein_change?: string;
    acmg_class?: string;
    notes?: string;
    evidences?: EvidenceInput[];
  }
): Promise<{ success: boolean; data: Variant }> {
  return request(`/variants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVariant(id: number): Promise<{ success: boolean }> {
  return request(`/variants/${id}`, { method: 'DELETE' });
}

export async function reviewVariant(
  id: number,
  data: { status: 'approved' | 'rejected'; comment: string }
): Promise<{ success: boolean; data: Variant }> {
  return request(`/variants/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Users
export async function getUsers(): Promise<{ success: boolean; data: User[] }> {
  return request('/users');
}

export async function updateUser(
  id: number,
  data: { role?: string; is_active?: number }
): Promise<{ success: boolean; data: User }> {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Dashboard
export async function getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
  return request('/dashboard/stats');
}
