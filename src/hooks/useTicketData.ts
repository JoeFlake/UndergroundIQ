import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mockDataService } from "@/lib/mockData";
import { Project, Ticket } from "@/types";

export function useTicketData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fetch initial data
  useEffect(() => {
    if (user) {
      setLoading(true);

      // Get projects for user
      const userProjects = mockDataService.getUserProjects(user.id);
      setProjects(userProjects);

      // Get tickets for all user projects
      const projectIds = userProjects.map((p) => p.id);
      const userTickets = mockDataService.getProjectTickets(projectIds);
      setTickets(userTickets);
      setFilteredTickets(userTickets);

      setLoading(false);
    }
  }, [user]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...tickets];

    // Apply project filter
    if (selectedProject) {
      result = result.filter((ticket) => ticket.projectId === selectedProject);
    }

    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.expirationDate).getTime();
      const dateB = new Date(b.expirationDate).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    setFilteredTickets(result);
  }, [tickets, selectedProject, sortDirection]);

  // Function to filter by project
  const filterByProject = (projectId: string | null) => {
    setSelectedProject(projectId === "all" ? null : projectId);
  };

  // Function to toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return {
    loading,
    projects,
    tickets: filteredTickets,
    selectedProject,
    sortDirection,
    filterByProject,
    toggleSortDirection
  };
}
