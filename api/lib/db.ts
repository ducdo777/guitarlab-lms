import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Server-side Database Connection (Reads from Vercel Environment Variables)
const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_o45GYDwXyvBf@ep-polished-dream-a15lrtp1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export const sql = neon(databaseUrl);

// JWT Secret Key
export const JWT_SECRET = process.env.JWT_SECRET || 'guitarlab-secret-key-production-2026-super-secure';

// Helper: Sign JWT Token
export function signJwtToken(payload: { id: string; email: string; full_name: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Helper: Verify JWT Token from Authorization header
export function verifyJwtToken(authHeader?: string) {
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; full_name: string; role: string };
  } catch (err) {
    return null;
  }
}

// Helper: Hash password with Bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Helper: Compare password with Bcrypt
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  // If previously stored in plaintext before migration, support transparent fallback
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
}

// Initialize schema on server if needed
let schemaInitialized = false;
export async function ensureSchema() {
  if (schemaInitialized) return;
  try {
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
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS target_bpm INT DEFAULT 80;`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS time_signature INT DEFAULT 4;`;
    } catch (e) {}

    await sql`
      CREATE TABLE IF NOT EXISTS student_progress (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255),
        session_id INT,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMPTZ
      );
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS user_courses (
        id VARCHAR(255) PRIMARY KEY,
        student_email VARCHAR(255) NOT NULL,
        course_id VARCHAR(100) NOT NULL,
        enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_course UNIQUE(student_email, course_id)
      );
    `;

    schemaInitialized = true;
  } catch (err) {
    console.error('Server schema init error:', err);
  }
}
