import { useEffect, useState, useRef } from "react";
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
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Map } from "../components/Map";
import { Loader2 } from "lucide-react";

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

// Helper to fetch and update user with company_id if missing
async function ensureUserCompanyId(user, setUser) {
  if (user && !user.company_id) {
    const { data, error } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!error && data && data.company_id) {
      setUser({ ...user, company_id: data.company_id });
      return data.company_id;
    }
  }
  return user?.company_id;
}

// Helper to get and set session storage
function getSessionCache(key) {
  try {
    const record = JSON.parse(sessionStorage.getItem(key));
    if (!record) return null;
    if (Date.now() > record.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    return record.value;
  } catch {
    return null;
  }
}

function setSessionCache(key, value, ttlMs = 5 * 60 * 1000) { // 5 min default
  const record = { value, expiry: Date.now() + ttlMs };
  sessionStorage.setItem(key, JSON.stringify(record));
}

// Helper to parse coordinates robustly (matches TicketView logic)
function getTicketLatLng(ticket: any): { lat: number | null, lng: number | null } {
  function parseCoord(val: any): number | null {
    if (typeof val === "number") return val;
    if (!val) return null;
    const trimmed = String(val).trim();
    if (trimmed === "" || trimmed === " ") return null;
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  }
  let lat = parseCoord(ticket.centroid_y);
  let lng = parseCoord(ticket.centroid_x);
  if (
    (lat === null || lng === null) &&
    ticket.extent_top &&
    ticket.extent_left &&
    ticket.extent_bottom &&
    ticket.extent_right
  ) {
    const top = parseCoord(ticket.extent_top);
    const left = parseCoord(ticket.extent_left);
    const bottom = parseCoord(ticket.extent_bottom);
    const right = parseCoord(ticket.extent_right);
    if ([top, left, bottom, right].every((v) => v !== null)) {
      lat = (top + bottom) / 2;
      lng = (left + right) / 2;
    }
  }
  if (lat === null || lng === null) {
    lat = parseCoord(ticket.latitude);
    lng = parseCoord(ticket.longitude);
  }
  return { lat, lng };
}

// Add custom hook for managing window references
function useWindowReference(windowName: string) {
  const windowRef = useRef<Window | null>(null);

  const openWindow = (url: string) => {
    // Only open if window doesn't exist or is closed
    if (!windowRef.current || windowRef.current.closed) {
      windowRef.current = window.open(url, windowName);
    } else {
      // If window exists, just focus it
      windowRef.current.focus();
    }
  };

  return openWindow;
}

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
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [openPopoverTicket, setOpenPopoverTicket] = useState<string | null>(null);
  const [popoverTicketData, setPopoverTicketData] = useState<Record<string, any>>({});
  const [popoverLoading, setPopoverLoading] = useState(false);

  const openBluestakesWindow = useWindowReference('bluestakes_ticket_entry');

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
      // Fetch tickets needing update first
      const updateTickets = await bluestakesService.getTicketsNeedingUpdate(bluestakesToken);
      
      // Filter out duplicates from updateTickets using a Set
      const seenUpdateTickets = new Set<string>();
      const uniqueUpdateTickets = updateTickets.filter(ticket => {
        if (seenUpdateTickets.has(ticket.ticket)) return false;
        seenUpdateTickets.add(ticket.ticket);
        return true;
      });

      // Sort tickets by replace_by_date in ascending order
      const sortedUpdateTickets = uniqueUpdateTickets.sort((a, b) => {
        const dateA = a.replace_by_date ? new Date(a.replace_by_date).getTime() : Infinity;
        const dateB = b.replace_by_date ? new Date(b.replace_by_date).getTime() : Infinity;
        return dateA - dateB;
      });

      setTicketsNeedingUpdate(sortedUpdateTickets);
      setSessionCache("ticketsNeedingUpdate", sortedUpdateTickets);

      // Then fetch unassigned tickets (your existing logic)
      // Ensure user has company_id
      if (user && !user.company_id && typeof setUser === 'function') {
        const companyId = await ensureUserCompanyId(user, setUser);
        if (companyId) user.company_id = companyId;
      }

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
      const unassignedTickets = allTickets.filter(
        (ticket) =>
          !assignedTicketNumbers.has(ticket.ticket) &&
          ticket.expires &&
          new Date(ticket.expires) > now
      );

      // For each unassigned ticket, check if it's an update of an existing ticket
      const updatePromises = unassignedTickets.map(async (ticket) => {
        try {
          // Get detailed ticket info including original ticket
          const ticketDetails = await bluestakesService.getTicketByNumber(
            ticket.ticket,
            bluestakesToken
          );

          if (ticketDetails.original_ticket) {
            // Check if the original ticket is assigned to a project
            const { data: originalAssignment, error: originalError } =
              await supabase
                .from("project_tickets")
                .select("project_id")
                .eq("ticket_number", ticketDetails.original_ticket)
                .maybeSingle();

            if (originalError) throw originalError;

            if (originalAssignment) {
              // Update the row to use the new ticket number and replace_by_date
              const { error: updateError } = await supabase
                .from("project_tickets")
                .update({
                  ticket_number: ticket.ticket,
                  replace_by_date: ticketDetails.replace_by_date,
                })
                .eq("ticket_number", ticketDetails.original_ticket);
              if (updateError) throw updateError;
              return true; // Ticket was updated/assigned
            }
          }
          return false; // No original ticket or no assignment found
        } catch (error) {
          console.error(`Error processing ticket ${ticket.ticket}:`, error);
          return false;
        }
      });

      // Wait for all ticket checks to complete
      const assignmentResults = await Promise.all(updatePromises);

      // Fetch updated assigned tickets after potential updates
      const { data: updatedAssigned, error: updatedAssignedError } =
        await supabase.from("project_tickets").select("ticket_number");

      if (updatedAssignedError) throw updatedAssignedError;

      const updatedAssignedTicketNumbers = new Set(
        (updatedAssigned || []).map((row) => row.ticket_number)
      );

      // Filter out newly assigned tickets and ensure no duplicates
      const seenUnassignedTickets = new Set<string>();
      const filteredTickets = unassignedTickets.filter(
        (ticket, index) => {
          if (seenUnassignedTickets.has(ticket.ticket)) return false;
          if (assignmentResults[index] || updatedAssignedTicketNumbers.has(ticket.ticket)) return false;
          seenUnassignedTickets.add(ticket.ticket);
          return true;
        }
      );

      setTickets(filteredTickets);
      setSessionCache("unassignedTickets", filteredTickets);

      // Fetch projects for this company
      if (user && user.company_id) {
        const { data: companyProjects, error: companyProjectsError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("company_id", user.company_id);

        const projectsList = (companyProjects || []).map((row) => ({
          project_id: row.id,
          project_name: row.name,
        }));

        setProjects(projectsList);
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
      const ticketUrl = `https://newtin.bluestakes.org/newtinweb/UTAH_ticketentry.html`;
      
      // Copy ticket number to clipboard
      await navigator.clipboard.writeText(ticket.ticket);

      // Show success toast
      toast({
        title: "Ticket Number Copied",
        description: `Ticket number ${ticket.ticket} has been copied to clipboard`,
      });

      openBluestakesWindow(ticketUrl);
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

  const handleManualRefresh = () => {
    sessionStorage.removeItem("ticketsNeedingUpdate");
    sessionStorage.removeItem("unassignedTickets");
    fetchAll();
  };

  async function handleRowPopover(ticketNumber: string) {
    setOpenPopoverTicket(ticketNumber);
    setPopoverLoading(true);
    try {
      const ticket = await bluestakesService.getTicketByNumber(ticketNumber, bluestakesToken);
      setPopoverTicketData((prev) => ({ ...prev, [ticketNumber]: ticket }));
    } catch {
      setPopoverTicketData((prev) => ({ ...prev, [ticketNumber]: null }));
    } finally {
      setPopoverLoading(false);
    }
  }

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
          <Button onClick={handleManualRefresh}>
            Refresh Page Data
          </Button>
        </div>
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
                    <TableHead className="w-40 text-center">Action</TableHead>
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
                    ticketsNeedingUpdate.map((ticket, index) => {
                      const popTicket = popoverTicketData[ticket.ticket];
                      const { lat: lat1, lng: lng1 } = popTicket ? getTicketLatLng(popTicket) : { lat: null, lng: null };
                      const hasMap = popTicket && lat1 !== null && lng1 !== null && popTicket.work_area && popTicket.work_area.type && popTicket.work_area.geometry;
                      return (
                        <Popover key={`update-${ticket.ticket}-${index}`} open={openPopoverTicket === ticket.ticket} onOpenChange={(open) => { if (!open) setOpenPopoverTicket(null); }}>
                          <PopoverTrigger asChild>
                            <div
                              role="row"
                              tabIndex={0}
                              className="contents cursor-pointer"
                              onClick={() => handleRowPopover(ticket.ticket)}
                            >
                              <TableRow>
                                <TableCell>{ticket.ticket}</TableCell>
                                <TableCell>
                                  {ticketProjects[ticket.ticket] || (
                                    <span className="text-gray-400">Loading...</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatDate(ticket.replace_by_date).split(",")[0]}
                                </TableCell>
                                <TableCell className="w-40 flex justify-center">
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket); }}
                                  >
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent align="end" sideOffset={8} className="w-[350px] p-0">
                            {popoverLoading && openPopoverTicket === ticket.ticket ? (
                              <div className="flex items-center justify-center h-[300px]"><Loader2 className="animate-spin mr-2" /> Loading map...</div>
                            ) : hasMap ? (
                              <Map key={ticket.ticket} lat={lat1!} lng={lng1!} workAreaGeoJSON={popTicket.work_area} height="300px" width="100%" showTooltips={false} />
                            ) : (
                              <div className="flex items-center justify-center h-[300px] text-gray-500">No map data available</div>
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    })
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
            {loading ? (
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Done For</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-40 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-500 py-8"
                      >
                        All Tickets have been assigned
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket, index) => {
                      const popTicket = popoverTicketData[ticket.ticket];
                      const { lat: lat2, lng: lng2 } = popTicket ? getTicketLatLng(popTicket) : { lat: null, lng: null };
                      const hasMap = popTicket && lat2 !== null && lng2 !== null && popTicket.work_area && popTicket.work_area.type && popTicket.work_area.geometry;
                      return (
                        <Popover key={`unassigned-${ticket.ticket}-${index}`} open={openPopoverTicket === ticket.ticket} onOpenChange={(open) => { if (!open) setOpenPopoverTicket(null); }}>
                          <PopoverTrigger asChild>
                            <div
                              role="row"
                              tabIndex={0}
                              className="contents cursor-pointer"
                              onClick={() => handleRowPopover(ticket.ticket)}
                            >
                              <TableRow>
                                <TableCell>{ticket.ticket}</TableCell>
                                <TableCell>{ticket.contact}</TableCell>
                                <TableCell>{ticket.done_for}</TableCell>
                                <TableCell>{formatStreetAddress(ticket)}</TableCell>
                                <TableCell className="w-40 flex justify-center">
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); openAssignModal(ticket); }}
                                  >
                                    Assign to Project
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent align="end" sideOffset={8} className="w-[350px] p-0">
                            {popoverLoading && openPopoverTicket === ticket.ticket ? (
                              <div className="flex items-center justify-center h-[300px]"><Loader2 className="animate-spin mr-2" /> Loading map...</div>
                            ) : hasMap ? (
                              <Map key={ticket.ticket} lat={lat2!} lng={lng2!} workAreaGeoJSON={popTicket.work_area} height="300px" width="100%" showTooltips={false} />
                            ) : (
                              <div className="flex items-center justify-center h-[300px] text-gray-500">No map data available</div>
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
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
