// import { supabase } from "./supabase";
// import { Project, Ticket, UserProject } from "@/types";
// import { useAuth } from "@/hooks/useAuth";

interface ProjectResponse {
  projects: {
    project_id: number;
    project_name: string;
  };
}

const BASE_URL = "https://newtin-api.bluestakes.org/api";

export const bluestakesService = {
  // Fetch all tickets for the user
  getAllTickets: async (token) => {
    const authHeader = token.startsWith("Bearer ") ? token : "Bearer " + token;
    console.log("Token being sent to /tickets/search:", token);
    console.log("Authorization header:", authHeader);
    const response = await fetch(`${BASE_URL}/tickets/search`, {
      headers: {
        accept: "application/json",
        Authorization: authHeader,
      },
    });
    const data = await response.json();
    return data.data || [];
  },

  // Fetch a ticket by its number
  getTicketByNumber: async (ticketNumber, token) => {
    const authHeader = token.startsWith("Bearer ") ? token : "Bearer " + token;
    const response = await fetch(`${BASE_URL}/tickets/${ticketNumber}`, {
      headers: {
        accept: "application/json",
        Authorization: authHeader,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch ticket");
    return await response.json();
  },

  // Fetch a list of states
  getStates: async () => {
    const response = await fetch(`${BASE_URL}/states`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch states");
    return await response.json();
  },

  // Fetch tickets for a given member (username) with Authorization token
  getUserTicketsByMember: async (member, token) => {
    const response = await fetch(
      `${BASE_URL}/reports/tickets/summary/${member}`,
      {
        headers: {
          accept: "application/json",
          Authorization: token,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch tickets for member");
    const data = await response.json();
    // The API returns an array of tickets
    return Array.isArray(data) ? data : data.data || [];
  },
};

// Comment out the entire supabaseService export
// export const supabaseService = { ... } // (comment out all contents)
