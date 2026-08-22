import { useState, useEffect } from 'react';
import GuitarQuest from '../GuitarQuest';
import { Auth } from '../components/auth/Auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/* ═══════════════════════════════════════════════
   Quest Route — Auth Guard for Student Portal
   Consolidates logic from the old quest-main.tsx
   ═══════════════════════════════════════════════ */

export default function QuestRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check skip_auth (custom Neon DB auth)
    if (localStorage.getItem('skip_auth') === 'true') {
      const customName = localStorage.getItem('temp_user_name') || 'Học Viên';
      const customEmail = localStorage.getItem('temp_user_email') || '';
      const customId = localStorage.getItem('temp_user_id') || customEmail;

      if (!customEmail) {
        localStorage.removeItem('skip_auth');
        setLoading(false);
        return;
      }

      setSession({
        user: { id: customId, user_metadata: { full_name: customName }, email: customEmail }
      });
      setLoading(false);
      return;
    }

    // 2. Check Supabase session
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0f0720] h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-300">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <GuitarQuest user={session.user} />;
}
