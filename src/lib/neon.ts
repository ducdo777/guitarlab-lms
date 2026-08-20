import { neon } from '@neondatabase/serverless';

const databaseUrl = 
  import.meta.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

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
        role VARCHAR(50) DEFAULT 'STUDENT',
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

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
        order_index INT
      );
    `;

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

    // --- SEEDING DATA IF TABLES ARE EMPTY ---

    // 1. Seed 8 Sessions if empty
    const sessionCount = await sql`SELECT COUNT(*) FROM sessions`;
    if (Number(sessionCount[0]?.count || 0) === 0) {
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

    // 2. Seed Profiles if empty
    const profileCount = await sql`SELECT COUNT(*) FROM profiles`;
    if (Number(profileCount[0]?.count || 0) === 0) {
      await sql`
        INSERT INTO profiles (id, full_name, email, role) VALUES
        ('user-1', 'Nguyễn Văn An', 'an.nguyen@gmail.com', 'STUDENT'),
        ('user-2', 'Trần Thị Mai', 'mai.tran@gmail.com', 'STUDENT'),
        ('demo-user', 'Khách Xem Trước', 'student@guitarlab.vn', 'STUDENT')
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 3. Seed Student Progress if empty
    const progressCount = await sql`SELECT COUNT(*) FROM student_progress`;
    if (Number(progressCount[0]?.count || 0) === 0) {
      await sql`
        INSERT INTO student_progress (id, student_id, session_id, is_completed) VALUES
        ('p1', 'user-1', 1, true),
        ('p2', 'user-1', 2, true),
        ('p3', 'user-1', 3, true),
        ('p4', 'user-1', 4, true),
        ('p5', 'user-2', 1, true),
        ('p6', 'user-2', 2, true),
        ('p7', 'user-2', 3, true),
        ('p8', 'user-2', 4, true),
        ('p9', 'user-2', 5, true),
        ('p10', 'user-2', 6, true)
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 4. Seed Submissions if empty
    const submissionCount = await sql`SELECT COUNT(*) FROM submissions`;
    if (Number(submissionCount[0]?.count || 0) === 0) {
      await sql`
        INSERT INTO submissions (id, student_id, student_name, student_email, session_id, video_url, status, grade, feedback) VALUES
        ('sub-1', 'user-1', 'Nguyễn Văn An', 'an.nguyen@gmail.com', 5, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'PENDING', NULL, NULL),
        ('sub-2', 'user-2', 'Trần Thị Mai', 'mai.tran@gmail.com', 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'REVIEWED', 9, 'Đàn rất ngón tay tròn, chuyển hợp âm Am sang Em chuẩn nhịp. Cần chú ý giữ lưng thẳng hơn một chút nhé!')
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log('✅ Neon Full LMS Database Schema & Initial Seed Data Ready!');
  } catch (err) {
    console.warn('Neon DB init warning:', err);
  }
}
