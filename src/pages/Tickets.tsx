import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { bluestakesService } from "../lib/bluestakesService";
import { Button } from "../components/ui/button";
import { Navbar } from "../components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
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

export default function Tickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState("expires");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Get project filter from URL params
  const projectId = searchParams.get("project");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError("");

        if (!user || !projectId) {
          setTickets([]);
          return;
        }

        const ticketsData =
          await bluestakesService.getTicketsForProject(projectId);
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      } catch (err) {
        setTickets([]); // fallback to empty array on error
        setError(
          err instanceof Error ? err.message : "Failed to fetch tickets"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, projectId]);

  // Always use a safe array for filtering
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const filteredTickets = safeTickets
    .filter((ticket) => {
      // Only filter by active if showActiveOnly is true
      const activeMatch =
        !showActiveOnly || new Date(ticket.expires) > new Date();

      // Search filter
      const searchMatch =
        !searchQuery ||
        ticket.ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description &&
          ticket.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        ticket.address1?.toLowerCase().includes(searchQuery.toLowerCase());

      return activeMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === "expires") {
        const dateA = new Date(a.expires).getTime();
        const dateB = new Date(b.expires).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

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
    return ticket.status || "No status";
  };

  // Format address
  const formatAddress = (ticket: any) => {
    const parts = [
      ticket.address1,
      ticket.address2,
      ticket.city,
      ticket.state,
      ticket.zip,
    ].filter(Boolean);
    return parts.join(", ");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Project Tickets</h1>
          <p className="text-gray-600 mt-2">
            View and manage tickets for this project
          </p>
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
              onCheckedChange={setShowActiveOnly}
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
              <SelectItem value="expires">Expiration Date</SelectItem>
              <SelectItem value="created_at">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              {filteredTickets.length} tickets found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500 py-8"
                    >
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.ticket}>
                      <TableCell>{ticket.ticket}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{formatAddress(ticket)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ticket.description}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatus(ticket) === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {getStatus(ticket)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(ticket.expires)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
