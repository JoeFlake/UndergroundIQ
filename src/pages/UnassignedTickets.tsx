import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Navbar } from "../components/Navbar";
import { useBluestakesAuth } from "../hooks/useBluestakesAuth";
import { bluestakesService, type BlueStakesTicket } from "../lib/bluestakesService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import type { Project } from "../types";
import { useToast } from "../components/ui/use-toast";

// Remove the local Ticket interface and use BlueStakesTicket instead
type Ticket = BlueStakesTicket;

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function getStatus(ticket: Ticket) {
  if (!ticket.expires) return "Unknown";
  const now = new Date();
  const expires = new Date(ticket.expires);
  return expires > now ? "Active" : "Expired";
}

function formatAddress(ticket: Ticket) {
  const parts = [
    ticket.address1,
    ticket.city,
    ticket.cstate,
    ticket.zip,
    ticket.county ? `${ticket.county} County` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

// Add a type guard for error with message
function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  );
}

interface ProjectData {
  project_id: number;
  projects: {
    name: string;
  };
}

export default function UnassignedTickets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { bluestakesToken, isLoading: authLoading, error: authError } = useBluestakesAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsNeedingUpdate, setTicketsNeedingUpdate] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  // Add function to get project name for a ticket
  const getProjectForTicket = async (ticketNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('project_tickets')
        .select('project_id, projects(name)')
        .eq('ticket_number', ticketNumber)
        .single() as { data: ProjectData | null; error: unknown };

      if (error) throw error;
      return data?.projects?.name || 'Unassigned';
    } catch (error) {
      console.error('Error fetching project for ticket:', error);
      return 'Error';
    }
  };

  // Add state for project names
  const [ticketProjects, setTicketProjects] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAllTickets = async () => {
      if (!bluestakesToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        // Fetch tickets needing updates
        const updateTickets = await bluestakesService.getTicketsNeedingUpdate(bluestakesToken);
        setTicketsNeedingUpdate(updateTickets);

        // Fetch all tickets
        const allTickets = await bluestakesService.getAllTickets(bluestakesToken);

        // Fetch all assigned ticket numbers from project_tickets
        const {
          data: assigned,
          error: assignedError,
        }: { data: { ticket_number: string }[] | null; error: unknown } =
          await supabase.from("project_tickets").select("ticket_number");
        if (assignedError) throw assignedError;
        const assignedTicketNumbers = new Set(
          (assigned || []).map((row) => row.ticket_number)
        );

        // Filter out assigned tickets and only keep active ones
        const now = new Date();
        const filteredTickets = allTickets.filter(
          (ticket) =>
            !assignedTicketNumbers.has(ticket.ticket) &&
            ticket.expires &&
            new Date(ticket.expires) > now
        );

        setTickets(filteredTickets);

        // Fetch projects for this user
        const {
          data: userProjects,
          error: userProjectsError,
        }: {
          data:
            | {
                projects:
                  | { id: number; name: string }
                  | { id: number; name: string }[]
                  | null;
              }[]
            | null;
          error: unknown;
        } = await supabase
          .from("user_projects")
          .select("project_id, projects(id, name)")
          .eq("user_id", user.id);
        if (userProjectsError) throw userProjectsError;
        setProjects(
          (userProjects || [])
            .map((up) => {
              if (Array.isArray(up.projects)) {
                return up.projects[0];
              }
              return up.projects;
            })
            .filter((proj) => proj && proj.id && proj.name)
            .map((proj) => ({
              project_id: proj.id,
              project_name: proj.name,
            }))
        );
      } catch (err: unknown) {
        setError(
          isErrorWithMessage(err) ? err.message : "Failed to fetch tickets"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && bluestakesToken) fetchAllTickets();
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

  const openAssignModal = (ticket: Ticket) => {
    setAssigningTicket(ticket);
    setSelectedProject("");
    setAssignError("");
    setAssignSuccess("");
  };

  const closeAssignModal = () => {
    setAssigningTicket(null);
    setSelectedProject("");
    setAssignError("");
    setAssignSuccess("");
  };

  const handleAssign = async () => {
    if (!selectedProject) {
      setAssignError("Please select a project");
      return;
    }
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      const { error } = await supabase.from("project_tickets").insert([
        {
          project_id: selectedProject,
          ticket_number: assigningTicket.ticket,
        },
      ]);
      if (error) {
        setAssignError(error.message);
      } else {
        setAssignSuccess("Ticket assigned successfully!");
        // Optionally remove the ticket from the list
        setTickets((prev) =>
          prev.filter((t) => t.ticket !== assigningTicket.ticket)
        );
        setTimeout(() => {
          closeAssignModal();
        }, 1000);
      }
    } catch (err: unknown) {
      setAssignError(
        isErrorWithMessage(err) ? err.message : "Failed to assign ticket"
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateTicket = async (ticket: Ticket) => {
    try {
      // Copy ticket number to clipboard
      await navigator.clipboard.writeText(ticket.ticket);
      
      // Show success toast
      toast({
        title: "Ticket Number Copied",
        description: `Ticket number ${ticket.ticket} has been copied to clipboard`,
      });

      // Navigate to external URL
      const ticketUrl = `https://newtin.bluestakes.org/newtinweb/UTAH_ticketentry.html`;
      window.open(ticketUrl, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy ticket number or open URL",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
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
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Tickets To Update</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Update Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsNeedingUpdate.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500 py-8"
                    >
                      No tickets need updates
                    </TableCell>
                  </TableRow>
                ) : (
                  ticketsNeedingUpdate.map((ticket) => (
                    <TableRow key={ticket.ticket}>
                      <TableCell>{ticket.ticket}</TableCell>
                      <TableCell>
                        {ticketProjects[ticket.ticket] || (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(ticket.replace_by_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTicket(ticket)}
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Unassigned Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Assign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.ticket}>
                      <TableCell>{ticket.ticket}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatus(ticket) === "Active"
                              ? "bg-green-100 text-green-800"
                              : getStatus(ticket) === "Expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getStatus(ticket)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(ticket.original_date)}</TableCell>
                      <TableCell>
                        {formatDate(ticket.replace_by_date)}
                      </TableCell>
                      <TableCell>{formatDate(ticket.expires)}</TableCell>
                      <TableCell>{formatAddress(ticket)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openAssignModal(ticket)}
                        >
                          Assign to Project
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Assign Modal */}
        {assigningTicket && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                Assign Ticket {assigningTicket.ticket} to Project
              </h2>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Select Project</label>
                <select
                  className="w-full border rounded p-2"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={assigning}
                >
                  <option value="">-- Select a project --</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>
              {assignError && (
                <div className="text-red-500 mb-2">{assignError}</div>
              )}
              {assignSuccess && (
                <div className="text-green-600 mb-2">{assignSuccess}</div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={closeAssignModal}
                  variant="outline"
                  disabled={assigning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assigning || !selectedProject}
                >
                  {assigning ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
