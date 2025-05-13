import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Add a User type for Blue Stakes login
interface BlueStakesUser {
  username: string;
  token: string;
}

type AuthContextType = {
  session: null;
  user: BlueStakesUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: null; user: null }>;
  signOut: () => Promise<{ error: null }>;
  setUser: React.Dispatch<React.SetStateAction<BlueStakesUser | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<null>(null);
  const [user, setUser] = useState<BlueStakesUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    setUser({ username }); // Mark user as logged in
    navigate("/");
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    navigate("/login");
    return { error: null, user: null };
  };

  const signOut = async () => {
    setUser(null);
    navigate("/login");
    return { error: null };
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
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
