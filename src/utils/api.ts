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

  if (res.status === 401) {
    // token 过期或无效，清除登录状态并跳转到登录页
    localStorage.removeItem('token');
    // 只在非登录页才跳转，避免循环
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '登录已过期，请重新登录');
  }

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

export async function loginByPhone(phone: string, verificationCode: string): Promise<{ success: boolean; data: { token: string; user: User } }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginType: 'phone', phone, verificationCode }),
  });
}

export async function register(data: {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  institution?: string;
  verificationCode: string;
  verificationType: 'email' | 'phone';
}): Promise<{ success: boolean; data: { token: string; user: User } }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<{ success: boolean; data: User }> {
  return request('/auth/me');
}

export async function updateProfile(data: { name: string; institution?: string }): Promise<{ success: boolean; data: User }> {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
  return request('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; data: { avatar: string; user: User } }> {
  const formData = new FormData();
  formData.append('avatar', file);
  const token = getToken();
  const res = await fetch(`${BASE_URL}/auth/avatar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function resetPassword(data: {
  target: string;
  type: 'email' | 'phone';
  newPassword: string;
  verificationCode: string;
}): Promise<{ success: boolean; message: string }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Verification
export async function sendVerificationCode(target: string, type: 'email' | 'phone', purpose: 'register' | 'reset_password' | 'login'): Promise<{ success: boolean; message: string; devCode?: string }> {
  return request('/verification/send', {
    method: 'POST',
    body: JSON.stringify({ target, type, purpose }),
  });
}

// Variants
export async function getVariants(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  acmgClass?: string;
  status?: string;
  gene?: string;
  genomeBuild?: string;
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
  genome_build?: string;
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
    genome_build?: string;
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

export async function importVariants(file: File): Promise<{
  success: boolean;
  data: { imported: number; skipped: number; total: number; errors: { row: number; reason: string }[] }
}> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const res = await fetch(`${BASE_URL}/variants/import`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Import failed: ${res.status}`);
  }
  return res.json();
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
