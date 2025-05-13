import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    tickets,
    sortDirection,
    searchQuery,
    toggleSortDirection,
    setSearchQuery,
    showActiveOnly,
    setShowActiveOnly,
  } = useTicketData();

  // Function to handle ticket click
  const handleTicketClick = (ticket) => {
    navigate(`/project/${ticket.ticket}`); // Use Blue Stakes ticket number
  };

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
        <Card className="w-full max-w-6xl animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 max-w-md mx-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSortDirection}
                className="flex items-center"
              >
                <span className="mr-2">Sort by date</span>
                {sortDirection === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center mb-4">
              <Checkbox
                id="show-active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <label
                htmlFor="show-active-only"
                className="ml-2 select-none cursor-pointer"
              >
                Show Active Only
              </label>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Original Date</TableHead>
                    <TableHead>Replace By Date</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => {
                      // Compute status
                      const isActive = ticket.expires && new Date(ticket.expires) > new Date();
                      const status = isActive
                        ? "Active"
                        : (ticket.expires ? "Expired" : (ticket.status || ticket.type || ticket.revision || "No status"));
                      // Fallbacks for description
                      const description = ticket.comments || ticket.description || ticket.type || "No description";
                      // Dates
                      const formatDate = (dateString) => {
                        if (!dateString) return "-";
                        const options = { year: "numeric", month: "short", day: "numeric" };
                        return new Date(dateString).toLocaleDateString(undefined, options);
                      };
                      return (
                        <TableRow
                          key={`${ticket.ticket}-${ticket.revision || ''}`}
                          className="hover:bg-gray-50"
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <TableCell className="cursor-default font-medium">{ticket.ticket}</TableCell>
                          <TableCell className="cursor-default">{status}</TableCell>
                          <TableCell className="cursor-default whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                              {formatDate(ticket.expires)}
                            </div>
                          </TableCell>
                          <TableCell className="cursor-default whitespace-nowrap">
                            {formatDate(ticket.original_date)}
                          </TableCell>
                          <TableCell className="cursor-default whitespace-nowrap">
                            {formatDate(ticket.replace_by_date)}
                          </TableCell>
                          <TableCell className="cursor-default hidden md:table-cell max-w-[200px] truncate">
                            {description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleTicketClick(ticket)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
