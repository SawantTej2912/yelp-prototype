import axios from 'axios';
import { API_BASE } from '../config.js';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Response Interceptor ────────────────────────────────────────────────────
// Normalise error messages so callers always get a plain Error with .message

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const detail = error?.response?.data?.detail;
        const message =
            typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map((d) => d.msg).join('; ')
                    : error.message ?? 'An unexpected error occurred';

        return Promise.reject(new Error(message));
    },
);

export default api;
