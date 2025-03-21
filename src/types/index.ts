export interface Project {
  project_id: number;
  project_name: string;
}

export interface Ticket {
  ticket_id: number;
  ticket_number: string;
  project_id: number;
  description: string;
  expiration_date: string;
  legal_date: string;
  update_date: string;
  map_url: string;
  full_ticket: string;
  old_ticket_numbers: string[];
}

export interface UserProject {
  user_id: string;
  email: string;
}
