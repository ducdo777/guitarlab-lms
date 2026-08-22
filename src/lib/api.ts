// ═══════════════════════════════════════════════════════════
// Pure Client-Side API Helper (Zero Direct SQL in Browser)
// ═══════════════════════════════════════════════════════════

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

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.ok) {
    return await res.json();
  }
  
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData?.error || `HTTP ${res.status}`);
}

// ═══════════════════════════════════════════════════════════
// Typed API Client
// ═══════════════════════════════════════════════════════════

export const api = {
  // ── Auth APIs ──
  auth: {
    async register(fullName: string, email: string, password: string) {
      const data = await apiRequest('/api/auth?action=register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
      });
      if (data.token) setStoredToken(data.token);
      return data;
    },

    async login(email: string, password: string) {
      const data = await apiRequest('/api/auth?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) setStoredToken(data.token);
      return data;
    },

    async me() {
      try {
        return await apiRequest('/api/auth?action=me');
      } catch (err) {
        return null;
      }
    }
  },

  // ── Courses APIs ──
  courses: {
    async list(email?: string) {
      return await apiRequest(`/api/courses?action=list&email=${encodeURIComponent(email || '')}`);
    },

    async getSessions(courseId: string) {
      return await apiRequest(`/api/courses?action=sessions&courseId=${encodeURIComponent(courseId)}`);
    },

    async completeSession(data: { studentEmail: string; studentId: string; studentName: string; sessionId: number }) {
      return await apiRequest('/api/courses?action=complete_session', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // ── Submissions APIs ──
  submissions: {
    async submit(data: { id?: string; studentId: string; studentName: string; studentEmail: string; sessionId: number; videoUrl: string }) {
      return await apiRequest('/api/submissions?action=submit', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async getMy(email: string, studentId?: string) {
      return await apiRequest(`/api/submissions?action=my&email=${encodeURIComponent(email)}&studentId=${encodeURIComponent(studentId || '')}`);
    },

    async delete(id: string) {
      return await apiRequest('/api/submissions?action=delete', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    }
  },

  // ── Admin APIs ──
  admin: {
    async getData() {
      return await apiRequest('/api/admin?action=data');
    },

    async getSessions(courseId: string) {
      return await apiRequest(`/api/admin?action=sessions&courseId=${encodeURIComponent(courseId)}`);
    },

    async grade(id: string, grade: number, feedback: string) {
      return await apiRequest('/api/admin?action=grade', {
        method: 'POST',
        body: JSON.stringify({ id, grade, feedback })
      });
    },

    async deleteSubmission(id: string) {
      return await apiRequest('/api/admin?action=delete_submission', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    },

    async createCourse(data: { id: string; title: string; subtitle: string; sessionsCount: number }) {
      return await apiRequest('/api/admin?action=create_course', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async deleteCourse(id: string) {
      return await apiRequest('/api/admin?action=delete_course', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    },

    async toggleEnrollment(email: string, courseId: string, shouldEnroll: boolean) {
      return await apiRequest('/api/admin?action=toggle_enrollment', {
        method: 'POST',
        body: JSON.stringify({ email, courseId, shouldEnroll })
      });
    },

    async saveSessions(sessions: any[], courseId: string) {
      return await apiRequest('/api/admin?action=save_sessions', {
        method: 'POST',
        body: JSON.stringify({ sessions, courseId })
      });
    }
  }
};
