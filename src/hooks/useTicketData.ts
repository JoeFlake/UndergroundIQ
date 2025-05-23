import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bluestakesService } from "@/lib/bluestakesService";
import { supabase } from "@/lib/supabaseClient";
import type { Ticket } from "@/types";

export const useTicketData = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("expires");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        if (!user) {
          setTickets([]);
          setLoading(false);
          return;
        }
        console.log("Current user:", user);
        // Fetch project IDs for this user from Supabase
        const { data: userProjects, error: userProjectsError } = await supabase
          .from("user_projects")
          .select("project_id")
          .eq("user_id", user.id);
        if (userProjectsError) throw userProjectsError;
        const userProjectIds = (userProjects || []).map((up) => up.project_id);
        let allTickets: Ticket[] = [];
        for (const projectId of userProjectIds) {
          const projectTickets =
            await bluestakesService.getTicketsForProject(projectId);
          console.log("Tickets for project", projectId, projectTickets);
          if (Array.isArray(projectTickets)) {
            allTickets = allTickets.concat(projectTickets);
          }
        }
        setTickets(allTickets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Filter and sort tickets based on current state
  const filteredAndSortedTickets = tickets
    .filter((ticket) => {
      // Only filter by active if showActiveOnly is true
      const activeMatch =
        !showActiveOnly || new Date(ticket.expires) > new Date();

      // Search filter
      const searchMatch =
        !searchQuery ||
        ticket.ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description &&
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return activeMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === "expires") {
        const dateA = new Date(a.expires).getTime();
        const dateB = new Date(b.expires).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      // Add more sorting options as needed
      return 0;
    });

  return {
    tickets: filteredAndSortedTickets,
    loading,
    error,
    showActiveOnly,
    setShowActiveOnly,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
};
