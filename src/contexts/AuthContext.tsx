import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ═══════════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════════ */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        // 1. Check skip_auth (custom Neon DB auth)
        if (localStorage.getItem('skip_auth') === 'true') {
          const customEmail = localStorage.getItem('temp_user_email') || '';
          const customName = localStorage.getItem('temp_user_name') || 'Học Viên';
          const customId = localStorage.getItem('temp_user_id') || customEmail;

          if (!customEmail) {
            localStorage.removeItem('skip_auth');
            setIsLoading(false);
            return;
          }

          setUser({
            id: customId,
            email: customEmail,
            full_name: customName,
          });
          setIsLoggedIn(true);

          // Check admin role
          try {
            const { sql, initNeonSchema } = await import('../lib/neon');
            await initNeonSchema();
            const rows = await sql`
              SELECT role FROM profiles WHERE LOWER(email) = ${customEmail.toLowerCase()}
            `;
            if (rows && rows.length > 0 && (rows[0].role === 'SUPER_ADMIN' || customEmail.toLowerCase() === 'admin@guitarlab.vn')) {
              setIsAdmin(true);
              setUser(prev => prev ? { ...prev, role: 'SUPER_ADMIN' } : prev);
            }
          } catch (err) {
            console.error('Admin role check error:', err);
            // Still allow student access even if admin check fails
            if (customEmail.toLowerCase() === 'admin@guitarlab.vn') {
              setIsAdmin(true);
            }
          }

          setIsLoading(false);
          return;
        }

        // 2. Check Supabase session
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            });
            setIsLoggedIn(true);
          }

          // Listen for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
              });
              setIsLoggedIn(true);
            } else {
              setUser(null);
              setIsLoggedIn(false);
              setIsAdmin(false);
            }
          });

          setIsLoading(false);
          return () => subscription.unsubscribe();
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Auth session check error:', err);
        setIsLoading(false);
      }
    }

    checkSession();
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    // Login is handled by Auth.tsx component directly (it does window.location.reload)
    // This is a placeholder for future SPA-based login flow
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('skip_auth');
    localStorage.removeItem('temp_user_name');
    localStorage.removeItem('temp_user_email');
    localStorage.removeItem('temp_user_id');
    setUser(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    // Navigate to home
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ═══════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
