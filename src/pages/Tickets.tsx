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
import { MoreVertical, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBluestakesAuth } from "@/hooks/useBluestakesAuth";
import { bluestakesService, type BlueStakesTicket } from "../lib/bluestakesService";
import { ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";

// Remove the Ticket type import and use BlueStakesTicket instead
type Ticket = BlueStakesTicket;

interface ProjectTicket {
  ticket_number: string;
  project_id: number;
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
  const parts = [
    ticket.place,
    ticket.city,
    ticket.state,
    ticket.zip,
  ];
  return parts.filter(Boolean).join(", ");
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
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

export default function Tickets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { bluestakesToken, isLoading: authLoading, error: authError } = useBluestakesAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ProjectTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [newTicketNumber, setNewTicketNumber] = useState("");
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [isEnrichingTickets, setIsEnrichingTickets] = useState(false);
  

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
        const projectId = Number(searchParams.get("project"));
        if (!projectId) {
          setTickets([]);
          setLoading(false);
          return;
        }

        // Fetch tickets from Supabase for this project
        const { data: projectTickets, error: dbError } = await supabase
          .from("project_tickets")
          .select("ticket_number, project_id")
          .eq("project_id", projectId);

        if (dbError) throw dbError;

        // Initialize tickets with just the database data
        setTickets(projectTickets || []);

        // If we have a BlueStakes token, enrich the tickets with API data
        if (bluestakesToken) {
          await enrichTicketsWithBlueStakesData(projectTickets || [], bluestakesToken);
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
    const projectId = Number(searchParams.get("project"));
    if (projectId) {
      supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single()
        .then(({ data }) => setProjectName(data?.name || null));
    }
  }, [searchParams]);

  const handleRowClick = (ticket: Ticket) => {
    const params = searchParams.toString();
    const url = params
      ? `/tickets/${ticket.ticket}?${params}`
      : `/tickets/${ticket.ticket}`;
    navigate(url);
  };

  const enrichTicketsWithBlueStakesData = async (projectTickets: ProjectTicket[], token: string) => {
    setIsEnrichingTickets(true);
    try {
      // Fetch all tickets from BlueStakes in parallel
      const enrichedTickets = await Promise.all(
        projectTickets.map(async (ticket) => {
          try {
            const bluestakesData = await bluestakesService.getTicketByNumber(ticket.ticket_number, token);
            return {
              ...ticket,
              bluestakes_data: bluestakesData,
            };
          } catch (err) {
            console.error(`Failed to fetch BlueStakes data for ticket ${ticket.ticket_number}:`, err);
            return ticket;
          }
        })
      );

      setTickets(enrichedTickets);
    } catch (err) {
      console.error("Error enriching tickets:", err);
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
      const projectId = Number(searchParams.get("project"));
      if (!projectId) {
        setTickets([]);
        return;
      }

      // Fetch tickets from Supabase
      const { data: projectTickets, error: dbError } = await supabase
        .from("project_tickets")
        .select("ticket_number, project_id")
        .eq("project_id", projectId);

      if (dbError) throw dbError;

      // Update tickets with database data
      setTickets(projectTickets || []);

      // Enrich with BlueStakes data
      await enrichTicketsWithBlueStakesData(projectTickets || [], bluestakesToken);
    } catch (err) {
      setError(
        isErrorWithMessage(err) ? err.message : "Failed to refresh tickets"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    const projectId = Number(searchParams.get("project"));
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
    
    if (fromAddress && toAddress && fromAddress !== '0' && toAddress !== '0') {
      if (fromAddress === toAddress) {
        parts.push(`${fromAddress} ${ticket.street?.trim()}`);
      } else {
        parts.push(`${ticket.street?.trim()} from ${fromAddress} to ${toAddress}`);
      }
    } else if (ticket.cross1?.trim() && ticket.cross2?.trim()) {
      // If no from/to addresses, show cross streets
      parts.push(`${ticket.street?.trim()} from ${ticket.cross1.trim()} to ${ticket.cross2.trim()}`);
    } else if (ticket.street?.trim()) {
      // Fallback to just street name if no other location data
      parts.push(ticket.street.trim());
    }
    
    if (ticket.place?.trim()) parts.push(ticket.place.trim());
    return parts.join(', ');
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

    const projectId = Number(searchParams.get("project"));
    if (!projectId) return;

    setIsAddingTicket(true);
    try {
      // First verify the ticket exists in BlueStakes
      if (!bluestakesToken) {
        throw new Error("Not authenticated with BlueStakes");
      }

      // Verify ticket exists and is valid
      const ticket = await bluestakesService.getTicketByNumber(ticketNumber, bluestakesToken);
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

      if (checkError && checkError.code !== "PGRST116") { // PGRST116 is "no rows returned"
        throw checkError;
      }

      if (existingTicket) {
        throw new Error("Ticket is already assigned to this project");
      }

      // Add ticket to project
      const { error: insertError } = await supabase.from("project_tickets").insert([
        {
          project_id: projectId,
          ticket_number: ticketNumber,
        },
      ]);

      if (insertError) throw insertError;

      // Add the new ticket to the state with its BlueStakes data
      setTickets(prev => [...prev, {
        ticket_number: ticketNumber,
        project_id: projectId,
        bluestakes_data: ticket
      }]);

      toast({
        title: "Success",
        description: "Ticket added successfully",
      });

      setIsAddTicketDialogOpen(false);
      setNewTicketNumber("");
    } catch (err) {
      toast({
        title: "Error",
        description: isErrorWithMessage(err) ? err.message : "Failed to add ticket",
        variant: "destructive",
      });
    } finally {
      setIsAddingTicket(false);
    }
  };

  const activeTickets = tickets.filter(ticket => {
    if (!ticket.bluestakes_data) return true; // Show tickets that are still loading
    return getStatus(ticket.bluestakes_data) === "Active";
  });

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
                <h2 className="text-2xl font-semibold mb-2">Authentication Error</h2>
                <p className="text-muted-foreground">
                  {authError}
                </p>
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
                <span className="text-sm text-muted-foreground">(Updating ticket data...)</span>
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
              <DropdownMenuItem onClick={() => setIsAddTicketDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Ticket
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRefreshTickets}>
                Refresh Tickets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/unassigned-tickets")}>
                View Unassigned Tickets
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
                      This action cannot be undone. This will permanently delete the project
                      and remove all associated tickets from your project.
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
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : activeTickets.length === 0 ? (
              <div className="text-gray-500">
                No active tickets assigned to this project.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Update Date</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTickets.map((ticket) => (
                    <TableRow
                      key={ticket.ticket_number}
                      onClick={() => ticket.bluestakes_data && handleRowClick(ticket.bluestakes_data)}
                      style={{ cursor: ticket.bluestakes_data ? "pointer" : "default" }}
                      className={!ticket.bluestakes_data ? "opacity-50" : ""}
                    >
                      <TableCell>{ticket.ticket_number}</TableCell>
                      <TableCell>
                        {ticket.bluestakes_data ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getStatus(ticket.bluestakes_data) === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {getStatus(ticket.bluestakes_data)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.bluestakes_data ? (
                          formatDate(ticket.bluestakes_data.replace_by_date)
                        ) : (
                          <span className="text-muted-foreground">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.bluestakes_data ? (
                          formatStreetAddress(ticket.bluestakes_data)
                        ) : (
                          <span className="text-muted-foreground">Loading...</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddTicketDialogOpen} onOpenChange={setIsAddTicketDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ticket to Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ticket-number">Ticket Number</Label>
                <Input
                  id="ticket-number"
                  value={newTicketNumber}
                  onChange={(e) => setNewTicketNumber(e.target.value)}
                  placeholder="Enter BlueStakes ticket number"
                  disabled={isAddingTicket}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddTicketDialogOpen(false)}
                disabled={isAddingTicket}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTicket}
                disabled={isAddingTicket}
              >
                {isAddingTicket ? "Adding..." : "Add Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
