import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AuthMiddleware } from "@/components/AuthMiddleware";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <TooltipProvider>
            <InviteRedirector />
            <Routes>
              {/* Public routes */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/set-password" element={<SetPassword />} />
              </Route>

              {/* Protected routes */}
              <Route element={<AuthMiddleware><ProtectedRoute /></AuthMiddleware>}>
                <Route path="/" element={<Projects />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/tickets/:ticketId" element={<TicketView />} />
                <Route path="/unassigned-tickets" element={<UnassignedTickets />} />
              </Route>

              {/* Admin routes */}
              <Route element={<AuthMiddleware><AdminRoute /></AuthMiddleware>}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>

              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
