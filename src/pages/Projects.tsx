import { useState, useEffect, useMemo } from "react";
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
import { Skeleton } from "../components/ui/skeleton";
import { Input } from "../components/ui/input";
import { MapPin, ExternalLink, Search, Folder } from "lucide-react";

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
  // ... (add more fields as needed)
}

interface Project {
  id: string;
  name: string;
  address: string;
  ticketCount: number;
  activeTickets: number;
  expiredTickets: number;
  latestTicket?: Ticket;
  tickets: Ticket[];
}

// Utility function to capitalize each word in a string
function capitalizeWords(str: string) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Projects() {
  const { user } = useAuth();
  const { tickets, loading, error } = useTicketData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Group tickets by address to create projects
  const projects = useMemo(() => {
    if (!tickets.length) return [];
    const projectMap = new Map<string, Project>();
    tickets.forEach((ticket) => {
      const address = [
        ticket.address1?.trim(),
        ticket.address2?.trim(),
        ticket.city?.trim(),
        ticket.state?.trim(),
        ticket.zip?.trim(),
      ]
        .filter((part) => part && part !== "")
        .join(", ")
        .toLowerCase();
      const projectId = address || `unknown-${ticket.ticket}`;
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          name: address || "Unknown Address",
          address: address,
          ticketCount: 0,
          activeTickets: 0,
          expiredTickets: 0,
          tickets: [],
        });
      }
      const project = projectMap.get(projectId)!;
      project.tickets.push(ticket);
      project.ticketCount++;
      const isActive = ticket.expires && new Date(ticket.expires) > new Date();
      if (isActive) {
        project.activeTickets++;
      } else {
        project.expiredTickets++;
      }
      if (
        !project.latestTicket ||
        (ticket.expires && ticket.expires > project.latestTicket.expires)
      ) {
        project.latestTicket = ticket;
      }
    });
    return Array.from(projectMap.values()).sort(
      (a, b) => b.ticketCount - a.ticketCount
    );
  }, [tickets]);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tickets.some((ticket) =>
          ticket.ticket?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
  }, [projects, searchQuery]);

  const handleProjectClick = (project: Project) => {
    // Navigate to tickets page with project address filter
    navigate(`/tickets?project=${encodeURIComponent(project.address)}`);
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Folder className="h-8 w-8" />
            Projects
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your Blue Stakes projects grouped by location
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects by address or ticket number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredProjects.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredProjects.reduce((sum, p) => sum + p.ticketCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Active Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredProjects.reduce((sum, p) => sum + p.activeTickets, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects List</CardTitle>
            <CardDescription>
              Click on a project to view all its tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Address</TableHead>
                  <TableHead>Total Tickets</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Latest Ticket</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500 py-8"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProjectClick(project)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {capitalizeWords(project.name) ||
                                "Unknown Address"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {project.ticketCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {project.activeTickets}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {project.expiredTickets}
                        </span>
                      </TableCell>
                      <TableCell>
                        {project.latestTicket ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              #{project.latestTicket.ticket}
                            </div>
                            <div className="text-gray-500">
                              {project.latestTicket.expires
                                ? new Date(
                                    project.latestTicket.expires
                                  ).toLocaleDateString()
                                : "-"}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
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
