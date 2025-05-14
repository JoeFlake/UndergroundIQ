export interface Project {
  project_id: number;
  project_name: string;
}

export interface Ticket {
  ticket: string;
  revision: string;
  completed: string;
  type: string;
  priority: string;
  category: string;
  lookup: string;
  channel: string;
  taken_source: string;
  taken_version: string;
  started: string;
  original_ticket: string;
  original_date: string;
  replaced_by_ticket: string;
  replace_by_date: string;
  expires: string;
  reference: string;
  account: string;
  original_account: string;
  caller_type: string;
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  description: string;
}

export interface UserProject {
  user_id: string;
  email: string;
}
