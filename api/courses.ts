import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const cleanDatabaseUrl = databaseUrl.replace('&channel_binding=require', '');
const sql = neon(cleanDatabaseUrl);

async function safeQuery<T = any>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (firstErr) {
    try {
      await new Promise(r => setTimeout(r, 400));
      return await queryFn();
    } catch (secondErr) {
      console.error('Neon query error in courses API:', secondErr);
      return fallback;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Email');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, courseId, email } = req.query;

    // 1. GET /api/courses?action=list&email=...
    if (req.method === 'GET' && action === 'list') {
      const studentEmail = String(email || '').trim().toLowerCase();
      
      const dbCourses = await safeQuery(() => sql`
        SELECT * FROM courses ORDER BY created_at ASC
      `, [
        { id: 'guitar-8-buoi', title: 'Khoá Học Guitar Đệm Hát 8 Bài', subtitle: 'Lộ trình chuẩn hóa', total_sessions: 8 }
      ]);

      let enrolledCourseIds: string[] = ['guitar-8-buoi'];
      if (studentEmail) {
        const enrolledRows = await safeQuery(() => sql`
          SELECT course_id FROM user_courses WHERE LOWER(student_email) = ${studentEmail}
        `, []);
        if (enrolledRows && enrolledRows.length > 0) {
          enrolledCourseIds = Array.from(new Set([...enrolledCourseIds, ...enrolledRows.map((r: any) => r.course_id)]));
        }
      }

      return res.status(200).json({
        courses: dbCourses && dbCourses.length > 0 ? dbCourses : [
          { id: 'guitar-8-buoi', title: 'Khoá Học Guitar Đệm Hát 8 Bài', subtitle: 'Lộ trình chuẩn hóa', total_sessions: 8 }
        ],
        enrolledCourseIds
      });
    }

    // 2. GET /api/courses?action=sessions&courseId=...
    if (req.method === 'GET' && action === 'sessions') {
      const targetCourseId = String(courseId || 'guitar-8-buoi');
      
      const dbSessions = await safeQuery(() => sql`
        SELECT * FROM sessions 
        WHERE course_id = ${targetCourseId} OR (course_id IS NULL AND ${targetCourseId} = 'guitar-8-buoi')
        ORDER BY order_index ASC, id ASC
      `, []);

      return res.status(200).json({
        sessions: dbSessions || []
      });
    }

    // 3. POST /api/courses?action=complete_session
    if (req.method === 'POST' && action === 'complete_session') {
      const { studentEmail, studentId, studentName, sessionId } = req.body || {};
      const cleanEmail = String(studentEmail || '').trim().toLowerCase();
      const sId = Number(sessionId);

      if (!cleanEmail || !sId) {
        return res.status(400).json({ error: 'Thiếu thông tin tiến độ học tập!' });
      }

      const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const progId = `prog_${cleanEmailKey}_${sId}`;

      await safeQuery(() => sql`
        INSERT INTO student_progress (id, student_id, session_id, is_completed, completed_at)
        VALUES (${progId}, ${cleanEmail}, ${sId}, true, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET is_completed = true, completed_at = CURRENT_TIMESTAMP
      `, null);

      if (studentId && studentId !== cleanEmail) {
        await safeQuery(() => sql`
          INSERT INTO student_progress (id, student_id, session_id, is_completed, completed_at)
          VALUES (${progId}_id, ${studentId}, ${sId}, true, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET is_completed = true, completed_at = CURRENT_TIMESTAMP
        `, null);
      }

      if (studentName) {
        await safeQuery(() => sql`
          INSERT INTO profiles (id, full_name, email)
          VALUES (${studentId || cleanEmail}, ${studentName}, ${cleanEmail})
          ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        `, null);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid courses action' });
  } catch (err: any) {
    console.error('Courses API error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
