const API_PORT = '3001';
const API_PREFIX = '/api';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function ensureApiPrefix(value) {
  const base = trimTrailingSlash(value);
  return base.endsWith(API_PREFIX) ? base : `${base}${API_PREFIX}`;
}

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return ensureApiPrefix(configured);

  if (typeof window === 'undefined') {
    return `http://127.0.0.1:${API_PORT}${API_PREFIX}`;
  }

  const hostname = window.location.hostname || '127.0.0.1';
  if (import.meta.env.DEV && LOCAL_HOSTS.has(hostname)) {
    return API_PREFIX;
  }

  return `http://${hostname}:${API_PORT}${API_PREFIX}`;
}

export function apiUrl(path) {
  const pathWithoutPrefix = path.startsWith(API_PREFIX)
    ? path.slice(API_PREFIX.length)
    : path;
  const normalizedPath = pathWithoutPrefix.startsWith('/')
    ? pathWithoutPrefix
    : `/${pathWithoutPrefix}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function api(path, options = {}) {
  const url = apiUrl(path);
  let res;

  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error(`API unreachable at ${url}. Check that the Family Hub API is running on port 3001.`);
  }

  if (!res.ok) {
    const details = await res.text();
    throw new Error(details || `API request failed at ${url}: ${res.status}`);
  }

  return res.json();
}
