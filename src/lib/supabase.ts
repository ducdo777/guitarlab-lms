import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Nếu chưa có env (mock mode), supabaseUrl sẽ rỗng và createClient có thể throw error. 
// Tạm thời khởi tạo dummy nếu thiếu key để không sập app ngay lập tức, nhưng phải cấu hình mới dùng được.
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

// Helper function
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};
