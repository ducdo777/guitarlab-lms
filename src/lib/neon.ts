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

    console.log('✅ Neon Full LMS Database Schema initialized successfully!');
  } catch (err) {
    console.warn('Neon DB init warning:', err);
  }
}
