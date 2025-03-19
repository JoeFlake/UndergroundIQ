import { Project, Ticket } from "@/types";

// Mock Projects
export const mockProjects: Project[] = [
  { id: "proj-1", name: "Downtown Renovation", status: "Active", userId: "bypass-user-id" },
  { id: "proj-2", name: "City Park Expansion", status: "Active", userId: "bypass-user-id" },
  {
    id: "proj-3",
    name: "Historic Building Restoration",
    status: "Inactive",
    userId: "bypass-user-id"
  },
  {
    id: "proj-4",
    name: "Highway Overpass Construction",
    status: "Active",
    userId: "bypass-user-id"
  }
];

// Mock Tickets
export const mockTickets: Ticket[] = [
  {
    id: "ticket-1",
    number: "T-001",
    projectId: "proj-1",
    expirationDate: "2024-06-30",
    description: "Main street sidewalk repairs",
    mapUrl: "https://maps.google.com/?q=40.7128,-74.0060",
    createdAt: "2024-03-01"
  },
  {
    id: "ticket-2",
    number: "T-002",
    projectId: "proj-1",
    expirationDate: "2024-07-15",
    description: "Traffic light installations",
    mapUrl: "https://maps.google.com/?q=40.7138,-74.0050",
    createdAt: "2024-03-05"
  },
  {
    id: "ticket-3",
    number: "T-003",
    projectId: "proj-2",
    expirationDate: "2024-05-20",
    description: "Fountain replacement",
    mapUrl: "https://maps.google.com/?q=40.7118,-74.0080",
    createdAt: "2024-02-15"
  },
  {
    id: "ticket-4",
    number: "T-004",
    projectId: "proj-3",
    expirationDate: "2024-08-10",
    description: "Facade restoration phase 1",
    mapUrl: "https://maps.google.com/?q=40.7108,-74.0070",
    createdAt: "2024-03-15"
  },
  {
    id: "ticket-5",
    number: "T-005",
    projectId: "proj-4",
    expirationDate: "2024-09-25",
    description: "Road barrier installation",
    mapUrl: "https://maps.google.com/?q=40.7148,-74.0040",
    createdAt: "2024-02-28"
  },
  {
    id: "ticket-6",
    number: "T-006",
    projectId: "proj-4",
    expirationDate: "2024-10-05",
    description: "Drainage system upgrades",
    mapUrl: "https://maps.google.com/?q=40.7158,-74.0030",
    createdAt: "2024-03-20"
  }
];

// Service to get data
export const mockDataService = {
  // Get projects for a user
  getUserProjects: (userId: string): Project[] => {
    // Return all projects for demo purposes
    return mockProjects;
  },

  // Get tickets for projects
  getProjectTickets: (projectIds: string[]): Ticket[] => {
    return mockTickets.filter((ticket) => projectIds.includes(ticket.projectId));
  },

  // Get project by ID
  getProjectById: (projectId: string): Project | undefined => {
    return mockProjects.find((project) => project.id === projectId);
  },

  // Get ticket by ID
  getTicketById: (ticketId: string): Ticket | undefined => {
    return mockTickets.find((ticket) => ticket.id === ticketId);
  },

  // Get all tickets for a specific project
  getTicketsByProjectId: (projectId: string): Ticket[] => {
    return mockTickets.filter((ticket) => ticket.projectId === projectId);
  }
};
