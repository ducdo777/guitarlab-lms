import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './quest.css'
import GuitarQuest from './GuitarQuest.tsx'
import { Auth } from './components/auth/Auth'
import { supabase, isSupabaseConfigured } from './lib/supabase'

function Root() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('skip_auth') === 'true') {
      const customName = localStorage.getItem('temp_user_name') || 'Học Viên Guitar';
      setSession({
        user: { id: 'demo-user', user_metadata: { full_name: customName }, email: 'hocvien@guitarlab.vn' }
      });
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="bg-[#0f0720] h-screen flex items-center justify-center text-white">Đang tải...</div>

  if (!session) {
    return <Auth />
  }

  // Truyền session vào GuitarQuest để lấy user.id
  return <GuitarQuest user={session.user} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
