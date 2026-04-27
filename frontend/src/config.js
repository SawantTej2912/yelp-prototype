/**
 * API base for REST calls and for prefixing /uploads paths.
 * - Local (monolith):  http://localhost:8000
 * - Docker (via nginx): build with VITE_API_BASE=http://localhost:8000
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
