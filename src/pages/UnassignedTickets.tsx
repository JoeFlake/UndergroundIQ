import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Navbar } from "../components/Navbar";
import { useBluestakesAuth } from "../hooks/useBluestakesAuth";
import { useWindowReference } from "../hooks/useWindowReference";
import type { BlueStakesTicket } from "../lib/bluestakesService";
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
import { getSessionCache, setSessionCache } from "../utils/sessionStorage";
import { isErrorWithMessage } from "../utils/errorHandling";
import { 
  fetchAllTickets, 
  getProjectForTicket, 
  markTicketNoLongerNeeded,
  handleTicketUpdate
} from "../services/ticketService";

// Type alias for backward compatibility
type Ticket = BlueStakesTicket;

export default function UnassignedTickets() {
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const {
    bluestakesToken,
    isLoading: authLoading,
    error: authError,
  } = useBluestakesAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsNeedingUpdate, setTicketsNeedingUpdate] = useState<Ticket[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [error, setError] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [openPopoverTicket, setOpenPopoverTicket] = useState<string | null>(null);
  const [popoverTicketData, setPopoverTicketData] = useState<Record<string, any>>({});
  const [confirmRemoveTicket, setConfirmRemoveTicket] = useState<Ticket | null>(null);

  const openBluestakesWindow = useWindowReference("bluestakes_ticket_entry");



  // Add state for project names
  const [ticketProjects, setTicketProjects] = useState<Record<string, string>>(
    {}
  );

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
      return;
    }

    try {
      const { ticketsNeedingUpdate, unassignedTickets } = await fetchAllTickets(bluestakesToken);
      
      setTicketsNeedingUpdate(ticketsNeedingUpdate);
      setTickets(unassignedTickets);
      setSessionCache("ticketsNeedingUpdate", ticketsNeedingUpdate);
      setSessionCache("unassignedTickets", unassignedTickets);

      // Fetch projects for this company
      if (user && user.company_id) {
        const { data: companyProjects, error: companyProjectsError } =
          await supabase
            .from("projects")
            .select("id, name")
            .eq("company_id", user.company_id);

        if (companyProjectsError) {
          console.error("Error fetching projects:", companyProjectsError);
        } else {
          const projectsList = (companyProjects || []).map((row) => ({
            project_id: row.id,
            project_name: row.name,
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



  // Update useEffect to fetch project names
  useEffect(() => {
    const fetchProjectNames = async () => {
      if (ticketsNeedingUpdate.length === 0) return;

      const projectNames: Record<string, string> = {};
      await Promise.all(
        ticketsNeedingUpdate.map(async (ticket) => {
          const projectName = await getProjectForTicket(ticket.ticket);
          projectNames[ticket.ticket] = projectName;
        })
      );
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
            .from("projects")
            .select("id, name")
            .eq("company_id", user.company_id);

        if (!companyProjectsError) {
          const projectsList = (companyProjects || []).map((row) => ({
            project_id: row.id,
            project_name: row.name,
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
      await handleTicketUpdate(ticket);
      
      // Show success toast
      toast({
        title: "Ticket Number Copied",
        description: `Ticket number ${ticket.ticket} has been copied to clipboard`,
      });

      // Remove ticket from the updates list and update cache
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
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <UnassignedTicketsTable
              tickets={tickets}
              loading={loading}
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
            setTickets((prev) => prev.filter((t) => t.ticket !== ticketNumber));
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
