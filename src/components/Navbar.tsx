import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { User, Folder, Home as HomeIcon, CheckSquare } from "lucide-react";
import logo from "../assets/images/LogoWide.png";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    // Home is '/' or '/tickets', Projects is '/projects'
    if (
      location.pathname === "/tickets" &&
      location.search.includes("project=")
    )
      return false;
    if (
      path === "/" &&
      (location.pathname === "/" ||
        (location.pathname === "/tickets" &&
          !location.search.includes("project=")))
    )
      return true;
    return location.pathname.startsWith(path) && path !== "/";
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
              <button
                onClick={() => navigate("/projects")}
                className={`border-b-2 px-1 pt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75 rounded-sm inline-flex items-center ${
                  isActive("/projects")
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Home
              </button>
              <button
                onClick={() => navigate("/unassigned-tickets")}
                className={`border-b-2 px-1 pt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75 rounded-sm inline-flex items-center ${
                  isActive("/unassigned-tickets")
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                To Do
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
              <User className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                {user?.username}
              </span>
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
