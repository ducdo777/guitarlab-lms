import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, hashPassword, verifyPassword, signJwtToken, verifyJwtToken } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await ensureSchema();

  const { action } = req.query;

  try {
    // 1. POST /api/auth?action=register
    if (req.method === 'POST' && action === 'register') {
      const { fullName, email, password } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '').trim();
      const displayName = String(fullName || '').trim() || cleanEmail.split('@')[0];

      if (!cleanEmail || !cleanPassword) {
        return res.status(400).json({ error: 'Email và mật khẩu không được để trống!' });
      }

      // Check existing email
      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = ${cleanEmail}`;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Email này đã được đăng ký tài khoản trong hệ thống!' });
      }

      // Hash password with Bcrypt
      const passwordHash = await hashPassword(cleanPassword);
      const userId = `user_${Date.now()}`;
      const role = cleanEmail === 'admin@guitarlab.vn' ? 'SUPER_ADMIN' : 'STUDENT';

      await sql`
        INSERT INTO profiles (id, full_name, email, password_hash, role)
        VALUES (${userId}, ${displayName}, ${cleanEmail}, ${passwordHash}, ${role})
      `;

      // Auto enroll in default course
      const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const autoEnrollId = `enroll_${cleanEmailKey}_guitar_8_buoi`;
      try {
        await sql`
          INSERT INTO user_courses (id, student_email, course_id)
          VALUES (${autoEnrollId}, ${cleanEmail}, 'guitar-8-buoi')
          ON CONFLICT (student_email, course_id) DO NOTHING
        `;
      } catch (e) {}

      const user = { id: userId, email: cleanEmail, full_name: displayName, role };
      const token = signJwtToken(user);

      return res.status(200).json({ success: true, user, token });
    }

    // 2. POST /api/auth?action=login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '').trim();

      if (!cleanEmail || !cleanPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu!' });
      }

      const rows = await sql`SELECT * FROM profiles WHERE LOWER(email) = ${cleanEmail}`;
      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'Tài khoản chưa tồn tại trong hệ thống. Vui lòng đăng ký!' });
      }

      const profile = rows[0];
      const isPasswordValid = await verifyPassword(cleanPassword, profile.password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
      }

      // Re-hash with Bcrypt if previously stored in plaintext
      if (profile.password_hash && !profile.password_hash.startsWith('$2')) {
        try {
          const newHash = await hashPassword(cleanPassword);
          await sql`UPDATE profiles SET password_hash = ${newHash} WHERE id = ${profile.id}`;
        } catch (e) {}
      }

      const role = cleanEmail === 'admin@guitarlab.vn' ? 'SUPER_ADMIN' : (profile.role || 'STUDENT');
      const user = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role
      };
      const token = signJwtToken(user);

      return res.status(200).json({ success: true, user, token });
    }

    // 3. GET /api/auth?action=me
    if (req.method === 'GET' && action === 'me') {
      const authUser = verifyJwtToken(req.headers.authorization);
      if (!authUser) {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
      }

      const rows = await sql`SELECT id, full_name, email, role, avatar_url FROM profiles WHERE LOWER(email) = ${authUser.email.toLowerCase()}`;
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy thông tin tài khoản.' });
      }

      return res.status(200).json({ user: rows[0] });
    }

    return res.status(400).json({ error: 'Invalid auth action' });
  } catch (err: any) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
