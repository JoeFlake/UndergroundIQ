import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { bluestakesService } from "../lib/bluestakesService";

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

  const refreshToken = async () => {
    if (!user) {
      setBluestakesToken(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the user's company_id
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      if (!userProfile?.company_id) {
        throw new Error("User does not have a company_id");
      }

      // Get Blue Stakes credentials from the companies table
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("bluestakes_username, bluestakes_password")
        .eq("id", userProfile.company_id)
        .single();

      if (companyError) throw companyError;
      if (!company?.bluestakes_username || !company?.bluestakes_password) {
        throw new Error("Company Blue Stakes credentials not found");
      }

      // Use the login function from bluestakesService
      const token = await bluestakesService.loginToBluestakes(
        company.bluestakes_username,
        company.bluestakes_password
      );
      setBluestakesToken(token);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to authenticate with Blue Stakes";
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
