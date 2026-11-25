import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lingualearn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === 'string' &&
      response.data.trim().startsWith('<') &&
      response.config.responseType !== 'text'
    ) {
      return Promise.reject(new Error('API returned an unexpected HTML response instead of JSON.'));
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
