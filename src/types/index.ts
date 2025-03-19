
export interface Project {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  userId: string;
}

export interface Ticket {
  id: string;
  number: string;
  projectId: string;
  expirationDate: string;
  description: string;
  mapUrl: string;
  createdAt: string;
}
