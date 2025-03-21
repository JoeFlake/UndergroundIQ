import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users_info")
          .select("is_admin")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data?.is_admin || false);
      } catch (error) {
        console.error("Error in checkAdminStatus:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
