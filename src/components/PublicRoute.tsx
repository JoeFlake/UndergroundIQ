import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";

export function PublicRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (user) {
    // If user is already logged in, redirect to home
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
