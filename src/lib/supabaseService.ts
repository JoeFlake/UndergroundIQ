import { supabase } from "./supabase";
import { Project, Ticket, UserProject } from "@/types";
import { useAuth } from "@/hooks/useAuth";

interface ProjectResponse {
  projects: {
    project_id: number;
    project_name: string;
  };
}

export const supabaseService = {
  // Get projects for a user
  getUserProjects: async (): Promise<Project[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("users-projects")
      .select(
        `
        projects (
          project_id,
          project_name
        )
      `
      )
      .eq("user_id", user.id);

    if (error) throw error;

    // Type assertion to handle the nested structure
    const typedData = data as unknown as {
      projects: { project_id: number; project_name: string };
    }[];
    return typedData.map((item) => ({
      project_id: item.projects.project_id,
      project_name: item.projects.project_name
    }));
  },

  // Get all tickets for the current user's projects
  getUserTickets: async (): Promise<Ticket[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // First get the user's projects
    const { data: userProjects, error: userProjectsError } = await supabase
      .from("users-projects")
      .select("project_id")
      .eq("user_id", user.id);

    if (userProjectsError) throw userProjectsError;

    const projectIds = userProjects.map((up) => up.project_id);

    // Then get all tickets for these projects
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .in("project_id", projectIds)
      .order("update_date", { ascending: false });

    if (ticketsError) throw ticketsError;
    return tickets;
  },

  // Get project by ID
  getProjectById: async (projectId: number): Promise<Project | null> => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get ticket by ID
  getTicketById: async (ticketId: number): Promise<Ticket | null> => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("ticket_id", ticketId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all tickets for a specific project
  getTicketsByProjectId: async (projectId: number): Promise<Ticket[]> => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("project_id", projectId)
      .order("update_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get users assigned to a project
  getProjectUsers: async (projectId: number): Promise<UserProject[]> => {
    const { data, error } = await supabase
      .from("users-projects")
      .select(
        `
        user_id,
        user_management (
          email
        )
      `
      )
      .eq("project_id", projectId);

    if (error) throw error;

    // Transform the data to match the UserProject type
    return data.map((item) => ({
      user_id: item.user_id,
      email: (item.user_management as unknown as { email: string }).email
    }));
  }
};
