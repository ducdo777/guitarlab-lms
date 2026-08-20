-- =====================================================================
-- GUITARLAB ACADEMY - NEON POSTGRESQL DATABASE SCHEMA
-- Model: 8-Session Guitar LMS (Course -> Sessions -> Submissions -> Feedback)
-- =====================================================================

-- 1. BẢNG HỌC VIÊN & GIÁO VIÊN (Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(255) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'STUDENT', -- 'STUDENT', 'TEACHER', 'ADMIN'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG KHÓA HỌC (Courses)
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  description TEXT,
  total_sessions INT DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG 8 BUỔI HỌC (Sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INT PRIMARY KEY,
  course_id VARCHAR(100) REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  icon VARCHAR(50),
  youtube_video_id VARCHAR(100),
  theory_content TEXT,
  chords TEXT[], -- Ví dụ: ARRAY['Em', 'Am', 'C', 'D', 'G']
  order_index INT UNIQUE
);

-- 4. BẢNG BÀI TẬP THỰC HÀNH TỪNG BUỔI (Exercises)
CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(100) PRIMARY KEY,
  session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_text TEXT NOT NULL,
  order_index INT DEFAULT 1
);

-- 5. BẢNG TIẾN ĐỘ HỌC VIÊN (Student Progress)
CREATE TABLE IF NOT EXISTS student_progress (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) REFERENCES profiles(id) ON DELETE CASCADE,
  session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_student_session UNIQUE (student_id, session_id)
);

-- 6. BẢNG NỘP BÀI VIDEO WEBCAM & CHẤM ĐIỂM (Submissions & Feedback)
CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255),
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  session_id INT NOT NULL,
  video_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'REVIEWED'
  grade INT CHECK (grade >= 1 AND grade <= 10),
  teacher_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES DÙNG CHO TỐC ĐỘ TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_id);

-- =====================================================================
-- SEED DATA MẪU KHÓA HỌC GUITAR 8 BUỔI
-- =====================================================================

INSERT INTO courses (id, title, subtitle, description, total_sessions)
VALUES (
  'guitar-8-buoi',
  'Khoá Học Guitar Đệm Hát 8 Buổi',
  'Lộ trình chuẩn hóa từ Zero đến đệm hát thuần thục bài hát yêu thích',
  'Dành riêng cho người mới bắt đầu học đàn guitar acoustic',
  8
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, chords, order_index) VALUES
(1, 'guitar-8-buoi', 'Làm Quen Đàn Guitar & Nhịp Căn Bản', 'Tư thế cầm đàn, gảy 6 dây mở và lắng nghe âm sắc', '🎸', 'dQw4w9WgXcQ', ARRAY['Em', 'Am'], 1),
(2, 'guitar-8-buoi', 'Hợp Âm Em, Am & Đệm Hát Bài Đầu Tiên', 'Bấm 2 hợp âm huyền thoại và tập chuyển nhịp 4/4', '🎵', 'dQw4w9WgXcQ', ARRAY['Em', 'Am', 'C'], 2),
(3, 'guitar-8-buoi', 'Hợp Âm G, C, D & Chuyển Hợp Âm Mượt Mà', 'Hoàn thiện bộ 5 hợp âm quốc dân đệm hàng trăm bài hát', '🎶', 'dQw4w9WgXcQ', ARRAY['G', 'C', 'D', 'Em', 'Am'], 3),
(4, 'guitar-8-buoi', 'Kỹ Thuật Quạt Dây (Strumming) Disco & Pop', 'Tạo tiết tấu sôi động bằng tay phải quạt dây', '⚡', 'dQw4w9WgXcQ', ARRAY['G', 'C', 'D', 'Em', 'Am'], 4),
(5, 'guitar-8-buoi', 'Hợp Âm F, Bm & Quạt Điệu Slow Rock', 'Luyện tập chuyển hợp âm nhanh và điệu 6/8', '🎼', 'dQw4w9WgXcQ', ARRAY['F', 'Bm', 'G', 'C', 'D'], 5),
(6, 'guitar-8-buoi', 'Kỹ Thuật Rải Dây (Fingerpicking) & Nhịp 3/4', 'Rải dây nhẹ nhàng truyền cảm cho bài hát Pop Ballad', '✨', 'dQw4w9WgXcQ', ARRAY['C', 'G', 'Am', 'F'], 6),
(7, 'guitar-8-buoi', 'Hợp Âm Chặn (Barre Chords) Căn Bản', 'Chinh phục hợp âm chặn và làm chủ cần đàn', '🔥', 'dQw4w9WgXcQ', ARRAY['F', 'Bm', 'Fm'], 7),
(8, 'guitar-8-buoi', 'Gam Pentatonic, Solo Đơn Giản & Tổng Kết', 'Tự nhìn hợp âm đệm hát bài yêu thích và solo dạo đầu', '🏆', 'dQw4w9WgXcQ', ARRAY['Am', 'C', 'G', 'F', 'Dm'], 8)
ON CONFLICT (id) DO NOTHING;
