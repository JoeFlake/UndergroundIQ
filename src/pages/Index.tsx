import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTicketData } from "../hooks/useTicketData";
import { Button } from "../components/ui/button";
import { Navbar } from "../components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  Search
} from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    projects,
    tickets,
    selectedProject,
    sortDirection,
    showActiveOnly,
    searchQuery,
    filterByProject,
    toggleSortDirection,
    setShowActiveOnly,
    setSearchQuery
  } = useTicketData();

  // Function to handle ticket click
  const handleTicketClick = (ticketId: number) => {
    navigate(`/project/${ticketId}`);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to get project name
  const getProjectName = (projectId: number) => {
    const project = projects.find((p) => p.project_id === projectId);
    return project ? project.project_name : "Unknown Project";
  };

  // Function to get project status
  const getProjectStatus = (projectId: number) => {
    const projectTickets = tickets.filter((t) => t.project_id === projectId);
    if (projectTickets.length === 0) return "No Tickets";

    const hasExpiredTickets = projectTickets.some((t) => new Date(t.expiration_date) < new Date());
    return hasExpiredTickets ? "Expired" : "Active";
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
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 text-gray-500" />
                  <Select
                    value={selectedProject || "all"}
                    onValueChange={(value) => filterByProject(value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.project_id} value={project.project_id.toString()}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant={showActiveOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                  className="flex items-center"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Active
                </Button>
              </div>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow
                        key={ticket.ticket_id}
                        className="hover:bg-gray-50"
                        onClick={() => handleTicketClick(ticket.ticket_id)}
                      >
                        <TableCell className="cursor-default font-medium">
                          {ticket.ticket_number}
                        </TableCell>
                        <TableCell className="cursor-default">
                          {getProjectName(ticket.project_id)}
                        </TableCell>
                        <TableCell className="cursor-default">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getProjectStatus(ticket.project_id) === "Active"
                                ? "bg-green-100 text-green-800"
                                : getProjectStatus(ticket.project_id) === "Expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {getProjectStatus(ticket.project_id)}
                          </span>
                        </TableCell>
                        <TableCell className="cursor-default whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                            {formatDate(ticket.expiration_date)}
                          </div>
                        </TableCell>
                        <TableCell className="cursor-default hidden md:table-cell max-w-[200px] truncate">
                          {ticket.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex items-center p-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(ticket.map_url, "_blank");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
