import { useState, useEffect } from 'react';
import AdminPage from '../AdminPage';
import { Auth } from '../components/auth/Auth';
import { sql, initNeonSchema } from '../lib/neon';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════
   Admin Route — Auth Guard + Role Check
   Consolidates logic from the old admin-main.tsx
   ═══════════════════════════════════════════════ */

export default function AdminRoute() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        await initNeonSchema();

        const userEmail = localStorage.getItem('temp_user_email')?.trim().toLowerCase();
        const skipAuth = localStorage.getItem('skip_auth') === 'true';

        if (!skipAuth || !userEmail) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);

        // Query Neon DB to verify SUPER_ADMIN role
        const rows = await sql`
          SELECT * FROM profiles WHERE LOWER(email) = ${userEmail}
        `;

        if (rows && rows.length > 0) {
          const profile = rows[0];
          setCurrentUser(profile);
          if (profile.role === 'SUPER_ADMIN' || userEmail === 'admin@guitarlab.vn') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          // If email is admin@guitarlab.vn, treat as admin
          if (userEmail === 'admin@guitarlab.vn') {
            setIsAdmin(true);
            setCurrentUser({ email: userEmail, full_name: 'Giảng Viên GuitarLab', role: 'SUPER_ADMIN' });
          } else {
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error('Check admin auth error:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('skip_auth');
    localStorage.removeItem('temp_user_name');
    localStorage.removeItem('temp_user_email');
    localStorage.removeItem('temp_user_id');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="bg-[#0f172a] h-screen flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-300">Đang xác thực quyền Super Admin...</p>
      </div>
    );
  }

  // Not logged in -> show Admin Auth form
  if (!isLoggedIn) {
    return <Auth mode="admin" />;
  }

  // Logged in but not SUPER_ADMIN -> Access Denied screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl mx-auto flex items-center justify-center border border-red-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white">Truy Cập Bị Từ Chối</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tài khoản <span className="font-mono text-amber-400 font-bold">{currentUser?.email || localStorage.getItem('temp_user_email')}</span> là tài khoản Học Viên, không có quyền truy cập Cổng Quản Trị Hệ Thống.
            </p>
            <p className="text-[11px] text-slate-400">
              Vui lòng đăng nhập bằng tài khoản <span className="text-amber-300 font-bold">Super Admin</span> để tiếp tục.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#0f172a] font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <LogOut className="w-4 h-4" /> Đăng Nhập Bằng Super Admin
            </button>

            <Link
              to="/quest"
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all block"
            >
              <ArrowLeft className="w-4 h-4" /> Quay Về Cổng Học Viên
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in as SUPER_ADMIN -> Render AdminPage
  return <AdminPage />;
}
