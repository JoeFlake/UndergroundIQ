import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
<<<<<<< HEAD
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
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
    ticket.subdivision && ticket.subdivision.trim()
      ? `Subdivision: ${ticket.subdivision}`
      : null,
    ticket.lot && ticket.lot.trim() ? `Lot: ${ticket.lot}` : null,
    (ticket.st_from_address && ticket.st_from_address !== "0") ||
    (ticket.st_to_address && ticket.st_to_address !== "0")
      ? `Address: ${ticket.st_from_address || ""} - ${ticket.st_to_address || ""}`
      : null,
    ticket.street,
    ticket.cross1,
    ticket.cross2,
    ticket.county,
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
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
=======
import { Input } from "../components/ui/input";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ExternalLink,
  Filter,
  MapPin,
  User,
  CheckCircle,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";

export default function Tickets() {
  const { user } = useAuth();
  const {
    tickets,
    loading,
    error,
    showActiveOnly,
    setShowActiveOnly,
  } = useTicketData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("ticket");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
>>>>>>> 5d3b807 (This was left open on my pc, minor changes)

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError("");
      try {
        const projectId = searchParams.get("project");
        if (!projectId) {
          setTickets([]);
          setLoading(false);
          return;
        }

        // 1. Get Blue Stakes credentials for the current user
        const { data: userProfile, error: userError } = await supabase
          .from("users")
          .select("bluestakes_username, bluestakes_password")
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

        // 4. Fetch assigned ticket numbers for this project
        const { data: assigned, error: assignedError } = await supabase
          .from("project_tickets")
          .select("ticket_number")
          .eq("project_id", projectId);
        if (assignedError) throw assignedError;

        // 5. Filter tickets to only those assigned to this project
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
<<<<<<< HEAD
    if (user) fetchTickets();
  }, [user, searchParams]);
=======

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ticket.address1?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [tickets, projectFilter, searchQuery]);

  const handleTicketClick = (ticket: any) => {
    navigate(`/tickets/${ticket.ticket}?place=${encodeURIComponent(ticket.place)}`);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  // Get status from expiration date
  const getStatus = (ticket: any) => {
    if (ticket.expires) {
      const isActive = new Date(ticket.expires) > new Date();
      return isActive ? "Active" : "Expired";
    }
    return ticket.status || ticket.type || ticket.revision || "No status";
  };

  // Get description from available fields
  const getDescription = (ticket: any) => {
    return (
      ticket.description || ticket.type || "No description"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
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
>>>>>>> 5d3b807 (This was left open on my pc, minor changes)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
<<<<<<< HEAD
=======
        <div className="mb-8">
          {projectFilter ? (
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">
                Tickets for: {projectFilter}
              </h1>
              <p className="text-gray-600 mt-2">
                Viewing all tickets for this project location
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
              <p className="text-gray-600 mt-2">
                Manage and view all Blue Stakes tickets
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Show Active Only Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-active-only"
              checked={showActiveOnly}
              onCheckedChange={setShowActiveOnly as (checked: CheckedState) => void}
            />
            <label htmlFor="show-active-only" className="text-sm font-medium">
              Show Active Only
            </label>
          </div>

          {/* Sort Controls */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ticket">Ticket Number</SelectItem>
              <SelectItem value="expires">Expiration Date</SelectItem>
              <SelectItem value="original_date">Original Date</SelectItem>
              <SelectItem value="replace_by_date">Replace By Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {
                  filteredTickets.filter(
                    (t) => t.expires && new Date(t.expires) > new Date()
                  ).length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {
                  filteredTickets.filter(
                    (t) => t.expires && new Date(t.expires) <= new Date()
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
>>>>>>> 5d3b807 (This was left open on my pc, minor changes)
        <Card>
          <CardHeader>
            <CardTitle>Project Tickets</CardTitle>
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
