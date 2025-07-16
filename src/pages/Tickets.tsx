import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Navbar } from "../components/Navbar";
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
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Share, Download } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBluestakesAuth } from "@/hooks/useBluestakesAuth";
import {
  bluestakesService,
  type BlueStakesTicket,
} from "../lib/bluestakesService";
import { ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Map } from "../components/Map";
import { Select } from "@/components/ui/select";
import { generateSlug } from "../utils/slug";
import { shareService } from "@/lib/shareService.ts";

// Remove the Ticket type import and use BlueStakesTicket instead
type Ticket = BlueStakesTicket;

interface ProjectTicket {
  ticket_number: string;
  project_id: number;
  is_continue_update?: boolean;
  bluestakes_data?: BlueStakesTicket;
}

function getStatus(ticket: BlueStakesTicket | undefined) {
  if (!ticket?.expires) return "Unknown";
  const now = new Date();
  const expires = new Date(ticket.expires);
  return expires > now ? "Active" : "Expired";
}

function formatAddress(ticket: BlueStakesTicket | undefined) {
  if (!ticket) return "-";
  const parts = [ticket.place, ticket.city, ticket.state, ticket.zip];
  return parts.filter(Boolean).join(", ");
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
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

// Helper function to format role names
function formatRoleName(roleKey: string): string {
  return roleKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface ProjectAssignee {
  id: string;
  name: string;
  role: string;
  email: string;
}

export default function Tickets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    bluestakesToken,
    isLoading: authLoading,
    error: authError,
  } = useBluestakesAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Helper function to resolve project slug to ID
  const getProjectIdFromSlug = async (slug: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name");

      if (error || !data) return null;

      // Find project by matching slug generated from name
      const project = data.find(p => generateSlug(p.name) === slug);
      return project ? Number(project.id) : null;
    } catch {
      return null;
    }
  };
  const [tickets, setTickets] = useState<ProjectTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [newTicketNumber, setNewTicketNumber] = useState("");
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [isEnrichingTickets, setIsEnrichingTickets] = useState(false);
  const [projectCenter, setProjectCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [projectWorkArea, setProjectWorkArea] = useState<any>(null);
  const [projectAssignees, setProjectAssignees] = useState<ProjectAssignee[]>([]);
  const [isAddAssigneeOpen, setIsAddAssigneeOpen] = useState(false);
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [assigneeRole, setAssigneeRole] = useState("superintendent");
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);

  useEffect(() => {
    async function fetchTickets() {
      if (!user) {
        setTickets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const projectSlug = searchParams.get("project");
        if (!projectSlug) {
          setTickets([]);
          setLoading(false);
          return;
        }

        const projectId = await getProjectIdFromSlug(projectSlug);
        if (!projectId) {
          setTickets([]);
          setLoading(false);
          return;
        }

        // Fetch tickets from Supabase for this project
        const { data: projectTickets, error: dbError } = await supabase
          .from("project_tickets")
          .select("ticket_number, project_id, is_continue_update")
          .eq("project_id", projectId);

        if (dbError) throw dbError;

        // Initialize tickets with just the database data
        setTickets(projectTickets || []);

        // If we have a BlueStakes token, enrich the tickets with API data
        if (bluestakesToken) {
          await enrichTicketsWithBlueStakesData(
            projectTickets || [],
            bluestakesToken
          );
        }
      } catch (err: unknown) {
        setError(
          isErrorWithMessage(err) ? err.message : "Failed to fetch tickets"
        );
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchTickets();
  }, [user, searchParams, bluestakesToken]);

  useEffect(() => {
    async function fetchProjectName() {
      const projectSlug = searchParams.get("project");
      if (!projectSlug) return;

      const projectId = await getProjectIdFromSlug(projectSlug);
      if (projectId) {
        const { data } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();
        setProjectName(data?.name || null);
      }
    }
    fetchProjectName();
  }, [searchParams]);

  useEffect(() => {
    async function fetchAssignees() {
      const projectSlug = searchParams.get("project");
      if (!projectSlug) return;

      const projectId = await getProjectIdFromSlug(projectSlug);
      if (!projectId) return;

      // Fetch project with project_roles JSON column
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("project_roles")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        setProjectAssignees([]);
        return;
      }

      const assignees: ProjectAssignee[] = [];
      
      // Parse project_roles JSON object
      if (project.project_roles && typeof project.project_roles === 'object') {
        const roles = project.project_roles;
        
        // Add assignees from the roles object
        Object.entries(roles).forEach(([roleKey, roleData]: [string, any]) => {
          if (roleData && typeof roleData === 'object') {
            // Handle array of users for a role
            if (Array.isArray(roleData)) {
              roleData.forEach((user, idx) => {
                                 if (user.name || user.email) {
                   assignees.push({
                     id: `${roleKey}-${idx}`,
                     name: user.name || user.email || '',
                     role: formatRoleName(roleKey),
                     email: user.email || '',
                   });
                 }
              });
            } else {
              // Handle single user for a role
                             if (roleData.name || roleData.email) {
                 assignees.push({
                   id: roleKey,
                   name: roleData.name || roleData.email || '',
                   role: formatRoleName(roleKey),
                   email: roleData.email || '',
                 });
               }
            }
          }
        });
      }
      
      setProjectAssignees(assignees);
    }
    fetchAssignees();
  }, [searchParams]);

  const handleRowClick = (ticket: Ticket) => {
    const params = searchParams.toString();
    const url = params
      ? `/tickets/${ticket.ticket}?${params}`
      : `/tickets/${ticket.ticket}`;
    navigate(url);
  };

  const enrichTicketsWithBlueStakesData = async (
    projectTickets: ProjectTicket[],
    token: string
  ) => {
    setIsEnrichingTickets(true);
    try {
      // Fetch all tickets from BlueStakes in parallel
      const enrichedTickets = await Promise.all(
        projectTickets.map(async (ticket) => {
          try {
            const bluestakesData = await bluestakesService.getTicketByNumber(
              ticket.ticket_number,
              token
            );
            return {
              ...ticket,
              bluestakes_data: bluestakesData,
            };
          } catch (err: unknown) {
            return ticket;
          }
        })
      );

      setTickets(enrichedTickets);
    } catch (err: unknown) {
      toast({
        title: "Warning",
        description: "Some ticket data may be incomplete",
        variant: "destructive",
      });
    } finally {
      setIsEnrichingTickets(false);
    }
  };

  const handleRefreshTickets = async () => {
    if (!bluestakesToken) return;
    setLoading(true);
    try {
      const projectSlug = searchParams.get("project");
      if (!projectSlug) {
        setTickets([]);
        return;
      }

      const projectId = await getProjectIdFromSlug(projectSlug);
      if (!projectId) {
        setTickets([]);
        return;
      }

      // Fetch tickets from Supabase
      const { data: projectTickets, error: dbError } = await supabase
        .from("project_tickets")
        .select("ticket_number, project_id, is_continue_update")
        .eq("project_id", projectId);

      if (dbError) throw dbError;

      // Update tickets with database data
      setTickets(projectTickets || []);

      // Enrich with BlueStakes data
      await enrichTicketsWithBlueStakesData(
        projectTickets || [],
        bluestakesToken
      );
    } catch (err) {
      setError(
        isErrorWithMessage(err) ? err.message : "Failed to refresh tickets"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    const projectSlug = searchParams.get("project");
    if (!projectSlug) return;

    const projectId = await getProjectIdFromSlug(projectSlug);
    if (!projectId) return;

    setIsDeleting(true);
    try {
      // First delete all project_tickets entries
      const { error: ticketsError } = await supabase
        .from("project_tickets")
        .delete()
        .eq("project_id", projectId);

      if (ticketsError) throw ticketsError;

      // Then delete the project itself
      const { error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (projectError) throw projectError;

      // Navigate back to dashboard on success
      navigate("/");
    } catch (err) {
      setError(
        isErrorWithMessage(err) ? err.message : "Failed to delete project"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  function formatStreetAddress(ticket: BlueStakesTicket | undefined) {
    if (!ticket) return "-";
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
  }

  const handleAddTicket = async () => {
    const ticketNumber = newTicketNumber.trim().toUpperCase();
    if (!ticketNumber) {
      toast({
        title: "Error",
        description: "Please enter a ticket number",
        variant: "destructive",
      });
      return;
    }

    const projectSlug = searchParams.get("project");
    if (!projectSlug) return;

    const projectId = await getProjectIdFromSlug(projectSlug);
    if (!projectId) return;

    setIsAddingTicket(true);
    try {
      // First verify the ticket exists in BlueStakes
      if (!bluestakesToken) {
        throw new Error("Not authenticated with BlueStakes");
      }

      // Verify ticket exists and is valid
      const ticket = await bluestakesService.getTicketByNumber(
        ticketNumber,
        bluestakesToken
      );
      if (!ticket) {
        throw new Error("Ticket not found in BlueStakes");
      }

      // Check if ticket is already assigned to this project
      const { data: existingTicket, error: checkError } = await supabase
        .from("project_tickets")
        .select("ticket_number")
        .eq("project_id", projectId)
        .eq("ticket_number", ticketNumber)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw checkError;
      }

      if (existingTicket) {
        throw new Error("Ticket is already assigned to this project");
      }

      // Add ticket to project
      const { error: insertError } = await supabase
        .from("project_tickets")
        .insert([
          {
            project_id: projectId,
            ticket_number: ticketNumber,
            is_continue_update: true,
          },
        ]);

      if (insertError) throw insertError;

      // Add the new ticket to the state with its BlueStakes data
      setTickets((prev) => [
        ...prev,
        {
          ticket_number: ticketNumber,
          project_id: projectId,
          is_continue_update: true,
          bluestakes_data: ticket,
        },
      ]);

      toast({
        title: "Success",
        description: "Ticket added successfully",
      });

      setIsAddTicketDialogOpen(false);
      setNewTicketNumber("");
    } catch (err) {
      toast({
        title: "Error",
        description: isErrorWithMessage(err)
          ? err.message
          : "Failed to add ticket",
        variant: "destructive",
      });
    } finally {
      setIsAddingTicket(false);
    }
  };

  const activeTickets = tickets
    .filter((ticket) => {
      if (!ticket.bluestakes_data) return true; // Show tickets that are still loading
      return ticket.is_continue_update === true;
    })
    .sort((a, b) => {
      // Sort by replace_by_date in descending order (newest first)
      const dateA = a.bluestakes_data?.replace_by_date;
      const dateB = b.bluestakes_data?.replace_by_date;
      
      // If both tickets have dates, compare them
      if (dateA && dateB) {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      
      // If only one has a date, prioritize the one with a date
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      
      // If neither has a date, maintain original order
      return 0;
    });

  // Add function to calculate project center and work area from tickets
  const calculateProjectLocation = (tickets: ProjectTicket[]) => {
    const activeTickets = tickets.filter(
      (ticket) =>
        ticket.bluestakes_data && ticket.is_continue_update === true
    );

    if (activeTickets.length === 0) return;

    // Calculate center point from all active tickets
    let totalLat = 0;
    let totalLng = 0;
    let validTickets = 0;

    // Collect all valid work areas
    const workAreas = activeTickets
      .filter((ticket) => {
        const lat = ticket.bluestakes_data?.latitude;
        const lng = ticket.bluestakes_data?.longitude;
        if (!lat || !lng) return false;
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (!isNaN(latNum) && !isNaN(lngNum)) {
          totalLat += latNum;
          totalLng += lngNum;
          validTickets++;
          return true;
        }
        return false;
      })
      .map((ticket) => ({
        ...ticket.bluestakes_data!.work_area,
        properties: {
          ...ticket.bluestakes_data!.work_area.properties,
          ticketNumber: ticket.ticket_number,
          status: ticket.is_continue_update ? "Continue Updates" : "Updates Stopped",
        },
      }));

    if (validTickets > 0) {
      setProjectCenter({
        lat: totalLat / validTickets,
        lng: totalLng / validTickets,
      });
    }

    // Create a FeatureCollection of all work areas
    if (workAreas.length > 0) {
      setProjectWorkArea({
        type: "FeatureCollection",
        features: workAreas,
      });
    }
  };

  // Update location when tickets change
  useEffect(() => {
    if (tickets.length > 0) {
      calculateProjectLocation(tickets);
    }
  }, [tickets]);

  // Handler for removing ticket from update list
  const handleRemoveFromUpdateList = async (ticketNumber: string) => {
    const projectSlug = searchParams.get("project");
    if (!projectSlug) return;

    const projectId = await getProjectIdFromSlug(projectSlug);
    if (!projectId) return;

    try {
      // Update the database
      const { error } = await supabase
        .from("project_tickets")
        .update({ is_continue_update: false })
        .eq("project_id", projectId)
        .eq("ticket_number", ticketNumber);

      if (error) throw error;

      // Update the local state
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.ticket_number === ticketNumber
            ? { ...ticket, is_continue_update: false }
            : ticket
        )
      );

      toast({
        title: "Success",
        description: "Ticket removed from update list",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: isErrorWithMessage(err)
          ? err.message
          : "Failed to remove ticket from update list",
        variant: "destructive",
      });
    }
  };

  // Handler for adding assignee
  async function handleAddAssignee() {
    setIsAddingAssignee(true);
    const projectSlug = searchParams.get("project");
    if (!projectSlug) return;

    const projectId = await getProjectIdFromSlug(projectSlug);
    if (!projectId) return;
    
    try {
      // Fetch current project_roles
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("project_roles")
        .eq("id", projectId)
        .single();
      
      if (fetchError || !project) {
        toast({ title: "Error", description: "Could not fetch current project roles", variant: "destructive" });
        return;
      }

      // Get current roles or initialize empty object
      const currentRoles = project.project_roles || {};
      
      // Add the new assignee to the appropriate role
      const newAssignee = { name: assigneeName, email: assigneeEmail };
      
      if (assigneeRole === "superintendent") {
        // For superintendent, store as single object
        currentRoles.superintendent = newAssignee;
      } else {
        // For other roles, store as array or add to existing array
        if (!currentRoles[assigneeRole]) {
          currentRoles[assigneeRole] = [];
        } else if (!Array.isArray(currentRoles[assigneeRole])) {
          // Convert single object to array if needed
          currentRoles[assigneeRole] = [currentRoles[assigneeRole]];
        }
        currentRoles[assigneeRole].push(newAssignee);
      }

      // Update the project with new roles
      const { error: updateError } = await supabase
        .from("projects")
        .update({ project_roles: currentRoles })
        .eq("id", projectId);

      if (updateError) {
        toast({ title: "Error", description: updateError.message, variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Assignee added successfully" });
      
      setIsAddAssigneeOpen(false);
      setAssigneeName("");
      setAssigneeEmail("");
      setAssigneeRole("superintendent");
      
      // Refresh assignees list
      const updatedAssignees: ProjectAssignee[] = [];
      Object.entries(currentRoles).forEach(([roleKey, roleData]: [string, any]) => {
        if (roleData && typeof roleData === 'object') {
          if (Array.isArray(roleData)) {
            roleData.forEach((user, idx) => {
                             if (user.name || user.email) {
                 updatedAssignees.push({
                   id: `${roleKey}-${idx}`,
                   name: user.name || user.email || '',
                   role: formatRoleName(roleKey),
                   email: user.email || '',
                 });
               }
            });
          } else {
                         if (roleData.name || roleData.email) {
               updatedAssignees.push({
                 id: roleKey,
                 name: roleData.name || roleData.email || '',
                 role: formatRoleName(roleKey),
                 email: roleData.email || '',
               });
             }
          }
        }
      });
      setProjectAssignees(updatedAssignees);
      
    } catch (err) {
      toast({ title: "Error", description: isErrorWithMessage(err) ? err.message : "Failed to add assignee", variant: "destructive" });
    } finally {
      setIsAddingAssignee(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-500">
                Authentication Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-semibold mb-2">
                  Authentication Error
                </h2>
                <p className="text-muted-foreground">{authError}</p>
              </div>
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
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle>Tickets for {projectName || "Project"}</CardTitle>
              {isEnrichingTickets && (
                <span className="text-sm text-muted-foreground">
                  (Updating ticket data...)
                </span>
              )}
            </div>
            <DropdownMenu
              trigger={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            >
              <DropdownMenuItem onMouseDown={() => setIsAddAssigneeOpen(true)}>
                Add Assignee
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the project and remove all associated tickets from your
                      project.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProject}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {/* Add project details section */}
            {projectCenter && (
              <div className="mb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Project Details
                      </h4>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          Active Tickets: {activeTickets.length}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Project Assignees
                      </h4>
                      <div className="space-y-3">
                        {projectAssignees.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No assignees found.</div>
                        ) : (
                          projectAssignees.map((assignee) => (
                            <div key={assignee.id} className="flex items-start space-x-3">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                {assignee.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{assignee.name}</div>
                                <div className="text-xs text-muted-foreground">{assignee.role}</div>
                                <div className="text-xs text-muted-foreground">{assignee.email}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <Map
                      lat={projectCenter.lat}
                      lng={projectCenter.lng}
                      zoom={13}
                      workAreaGeoJSON={projectWorkArea}
                      onPolygonClick={(ticketNumber) => {
                        const params = searchParams.toString();
                        const url = params
                          ? `/tickets/${ticketNumber}?${params}`
                          : `/tickets/${ticketNumber}`;
                        navigate(url);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Existing tickets table */}
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : activeTickets.length === 0 ? (
              <div className="text-gray-500">
                No active tickets for this project.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Update Date</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTickets.map((ticket) => (
                    <TableRow
                      key={ticket.ticket_number}
                      onClick={() =>
                        ticket.bluestakes_data &&
                        handleRowClick(ticket.bluestakes_data)
                      }
                      style={{
                        cursor: ticket.bluestakes_data ? "pointer" : "default",
                      }}
                      className={!ticket.bluestakes_data ? "opacity-50" : ""}
                    >
                      <TableCell>{ticket.ticket_number}</TableCell>
                      <TableCell>
                        {ticket.bluestakes_data ? (
                          formatDate(ticket.bluestakes_data.replace_by_date)
                        ) : (
                          <span className="text-muted-foreground">
                            Loading...
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.bluestakes_data ? (
                          formatStreetAddress(ticket.bluestakes_data)
                        ) : (
                          <span className="text-muted-foreground">
                            Loading...
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        >
                          <DropdownMenuItem
                            onMouseDown={async () => {
                              try {
                                await shareService.copyTicketLink(ticket.ticket_number, {
                                  includeProjectContext: true,
                                  expiresIn: 24,
                                });
                                toast({
                                  title: "Link Copied",
                                  description: "Shareable link copied to clipboard",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to copy share link",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Share className="mr-2 h-4 w-4" />
                            Share Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onMouseDown={() => {
                              shareService.printTicketCard(ticket.ticket_number);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onMouseDown={() => handleRemoveFromUpdateList(ticket.ticket_number)}
                          >
                            Remove from Update List
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddAssigneeOpen} onOpenChange={setIsAddAssigneeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Project Assignee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="assignee-name">Name</Label>
                <Input
                  id="assignee-name"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Enter assignee name"
                  disabled={isAddingAssignee}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee-email">Email</Label>
                <Input
                  id="assignee-email"
                  value={assigneeEmail}
                  onChange={(e) => setAssigneeEmail(e.target.value)}
                  placeholder="Enter assignee email"
                  disabled={isAddingAssignee}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee-role">Role</Label>
                <select
                  id="assignee-role"
                  className="border rounded px-2 py-1"
                  value={assigneeRole}
                  onChange={(e) => setAssigneeRole(e.target.value)}
                  disabled={isAddingAssignee}
                >
                  <option value="superintendent">Superintendent</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="foreman">Foreman</option>
                  <option value="inspector">Inspector</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddAssigneeOpen(false)}
                disabled={isAddingAssignee}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAssignee} disabled={isAddingAssignee}>
                {isAddingAssignee ? "Adding..." : "Add Assignee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
