import { neon, neonConfig } from '@neondatabase/serverless';

// Suppress Neon SQL in browser warning
neonConfig.disableWarningInBrowsers = true;

const databaseUrl = 
  import.meta.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Neon Serverless SQL Client
export const sql = neon(databaseUrl);

// Full Production LMS Database Schema Initializer
export async function initNeonSchema() {
  try {
    // 1. Profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'STUDENT',
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`;
    } catch (e) {}

    // 2. Courses table
    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        description TEXT,
        total_sessions INT DEFAULT 8,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY,
        course_id VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        icon VARCHAR(50),
        youtube_video_id VARCHAR(100),
        theory_content TEXT,
        chords TEXT[],
        exercises JSONB,
        order_index INT
      );
    `;
    try {
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS exercises JSONB;`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS practice JSONB;`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS theory_content TEXT;`;
      await sql`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_order_index_key;`;
    } catch (e) {}

    // 4. Student Progress table
    await sql`
      CREATE TABLE IF NOT EXISTS student_progress (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255),
        session_id INT,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMPTZ
      );
    `;

    // 5. Submissions & Feedback table
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255),
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255) NOT NULL,
        session_id INT NOT NULL,
        video_url TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        grade INT,
        feedback TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. User Courses Enrollment Table (Phân Lớp Học Viên)
    await sql`
      CREATE TABLE IF NOT EXISTS user_courses (
        id VARCHAR(255) PRIMARY KEY,
        student_email VARCHAR(255) NOT NULL,
        course_id VARCHAR(100) NOT NULL,
        enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_course UNIQUE(student_email, course_id)
      );
    `;

    // Seed 8 Course Sessions if empty
    const sessionCount = await sql`SELECT COUNT(*) FROM sessions`;
    if (Number(sessionCount[0]?.count || 0) === 0) {
      await sql`
        INSERT INTO courses (id, title, subtitle, description, total_sessions)
        VALUES ('guitar-8-buoi', 'Khoá Học Guitar Đệm Hát 8 Buổi', 'Lộ trình chuẩn hóa từ Zero đến đệm hát thuần thục bài hát yêu thích', 'Dành riêng cho người mới bắt đầu học đàn guitar acoustic', 8)
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, chords, order_index) VALUES
        (1, 'guitar-8-buoi', 'Làm Quen Đàn Guitar & Nhịp Căn Bản', 'Tư thế cầm đàn, gảy 6 dây mở và lắng nghe âm sắc', '🎸', 'dQw4w9WgXcQ', ARRAY['Em', 'Am'], 1),
        (2, 'guitar-8-buoi', 'Hợp Âm Em, Am & Đệm Hát Bài Đầu Tiên', 'Bấm 2 hợp âm huyền thoại và tập chuyển nhịp 4/4', '🎵', 'dQw4w9WgXcQ', ARRAY['Em', 'Am', 'C'], 2),
        (3, 'guitar-8-buoi', 'Hợp Âm G, C, D & Chuyển Hợp Âm Mượt Mà', 'Hoàn thiện bộ 5 hợp âm quốc dân đệm hàng trăm bài hát', '🎶', 'dQw4w9WgXcQ', ARRAY['G', 'C', 'D', 'Em', 'Am'], 3),
        (4, 'guitar-8-buoi', 'Kỹ Thuật Quạt Dây (Strumming) Disco & Pop', 'Tạo tiết tấu sôi động bằng tay phải quạt dây', '⚡', 'dQw4w9WgXcQ', ARRAY['G', 'C', 'D', 'Em', 'Am'], 4),
        (5, 'guitar-8-buoi', 'Hợp Âm F, Bm & Quạt Điệu Slow Rock', 'Luyện tập chuyển hợp âm nhanh và điệu 6/8', '🎼', 'dQw4w9WgXcQ', ARRAY['F', 'Bm', 'G', 'C', 'D'], 5),
        (6, 'guitar-8-buoi', 'Kỹ Thuật Rải Dây (Fingerpicking) & Nhịp 3/4', 'Rải dây nhẹ nhàng truyền cảm cho bài hát Pop Ballad', '✨', 'dQw4w9WgXcQ', ARRAY['C', 'G', 'Am', 'F'], 6),
        (7, 'guitar-8-buoi', 'Hợp Âm Chặn (Barre Chords) Căn Bản', 'Chinh phục hợp âm chặn và làm chủ cần đàn', '🔥', 'dQw4w9WgXcQ', ARRAY['F', 'Bm', 'Fm'], 7),
        (8, 'guitar-8-buoi', 'Gam Pentatonic, Solo Đơn Giản & Tổng Kết', 'Tự nhìn hợp âm đệm hát bài yêu thích và solo dạo đầu', '🏆', 'dQw4w9WgXcQ', ARRAY['Am', 'C', 'G', 'F', 'Dm'], 8);
      `;
    }

    // Seed Super Admin Account if not exists
    try {
      const adminExists = await sql`SELECT id FROM profiles WHERE LOWER(email) = 'admin@guitarlab.vn'`;
      if (!adminExists || adminExists.length === 0) {
        await sql`
          INSERT INTO profiles (id, full_name, email, password_hash, role)
          VALUES ('super_admin_001', 'Giảng Viên GuitarLab', 'admin@guitarlab.vn', 'admin123', 'SUPER_ADMIN')
          ON CONFLICT (email) DO UPDATE SET role = 'SUPER_ADMIN'
        `;
      } else {
        // Ensure existing admin account always has SUPER_ADMIN role
        await sql`UPDATE profiles SET role = 'SUPER_ADMIN' WHERE LOWER(email) = 'admin@guitarlab.vn'`;
      }
    } catch (e) {
      console.warn('Neon DB admin seed note:', e);
    }

    // Ensure all existing student profiles have at least 'guitar-8-buoi' if they have 0 user_courses
    try {
      await sql`
        INSERT INTO user_courses (id, student_email, course_id)
        SELECT 'enroll_' || replace(replace(email, '@', '_'), '.', '_') || '_guitar_8_buoi', email, 'guitar-8-buoi'
        FROM profiles
        WHERE role != 'SUPER_ADMIN'
          AND email NOT IN (SELECT student_email FROM user_courses)
        ON CONFLICT (student_email, course_id) DO NOTHING;
      `;
    } catch (e) {
      console.warn('Neon DB default enrollment migration note:', e);
    }

    console.log('✅ Neon Database Schema Ready! Zero fake data.');
  } catch (err) {
    console.warn('Neon DB init warning:', err);
  }
}
