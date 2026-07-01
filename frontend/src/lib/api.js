import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_TIMEOUT_MS = 15000;
const LONG_TIMEOUT_MS = 120000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  if (config.longRunning) {
    config.timeout = LONG_TIMEOUT_MS;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const method = config?.method?.toUpperCase();
    const canRetry = method === 'GET' || method === 'HEAD';

    if (!config || !canRetry || config.__retryCount >= 2) {
      return Promise.reject(error);
    }

    const retryableStatus = !error.response || [408, 429, 500, 502, 503, 504].includes(error.response.status);
    if (!retryableStatus) {
      return Promise.reject(error);
    }

    config.__retryCount = (config.__retryCount || 0) + 1;
    await sleep(400 * config.__retryCount);
    return api(config);
  },
);

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error.code === 'ECONNABORTED') {
    return 'The request took too long. Please check your connection and try again.';
  }

  return error.response?.data?.detail || error.message || fallback;
};

export default api;
