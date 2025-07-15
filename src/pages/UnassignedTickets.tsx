import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Navbar } from "../components/Navbar";
import { useBluestakesAuth } from "../hooks/useBluestakesAuth";
import { useWindowReference } from "../hooks/useWindowReference";
import type { BlueStakesTicket } from "../lib/bluestakesService";
import { bluestakesService } from "../lib/bluestakesService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import type { Project } from "../types";
import { useToast } from "../components/ui/use-toast";
import { TicketsToUpdate } from "../components/TicketsToUpdate";
import { UnassignedTicketsTable } from "../components/UnassignedTicketsTable";
import { AssignTicketModal } from "../components/AssignTicketModal";
import { ConfirmRemoveDialog } from "../components/ConfirmRemoveDialog";
import { TicketRequestCard } from "../components/TicketRequestCard";
import { getSessionCache, setSessionCache } from "../utils/sessionStorage";
import { isErrorWithMessage } from "../utils/errorHandling";
import { 
  fetchAllTickets, 
  getProjectForTicket, 
  getProjectsForTickets,
  markTicketNoLongerNeeded,
  fetchOrphanedTickets
} from "../services/ticketService";

// Type alias for backward compatibility
type Ticket = BlueStakesTicket;

// Interface for database tickets that may not have full BlueStakes data
interface DatabaseTicket {
  ticket_number: string;
  replace_by_date?: string;
  bluestakes_data?: BlueStakesTicket;
}

// Combined ticket type for display
type UnassignedTicket = BlueStakesTicket | DatabaseTicket;

export default function UnassignedTickets() {
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const {
    bluestakesToken,
    isLoading: authLoading,
    error: authError,
  } = useBluestakesAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orphanedTickets, setOrphanedTickets] = useState<DatabaseTicket[]>([]);
  const [combinedTickets, setCombinedTickets] = useState<UnassignedTicket[]>([]);
  const [ticketsNeedingUpdate, setTicketsNeedingUpdate] = useState<Ticket[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [loadingOrphaned, setLoadingOrphaned] = useState(true);
  const [error, setError] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [openPopoverTicket, setOpenPopoverTicket] = useState<string | null>(null);
  const [popoverTicketData, setPopoverTicketData] = useState<Record<string, any>>({});
  const [confirmRemoveTicket, setConfirmRemoveTicket] = useState<Ticket | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  const openBluestakesWindow = useWindowReference("bluestakes_ticket_entry");

  // Add state for project names
  const [ticketProjects, setTicketProjects] = useState<Record<string, string>>(
    {}
  );

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role) {
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, [user]);

  // Combine tickets whenever either tickets or orphanedTickets change
  useEffect(() => {
    // Helper function to get ticket number from either type
    const getTicketNumber = (ticket: UnassignedTicket): string => {
      return 'ticket' in ticket ? ticket.ticket : ticket.ticket_number;
    };

    // Filter tickets to only show those beginning with "A" or "C"
    const filteredTickets = tickets.filter(ticket => {
      const ticketNumber = getTicketNumber(ticket);
      return ticketNumber.toUpperCase().startsWith('A') || ticketNumber.toUpperCase().startsWith('C');
    });

    const filteredOrphanedTickets = orphanedTickets.filter(ticket => {
      const ticketNumber = getTicketNumber(ticket);
      return ticketNumber.toUpperCase().startsWith('A') || ticketNumber.toUpperCase().startsWith('C');
    });

    const combined: UnassignedTicket[] = [...filteredTickets, ...filteredOrphanedTickets];
    setCombinedTickets(combined);
  }, [tickets, orphanedTickets]);

  // Fetch orphaned tickets with null project_id
  async function fetchOrphanedTicketsData() {
    setLoadingOrphaned(true);
    
    // Try to load from sessionStorage first
    const cachedOrphaned = getSessionCache("orphanedTickets");
    if (cachedOrphaned) {
      setOrphanedTickets(cachedOrphaned);
      setLoadingOrphaned(false);
      return;
    }

    try {
      const orphanedData = await fetchOrphanedTickets();
      
      // Enrich with BlueStakes data if token is available
      const enrichedOrphaned: DatabaseTicket[] = [];
      if (orphanedData.length > 0) {
        for (const orphaned of orphanedData) {
          const dbTicket: DatabaseTicket = {
            ticket_number: orphaned.ticket_number,
            replace_by_date: orphaned.replace_by_date,
          };

          // Try to get BlueStakes data if token is available
          if (bluestakesToken) {
            try {
              const ticketDetails = await bluestakesService.getTicketByNumber(
                orphaned.ticket_number,
                bluestakesToken
              );
              dbTicket.bluestakes_data = ticketDetails;
            } catch (error) {
              // BlueStakes data not available, keep just the database info
              console.log(`Could not fetch BlueStakes data for ticket ${orphaned.ticket_number}`);
            }
          }
          
          enrichedOrphaned.push(dbTicket);
        }
      }
      
      setOrphanedTickets(enrichedOrphaned);
      setSessionCache("orphanedTickets", enrichedOrphaned);
    } catch (error) {
      console.error("Error fetching orphaned tickets:", error);
    } finally {
      setLoadingOrphaned(false);
    }
  }

  // Fetch all tickets and tickets needing update, with sessionStorage caching
  async function fetchAll() {
    if (!bluestakesToken) return;

    setLoading(true);
    setLoadingUpdates(true);
    setError("");

    // Try to load from sessionStorage first
    const cachedUpdates = getSessionCache("ticketsNeedingUpdate");
    const cachedUnassigned = getSessionCache("unassignedTickets");
    if (cachedUpdates && cachedUnassigned) {
      setTicketsNeedingUpdate(cachedUpdates);
      setTickets(cachedUnassigned);
      setLoading(false);
      setLoadingUpdates(false);
      
      // Still fetch orphaned tickets
      fetchOrphanedTicketsData();
      return;
    }

    try {
      const { ticketsNeedingUpdate, unassignedTickets } = await fetchAllTickets(bluestakesToken);
      
      setTicketsNeedingUpdate(ticketsNeedingUpdate);
      setTickets(unassignedTickets);
      setSessionCache("ticketsNeedingUpdate", ticketsNeedingUpdate);
      setSessionCache("unassignedTickets", unassignedTickets);

      // Fetch orphaned tickets
      fetchOrphanedTicketsData();

      // Fetch projects for this company
      if (user && user.company_id) {
        const { data: companyProjects, error: companyProjectsError } =
          await supabase
            .from("company_projects")
            .select("project_id, projects(id, name)")
            .eq("company_id", user.company_id);

        if (companyProjectsError) {
          console.error("Error fetching projects:", companyProjectsError);
        } else {
          const projectsList = (companyProjects || []).map((row: any) => ({
            project_id: row.projects.id,
            project_name: row.projects.name,
          }));

          setProjects(projectsList);
        }
      } else {
        setProjects([]);
      }
    } catch (err: unknown) {
      setError(
        isErrorWithMessage(err) ? err.message : "Failed to fetch tickets"
      );
    } finally {
      setLoading(false);
      setLoadingUpdates(false);
    }
  }

  useEffect(() => {
    if (user && bluestakesToken) fetchAll();
  }, [user, bluestakesToken]);

  // Update useEffect to fetch project names (batched for performance)
  useEffect(() => {
    const fetchProjectNames = async () => {
      if (ticketsNeedingUpdate.length === 0) return;

      const ticketNumbers = ticketsNeedingUpdate.map(ticket => ticket.ticket);
      const projectNames = await getProjectsForTickets(ticketNumbers);
      setTicketProjects(projectNames);
    };

    fetchProjectNames();
  }, [ticketsNeedingUpdate]);

  const openAssignModal = async (ticket: Ticket) => {
    setAssigningTicket(ticket);
    
    // Fetch projects if we don't have them
    if (projects.length === 0 && user && user.company_id) {
      try {
        const { data: companyProjects, error: companyProjectsError } =
          await supabase
            .from("company_projects")
            .select("project_id, projects(id, name)")
            .eq("company_id", user.company_id);

        if (!companyProjectsError) {
          const projectsList = (companyProjects || []).map((row: any) => ({
            project_id: row.projects.id,
            project_name: row.projects.name,
          }));
          setProjects(projectsList);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }
  };

  const closeAssignModal = () => {
    setAssigningTicket(null);
  };

  const handleUpdateTicketAction = async (ticket: Ticket) => {
    try {
      // Copy ticket number to clipboard
      await navigator.clipboard.writeText(ticket.ticket);
      
      // Show success toast
      toast({
        title: "Ticket Number Copied",
        description: `Ticket number ${ticket.ticket} has been copied to clipboard`,
      });

      // Wait 750ms for UI feedback, then open/focus tab using the hook
      setTimeout(() => {
        const ticketUrl = `https://newtin.bluestakes.org/newtinweb/UTAH_ticketentry.html`;
        openBluestakesWindow(ticketUrl);
      }, 750);

      // Remove ticket from the updates list and update cache after navigation
      const updatedTickets = ticketsNeedingUpdate.filter(t => t.ticket !== ticket.ticket);
      setTicketsNeedingUpdate(updatedTickets);
      setSessionCache("ticketsNeedingUpdate", updatedTickets);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy ticket number or open URL",
        variant: "destructive",
      });
    }
  };

  const handleMarkTicketNoLongerNeeded = async (ticket: Ticket) => {
    try {
      await markTicketNoLongerNeeded(ticket.ticket);

      // Remove ticket from the updates list and update cache
      const updatedTickets = ticketsNeedingUpdate.filter(t => t.ticket !== ticket.ticket);
      setTicketsNeedingUpdate(updatedTickets);
      setSessionCache("ticketsNeedingUpdate", updatedTickets);

      toast({
        title: "Ticket Updated",
        description: `Ticket ${ticket.ticket} marked as no longer needing updates`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: isErrorWithMessage(error) 
          ? error.message 
          : "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const handleManualRefresh = () => {
    sessionStorage.removeItem("ticketsNeedingUpdate");
    sessionStorage.removeItem("unassignedTickets");
    sessionStorage.removeItem("orphanedTickets");
    fetchAll();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (authError || error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-500 text-lg">{authError || error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <Button onClick={handleManualRefresh}>Refresh Page Data</Button>
        </div>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Tickets To Update</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketsToUpdate
              tickets={ticketsNeedingUpdate}
              loading={loadingUpdates}
              ticketProjects={ticketProjects}
              openPopoverTicket={openPopoverTicket}
              onOpenPopoverTicket={setOpenPopoverTicket}
              popoverTicketData={popoverTicketData}
              onPopoverTicketDataUpdate={(ticketNumber, data) => 
                setPopoverTicketData(prev => ({ ...prev, [ticketNumber]: data }))
              }
              onUpdateTicket={handleUpdateTicketAction}
              onRemoveFromUpdateList={setConfirmRemoveTicket}
              bluestakesToken={bluestakesToken}
            />
          </CardContent>
        </Card>
        <TicketRequestCard userRole={userRole} />
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <UnassignedTicketsTable
              tickets={combinedTickets}
              loading={loading || loadingOrphaned}
              openPopoverTicket={openPopoverTicket}
              onOpenPopoverTicket={setOpenPopoverTicket}
              popoverTicketData={popoverTicketData}
              onPopoverTicketDataUpdate={(ticketNumber, data) => 
                setPopoverTicketData(prev => ({ ...prev, [ticketNumber]: data }))
              }
              onAssignTicket={openAssignModal}
              bluestakesToken={bluestakesToken}
            />
          </CardContent>
        </Card>
        <AssignTicketModal
          ticket={assigningTicket}
          projects={projects}
          onClose={closeAssignModal}
          onTicketAssigned={(ticketNumber) => {
            // Remove from regular unassigned tickets
            setTickets((prev) => prev.filter((t) => t.ticket !== ticketNumber));
            // Remove from orphaned tickets
            setOrphanedTickets((prev) => prev.filter((t) => t.ticket_number !== ticketNumber));
          }}
          onProjectsUpdated={setProjects}
          bluestakesToken={bluestakesToken}
        />

        <ConfirmRemoveDialog
          ticket={confirmRemoveTicket}
          onConfirm={(ticket) => {
            handleMarkTicketNoLongerNeeded(ticket);
            setConfirmRemoveTicket(null);
          }}
          onCancel={() => setConfirmRemoveTicket(null)}
        />
      </div>
    </div>
  );
}
