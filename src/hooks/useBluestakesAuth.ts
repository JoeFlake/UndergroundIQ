import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface BluestakesAuthState {
  bluestakesToken: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

export function useBluestakesAuth(): BluestakesAuthState {
  const { user } = useAuth();
  const [bluestakesToken, setBluestakesToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loginToBluestakes = async (username: string, password: string) => {
    const loginResp = await fetch(
      "https://newtin-api.bluestakes.org/api/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username,
          password,
        }).toString(),
      }
    );
    const loginData = await loginResp.json();
    if (!loginResp.ok || !loginData.Authorization) {
      throw new Error("Failed to log in to Blue Stakes");
    }
    return loginData.Authorization.replace("Bearer ", "");
  };

  const refreshToken = async () => {
    if (!user) {
      setBluestakesToken(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Blue Stakes credentials for the current user
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("bluestakes_username, bluestakes_password")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      if (!userProfile?.bluestakes_username || !userProfile?.bluestakes_password) {
        throw new Error("Blue Stakes credentials not found");
      }

      const token = await loginToBluestakes(
        userProfile.bluestakes_username,
        userProfile.bluestakes_password
      );
      setBluestakesToken(token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to authenticate with Blue Stakes";
      setError(errorMessage);
      setBluestakesToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshToken();
    } else {
      setBluestakesToken(null);
      setIsLoading(false);
    }
  }, [user]);

  return {
    bluestakesToken,
    isLoading,
    error,
    refreshToken,
  };
} 