import { useState, useEffect } from "react";
import { bluestakesService } from "@/lib/supabaseService";
import { useAuth } from "@/contexts/AuthContext";
import type { Project, Ticket } from "@/types";

export const useTicketData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        if (!user || !user.token) {
          setTickets([]);
          setProjects([]);
          setLoading(false);
          return;
        }
        // Fetch all tickets for the user from Blue Stakes API
        const ticketsData = await bluestakesService.getAllTickets(user.token);
        console.log("Tickets data from API:", ticketsData);
        setTickets(ticketsData);
        setProjects([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Filter tickets by project
  const filterByProject = (projectId: string) => {
    setSelectedProject(projectId);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Filter and sort tickets based on current state
  const filteredAndSortedTickets = tickets
    .filter((ticket) => {
      // Only filter by active if showActiveOnly is true
      const activeMatch =
        !showActiveOnly || new Date(ticket.expires) > new Date();

      // Search filter
      const searchMatch =
        !searchQuery ||
        ticket.ticket.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description &&
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return activeMatch && searchMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expires).getTime();
      const dateB = new Date(b.expires).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

  return {
    projects,
    tickets,
    filteredTickets: filteredAndSortedTickets,
    loading,
    error,
    selectedProject,
    sortDirection,
    showActiveOnly,
    searchQuery,
    filterByProject,
    toggleSortDirection,
    setShowActiveOnly,
    setSearchQuery,
  };
};
