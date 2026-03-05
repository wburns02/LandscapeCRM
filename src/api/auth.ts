import api from './client';
import type { User } from '../types';

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const result = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password });
  localStorage.setItem('gs_token', result.access_token);
  return { token: result.access_token, user: result.user };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('gs_token');
  }
}

export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me');
}
