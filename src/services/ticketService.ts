import { supabase } from "../lib/supabaseClient";
import { bluestakesService, type BlueStakesTicket } from "../lib/bluestakesService";

// Function to get project name for a ticket
export async function getProjectForTicket(ticketNumber: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("project_tickets")
      .select("project_id, projects(name)")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    const project = Array.isArray(data?.projects) ? data.projects[0] : data?.projects;
    return project?.name || "Unassigned";
  } catch (error: unknown) {
    return "Unassigned";
  }
}

// Function to get project names for multiple tickets in a single query (performance optimized)
export async function getProjectsForTickets(ticketNumbers: string[]): Promise<Record<string, string>> {
  if (ticketNumbers.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("project_tickets")
      .select("ticket_number, projects(name)")
      .in("ticket_number", ticketNumbers);

    if (error) throw error;

    const projectNames: Record<string, string> = {};
    
    // Initialize all tickets as "Unassigned"
    ticketNumbers.forEach(ticketNumber => {
      projectNames[ticketNumber] = "Unassigned";
    });

    // Update with actual project names where available
    (data || []).forEach(item => {
      const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
      if (project?.name) {
        projectNames[item.ticket_number] = project.name;
      }
    });

    return projectNames;
  } catch (error: unknown) {
    console.error("Error fetching project names:", error);
    // Return default "Unassigned" for all tickets on error
    const projectNames: Record<string, string> = {};
    ticketNumbers.forEach(ticketNumber => {
      projectNames[ticketNumber] = "Unassigned";
    });
    return projectNames;
  }
}

// Function to fetch tickets with null project_id from database
export async function fetchOrphanedTickets(): Promise<{ ticket_number: string; replace_by_date?: string }[]> {
  try {
    const { data, error } = await supabase
      .from("project_tickets")
      .select("ticket_number, replace_by_date")
      .is("project_id", null);

    if (error) throw error;
    return data || [];
  } catch (error: unknown) {
    console.error("Error fetching orphaned tickets:", error);
    return [];
  }
}

// Function to fetch all tickets and handle assignments
export async function fetchAllTickets(bluestakesToken: string) {
  // Fetch all tickets
  const allTickets = await bluestakesService.getAllTickets(bluestakesToken);

  // Fetch all ticket information from project_tickets
  const {
    data: projectTickets,
    error: projectTicketsError,
  }: { 
    data: { 
      ticket_number: string;
      old_ticket: string | null;
      is_continue_update: boolean;
    }[] | null; 
    error: unknown 
  } = await supabase
    .from("project_tickets")
    .select("ticket_number, old_ticket, is_continue_update");
  
  if (projectTicketsError) throw projectTicketsError;

  // Create sets for ALL assigned tickets and previous tickets
  const allAssignedTicketNumbers = new Set(
    (projectTickets || []).map(ticket => ticket.ticket_number)
  );
  
  // Keep active tickets set for the updates functionality
  const activeTicketNumbers = new Set(
    (projectTickets || [])
      .filter(ticket => ticket.is_continue_update)
      .map(ticket => ticket.ticket_number)
  );
  
  const previousTicketNumbers = new Set(
    (projectTickets || [])
      .filter(ticket => ticket.old_ticket)
      .map(ticket => ticket.old_ticket)
  );

  // Fetch tickets needing update from database (where is_continue_update = true and due today or before)
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  
  const {
    data: ticketsNeedingUpdateData,
    error: updateTicketsError,
  } = await supabase
    .from("project_tickets")
    .select("ticket_number, replace_by_date")
    .eq("is_continue_update", true)
    .lte("replace_by_date", today)
    .order("replace_by_date", { ascending: true });

  if (updateTicketsError) throw updateTicketsError;

  console.log("Debug: Database tickets needing update", ticketsNeedingUpdateData?.length || 0);

  // Convert database tickets to BlueStakes ticket format for compatibility
  const updateTicketsFromDB = ticketsNeedingUpdateData || [];
  const ticketsNeedingUpdatePromises = updateTicketsFromDB.map(async (dbTicket) => {
    try {
      // Fetch full ticket details from BlueStakes API
      const ticketDetails = await bluestakesService.getTicketByNumber(
        dbTicket.ticket_number,
        bluestakesToken
      );
      return ticketDetails;
         } catch (error) {
       console.error(`Failed to fetch BlueStakes data for ticket ${dbTicket.ticket_number}:`, error);
       // Return a minimal ticket object if BlueStakes data is unavailable
       // We'll create a minimal object with required fields and cast it properly
       const minimalTicket = {
         ticket: dbTicket.ticket_number,
         replace_by_date: dbTicket.replace_by_date,
         revision: '',
         completed: '',
         type: '',
         priority: '',
         category: '',
         lookup: '',
         channel: '',
         started: '',
         original_ticket: '',
         original_date: '',
         expires: '',
         account: '',
         original_account: '',
         caller_type: '',
         name: '',
         address1: '',
         city: '',
         cstate: '',
         zip: '',
         phone: '',
         phone_ext: '',
         caller: '',
         caller_phone: '',
         caller_phone_ext: '',
         contact: '',
         contact_phone: '',
         contact_phone_ext: '',
         cell: '',
         email: '',
         state: '',
         county: '',
         place: '',
         subdivision: '',
         lot: '',
         st_from_address: '',
         st_to_address: '',
         street: '',
         cross1: '',
         cross2: '',
         latitude: '',
         longitude: '',
         legal_date: '',
         work_date: '',
         response_due: '',
         hours_notice_clock: 0,
         hours_notice_business: 0,
         work_type: '',
         done_for: '',
         svc_side_of_st: '',
         boring: '',
         rr: '',
         extent_top: 0,
         extent_left: 0,
         extent_bottom: 0,
         extent_right: 0,
         area_in_miles: 0,
         emergency: false,
         blasting: false,
         meet: false,
         dig_in_road: false,
         response_required: false,
         location: '',
         remarks: '',
         comments: '',
         members: [],
         work_area: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [] } },
       } as unknown as BlueStakesTicket;
       return minimalTicket;
     }
  });

  const sortedUpdateTickets = await Promise.all(ticketsNeedingUpdatePromises);

  // Filter out ALL assigned tickets, previous tickets, and expired tickets
  const now = new Date();
  const unassignedTickets = allTickets.filter(
    (ticket) =>
      !allAssignedTicketNumbers.has(ticket.ticket) &&
      !previousTicketNumbers.has(ticket.ticket) &&
      ticket.replace_by_date &&
      new Date(ticket.replace_by_date) > now
  );

  // Process ticket updates
  const updatePromises = unassignedTickets.map(async (ticket) => {
    try {
      const ticketDetails = await bluestakesService.getTicketByNumber(
        ticket.ticket,
        bluestakesToken
      );

      if (ticketDetails.original_ticket) {
        const originalTicket = projectTickets?.find(
          pt => pt.ticket_number === ticketDetails.original_ticket && pt.is_continue_update
        );

        if (originalTicket) {
          await supabase
            .from("project_tickets")
            .update({ is_continue_update: false })
            .eq("ticket_number", ticketDetails.original_ticket);

          await supabase
            .from("project_tickets")
            .insert({
              ticket_number: ticket.ticket,
              old_ticket: ticketDetails.original_ticket,
              replace_by_date: ticketDetails.replace_by_date,
              is_continue_update: true
            });

          return true;
        }
      }
      return false;
    } catch (error: unknown) {
      console.error("Error processing ticket update:", error);
      return false;
    }
  });

  const assignmentResults = await Promise.all(updatePromises);
  const finalUnassignedTickets = unassignedTickets.filter((_, index) => !assignmentResults[index]);

  return {
    ticketsNeedingUpdate: sortedUpdateTickets,
    unassignedTickets: finalUnassignedTickets,
  };
}

// Function to mark ticket as no longer needing updates
export async function markTicketNoLongerNeeded(ticketNumber: string) {
  const { error } = await supabase
    .from("project_tickets")
    .update({ is_continue_update: false })
    .eq("ticket_number", ticketNumber);

  if (error) throw error;
}

// Function to copy ticket to clipboard and open BlueStakes
export async function handleTicketUpdate(ticket: BlueStakesTicket): Promise<void> {
  const ticketUrl = `https://newtin.bluestakes.org/newtinweb/UTAH_ticketentry.html`;
  await navigator.clipboard.writeText(ticket.ticket);
  
  // Return a promise that resolves after a delay to allow for UI feedback
  return new Promise((resolve) => {
    setTimeout(() => {
      window.open(ticketUrl, "bluestakes_ticket_entry");
      resolve();
    }, 750);
  });
} 