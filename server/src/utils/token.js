import crypto from 'crypto';
import env from '../config/env.js';

const SECRET = env.SESSION_SECRET || 'cpg-secure-secret-key-fallback';

/**
 * Creates a signed, tamper-proof session token.
 * @param {Object} payload - User data to embed in token (userId, role, email)
 * @param {number} expiresInMs - Expiration duration in milliseconds (default 7 days)
 * @returns {string} Signed token
 */
export function createToken(payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const data = {
    ...payload,
    exp: Date.now() + expiresInMs,
  };
  const str = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  return `${str}.${signature}`;
}

/**
 * Verifies and decodes a session token.
 * @param {string} token - The signed token string
 * @returns {Object|null} Decoded payload or null if invalid or expired
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(dataStr).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
