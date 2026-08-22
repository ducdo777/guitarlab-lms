import { Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="font-sans min-h-screen bg-gray-100 flex flex-col antialiased text-gray-900 selection:bg-amber-200 selection:text-amber-900">
      
      {/* ══ TOP BANNER ══ */}
      <div className="bg-[#1b2a47] text-white text-xs sm:text-sm py-2 px-4 flex flex-wrap justify-center items-center gap-3 border-b border-amber-500/20 z-50">
        <span className="font-medium text-amber-100/90 text-center">
          Khoá Học Guitar Đệm Hát 8 Bài — Tặng Kèm Metronome &amp; Tuner Chuyên Nghiệp
        </span>
        <Link 
          to="/quest" 
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-3.5 py-1 rounded-md text-xs transition-all shadow-sm shadow-amber-900/40 shrink-0"
        >
          Sở Hữu Ngay!
        </Link>
      </div>

      {/* ══ HEADER NAVIGATION ══ */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1360px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl">🎸</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-[#1b2a47] leading-none">GUITARLAB</span>
              <span className="text-[10px] font-extrabold text-amber-600 tracking-widest uppercase mt-1">ACADEMY</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[#1b2a47] font-semibold text-sm">
            <Link to="/" className="text-amber-600 font-bold border-b-2 border-amber-500 pb-1">Trang chủ</Link>
            <Link to="/quest" className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
              Khoá Học 8 Bài
            </Link>
            <Link to="/admin" className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
              Cổng Giáo Viên
            </Link>
            <Link to="/quest" className="hover:text-amber-600 transition-colors uppercase text-xs font-bold bg-amber-50 text-amber-800 px-3.5 py-1.5 rounded-full border border-amber-200/60">
              CỔNG HỌC VIÊN
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link 
              to="/admin" 
              className="hidden sm:inline-flex bg-slate-100 hover:bg-slate-200 text-[#1b2a47] font-bold text-xs py-2.5 px-4 rounded-full transition-all border border-slate-200"
            >
              Cổng Giáo Viên
            </Link>
            <Link 
              to="/quest" 
              className="hidden sm:inline-flex bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 px-5 rounded-full transition-all shadow-md shadow-amber-500/20"
            >
              Cổng Học Viên ➔
            </Link>
          </div>
        </div>
      </header>

      {/* ══ HERO SECTION ══ */}
      <main className="flex-1 relative overflow-hidden flex justify-center py-6 lg:py-10">
        
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80" 
            className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.05]"
            alt="Guitar Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/60"></div>
        </div>

        <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col xl:flex-row items-stretch gap-6 lg:gap-10">
          
          {/* Breadcrumb */}
          <div className="w-full text-xs text-white/80 font-medium mb-2 xl:absolute xl:top-0 xl:left-6">
            Trang chủ <span className="mx-1 text-white/40">/</span> Khoá học cơ bản <span className="mx-1 text-white/40">/</span>
          </div>

          {/* ══ LEFT FROSTED CARD ══ */}
          <div className="xl:mt-6 w-full xl:w-[500px] shrink-0 bg-white/90 backdrop-blur-2xl rounded-[32px] p-7 sm:p-10 shadow-2xl border border-white/60 flex flex-col justify-between relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              {/* Logos / Stats Header */}
              <div className="flex items-center gap-5 pb-6 mb-6 border-b border-gray-200/60">
                <div className="flex flex-col border-r border-gray-200 pr-5">
                  <span className="text-amber-600 font-black text-2xl leading-none">35k+</span>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mt-1">Học Viên</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl shrink-0">🏆</span>
                  <div className="flex flex-col">
                    <span className="text-[#1b2a47] font-extrabold text-sm leading-tight">Chất Lượng</span>
                    <span className="text-gray-500 font-bold text-xs">Hàng Đầu Việt Nam</span>
                  </div>
                </div>
              </div>

              {/* Offer Badge Ribbon */}
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider mb-5 border border-amber-200/80 uppercase shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Ưu Đãi Học Guitar Tháng 8
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-[2.4rem] leading-[1.2] font-black text-[#114b48] mb-6 tracking-tight">
                Đặc Quyền Học Guitar<br className="hidden sm:block"/>
                Đệm Hát Cùng<br className="hidden sm:block"/>
                <span className="text-[#1b2a47]">GuitarLab Academy</span>
              </h1>

              {/* Action Button */}
              <Link 
                to="/quest" 
                className="w-full bg-gradient-to-r from-[#224285] to-[#162d5a] hover:from-[#1b346b] hover:to-[#0f1f3d] text-white font-extrabold text-base sm:text-lg py-4 px-6 rounded-2xl text-center uppercase tracking-wide transition-all shadow-xl shadow-blue-950/30 mb-8 block transform hover:-translate-y-0.5 active:translate-y-0"
              >
                CHỌN KHÓA HỌC QUAN TÂM
              </Link>

              {/* Bullet Features */}
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                    ✓
                  </div>
                  <span><strong className="text-gray-900 font-extrabold">Giáo trình 8 bài</strong> chuẩn Quốc tế dành riêng cho người mới</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                    ✓
                  </div>
                  <span><strong className="text-gray-900 font-extrabold">Trả bài qua Video</strong> nhận phản hồi trực tiếp từ Giảng viên 1:1</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                    ✓
                  </div>
                  <span>Tặng <strong className="text-gray-900 font-extrabold">Metronome &amp; Tuner Premium</strong> tương tác trực tiếp</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400 font-medium text-center">
              Cam kết hoàn hoàn tiền trong 7 ngày nếu không hài lòng
            </div>
          </div>

          {/* ══ RIGHT PROMO BADGES ══ */}
          <div className="xl:mt-6 flex-1 flex flex-col justify-between items-center relative py-6 lg:py-8 px-2">
            
            <div className="w-full flex flex-col items-center text-center">
              {/* Promo Titles */}
              <h2 className="text-2xl sm:text-4xl font-extrabold text-amber-300 tracking-wider drop-shadow-md mb-1 uppercase">
                HỌC GUITAR ĐỆM HÁT
              </h2>
              <p className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase drop-shadow-sm mb-2">
                ĐẶC QUYỀN THÁNG NGÂU
              </p>

              {/* Huge NGÂU Graphic Text */}
              <div 
                className="text-[90px] sm:text-[130px] lg:text-[150px] font-black leading-none my-2 drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)] text-transparent bg-clip-text bg-gradient-to-b from-[#fff3cd] via-[#d4af37] to-[#8a6418]"
                style={{ WebkitTextStroke: '2px rgba(255,255,255,0.4)' }}
              >
                NGÂU
              </div>

              {/* Date Ribbon */}
              <div className="bg-[#1b2a47]/90 backdrop-blur-md border border-amber-400/60 text-amber-200 font-bold text-xs sm:text-sm py-2 px-7 rounded-full shadow-2xl mb-8">
                Áp dụng từ 13/08/2026 – 10/09/2026
              </div>
            </div>

            {/* 4 Badges Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full mt-4">
              
              {/* Badge 1 */}
              <div className="bg-gradient-to-b from-[#fffbf0] via-[#f7e6c4] to-[#deb36f] rounded-2xl pt-7 pb-4 px-2 flex flex-col items-center text-center shadow-2xl border border-white/80 relative transform hover:-translate-y-1.5 transition-all">
                <div className="w-10 h-10 bg-[#1b2a47] rounded-full border-2 border-amber-400 flex items-center justify-center absolute -top-5 shadow-lg">
                  <span className="text-lg">🎸</span>
                </div>
                <span className="text-[10px] font-black text-[#1b2a47] uppercase tracking-tight text-center leading-tight">TẶNG NGAY ĐÀN</span>
                <div className="text-2xl sm:text-3xl font-black text-[#6d4615] leading-none mt-1">
                  1 <span className="text-xs font-bold">CÂY</span>
                </div>
              </div>

              {/* Badge 2 */}
              <div className="bg-gradient-to-b from-[#fffbf0] via-[#f7e6c4] to-[#deb36f] rounded-2xl pt-7 pb-4 px-2 flex flex-col items-center text-center shadow-2xl border border-white/80 relative transform hover:-translate-y-1.5 transition-all">
                <div className="w-10 h-10 bg-[#1b2a47] rounded-full border-2 border-amber-400 flex items-center justify-center absolute -top-5 shadow-lg">
                  <span className="text-lg">💎</span>
                </div>
                <span className="text-[10px] font-black text-[#1b2a47] uppercase tracking-tight text-center leading-tight">ƯU ĐÃI THÀNH VIÊN</span>
                <div className="text-2xl sm:text-3xl font-black text-[#6d4615] leading-none mt-1">
                  15<span className="text-xs font-bold">%</span>
                </div>
              </div>

              {/* Badge 3 */}
              <div className="bg-gradient-to-b from-[#fffbf0] via-[#f7e6c4] to-[#deb36f] rounded-2xl pt-7 pb-4 px-2 flex flex-col items-center text-center shadow-2xl border border-white/80 relative transform hover:-translate-y-1.5 transition-all">
                <div className="w-10 h-10 bg-[#1b2a47] rounded-full border-2 border-amber-400 flex items-center justify-center absolute -top-5 shadow-lg">
                  <span className="text-lg">🎟️</span>
                </div>
                <span className="text-[10px] font-black text-[#1b2a47] uppercase tracking-tight text-center leading-tight">VOUCHER HỌC BỔNG</span>
                <div className="text-2xl sm:text-3xl font-black text-[#6d4615] leading-none mt-1">
                  20<span className="text-xs font-bold">%</span>
                </div>
              </div>

              {/* Badge 4 */}
              <div className="bg-gradient-to-b from-[#fffbf0] via-[#f7e6c4] to-[#deb36f] rounded-2xl pt-7 pb-4 px-2 flex flex-col items-center text-center shadow-2xl border border-white/80 relative transform hover:-translate-y-1.5 transition-all">
                <div className="w-10 h-10 bg-[#1b2a47] rounded-full border-2 border-amber-400 flex items-center justify-center absolute -top-5 shadow-lg">
                  <span className="text-lg">💳</span>
                </div>
                <span className="text-[10px] font-black text-[#1b2a47] uppercase tracking-tight text-center leading-tight">HỖ TRỢ TRẢ GÓP</span>
                <div className="text-2xl sm:text-3xl font-black text-[#6d4615] leading-none mt-1">
                  0<span className="text-xs font-bold">%</span>
                </div>
              </div>

            </div>

            {/* Subtext */}
            <div className="text-[11px] text-white/60 font-medium text-center mt-6">
              Áp dụng có điều kiện, liên hệ GuitarLab Market để được tư vấn chi tiết
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1b2a47] text-white/50 text-xs text-center py-4 border-t border-white/10">
        © 2026 GuitarLab Academy. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}
