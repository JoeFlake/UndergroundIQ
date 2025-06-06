import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Navbar } from "../components/Navbar";
import { useBluestakesAuth } from "../hooks/useBluestakesAuth";
import {
  bluestakesService,
  type BlueStakesTicket,
} from "../lib/bluestakesService";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { subDays, formatISO } from "date-fns";

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
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  // Add function to get project name for a ticket
  const getProjectForTicket = async (ticketNumber: string) => {
    try {
      const { data, error } = await supabase
        .from("project_tickets")
        .select("project_id, projects(name)")
        .eq("ticket_number", ticketNumber)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      const project = Array.isArray(data?.projects)
        ? data.projects[0]
        : data?.projects;
      return project?.name || "Unassigned";
    } catch (error) {
      console.error("Error fetching project for ticket:", error);
      return "Unassigned";
    }
  };

  // Add state for project names
  const [ticketProjects, setTicketProjects] = useState<Record<string, string>>(
    {}
  );

  // First effect to fetch unassigned tickets
  useEffect(() => {
    const fetchAllUnassignedTickets = async () => {
      if (!bluestakesToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const allTickets = [];
        const limit = 100;
        let offset = 0;
        let hasMore = true;

        // Calculate date range for last 28 days
        const endDate = new Date();
        const startDate = subDays(endDate, 28);

        while (hasMore) {
          const params = new URLSearchParams({
            offset: offset.toString(),
            limit: limit.toString(),
            start: formatISO(startDate, { representation: "date" }),
            end: formatISO(endDate, { representation: "date" }),
          });

          // You may need to add authentication headers here
          const response = await fetch(
            `https://newtin-api.bluestakes.org/api/tickets/search?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${bluestakesToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (!response.ok) throw new Error("Failed to fetch tickets");
          const result = await response.json();

          // result.data is the array of tickets
          allTickets.push(...(result.data || []));

          // If less than limit returned, we're done
          if (!result.data || result.data.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        // Now filter out assigned tickets as before
        const { data: assigned, error: assignedError } = await supabase
          .from("project_tickets")
          .select("ticket_number");
        if (assignedError) throw assignedError;
        const assignedTicketNumbers = new Set(
          (assigned || []).map((row) => String(row.ticket_number).toUpperCase())
        );

        const trulyUnassigned = allTickets.filter(
          (ticket) =>
            !assignedTicketNumbers.has(String(ticket.ticket).toUpperCase())
        );

        setTickets(trulyUnassigned);
      } catch (err) {
        setError(
          isErrorWithMessage(err) ? err.message : "Failed to fetch tickets"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && bluestakesToken) fetchAllUnassignedTickets();
  }, [user, bluestakesToken]);

  // Second effect to fetch tickets needing updates
  useEffect(() => {
    const fetchTicketsNeedingUpdate = async () => {
      if (!bluestakesToken || loading) return; // Wait for unassigned tickets to load first

      setLoadingUpdates(true);
      try {
        const updateTickets =
          await bluestakesService.getTicketsNeedingUpdate(bluestakesToken);
        setTicketsNeedingUpdate(updateTickets);
      } catch (err: unknown) {
        toast({
          title: "Error",
          description: isErrorWithMessage(err)
            ? err.message
            : "Failed to fetch tickets needing updates",
          variant: "destructive",
        });
      } finally {
        setLoadingUpdates(false);
      }
    };

    fetchTicketsNeedingUpdate();
  }, [bluestakesToken, loading]); // Add loading as dependency to ensure it runs after unassigned tickets are loaded

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
      // Fetch ticket details to get replace_by_date
      const ticketDetails = await bluestakesService.getTicketByNumber(
        assigningTicket.ticket,
        bluestakesToken
      );

      const { error } = await supabase.from("project_tickets").insert([
        {
          project_id: selectedProject,
          ticket_number: assigningTicket.ticket,
          replace_by_date: ticketDetails.replace_by_date,
        },
      ]);
      if (error) {
        setAssignError(error.message);
      } else {
        setAssignSuccess("Ticket assigned successfully!");
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
      window.open(ticketUrl, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy ticket number or open URL",
        variant: "destructive",
      });
    }
  };

  const formatStreetAddress = (ticket: Ticket) => {
    const parts = [];

    // Handle street address with from/to if available
    const fromAddress = ticket.st_from_address?.trim();
    const toAddress = ticket.st_to_address?.trim();

    if (fromAddress && toAddress && fromAddress !== "0" && toAddress !== "0") {
      if (fromAddress === toAddress) {
        parts.push(`${fromAddress} ${ticket.street?.trim()}`);
      } else {
        parts.push(
          `${ticket.street?.trim()} from ${fromAddress} to ${toAddress}`
        );
      }
    } else if (ticket.cross1?.trim() && ticket.cross2?.trim()) {
      // If no from/to addresses, show cross streets
      parts.push(
        `${ticket.street?.trim()} from ${ticket.cross1.trim()} to ${ticket.cross2.trim()}`
      );
    } else if (ticket.street?.trim()) {
      // Fallback to just street name if no other location data
      parts.push(ticket.street.trim());
    }

    if (ticket.place?.trim()) parts.push(ticket.place.trim());
    return parts.join(", ");
  };

  // Add function to create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    setCreatingProject(true);
    try {
      // Insert new project
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([{ name: newProjectName.trim() }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Add user to project
      const { error: userProjectError } = await supabase
        .from("user_projects")
        .insert([
          {
            user_id: user.id,
            project_id: newProject.id,
          },
        ]);

      if (userProjectError) throw userProjectError;

      // Update projects list
      setProjects((prev) => [
        ...prev,
        {
          project_id: newProject.id,
          project_name: newProject.name,
        },
      ]);

      // Select the new project
      setSelectedProject(newProject.id.toString());

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      setIsNewProjectModalOpen(false);
      setNewProjectName("");
    } catch (error) {
      toast({
        title: "Error",
        description: isErrorWithMessage(error)
          ? error.message
          : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreatingProject(false);
    }
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
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Tickets To Update</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUpdates ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
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
                        <TableCell>
                          {formatDate(ticket.replace_by_date).split(",")[0]}
                        </TableCell>
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
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Done For</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      All Tickets have been assigned
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.ticket}>
                      <TableCell>{ticket.ticket}</TableCell>
                      <TableCell>{ticket.contact}</TableCell>
                      <TableCell>{ticket.done_for}</TableCell>
                      <TableCell>{formatStreetAddress(ticket)}</TableCell>
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
                <div className="flex gap-2 mb-2">
                  <select
                    className="flex-1 border rounded p-2"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="">-- Select a project --</option>
                    {projects.map((project) => (
                      <option
                        key={project.project_id}
                        value={project.project_id}
                      >
                        {project.project_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewProjectModalOpen(true)}
                    disabled={assigning}
                  >
                    New Project
                  </Button>
                </div>
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

        {/* New Project Modal */}
        <Dialog
          open={isNewProjectModalOpen}
          onOpenChange={setIsNewProjectModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={creatingProject}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewProjectModalOpen(false)}
                disabled={creatingProject}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={creatingProject || !newProjectName.trim()}
              >
                {creatingProject ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
