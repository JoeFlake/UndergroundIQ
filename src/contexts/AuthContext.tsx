import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null; user: User | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

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
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("Invalid login credentials")) {
          return { error: { message: "Invalid email or password" } };
        }
        if (error.message.includes("Email not confirmed")) {
          return { error: { message: "Please verify your email address" } };
        }
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error: Error | unknown) {
      console.error("Sign in error:", error);
      return { error: { message: "An unexpected error occurred" } };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log("Attempting sign up for email:", email);
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        console.log("Sign up error details:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        // Handle specific error cases
        if (
          error.message.includes("already registered") ||
          error.message.includes("already exists") ||
          error.message.includes("User already registered")
        ) {
          return {
            error: { message: "This email is already registered. Please sign in instead." },
            user: null
          };
        }
        if (error.message.includes("password")) {
          return {
            error: { message: "Password must be at least 6 characters long" },
            user: null
          };
        }
        return { error: { message: error.message }, user: null };
      }

      console.log("Sign up response:", { data, error });

      // Check if we got a user back
      if (!data?.user) {
        console.log("No user data received from sign up");
        return {
          error: { message: "Failed to create account. Please try again." },
          user: null
        };
      }

      // Check if the user is already registered
      if (data.user.identities && data.user.identities.length === 0) {
        console.log("User already registered (no new identities created)");
        return {
          error: { message: "This email is already registered. Please sign in instead." },
          user: null
        };
      }

      return { error: null, user: data.user };
    } catch (error: Error | unknown) {
      console.error("Sign up error:", error);
      return {
        error: { message: "An unexpected error occurred" },
        user: null
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
