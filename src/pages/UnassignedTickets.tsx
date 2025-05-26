import { useEffect, useState } from "react";
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
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import type { Ticket, Project } from "../types";

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
  // Build a more descriptive address using the provided fields
  const parts = [
    ticket.place,
    ticket.subdivision && ticket.subdivision.trim()
      ? `Subdivision: ${ticket.subdivision}`
      : null,
    ticket.lot && ticket.lot.trim() ? `Lot: ${ticket.lot}` : null,
    (ticket.st_from_address && ticket.st_from_address !== "0") ||
    (ticket.st_to_address && ticket.st_to_address !== "0")
      ? `From ${ticket.st_from_address} to ${ticket.st_to_address}`
      : null,
    ticket.street,
    ticket.cross1 && ticket.cross1.trim() ? `Cross: ${ticket.cross1}` : null,
    ticket.cross2 && ticket.cross2.trim() ? `Cross: ${ticket.cross2}` : null,
    ticket.county ? `${ticket.county} County` : null,
    ticket.state,
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

export default function UnassignedTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  useEffect(() => {
    const fetchAllTickets = async () => {
      setLoading(true);
      setError("");
      try {
        // 1. Get Blue Stakes credentials for the current user
        const {
          data: userProfile,
          error: userError,
        }: {
          data: {
            bluestakes_username: string;
            bluestakes_password: string;
            id: string;
          } | null;
          error: unknown;
        } = await supabase
          .from("users")
          .select("bluestakes_username, bluestakes_password, id")
          .eq("id", user.id)
          .single();
        if (userError) throw userError;
        if (
          !userProfile?.bluestakes_username ||
          !userProfile?.bluestakes_password
        ) {
          throw new Error("Blue Stakes credentials not found");
        }

        // 2. Log in to Blue Stakes API to get Bearer token
        const loginResp = await fetch(
          "https://newtin-api.bluestakes.org/api/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              username: userProfile.bluestakes_username,
              password: userProfile.bluestakes_password,
            }).toString(),
          }
        );
        const loginData = await loginResp.json();
        if (!loginResp.ok || !loginData.Authorization) {
          throw new Error("Failed to log in to Blue Stakes");
        }
        const bearerToken = loginData.Authorization.replace("Bearer ", "");

        // 3. Fetch tickets/summary with Bearer token
        const summaryResp = await fetch(
          "https://newtin-api.bluestakes.org/api/tickets/summary",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              Accept: "application/json",
            },
          }
        );
        const responseData = await summaryResp.json();
        const allTickets: Ticket[] = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];

        // 4. Fetch all assigned ticket numbers from project_tickets
        const {
          data: assigned,
          error: assignedError,
        }: { data: { ticket_number: string }[] | null; error: unknown } =
          await supabase.from("project_tickets").select("ticket_number");
        if (assignedError) throw assignedError;
        const assignedTicketNumbers = new Set(
          (assigned || []).map((row) => row.ticket_number)
        );

        // 5. Filter out assigned tickets and only keep active ones
        const now = new Date();
        const unassignedActiveTickets = allTickets.filter(
          (ticket) =>
            !assignedTicketNumbers.has(ticket.ticket) &&
            ticket.expires &&
            new Date(ticket.expires) > now
        );
        setTickets(unassignedActiveTickets);

        // 6. Fetch projects for this user
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

    if (user) fetchAllTickets();
  }, [user]);

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

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-500 text-lg">{error}</p>
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
        <Card>
          <CardHeader>
            <CardTitle>
              {tickets.length} Unassigned Ticket
              {tickets.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Original Date</TableHead>
                  <TableHead>Replace By Date</TableHead>
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
