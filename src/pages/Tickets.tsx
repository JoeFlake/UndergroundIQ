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
import { MoreVertical } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBluestakesAuth } from "@/hooks/useBluestakesAuth";
import { bluestakesService, type BlueStakesTicket } from "../lib/bluestakesService";
import { ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

// Remove the Ticket type import and use BlueStakesTicket instead
type Ticket = BlueStakesTicket;

function getStatus(ticket: Ticket) {
  if (!ticket.expires) return "Unknown";
  const now = new Date();
  const expires = new Date(ticket.expires);
  return expires > now ? "Active" : "Expired";
}

function formatAddress(ticket: Ticket) {
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
  const { user } = useAuth();
  const { bluestakesToken, isLoading: authLoading, error: authError } = useBluestakesAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  

  useEffect(() => {
    async function fetchTickets() {
      if (!bluestakesToken) {
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

        // Fetch all tickets using the service
        const allTickets = await bluestakesService.getAllTickets(bluestakesToken);

        // Fetch assigned ticket numbers for this project
        const { data: assigned, error: assignedError } = await supabase
          .from("project_tickets")
          .select("ticket_number")
          .eq("project_id", projectId);
        if (assignedError) throw assignedError;

        // Filter tickets to only those assigned to this project
        const assignedTicketNumbers = new Set(
          (assigned || []).map((row) => row.ticket_number)
        );
        const projectTickets = allTickets.filter((ticket) =>
          assignedTicketNumbers.has(ticket.ticket)
        );

        setTickets(projectTickets);
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

  const handleRefreshTickets = async () => {
    if (!bluestakesToken) return;
    setLoading(true);
    try {
      const allTickets = await bluestakesService.getAllTickets(bluestakesToken);
      const projectId = Number(searchParams.get("project"));
      if (!projectId) {
        setTickets([]);
        return;
      }

      const { data: assigned } = await supabase
        .from("project_tickets")
        .select("ticket_number")
        .eq("project_id", projectId);

      const assignedTicketNumbers = new Set(
        (assigned || []).map((row) => row.ticket_number)
      );
      const projectTickets = allTickets.filter((ticket) =>
        assignedTicketNumbers.has(ticket.ticket)
      );

      setTickets(projectTickets);
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

  const formatStreetAddress = (ticket: Ticket) => {
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
  };

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
            <CardTitle>Tickets for {projectName || "Project"}</CardTitle>
            <DropdownMenu
              trigger={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            >
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
            ) : tickets.length === 0 ? (
              <div className="text-gray-500">
                No tickets assigned to this project.
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
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.ticket}
                      onClick={() => handleRowClick(ticket)}
                      style={{ cursor: "pointer" }}
                    >
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
                      <TableCell>
                        {formatDate(ticket.replace_by_date)}
                      </TableCell>
                      <TableCell>{formatStreetAddress(ticket)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
