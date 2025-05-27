import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTicketData } from "../hooks/useTicketData";
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

// Define a Ticket type that matches the Blue Stakes API response
interface Ticket {
  ticket: string;
  revision: string;
  completed: string;
  type: string;
  priority: string;
  category: string;
  lookup: string;
  channel: string;
  taken_source: string;
  taken_version: string;
  started: string;
  original_ticket: string;
  original_date: string;
  replaced_by_ticket: string;
  replace_by_date: string;
  expires: string;
  reference: string;
  account: string;
  original_account: string;
  caller_type: string;
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  place: string;
  // ... (add more fields as needed)
}

// Utility function to capitalize each word in a string
function capitalizeWords(str: string) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

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

  // Local sorting state
  const [sortBy, setSortBy] = useState("ticket");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get project filter from URL params
  const projectFilter = searchParams.get("project");

  // Filter tickets by project if specified
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Apply project filter if specified
    if (projectFilter) {
      filtered = filtered.filter((ticket) => {
        const ticketAddress = [
          ticket.address1?.trim(),
          ticket.address2?.trim(),
          ticket.city?.trim(),
          ticket.state?.trim(),
          ticket.zip?.trim(),
        ]
          .filter((part) => part && part !== "")
          .join(", ")
          .toLowerCase();
        return ticketAddress === (projectFilter?.toLowerCase() || "");
      });
    }

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

  const handleTicketClick = (ticket: Ticket) => {
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
  const getStatus = (ticket: Ticket) => {
    if (ticket.expires) {
      const isActive = new Date(ticket.expires) > new Date();
      return isActive ? "Active" : "Expired";
    }
    return ticket.type || ticket.revision || "No status";
  };

  // Get description from available fields
  const getDescription = (ticket: Ticket) => {
    return ticket.description || ticket.type || "No description";
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
          {projectFilter ? (
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/projects")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">
                Tickets for: {capitalizeWords(projectFilter || "")}
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
              onCheckedChange={(checked) => setShowActiveOnly(checked === true)}
            />
            <label htmlFor="show-active-only" className="text-sm font-medium">
              Show Active Only
            </label>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-by-select" className="text-sm font-medium">
              Order by:
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by-select" className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ticket">Ticket Number</SelectItem>
                <SelectItem value="expires">Expiration Date</SelectItem>
                <SelectItem value="original_date">Original Date</SelectItem>
                <SelectItem value="replace_by_date">Update Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>Click on a ticket to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("ticket")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Ticket #</span>
                      {getSortIcon("ticket")}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("expires")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Expiration</span>
                      {getSortIcon("expires")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("original_date")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Original Date</span>
                      {getSortIcon("original_date")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("replace_by_date")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Update Date</span>
                      {getSortIcon("replace_by_date")}
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow
                      key={`${ticket.ticket}-${ticket.revision || ""}`}
                      className="hover:bg-gray-50"
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <TableCell className="font-medium">
                        #{ticket.ticket || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatus(ticket) === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {getStatus(ticket)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(ticket.expires)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(ticket.original_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(ticket.replace_by_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {getDescription(ticket)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
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