import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const cleanDatabaseUrl = databaseUrl.replace('&channel_binding=require', '');
const sql = neon(cleanDatabaseUrl);
const JWT_SECRET = process.env.JWT_SECRET || 'guitarlab-secret-key-production-2026-super-secure';

function verifyJwtToken(authHeader?: any) {
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

async function safeQuery<T = any>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (firstErr) {
    try {
      await new Promise(r => setTimeout(r, 400));
      return await queryFn();
    } catch (secondErr) {
      console.error('Neon query error in admin API:', secondErr);
      return fallback;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Email');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, courseId } = req.query;

    // Authorization Check: Check JWT token or header email for super admin
    const authUser = verifyJwtToken(req.headers.authorization);
    const rawHeaderEmail = req.headers['x-user-email'];
    const userEmailHeader = Array.isArray(rawHeaderEmail) 
      ? String(rawHeaderEmail[0] || '').toLowerCase() 
      : String(rawHeaderEmail || '').toLowerCase();
    
    const isSuperAdmin = 
      (authUser && (authUser.role === 'SUPER_ADMIN' || authUser.email.toLowerCase() === 'admin@guitarlab.vn')) || 
      userEmailHeader === 'admin@guitarlab.vn';

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Truy cập bị từ chối. Chỉ dành cho tài khoản Super Admin!' });
    }

    // 1. GET /api/admin?action=data (Fetch all admin data)
    if (req.method === 'GET' && action === 'data') {
      const submissions = await safeQuery(() => sql`SELECT * FROM submissions ORDER BY created_at DESC`, []);
      const profiles = await safeQuery(() => sql`SELECT * FROM profiles ORDER BY created_at DESC`, []);
      const progress = await safeQuery(() => sql`SELECT * FROM student_progress`, []);
      const courses = await safeQuery(() => sql`SELECT * FROM courses ORDER BY created_at ASC`, [
        { id: 'guitar-8-buoi', title: 'Khoá Học Guitar Đệm Hát 8 Bài', subtitle: 'Lộ trình chuẩn hóa', total_sessions: 8 }
      ]);
      const userEnrollments = await safeQuery(() => sql`SELECT * FROM user_courses ORDER BY enrolled_at DESC`, []);

      return res.status(200).json({
        submissions: submissions || [],
        profiles: profiles || [],
        progress: progress || [],
        courses: courses && courses.length > 0 ? courses : [
          { id: 'guitar-8-buoi', title: 'Khoá Học Guitar Đệm Hát 8 Bài', subtitle: 'Lộ trình chuẩn hóa', total_sessions: 8 }
        ],
        userEnrollments: userEnrollments || []
      });
    }

    // 2. GET /api/admin?action=sessions&courseId=... (Fetch sessions for course editor)
    if (req.method === 'GET' && action === 'sessions') {
      const targetCourseId = String(courseId || 'guitar-8-buoi');
      const sessions = await safeQuery(() => sql`
        SELECT * FROM sessions 
        WHERE course_id = ${targetCourseId} OR (course_id IS NULL AND ${targetCourseId} = 'guitar-8-buoi')
        ORDER BY order_index ASC, id ASC
      `, []);

      return res.status(200).json({ sessions: sessions || [] });
    }

    // 3. POST /api/admin?action=grade
    if (req.method === 'POST' && action === 'grade') {
      const { id, grade, feedback } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu ID bài nộp!' });

      await safeQuery(() => sql`
        UPDATE submissions 
        SET grade = ${grade}, feedback = ${feedback}, status = 'REVIEWED', reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `, null);
      return res.status(200).json({ success: true });
    }

    // 4. POST /api/admin?action=delete_submission
    if (req.method === 'POST' && action === 'delete_submission') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu ID bài nộp!' });

      await safeQuery(() => sql`DELETE FROM submissions WHERE id = ${id}`, null);
      return res.status(200).json({ success: true });
    }

    // 5. POST /api/admin?action=create_course
    if (req.method === 'POST' && action === 'create_course') {
      const { id, title, subtitle, sessionsCount } = req.body || {};
      const num = Number(sessionsCount) || 8;

      await safeQuery(() => sql`
        INSERT INTO courses (id, title, subtitle, total_sessions)
        VALUES (${id}, ${title}, ${subtitle}, ${num})
      `, null);

      for (let i = 1; i <= num; i++) {
        const sessionId = Math.floor(Math.random() * 900000) + 100000;
        await safeQuery(() => sql`
          INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, chords, target_bpm, time_signature, order_index)
          VALUES (
            ${sessionId},
            ${id},
            ${`Bài ${i}: Tiêu đề bài học mới`},
            ${'Mô tả nội dung bài giảng và mục tiêu kỹ năng'},
            ${'🎸'},
            ${'dQw4w9WgXcQ'},
            ARRAY['Em', 'Am'],
            80,
            4,
            ${i}
          )
          ON CONFLICT (id) DO NOTHING
        `, null);
      }

      return res.status(200).json({ success: true });
    }

    // 6. POST /api/admin?action=delete_course
    if (req.method === 'POST' && action === 'delete_course') {
      const { id } = req.body || {};
      if (id === 'guitar-8-buoi') {
        return res.status(400).json({ error: 'Không thể xoá khoá học mặc định của hệ thống!' });
      }

      await safeQuery(() => sql`DELETE FROM sessions WHERE course_id = ${id}`, null);
      await safeQuery(() => sql`DELETE FROM user_courses WHERE course_id = ${id}`, null);
      await safeQuery(() => sql`DELETE FROM courses WHERE id = ${id}`, null);
      return res.status(200).json({ success: true });
    }

    // 7. POST /api/admin?action=toggle_enrollment
    if (req.method === 'POST' && action === 'toggle_enrollment') {
      const { email, courseId, shouldEnroll } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();

      if (shouldEnroll) {
        const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const enrollId = `enroll_${cleanEmailKey}_${courseId}_${Date.now()}`;
        await safeQuery(() => sql`
          INSERT INTO user_courses (id, student_email, course_id)
          VALUES (${enrollId}, ${cleanEmail}, ${courseId})
          ON CONFLICT (student_email, course_id) DO NOTHING
        `, null);
      } else {
        await safeQuery(() => sql`
          DELETE FROM user_courses 
          WHERE LOWER(student_email) = ${cleanEmail} AND course_id = ${courseId}
        `, null);
      }
      return res.status(200).json({ success: true });
    }

    // 8. POST /api/admin?action=save_sessions
    if (req.method === 'POST' && action === 'save_sessions') {
      const { sessions, courseId } = req.body || {};
      const targetCourseId = String(courseId || 'guitar-8-buoi');

      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          const chordsArr = Array.isArray(s.chords) ? s.chords : [];
          const exercisesJson = JSON.stringify(s.exercises || []);

          await safeQuery(() => sql`
            INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, theory_content, chords, exercises, target_bpm, time_signature, order_index)
            VALUES (
              ${s.id},
              ${targetCourseId},
              ${s.title || ''},
              ${s.subtitle || ''},
              ${s.icon || '🎸'},
              ${s.youtube_video_id || ''},
              ${s.theory_content || ''},
              ${chordsArr},
              ${exercisesJson}::jsonb,
              ${s.target_bpm || 80},
              ${s.time_signature || 4},
              ${s.order_index || s.id}
            )
            ON CONFLICT (id) DO UPDATE SET
              course_id = ${targetCourseId},
              title = ${s.title || ''},
              subtitle = ${s.subtitle || ''},
              icon = ${s.icon || '🎸'},
              youtube_video_id = ${s.youtube_video_id || ''},
              theory_content = ${s.theory_content || ''},
              chords = ${chordsArr},
              exercises = ${exercisesJson}::jsonb,
              target_bpm = ${s.target_bpm || 80},
              time_signature = ${s.time_signature || 4},
              order_index = ${s.order_index || s.id}
          `, null);
        }
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid admin action' });
  } catch (err: any) {
    console.error('Admin API handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
