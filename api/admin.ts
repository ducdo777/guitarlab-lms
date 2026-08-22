import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, verifyJwtToken } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureSchema();

  const { action, courseId } = req.query;

  // Authorization Check: Check JWT token or header email for super admin
  const authUser = verifyJwtToken(req.headers.authorization);
  const userEmailHeader = (req.headers['x-user-email'] as string || '').toLowerCase();
  
  const isSuperAdmin = 
    (authUser && authUser.role === 'SUPER_ADMIN') || 
    (authUser && authUser.email === 'admin@guitarlab.vn') ||
    userEmailHeader === 'admin@guitarlab.vn';

  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Truy cập bị từ chối. Chỉ dành cho tài khoản Super Admin!' });
  }

  try {
    // 1. GET /api/admin?action=data (Fetch all admin data)
    if (req.method === 'GET' && action === 'data') {
      const [submissions, profiles, progress, courses, userEnrollments] = await Promise.all([
        sql`SELECT * FROM submissions ORDER BY created_at DESC`,
        sql`SELECT * FROM profiles ORDER BY created_at DESC`,
        sql`SELECT * FROM student_progress`,
        sql`SELECT * FROM courses ORDER BY created_at ASC`,
        sql`SELECT * FROM user_courses ORDER BY enrolled_at DESC`
      ]);

      return res.status(200).json({
        submissions: submissions || [],
        profiles: profiles || [],
        progress: progress || [],
        courses: courses || [],
        userEnrollments: userEnrollments || []
      });
    }

    // 2. GET /api/admin?action=sessions&courseId=... (Fetch sessions for course editor)
    if (req.method === 'GET' && action === 'sessions') {
      const targetCourseId = String(courseId || 'guitar-8-buoi');
      const sessions = await sql`
        SELECT * FROM sessions 
        WHERE course_id = ${targetCourseId} OR (course_id IS NULL AND ${targetCourseId} = 'guitar-8-buoi')
        ORDER BY order_index ASC, id ASC
      `;
      return res.status(200).json({ sessions: sessions || [] });
    }

    // 3. POST /api/admin?action=grade
    if (req.method === 'POST' && action === 'grade') {
      const { id, grade, feedback } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu ID bài nộp!' });

      await sql`
        UPDATE submissions 
        SET grade = ${grade}, feedback = ${feedback}, status = 'REVIEWED', reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true });
    }

    // 4. POST /api/admin?action=delete_submission
    if (req.method === 'POST' && action === 'delete_submission') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu ID bài nộp!' });

      await sql`DELETE FROM submissions WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    // 5. POST /api/admin?action=create_course
    if (req.method === 'POST' && action === 'create_course') {
      const { id, title, subtitle, sessionsCount } = req.body || {};
      const num = Number(sessionsCount) || 8;

      await sql`
        INSERT INTO courses (id, title, subtitle, total_sessions)
        VALUES (${id}, ${title}, ${subtitle}, ${num})
      `;

      // Auto generate initial sessions for the course
      for (let i = 1; i <= num; i++) {
        const sessionId = Math.floor(Math.random() * 900000) + 100000;
        await sql`
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
        `;
      }

      return res.status(200).json({ success: true });
    }

    // 6. POST /api/admin?action=delete_course
    if (req.method === 'POST' && action === 'delete_course') {
      const { id } = req.body || {};
      if (id === 'guitar-8-buoi') {
        return res.status(400).json({ error: 'Không thể xoá khoá học mặc định của hệ thống!' });
      }

      await sql`DELETE FROM sessions WHERE course_id = ${id}`;
      await sql`DELETE FROM user_courses WHERE course_id = ${id}`;
      await sql`DELETE FROM courses WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    // 7. POST /api/admin?action=toggle_enrollment
    if (req.method === 'POST' && action === 'toggle_enrollment') {
      const { email, courseId, shouldEnroll } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();

      if (shouldEnroll) {
        const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const enrollId = `enroll_${cleanEmailKey}_${courseId}_${Date.now()}`;
        await sql`
          INSERT INTO user_courses (id, student_email, course_id)
          VALUES (${enrollId}, ${cleanEmail}, ${courseId})
          ON CONFLICT (student_email, course_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM user_courses 
          WHERE LOWER(student_email) = ${cleanEmail} AND course_id = ${courseId}
        `;
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

          await sql`
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
          `;
        }
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid admin action' });
  } catch (err: any) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
