import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTicketData } from "@/hooks/useTicketData";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ExternalLink,
  Filter,
  LogOut,
  MapPin,
  User
} from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    projects,
    tickets,
    selectedProject,
    sortDirection,
    filterByProject,
    toggleSortDirection
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

  // Function to get project status (using expiration date as a simple status indicator)
  const getProjectStatus = (projectId: number) => {
    const projectTickets = tickets.filter((t) => t.project_id === projectId);
    if (projectTickets.length === 0) return "No Tickets";

    const hasExpiredTickets = projectTickets.some((t) => new Date(t.expiration_date) < new Date());
    return hasExpiredTickets ? "Expired" : "Active";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <Card className="w-full max-w-6xl animate-fade-in">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Your Dashboard</CardTitle>
              <CardDescription>Welcome back, here are your current tickets</CardDescription>
            </div>
            <div className="flex items-center">
              <div className="flex items-center mr-4 bg-gray-100 p-2 rounded-lg">
                <User className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
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
                      <TableHead className="hidden md:table-cell">Map</TableHead>
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
                      tickets.map((ticket) => (
                        <TableRow
                          key={ticket.ticket_id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleTicketClick(ticket.ticket_id)}
                        >
                          <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                          <TableCell>{getProjectName(ticket.project_id)}</TableCell>
                          <TableCell>
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
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                              {formatDate(ticket.expiration_date)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                            {ticket.description}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <a
                              href={ticket.map_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 inline-flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              View Map
                            </a>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="inline-flex items-center px-2 py-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="ml-1 md:hidden">View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
