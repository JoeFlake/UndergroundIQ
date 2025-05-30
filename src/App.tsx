import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import TicketView from "./pages/TicketView";
import AdminPanel from "./pages/AdminPanel";
import Projects from "./pages/Projects";
import Tickets from "./pages/Tickets";
import UnassignedTickets from "./pages/UnassignedTickets";
import SetPassword from "./pages/SetPassword";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const queryClient = new QueryClient();

function InviteRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get("access_token");
    const type = params.get("type");
    if (type === "invite" && accessToken) {
      // Redirect to /set-password, preserving the hash
      navigate("/set-password" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <InviteRedirector />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:ticketId"
              element={
                <ProtectedRoute>
                  <TicketView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route
              path="/unassigned-tickets"
              element={
                <ProtectedRoute>
                  <UnassignedTickets />
                </ProtectedRoute>
              }
            />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </TooltipProvider>
    </HashRouter>
  </QueryClientProvider>
);

export default App;
