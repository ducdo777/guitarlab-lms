import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, verifyJwtToken } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureSchema();

  const { action, courseId, email } = req.query;

  try {
    // 1. GET /api/courses?action=list&email=...
    if (req.method === 'GET' && action === 'list') {
      const studentEmail = String(email || '').trim().toLowerCase();
      
      const dbCourses = await sql`
        SELECT * FROM courses ORDER BY created_at ASC
      `;

      let enrolledCourseIds: string[] = ['guitar-8-buoi'];
      if (studentEmail) {
        const enrolledRows = await sql`
          SELECT course_id FROM user_courses WHERE LOWER(student_email) = ${studentEmail}
        `;
        if (enrolledRows && enrolledRows.length > 0) {
          enrolledCourseIds = Array.from(new Set([...enrolledCourseIds, ...enrolledRows.map((r: any) => r.course_id)]));
        }
      }

      return res.status(200).json({
        courses: dbCourses || [],
        enrolledCourseIds
      });
    }

    // 2. GET /api/courses?action=sessions&courseId=...
    if (req.method === 'GET' && action === 'sessions') {
      const targetCourseId = String(courseId || 'guitar-8-buoi');
      
      const dbSessions = await sql`
        SELECT * FROM sessions 
        WHERE course_id = ${targetCourseId} OR (course_id IS NULL AND ${targetCourseId} = 'guitar-8-buoi')
        ORDER BY order_index ASC, id ASC
      `;

      return res.status(200).json({
        sessions: dbSessions || []
      });
    }

    return res.status(400).json({ error: 'Invalid courses action' });
  } catch (err: any) {
    console.error('Courses API error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
