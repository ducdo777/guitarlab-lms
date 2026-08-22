import { sql, initNeonSchema } from './neon';

// Token Management
const TOKEN_KEY = 'guitarlab_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Base Fetch Helper
async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const userEmail = localStorage.getItem('temp_user_email') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (res.ok) {
      return await res.json();
    }
    
    // If endpoint returns 404/500 in dev mode, throw to trigger fallback
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `HTTP ${res.status}`);
  } catch (err: any) {
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════
// Typed API Client (with graceful hybrid fallback)
// ═══════════════════════════════════════════════════════════

export const api = {
  // ── Auth APIs ──
  auth: {
    async register(fullName: string, email: string, password: string) {
      try {
        const data = await apiRequest('/api/auth?action=register', {
          method: 'POST',
          body: JSON.stringify({ fullName, email, password })
        });
        if (data.token) setStoredToken(data.token);
        return data;
      } catch (err) {
        // Fallback for local Vite dev
        await initNeonSchema();
        const cleanEmail = email.trim().toLowerCase();
        const displayName = fullName.trim() || cleanEmail.split('@')[0];
        const userId = `user_${Date.now()}`;
        
        await sql`
          INSERT INTO profiles (id, full_name, email, password_hash)
          VALUES (${userId}, ${displayName}, ${cleanEmail}, ${password})
        `;
        const autoEnrollId = `enroll_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}_guitar_8_buoi`;
        try {
          await sql`
            INSERT INTO user_courses (id, student_email, course_id)
            VALUES (${autoEnrollId}, ${cleanEmail}, 'guitar-8-buoi')
            ON CONFLICT (student_email, course_id) DO NOTHING
          `;
        } catch (e) {}
        return { success: true, user: { id: userId, email: cleanEmail, full_name: displayName } };
      }
    },

    async login(email: string, password: string) {
      try {
        const data = await apiRequest('/api/auth?action=login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (data.token) setStoredToken(data.token);
        return data;
      } catch (err: any) {
        // Fallback for local Vite dev
        await initNeonSchema();
        const cleanEmail = email.trim().toLowerCase();
        const rows = await sql`SELECT * FROM profiles WHERE LOWER(email) = ${cleanEmail}`;
        if (!rows || rows.length === 0) {
          throw new Error('Tài khoản chưa tồn tại trong hệ thống!');
        }
        if (rows[0].password_hash && rows[0].password_hash !== password) {
          throw new Error('Mật khẩu không chính xác!');
        }
        return { success: true, user: rows[0] };
      }
    },

    async me() {
      try {
        return await apiRequest('/api/auth?action=me');
      } catch (err) {
        const email = localStorage.getItem('temp_user_email');
        if (!email) return null;
        const rows = await sql`SELECT * FROM profiles WHERE LOWER(email) = ${email.toLowerCase()}`;
        return rows?.[0] ? { user: rows[0] } : null;
      }
    }
  },

  // ── Courses APIs ──
  courses: {
    async list(email?: string) {
      try {
        return await apiRequest(`/api/courses?action=list&email=${encodeURIComponent(email || '')}`);
      } catch (err) {
        // Fallback
        const dbCourses = await sql`SELECT * FROM courses ORDER BY created_at ASC`;
        let enrolledCourseIds = ['guitar-8-buoi'];
        if (email) {
          const enrolled = await sql`SELECT course_id FROM user_courses WHERE LOWER(student_email) = ${email.toLowerCase()}`;
          if (enrolled && enrolled.length > 0) {
            enrolledCourseIds = Array.from(new Set([...enrolledCourseIds, ...enrolled.map((r: any) => r.course_id)]));
          }
        }
        return { courses: dbCourses || [], enrolledCourseIds };
      }
    },

    async getSessions(courseId: string) {
      try {
        return await apiRequest(`/api/courses?action=sessions&courseId=${encodeURIComponent(courseId)}`);
      } catch (err) {
        // Fallback
        const sessions = await sql`
          SELECT * FROM sessions 
          WHERE course_id = ${courseId} OR (course_id IS NULL AND ${courseId} = 'guitar-8-buoi')
          ORDER BY order_index ASC, id ASC
        `;
        return { sessions: sessions || [] };
      }
    }
  },

  // ── Submissions APIs ──
  submissions: {
    async submit(data: { id?: string; studentId: string; studentName: string; studentEmail: string; sessionId: number; videoUrl: string }) {
      try {
        return await apiRequest('/api/submissions?action=submit', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (err) {
        // Fallback
        const subId = data.id || `sub_${Date.now()}`;
        await sql`
          INSERT INTO submissions (id, student_id, student_name, student_email, session_id, video_url, status)
          VALUES (${subId}, ${data.studentId}, ${data.studentName}, ${data.studentEmail}, ${data.sessionId}, ${data.videoUrl}, 'PENDING')
        `;
        return { success: true, id: subId };
      }
    },

    async getMy(email: string, studentId?: string) {
      try {
        return await apiRequest(`/api/submissions?action=my&email=${encodeURIComponent(email)}&studentId=${encodeURIComponent(studentId || '')}`);
      } catch (err) {
        // Fallback
        const dbSubmissions = await sql`
          SELECT * FROM submissions 
          WHERE LOWER(student_email) = ${email.toLowerCase()} OR student_id = ${studentId || ''}
          ORDER BY created_at DESC
        `;
        return { submissions: dbSubmissions || [] };
      }
    }
  },

  // ── Admin APIs ──
  admin: {
    async getData() {
      try {
        return await apiRequest('/api/admin?action=data');
      } catch (err) {
        // Fallback
        const [submissions, profiles, progress, courses, userEnrollments] = await Promise.all([
          sql`SELECT * FROM submissions ORDER BY created_at DESC`,
          sql`SELECT * FROM profiles ORDER BY created_at DESC`,
          sql`SELECT * FROM student_progress`,
          sql`SELECT * FROM courses ORDER BY created_at ASC`,
          sql`SELECT * FROM user_courses ORDER BY enrolled_at DESC`
        ]);
        return { submissions, profiles, progress, courses, userEnrollments };
      }
    },

    async getSessions(courseId: string) {
      try {
        return await apiRequest(`/api/admin?action=sessions&courseId=${encodeURIComponent(courseId)}`);
      } catch (err) {
        const sessions = await sql`
          SELECT * FROM sessions 
          WHERE course_id = ${courseId} OR (course_id IS NULL AND ${courseId} = 'guitar-8-buoi')
          ORDER BY order_index ASC, id ASC
        `;
        return { sessions: sessions || [] };
      }
    },

    async grade(id: string, grade: number, feedback: string) {
      try {
        return await apiRequest('/api/admin?action=grade', {
          method: 'POST',
          body: JSON.stringify({ id, grade, feedback })
        });
      } catch (err) {
        await sql`
          UPDATE submissions 
          SET grade = ${grade}, feedback = ${feedback}, status = 'REVIEWED', reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
        return { success: true };
      }
    },

    async deleteSubmission(id: string) {
      try {
        return await apiRequest('/api/admin?action=delete_submission', {
          method: 'POST',
          body: JSON.stringify({ id })
        });
      } catch (err) {
        await sql`DELETE FROM submissions WHERE id = ${id}`;
        return { success: true };
      }
    },

    async createCourse(data: { id: string; title: string; subtitle: string; sessionsCount: number }) {
      try {
        return await apiRequest('/api/admin?action=create_course', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (err) {
        await sql`
          INSERT INTO courses (id, title, subtitle, total_sessions)
          VALUES (${data.id}, ${data.title}, ${data.subtitle}, ${data.sessionsCount})
        `;
        for (let i = 1; i <= data.sessionsCount; i++) {
          const sId = Math.floor(Math.random() * 900000) + 100000;
          await sql`
            INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, chords, target_bpm, time_signature, order_index)
            VALUES (${sId}, ${data.id}, ${`Bài ${i}: Tiêu đề bài học mới`}, 'Mô tả nội dung bài giảng', '🎸', 'dQw4w9WgXcQ', ARRAY['Em', 'Am'], 80, 4, ${i})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        return { success: true };
      }
    },

    async deleteCourse(id: string) {
      try {
        return await apiRequest('/api/admin?action=delete_course', {
          method: 'POST',
          body: JSON.stringify({ id })
        });
      } catch (err) {
        await sql`DELETE FROM sessions WHERE course_id = ${id}`;
        await sql`DELETE FROM user_courses WHERE course_id = ${id}`;
        await sql`DELETE FROM courses WHERE id = ${id}`;
        return { success: true };
      }
    },

    async toggleEnrollment(email: string, courseId: string, shouldEnroll: boolean) {
      try {
        return await apiRequest('/api/admin?action=toggle_enrollment', {
          method: 'POST',
          body: JSON.stringify({ email, courseId, shouldEnroll })
        });
      } catch (err) {
        if (shouldEnroll) {
          const cleanEmailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
          const enrollId = `enroll_${cleanEmailKey}_${courseId}_${Date.now()}`;
          await sql`
            INSERT INTO user_courses (id, student_email, course_id)
            VALUES (${enrollId}, ${email}, ${courseId})
            ON CONFLICT (student_email, course_id) DO NOTHING
          `;
        } else {
          await sql`
            DELETE FROM user_courses 
            WHERE LOWER(student_email) = ${email.toLowerCase()} AND course_id = ${courseId}
          `;
        }
        return { success: true };
      }
    },

    async saveSessions(sessions: any[], courseId: string) {
      try {
        return await apiRequest('/api/admin?action=save_sessions', {
          method: 'POST',
          body: JSON.stringify({ sessions, courseId })
        });
      } catch (err) {
        for (const s of sessions) {
          const chordsArr = Array.isArray(s.chords) ? s.chords : [];
          const exercisesJson = JSON.stringify(s.exercises || []);
          await sql`
            INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, theory_content, chords, exercises, target_bpm, time_signature, order_index)
            VALUES (${s.id}, ${courseId}, ${s.title || ''}, ${s.subtitle || ''}, ${s.icon || '🎸'}, ${s.youtube_video_id || ''}, ${s.theory_content || ''}, ${chordsArr}, ${exercisesJson}::jsonb, ${s.target_bpm || 80}, ${s.time_signature || 4}, ${s.order_index || s.id})
            ON CONFLICT (id) DO UPDATE SET
              course_id = ${courseId},
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
        return { success: true };
      }
    }
  }
};
