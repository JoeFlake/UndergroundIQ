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

export interface TicketSecondaryFunction {
  ticket: string;
  revision: string;
  cancel: boolean;
  comment: boolean;
  remark: boolean;
  retransmit: boolean;
  secondNotice: boolean;
  update: boolean;
}

const BASE_URL = "https://newtin-api.bluestakes.org/api";

function getLatestRevisions(tickets: BlueStakesTicket[]): BlueStakesTicket[] {
  return tickets.reduce((acc, ticket) => {
    const existingTicket = acc.find((t) => t.ticket === ticket.ticket);
    if (
      !existingTicket ||
      Number(ticket.revision) > Number(existingTicket.revision)
    ) {
      const filtered = acc.filter((t) => t.ticket !== ticket.ticket);
      return [...filtered, ticket];
    }
    return acc;
  }, [] as BlueStakesTicket[]);
}

export const bluestakesService = {
  async getAllTickets(token: string): Promise<BlueStakesTicket[]> {
    const tickets: BlueStakesTicket[] = [];
    const limit = 100;
    let offset = 0;
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const start = fourWeeksAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    const end = now.toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
    let hasMore = true;

    try {
      while (hasMore) {
        // URL format: .../tickets/search?limit=100&start=YYYY-MM-DD&end=YYYY-MM-DD
        const url = new URL(`${BASE_URL}/tickets/search`);
        url.searchParams.append("limit", limit.toString());
        url.searchParams.append("start", start);
        url.searchParams.append("end", end);
        if (offset > 0) url.searchParams.append("offset", offset.toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tickets from Blue Stakes");
        }

        const responseData = await response.json();
        const pageTickets = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];
        tickets.push(...pageTickets);
        if (pageTickets.length < limit) hasMore = false;
        else offset += limit;
      }
      return getLatestRevisions(tickets);
    } catch (error) {
      console.error("Error fetching all tickets:", error);
      throw error;
    }
  },

  async getTicketSecondaryFunction(
    ticketNumber: string,
    token: string
  ): Promise<TicketSecondaryFunction> {
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
        throw new Error(
          `Failed to fetch secondary functions for ticket ${ticketNumber}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Error fetching secondary functions for ticket ${ticketNumber}:`,
        error
      );
      throw error;
    }
  },

  async getTicketByNumber(
    ticketNumber: string,
    token: string
  ): Promise<BlueStakesTicket> {
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

  async getResponsesByTicket(
    ticketNumber: string,
    token: string
  ): Promise<BlueStakesResponse[]> {
    try {
      const authHeader = token.startsWith("Bearer ")
        ? token
        : "Bearer " + token;
      const response = await fetch(
        `${BASE_URL}/tickets/${ticketNumber}/responses`,
        {
          headers: {
            accept: "application/json",
            Authorization: authHeader,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to fetch ticket responses"
        );
      }
      const data = await response.json();

      // Extract the responses array from the ticket object
      const ticketData = Array.isArray(data) ? data[0] : data;
      const responses = ticketData?.responses || [];

      // Validate and normalize each response
      const validatedResponses = responses.map((resp, index) => {
        return {
          member_id: resp.member_id || 0,
          ticket: resp.ticket || ticketNumber,
          revision: resp.revision || "",
          response: resp.response || "",
          responded: resp.responded || "",
          response_by: resp.response_by || "",
          source: resp.source || "",
          sys_id: resp.sys_id || "",
          comments: resp.comments || "",
          description: resp.description || "",
          mbcode: resp.mbcode || "",
          mbname: resp.name || "", // Note: API uses 'name' instead of 'mbname'
          mbdescription: resp.mbdescription || "",
          status: resp.status || "", // Add status field
        };
      });

      return validatedResponses;
    } catch (error) {
      console.error(
        `Error fetching responses for ticket ${ticketNumber}:`,
        error
      );
      throw error;
    }
  },

  async getTicketsNeedingUpdate(token: string): Promise<BlueStakesTicket[]> {
    try {
      // Get all assigned tickets from project_tickets
      const { data: assignedTickets, error: dbError } = await supabase
        .from("project_tickets")
        .select("ticket_number");

      if (dbError) {
        throw new Error(`Failed to fetch assigned tickets: ${dbError.message}`);
      }

      if (!assignedTickets?.length) {
        return [];
      }

      // Calculate the date 7 days from now
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Calculate yesterday's date to include tickets due in the past day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Calculate today's date for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      console.log("Debug: Date ranges", {
        yesterday: yesterday.toISOString(),
        today: today.toISOString(),
        sevenDaysFromNow: sevenDaysFromNow.toISOString()
      });

      // Fetch ticket details for all assigned tickets
      const ticketDetails = await Promise.all(
        assignedTickets.map(async ({ ticket_number }) => {
          try {
            const ticket = await this.getTicketByNumber(ticket_number, token);
            return ticket;
          } catch (error) {
            console.error(
              `Error fetching details for ticket ${ticket_number}:`,
              error
            );
            return null;
          }
        })
      );

      // Filter tickets that are within 7 days future or 1 day past of their replace_by_date
      const ticketsToCheck = ticketDetails.filter(
        (ticket): ticket is BlueStakesTicket => {
          if (!ticket?.replace_by_date) return false;
          const replaceDate = new Date(ticket.replace_by_date);
          const inRange = replaceDate <= sevenDaysFromNow && replaceDate >= yesterday;
          
          if (replaceDate >= yesterday && replaceDate <= sevenDaysFromNow) {
            console.log("Debug: Ticket in date range", {
              ticket: ticket.ticket,
              replaceDate: replaceDate.toISOString(),
              isPastDue: replaceDate < today
            });
          }
          
          return inRange;
        }
      );

      console.log("Debug: Total tickets to check", ticketsToCheck.length);

      // Separate past due and today tickets from future tickets
      const pastDueAndTodayTickets: BlueStakesTicket[] = [];
      const futureTickets: BlueStakesTicket[] = [];

      ticketsToCheck.forEach(ticket => {
        const replaceDate = new Date(ticket.replace_by_date);
        const replaceDateNoTime = new Date(replaceDate);
        replaceDateNoTime.setHours(0, 0, 0, 0); // Normalize to start of day
        
        console.log("Debug: Comparing dates for ticket", ticket.ticket, {
          originalReplaceDate: ticket.replace_by_date,
          parsedReplaceDate: replaceDate.toISOString(),
          normalizedReplaceDate: replaceDateNoTime.toISOString(),
          today: today.toISOString(),
          isPastDue: replaceDateNoTime < today,
          isToday: replaceDateNoTime.getTime() === today.getTime()
        });
        
        if (replaceDateNoTime <= today) {
          // Ticket is past due (yesterday) or due today - include automatically
          console.log("Debug: Adding past due or today ticket", ticket.ticket, replaceDateNoTime.toISOString());
          pastDueAndTodayTickets.push(ticket);
        } else {
          // Ticket is future (tomorrow+) - check secondary functions
          futureTickets.push(ticket);
        }
      });

      console.log("Debug: Past due and today tickets found", pastDueAndTodayTickets.length);
      console.log("Debug: Future tickets found", futureTickets.length);

      // Check secondary functions only for future tickets (tomorrow and beyond)
      const futureTicketsNeedingUpdate = await Promise.all(
        futureTickets.map(async (ticket) => {
          try {
            const secondaryFunction = await this.getTicketSecondaryFunction(
              ticket.ticket,
              token
            );
            console.log("Debug: Secondary function check for ticket", ticket.ticket, {
              replaceDate: ticket.replace_by_date,
              updateFlag: secondaryFunction.update,
              included: secondaryFunction.update ? "YES" : "NO"
            });
            return secondaryFunction.update ? ticket : null;
          } catch (error) {
            console.error(
              `Error checking secondary functions for ticket ${ticket.ticket}:`,
              error
            );
            return null;
          }
        })
      );

      // Combine past due/today tickets (automatically included) with future tickets that need updates
      const allTicketsNeedingUpdate = [
        ...pastDueAndTodayTickets,
        ...futureTicketsNeedingUpdate.filter(
          (ticket): ticket is BlueStakesTicket => ticket !== null
        )
      ];

      console.log("Debug: Final tickets needing update", allTicketsNeedingUpdate.length);

      return allTicketsNeedingUpdate;
    } catch (error) {
      console.error("Error fetching tickets needing update:", error);
      throw error;
    }
  },

  async assignTicketToProject(
    ticketNumber: string,
    projectId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("project_tickets")
      .insert([{ project_id: projectId, ticket_number: ticketNumber }]);

    if (error) {
      throw new Error(`Failed to assign ticket to project: ${error.message}`);
    }
  },

  async loginToBluestakes(username: string, password: string): Promise<string> {
    const loginResp = await fetch(
      "https://newtin-api.bluestakes.org/api/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username,
          password,
        }).toString(),
      }
    );
    const loginData = await loginResp.json();
    if (!loginResp.ok || !loginData.Authorization) {
      throw new Error("Failed to log in to Blue Stakes");
    }
    return loginData.Authorization.replace("Bearer ", "");
  },
};
