import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const rawUrl = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const cleanDatabaseUrl = rawUrl.replace('&channel_binding=require', '');

export const sql = neon(cleanDatabaseUrl);

export const JWT_SECRET = process.env.JWT_SECRET || 'guitarlab-secret-key-production-2026-super-secure';

export function signJwtToken(payload: { id: string; email: string; full_name: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwtToken(authHeader?: any) {
  if (!authHeader) return null;
  try {
    const headerStr = Array.isArray(authHeader) ? String(authHeader[0] || '') : String(authHeader || '');
    if (!headerStr) return null;
    const token = headerStr.startsWith('Bearer ') ? headerStr.substring(7).trim() : headerStr.trim();
    if (!token || token === 'null' || token === 'undefined') return null;
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; full_name: string; role: string };
  } catch (err) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
}

// Safe SQL runner with 1 retry for Neon compute wake-up
export async function safeQuery<T = any>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (firstErr) {
    console.warn('Neon query retry after error:', firstErr);
    try {
      // Wait 500ms for Neon compute to wake up
      await new Promise(r => setTimeout(r, 500));
      return await queryFn();
    } catch (secondErr) {
      console.error('Neon query failed twice:', secondErr);
      return fallback;
    }
  }
}
