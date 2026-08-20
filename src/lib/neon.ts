import { neon } from '@neondatabase/serverless';

const databaseUrl = 
  import.meta.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// Neon Serverless SQL Client
export const sql = neon(databaseUrl);

// Initialize Tables on Neon Database automatically
export async function initNeonSchema() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        full_name TEXT,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        student_name TEXT,
        student_email TEXT,
        session_id INT,
        video_url TEXT,
        status TEXT DEFAULT 'PENDING',
        grade INT,
        feedback TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Neon Database Schema initialized successfully!');
  } catch (err) {
    console.warn('Neon DB init warning:', err);
  }
}
