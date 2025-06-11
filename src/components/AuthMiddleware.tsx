import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { AuthChangeEvent } from "@supabase/supabase-js";

interface AuthMiddlewareProps {
  children: React.ReactNode;
}

export function AuthMiddleware({ children }: AuthMiddlewareProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (event === 'TOKEN_REFRESHED') {
        // Token was successfully refreshed
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        // User was signed out
        setUser(null);
        navigate('/login', { 
          state: { 
            from: location.pathname,
            message: 'Your session has expired. Please sign in again.'
          },
          replace: true 
        });
      }
    });

    // Check if the current session is valid
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setUser(null);
        navigate('/login', { 
          state: { 
            from: location.pathname,
            message: 'Your session has expired. Please sign in again.'
          },
          replace: true 
        });
      }
    };

    // Check session immediately and then every 5 minutes
    checkSession();
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate, location, setUser]);

  return <>{children}</>;
} 