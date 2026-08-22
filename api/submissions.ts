import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, verifyJwtToken } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureSchema();

  const { action, email, studentId } = req.query;

  try {
    // 1. GET /api/submissions?action=my&email=...
    if (req.method === 'GET' && action === 'my') {
      const targetEmail = String(email || '').trim().toLowerCase();
      const targetId = String(studentId || '').trim();

      const dbSubmissions = await sql`
        SELECT * FROM submissions 
        WHERE LOWER(student_email) = ${targetEmail} OR student_id = ${targetId}
        ORDER BY created_at DESC
      `;

      return res.status(200).json({
        submissions: dbSubmissions || []
      });
    }

    // 2. POST /api/submissions?action=submit
    if (req.method === 'POST' && action === 'submit') {
      const { id, studentId, studentName, studentEmail, sessionId, videoUrl } = req.body || {};

      if (!studentEmail || !sessionId || !videoUrl) {
        return res.status(400).json({ error: 'Thiếu thông tin nộp bài!' });
      }

      const submissionId = id || `sub_${Date.now()}`;
      const cleanEmail = String(studentEmail).trim().toLowerCase();
      const displayName = String(studentName || '').trim() || cleanEmail.split('@')[0];

      await sql`
        INSERT INTO submissions (id, student_id, student_name, student_email, session_id, video_url, status)
        VALUES (${submissionId}, ${studentId || cleanEmail}, ${displayName}, ${cleanEmail}, ${sessionId}, ${videoUrl}, 'PENDING')
      `;

      return res.status(200).json({ success: true, id: submissionId });
    }

    // 3. POST /api/submissions?action=delete
    if (req.method === 'POST' && action === 'delete') {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Thiếu ID bài nộp cần xóa!' });
      }

      await sql`DELETE FROM submissions WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid submissions action' });
  } catch (err: any) {
    console.error('Submissions API error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
