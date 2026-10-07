export const getAuthToken = () => {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
};

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
  }

  return res;
};