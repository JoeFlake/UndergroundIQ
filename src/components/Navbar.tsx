import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "lucide-react";
import logo from "../assets/images/LogoWide.png";

export function Navbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("users_info")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error checking admin status:", error);
        return;
      }

      setIsAdmin(data?.is_admin || false);
    };

    checkAdminStatus();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img src={logo} alt="UndergroundIQ" className="h-8 w-auto" />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="#/"
                className="border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75 rounded-sm"
              >
                Home
              </a>
              {isAdmin && (
                <a
                  href="#/admin"
                  className="border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75 rounded-sm"
                >
                  Admin Panel
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
              <User className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
