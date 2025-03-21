import { useState, useEffect } from "react";
import { supabaseService } from "@/lib/supabaseService";
import type { Project, Ticket } from "@/types";

export const useTicketData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch projects and tickets
        const projectsData = await supabaseService.getUserProjects();
        const ticketsData = await supabaseService.getUserTickets();

        setProjects(projectsData);
        setTickets(ticketsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      const projectMatch =
        selectedProject === "all" || ticket.project_id.toString() === selectedProject;
      const activeMatch = !showActiveOnly || new Date(ticket.expiration_date) > new Date();
      return projectMatch && activeMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expiration_date).getTime();
      const dateB = new Date(b.expiration_date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

  return {
    projects,
    tickets: filteredAndSortedTickets,
    loading,
    error,
    selectedProject,
    sortDirection,
    showActiveOnly,
    filterByProject,
    toggleSortDirection,
    setShowActiveOnly
  };
};
