import api from './client';
import type { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  // Use raw fetch to avoid the api client's 401 redirect behavior on login
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error('Login failed');
  }

  const result = await res.json();
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
