import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  mode?: 'student' | 'admin';
}

export const Auth: React.FC<AuthProps> = ({ mode = 'student' }) => {
  const isAdminMode = mode === 'admin';
  const [isLogin, setIsLogin] = useState(isAdminMode ? true : true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 3D Tilt Effect State
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { sql, initNeonSchema } = await import('../../lib/neon');
      await initNeonSchema();

      if (isLogin) {
        // === 1. ĐĂNG NHẬP & KIỂM TRA TRONG NEON POSTGRES CSDL ===
        const existingProfiles = await sql`
          SELECT * FROM profiles WHERE LOWER(email) = ${cleanEmail}
        `;

        if (!existingProfiles || existingProfiles.length === 0) {
          setError('Tài khoản chưa tồn tại trong hệ thống. Vui lòng bấm Đăng Ký để tạo tài khoản mới!');
          setLoading(false);
          return;
        }

        const userProfile = existingProfiles[0];
        if (userProfile.password_hash && userProfile.password_hash !== cleanPassword) {
          setError('Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
          setLoading(false);
          return;
        }

        // Đăng nhập thành công từ CSDL Neon!
        localStorage.setItem('skip_auth', 'true');
        localStorage.setItem('temp_user_name', userProfile.full_name || cleanEmail.split('@')[0]);
        localStorage.setItem('temp_user_email', cleanEmail);
        localStorage.setItem('temp_user_id', userProfile.id);
        window.location.reload();
        return;
      } else {
        // === 2. ĐĂNG KÝ TÀI KHOẢN MỚI VÀO NEON POSTGRES CSDL ===
        const displayName = fullName.trim() || cleanEmail.split('@')[0];

        // Kiểm tra xem Email đã tồn tại trong CSDL chưa
        const checkEmail = await sql`
          SELECT * FROM profiles WHERE LOWER(email) = ${cleanEmail}
        `;

        if (checkEmail && checkEmail.length > 0) {
          setError('Email này đã được đăng ký tài khoản trong hệ thống! Vui lòng chuyển sang Đăng Nhập.');
          setLoading(false);
          return;
        }

        // Chèn tài khoản mới trực tiếp vào bảng profiles trong Neon Postgres DB
        const userId = `user_${Date.now()}`;
        await sql`
          INSERT INTO profiles (id, full_name, email, password_hash)
          VALUES (${userId}, ${displayName}, ${cleanEmail}, ${cleanPassword})
        `;

        // Tự động phân học viên mới vào lớp mặc định: "Khoá Học Guitar Đệm Hát 8 Bài"
        const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const autoEnrollId = `enroll_${cleanEmailKey}_guitar_8_buoi`;
        try {
          await sql`
            INSERT INTO user_courses (id, student_email, course_id)
            VALUES (${autoEnrollId}, ${cleanEmail}, 'guitar-8-buoi')
            ON CONFLICT (student_email, course_id) DO NOTHING
          `;
        } catch (enrollErr) {
          console.warn('Auto enrollment error on signup:', enrollErr);
        }

        // Tự động Đăng nhập sau khi Đăng ký thành công
        localStorage.setItem('skip_auth', 'true');
        localStorage.setItem('temp_user_name', displayName);
        localStorage.setItem('temp_user_email', cleanEmail);
        localStorage.setItem('temp_user_id', userId);
        window.location.reload();
        return;
      }
    } catch (err: any) {
      console.error('Auth DB error:', err);
      setError('Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center overflow-hidden font-sans relative bg-black">
      
      {/* ══ MESH GRADIENT BACKGROUND ══ */}
      <div className="absolute inset-0 z-0 opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-500 rounded-full mix-blend-screen filter blur-[90px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Background Particles/Noise could go here */}

      {/* ══ 3D FLOATING CARD CONTAINER ══ */}
      <div className="relative z-10 perspective-[1500px]">
        <div 
          className="w-[420px] rounded-[32px] p-10 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 transition-transform duration-200 ease-out"
          style={{ 
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(50px)`,
            transformStyle: 'preserve-3d',
            borderTopColor: 'rgba(255,255,255,0.3)',
            borderLeftColor: 'rgba(255,255,255,0.3)'
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Inner content floats slightly above the card */}
          <div style={{ transform: 'translateZ(40px)' }}>
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className={`w-16 h-16 ${isAdminMode ? 'bg-gradient-to-tr from-[#1b2a47] to-amber-500' : 'bg-gradient-to-tr from-[#7c3aed] to-[#5ac8fa]'} rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(124,58,237,0.5)] transform hover:scale-110 transition-transform cursor-pointer`}>
                <span className="text-3xl">{isAdminMode ? '🛡️' : '🎸'}</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                GuitarLab<span className="text-[#5ac8fa]">.</span>
              </h1>
              <p className="text-white/60 text-sm mt-1 font-medium tracking-wide uppercase">
                {isAdminMode 
                  ? 'Cổng Quản Trị Viên' 
                  : (isLogin ? 'Chào mừng trở lại' : 'Bắt đầu hành trình')
                }
              </p>
              {isAdminMode && (
                <p className="text-amber-400/80 text-xs mt-2 font-semibold">
                  Chỉ dành cho tài khoản Super Admin
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-6 text-sm text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="group relative">
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-[#7c3aed] focus:bg-black/40 transition-all placeholder-white/30"
                    required
                  />
                </div>
              )}
              
              <div className="group relative">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-[#7c3aed] focus:bg-black/40 transition-all placeholder-white/30"
                  required
                />
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-5 pr-12 text-white text-sm outline-none focus:border-[#7c3aed] focus:bg-black/40 transition-all placeholder-white/30"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between mt-2 px-1">
                  <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="rounded bg-black/20 border-white/10 accent-[#7c3aed] w-3.5 h-3.5" />
                    Nhớ thiết bị
                  </label>
                  <a href="#" className="text-xs text-[#5ac8fa] hover:text-white transition-colors">Quên mật khẩu?</a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-[#5ac8fa] text-white font-bold py-3.5 rounded-xl mt-6 hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}
              </button>
            </form>

            {!isAdminMode ? (
              <div className="mt-8 text-center text-sm text-white/50">
                {isLogin ? 'Bạn là người mới? ' : 'Đã có tài khoản? '}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-white font-bold hover:underline decoration-2 underline-offset-4"
                >
                  {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                </button>
              </div>
            ) : (
              <div className="mt-8 text-center text-xs text-white/40">
                <a href="/quest" className="text-amber-400 hover:underline">← Quay lại Cổng Học Viên</a>
              </div>
            )}

          </div>
        </div>
      </div>
      
    </div>
  );
};
