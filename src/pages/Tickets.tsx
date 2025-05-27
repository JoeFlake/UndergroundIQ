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
import { useAuth } from "../contexts/AuthContext";
import { useBluestakesAuth } from "@/hooks/useBluestakesAuth";
import { bluestakesService } from "@/lib/bluestakesService";
import type { Ticket } from "../types";

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
    return new Date(dateString).toLocaleString();
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
        <Card>
          <CardHeader>
            <CardTitle>Tickets for {projectName || "Project"}</CardTitle>
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
                    <TableHead>Original Date</TableHead>
                    <TableHead>Replace By Date</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Description</TableHead>
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
                      <TableCell>{formatDate(ticket.original_date)}</TableCell>
                      <TableCell>
                        {formatDate(ticket.replace_by_date)}
                      </TableCell>
                      <TableCell>{formatDate(ticket.expires)}</TableCell>
                      <TableCell>{formatAddress(ticket)}</TableCell>
                      <TableCell>{ticket.description}</TableCell>
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
