import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import {
  User,
  Folder,
  Home as HomeIcon,
  CheckSquare,
  Shield,
  Search,
  Menu,
} from "lucide-react";
import logo from "../assets/images/LogoWide.png";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "./ui/dropdown-menu";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role === "admin") setIsAdmin(true);
        else setIsAdmin(false);
      } else {
        setIsAdmin(false);
      }
    };
    fetchRole();
  }, [user]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tickets/${searchQuery.trim()}`);
      setSearchQuery("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
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
              {/* To Do tab only for admins */}
              {isAdmin && (
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
              )}
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className={`border-b-2 px-1 pt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75 rounded-sm inline-flex items-center ${
                    isActive("/admin")
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </button>
              )}
            </div>
            {/* Hamburger menu for mobile */}
            <div className="sm:hidden ml-2 flex items-center">
              <DropdownMenu
                trigger={
                  <Button variant="ghost" size="icon" className="p-2">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/projects")}> <HomeIcon className="h-4 w-4 mr-2" /> Home</DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/unassigned-tickets")}> <CheckSquare className="h-4 w-4 mr-2" /> To Do</DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}> <Shield className="h-4 w-4 mr-2" /> Admin Panel</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}> <User className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket..."
                  className="w-48 pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </form>
            {/* Desktop sign out button */}
            <div className="hidden sm:block">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </Button>
            </div>
            {/* Hamburger menu for mobile (right of search bar) */}
            <div className="sm:hidden ml-2 flex items-center">
              <DropdownMenu
                trigger={
                  <Button variant="ghost" size="icon" className="p-2">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/projects")}> <HomeIcon className="h-4 w-4 mr-2" /> Home</DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/unassigned-tickets")}> <CheckSquare className="h-4 w-4 mr-2" /> To Do</DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}> <Shield className="h-4 w-4 mr-2" /> Admin Panel</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}> <User className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
