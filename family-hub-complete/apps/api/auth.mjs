/**
 * API Key authentication middleware
 * Configure API_KEYS=key1,key2 in .env
 * Localhost is always allowed without a key
 */
const LOCAL = ['localhost','127.0.0.1','::1','::ffff:127.0.0.1'];

export function checkApiKey(req) {
  const keys = (process.env.API_KEYS||'').split(',').map(k=>k.trim()).filter(Boolean);
  if (keys.length === 0) return null; // open mode
  const ip = req.socket?.remoteAddress || '';
  if (LOCAL.some(l => ip.includes(l))) return null; // local always allowed
  const provided = (req.headers['x-api-key']||'').trim();
  if (!provided) return { error: 'Missing X-API-Key header' };
  if (!keys.includes(provided)) return { error: 'Invalid API key' };
  return null;
}
