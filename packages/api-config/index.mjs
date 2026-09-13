function configurationError(variable, detail) {
  const error = new Error(`API configuration error: ${variable} ${detail}`);
  error.code = 'API_CONFIGURATION';
  return error;
}

function isLocalHost(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true;
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d+$/.test(p) || Number(p) > 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function resolveApiOrigin(value, variable = 'API_BASE_URL') {
  if (typeof value !== 'string' || !value.trim()) {
    throw configurationError(variable, 'is missing. Configure the backend URL and rebuild the app.');
  }
  const input = value.trim();
  const invalid = () => configurationError(variable, 'must be an absolute backend HTTP(S) origin (optionally ending in /api), without credentials, query or fragment.');
  if (!/^https?:\/\//i.test(input) || /[\\\s?#]/.test(input)) throw invalid();
  let url;
  try { url = new URL(input); } catch { throw invalid(); }
  if (url.username || url.password || !['', '/', '/api', '/api/'].includes(url.pathname)) throw invalid();
  if (url.protocol === 'http:' && !isLocalHost(url.hostname)) {
    throw configurationError(variable, 'must use HTTPS except for a local loopback/private network backend.');
  }
  return url.origin;
}

export function resolveApiUrl(value, apiPath, variable = 'API_BASE_URL') {
  const origin = resolveApiOrigin(value, variable);
  if (typeof apiPath !== 'string' || !/^\/api(?:\/|$)/.test(apiPath) || /[\\\s#]/.test(apiPath)) {
    throw configurationError(variable, 'requires an API path beginning with /api/.');
  }
  const url = new URL(apiPath, origin);
  if (url.origin !== origin || (url.pathname !== '/api' && !url.pathname.startsWith('/api/'))) {
    throw configurationError(variable, 'cannot resolve a path outside the configured API.');
  }
  return url.href;
}
