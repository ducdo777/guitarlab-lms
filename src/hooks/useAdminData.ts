import { useState, useEffect, useCallback, useRef } from 'react';
import { sql, initNeonSchema } from '../lib/neon';

export interface SubmissionItem {
  id: string;
  student_name: string;
  student_email: string;
  session_id: number;
  video_url: string;
  created_at: string;
  status: 'PENDING' | 'REVIEWED';
  grade?: number;
  feedback?: string;
}

export interface StudentProgressItem {
  id: string;
  student_name: string;
  student_email: string;
  created_at: string;
  completed_count: number;
  completed_sessions: number[];
  latest_submission?: SubmissionItem;
}

export interface CourseItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  total_sessions: number;
  created_at?: string;
}

export function useAdminData() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [studentsList, setStudentsList] = useState<StudentProgressItem[]>([]);
  const [coursesList, setCoursesList] = useState<CourseItem[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCoursesAndEnrollments = async (signal: AbortSignal) => {
    try {
      const dbCourses = await sql`SELECT * FROM courses ORDER BY created_at ASC`;
      if (signal.aborted) return;
      const dbEnrollments = await sql`SELECT * FROM user_courses`;
      if (signal.aborted) return;
      if (dbCourses && dbCourses.length > 0) {
        setCoursesList(dbCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle || '',
          description: c.description || '',
          total_sessions: Number(c.total_sessions || 8)
        })));
      }
      if (dbEnrollments) setUserEnrollments(dbEnrollments);
    } catch (e) {
      console.warn('Neon DB fetch courses:', e);
    }
  };

  const fetchDatabaseSubmissionsAndStudents = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setError(null);
    try {
      let neonFormatted: SubmissionItem[] = [];
      const neonRows = await sql`SELECT * FROM submissions ORDER BY created_at DESC`;
      if (signal.aborted) return;
      
      if (neonRows && neonRows.length > 0) {
        neonFormatted = neonRows.map((d: any) => ({
          id: d.id,
          student_name: d.student_name || 'Học Viên',
          student_email: d.student_email || 'student@guitarlab.vn',
          session_id: Number(d.session_id),
          video_url: d.video_url,
          created_at: d.created_at ? (d.created_at instanceof Date ? d.created_at.toLocaleString('vi-VN') : new Date(d.created_at).toLocaleString('vi-VN')) : 'Mới nộp',
          status: d.status || 'PENDING',
          grade: d.grade,
          feedback: d.feedback
        }));
        setSubmissions(neonFormatted);
      } else {
        setSubmissions([]);
      }

      const profilesRows = await sql`SELECT * FROM profiles ORDER BY created_at DESC`;
      if (signal.aborted) return;
      const progressRows = await sql`SELECT * FROM student_progress`;
      if (signal.aborted) return;

      const progressMap = new Map<string, number[]>();
      progressRows.forEach((p: any) => {
        const sId = p.student_id;
        const sNum = Number(p.session_id);
        if (p.is_completed) {
          const list = progressMap.get(sId) || [];
          list.push(sNum);
          progressMap.set(sId, list);
        }
      });

      if (profilesRows && profilesRows.length > 0) {
        const studentItems: StudentProgressItem[] = profilesRows.map((prof: any) => {
          const byId = progressMap.get(prof.id) || [];
          const byEmail = progressMap.get(prof.email) || [];
          const combinedSet = new Set([...byId, ...byEmail]);
          const completedList = Array.from(combinedSet).sort((a: number, b: number) => a - b);
          const latestSub = neonFormatted.find((s: SubmissionItem) => s.student_email === prof.email || s.student_name === prof.full_name);
          return {
            id: prof.id,
            student_name: prof.full_name || 'Học Viên',
            student_email: prof.email,
            created_at: new Date(prof.created_at).toLocaleDateString('vi-VN'),
            completed_count: completedList.length,
            completed_sessions: completedList,
            latest_submission: latestSub
          };
        });
        setStudentsList(studentItems);
      } else {
        setStudentsList([]);
      }

      await fetchCoursesAndEnrollments(signal);
    } catch (err: any) {
      if (!signal.aborted) {
        setError(err.message);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    async function loadAllDatabaseData() {
      await initNeonSchema();
      await fetchDatabaseSubmissionsAndStudents();
    }
    loadAllDatabaseData();

    const timer = setInterval(() => {
      fetchDatabaseSubmissionsAndStudents();
    }, 30000);

    return () => {
      clearInterval(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDatabaseSubmissionsAndStudents]);

  return {
    submissions,
    studentsList,
    coursesList,
    userEnrollments,
    isLoading,
    error,
    refetch: fetchDatabaseSubmissionsAndStudents
  };
}
