import { supabase } from "./supabaseClient";

export interface BlueStakesMember {
  ticket: string;
  revision: string;
  member_id: number;
  mbcode: string;
  deliver: number;
  show: number;
  add_county: number;
  add_place: number;
  add_polygon: number;
  add_street: number;
  add_operator: number;
  add_strategy: number;
  rem_county: number;
  rem_place: number;
  rem_polygon: number;
  rem_street: number;
  rem_operator: number;
  rem_strategy: number;
  rem_contractor: number;
  rem_inactive: number;
  group_code: string;
  name: string;
  facility_type: string;
  description: string;
  system: number;
}

interface BlueStakesGrid {
  ticket: string;
  revision: string;
  st: number;
  co: number;
  map: string;
  name: string;
}

interface BlueStakesDelivery {
  ticket: string;
  revision: string;
  member_id: number;
  mbcode: string;
  delivered: string;
  sequence: number;
  destination_type: string;
  attempts: number;
  sys_id: string;
  type: string;
  category: string;
  priority: string;
}

interface BlueStakesResponse {
  member_id: number;
  ticket: string;
  revision: string;
  response: string;
  responded: string;
  response_by: string;
  source: string;
  sys_id: string;
  comments: string;
  description: string;
  mbcode: string;
  mbname: string;
  mbdescription: string;
}

interface GeoJSONGeometry {
  type: string;
  coordinates: number[][][] | number[];
}

interface GeoJSONFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: GeoJSONGeometry;
}

export interface BlueStakesTicket {
  ticket: string;
  revision: string;
  completed: string;
  type: string;
  priority: string;
  category: string;
  lookup: string;
  channel: string;
  started: string;
  original_ticket: string;
  original_date: string;
  replace_by_date: string;
  expires: string;
  account: string;
  original_account: string;
  caller_type: string;
  name: string;
  address1: string;
  city: string;
  cstate: string;
  zip: string;
  phone: string;
  phone_ext: string;
  caller: string;
  caller_phone: string;
  caller_phone_ext: string;
  contact: string;
  contact_phone: string;
  contact_phone_ext: string;
  cell: string;
  email: string;
  state: string;
  county: string;
  place: string;
  subdivision: string;
  lot: string;
  st_from_address: string;
  st_to_address: string;
  street: string;
  cross1: string;
  cross2: string;
  latitude: string;
  longitude: string;
  legal_date: string;
  work_date: string;
  response_due: string;
  hours_notice_clock: number;
  hours_notice_business: number;
  work_type: string;
  done_for: string;
  svc_side_of_st: string;
  boring: string;
  rr: string;
  extent_top: number;
  extent_left: number;
  extent_bottom: number;
  extent_right: number;
  area_in_miles: number;
  emergency: boolean;
  blasting: boolean;
  meet: boolean;
  dig_in_road: boolean;
  response_required: boolean;
  location: string;
  remarks: string;
  comments: string;
  members: BlueStakesMember[];
  work_area: GeoJSONFeature;
  grids: BlueStakesGrid[];
  deliveries: BlueStakesDelivery[];
  responses: BlueStakesResponse[];
  best_fit_rect: GeoJSONFeature;
  centroid: GeoJSONFeature;
}

interface TicketSecondaryFunction {
  update: boolean;
  // Add other fields if they exist in the response
}

interface TicketUpdatePayload {
  contact: string;
  contact_phone: string;
  contact_phone_ext: string;
  caller: string;
  caller_phone: string;
  caller_phone_ext: string;
  caller_type: string;
  address1: string;
  city: string;
  cstate: string;
  zip: string;
  name: string;
  phone: string;
  phone_ext: string;
  email: string;
  eml_confirm: boolean;
  cell: string;
  sms_confirm: boolean;
  blasting: boolean;
  boring: string;
  done_for: string;
  work_type: string;
  comments: string;
  remarks: string;
  membersToAdd: string;
}

interface TicketUpdateResponse {
  ticket: string;
  revision: string;
}

const BASE_URL = "https://newtiny-api.bluestakes.org/api";

function getLatestRevisions(tickets: BlueStakesTicket[]): BlueStakesTicket[] {
  return tickets.reduce((acc, ticket) => {
    const existingTicket = acc.find(t => t.ticket === ticket.ticket);
    if (!existingTicket || Number(ticket.revision) > Number(existingTicket.revision)) {
      const filtered = acc.filter(t => t.ticket !== ticket.ticket);
      return [...filtered, ticket];
    }
    return acc;
  }, [] as BlueStakesTicket[]);
}

export const bluestakesService = {
  async getAllTickets(token: string): Promise<BlueStakesTicket[]> {
    try {
      const response = await fetch(
        `${BASE_URL}/tickets/summary`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tickets from Blue Stakes");
      }

      const responseData = await response.json();
      const tickets = Array.isArray(responseData) ? responseData : responseData.data || [];
      return getLatestRevisions(tickets);
    } catch (error) {
      console.error("Error fetching all tickets:", error);
      throw error;
    }
  },

  async getTicketSecondaryFunction(ticketNumber: string, token: string): Promise<TicketSecondaryFunction> {
    try {
      const response = await fetch(
        `${BASE_URL}/tickets/${ticketNumber}/secondary-functions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch secondary functions for ticket ${ticketNumber}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching secondary functions for ticket ${ticketNumber}:`, error);
      throw error;
    }
  },

  async getTicketByNumber(ticketNumber: string, token: string): Promise<BlueStakesTicket> {
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
  
  async getResponsesByTicket(ticketNumber: string, token: string): Promise<BlueStakesResponse[]> {
    const authHeader = token.startsWith("Bearer ") ? token : "Bearer " + token;
    const response = await fetch(`${BASE_URL}/tickets/${ticketNumber}/responses`, {
      headers: {
        accept: "application/json", 
        Authorization: authHeader,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch ticket responses");
    return await response.json();
  },

  async getTicketsNeedingUpdate(token: string): Promise<BlueStakesTicket[]> {
    try {
      // First get all tickets
      const allTickets = await this.getAllTickets(token);
      
      // Calculate the date 7 days from now
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Filter tickets that are within 7 days of their replace_by_date
      const ticketsToCheck = allTickets.filter(ticket => {
        if (!ticket.replace_by_date) return false;
        const replaceDate = new Date(ticket.replace_by_date);
        return replaceDate <= sevenDaysFromNow && replaceDate >= new Date();
      });

      // Then check only the filtered tickets' secondary functions
      const ticketsNeedingUpdate = await Promise.all(
        ticketsToCheck.map(async (ticket) => {
          try {
            const secondaryFunction = await this.getTicketSecondaryFunction(ticket.ticket, token);
            return secondaryFunction.update ? ticket : null;
          } catch (error) {
            console.error(`Error checking secondary functions for ticket ${ticket.ticket}:`, error);
            return null;
          }
        })
      );

      // Filter out null values (tickets that don't need updates or had errors)
      return ticketsNeedingUpdate.filter((ticket): ticket is BlueStakesTicket => ticket !== null);
    } catch (error) {
      console.error("Error fetching tickets needing update:", error);
      throw error;
    }
  },

  async assignTicketToProject(ticketNumber: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("project_tickets")
      .insert([{ project_id: projectId, ticket_number: ticketNumber }]);

    if (error) {
      throw new Error(`Failed to assign ticket to project: ${error.message}`);
    }
  },
};
