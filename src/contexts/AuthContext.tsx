import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Add a User type for Blue Stakes login
interface BlueStakesUser {
  username: string;
  token: string;
}

type AuthContextType = {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<any>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to fetch complete user profile
    const fetchUserProfile = async (authUser: any) => {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile from users table
        const { data: userProfile, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          setUser(authUser); // Fallback to auth user
        } else {
          // Merge auth user with profile data
          setUser({ ...authUser, ...userProfile });
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
        setUser(authUser); // Fallback to auth user
      } finally {
        setLoading(false);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      fetchUserProfile(data.session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetchUserProfile(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
