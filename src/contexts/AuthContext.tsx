
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// Set this to false to enable real authentication
const BYPASS_AUTH = true;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any, user: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // If bypass is enabled, create a fake successful response
    if (BYPASS_AUTH) {
      console.log('Auth bypass enabled - allowing any sign in');
      // Create a mock user if one doesn't exist
      if (!user) {
        const mockUser = {
          id: 'bypass-user-id',
          email: email || 'bypass@example.com',
          created_at: new Date().toISOString(),
        } as User;
        
        setUser(mockUser);
      }
      return { error: null };
    }
    
    // Regular authentication flow when bypass is disabled
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // If bypass is enabled, create a fake successful response
    if (BYPASS_AUTH) {
      console.log('Auth bypass enabled - allowing any sign up');
      const mockUser = {
        id: 'bypass-user-id',
        email: email || 'bypass@example.com',
        created_at: new Date().toISOString(),
      } as User;
      
      setUser(mockUser);
      return { error: null, user: mockUser };
    }
    
    // Regular sign up flow when bypass is disabled
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error, user: data.user };
  };

  const signOut = async () => {
    // If bypass is enabled, just clear the user state
    if (BYPASS_AUTH) {
      console.log('Auth bypass enabled - simulating sign out');
      setUser(null);
      setSession(null);
      navigate('/login');
      return;
    }
    
    // Regular sign out flow when bypass is disabled
    await supabase.auth.signOut();
    navigate('/login');
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
