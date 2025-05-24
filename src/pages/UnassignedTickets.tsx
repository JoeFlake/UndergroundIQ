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

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function getStatus(ticket: any) {
  if (!ticket.expires) return "Unknown";
  const now = new Date();
  const expires = new Date(ticket.expires);
  return expires > now ? "Active" : "Expired";
}

function formatAddress(ticket: any) {
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

export default function UnassignedTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [assigningTicket, setAssigningTicket] = useState<any | null>(null);
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
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("bluestakes_username, bluestakes_password, id")
          .single();
        if (userError) throw userError;
        if (!user?.bluestakes_username || !user?.bluestakes_password) {
          throw new Error("Blue Stakes credentials not found");
        }

        // 2. Call the proxy to get tickets from /tickets/summary
        const response = await fetch(
          "http://localhost:3001/api/bluestakes/summary",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user.bluestakes_username,
              password: user.bluestakes_password,
            }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch tickets from Blue Stakes proxy");
        }
        const responseData = await response.json();
        const allTickets = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];

        // 3. Fetch all assigned ticket numbers from project_tickets
        const { data: assigned, error: assignedError } = await supabase
          .from("project_tickets")
          .select("ticket_number");
        if (assignedError) throw assignedError;
        const assignedTicketNumbers = new Set(
          (assigned || []).map((row: any) => row.ticket_number)
        );

        // 4. Filter out assigned tickets and only keep active ones
        const unassignedActiveTickets = allTickets.filter(
          (ticket: any) =>
            !assignedTicketNumbers.has(ticket.ticket) &&
            ticket.expires &&
            new Date(ticket.expires) > new Date()
        );
        setTickets(unassignedActiveTickets);

        // 5. Fetch projects for this user
        const { data: userProjects, error: userProjectsError } = await supabase
          .from("user_projects")
          .select("project_id, projects(id, name)")
          .eq("user_id", user.id);
        if (userProjectsError) throw userProjectsError;
        setProjects(userProjects.map((up: any) => up.projects));
      } catch (err: any) {
        setError(err.message || "Failed to fetch tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchAllTickets();
  }, []);

  const openAssignModal = (ticket: any) => {
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
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign ticket");
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
                    <option key={project.id} value={project.id}>
                      {project.name}
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
