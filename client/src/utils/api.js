import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 180000,
});

// ── Attach JWT token to every request ──
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('pdfforge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 globally ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('pdfforge_token');
      sessionStorage.removeItem('pdfforge_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
