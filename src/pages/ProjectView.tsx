import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseService } from "@/lib/supabaseService";
import { Ticket, Project } from "@/types";
import { ArrowLeft, Calendar, ExternalLink, MapPin } from "lucide-react";

const ProjectView = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<Ticket[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId) return;

      try {
        setLoading(true);
        const ticketIdNum = parseInt(ticketId, 10);

        // Get the current ticket
        const ticket = await supabaseService.getTicketById(ticketIdNum);

        if (ticket) {
          setCurrentTicket(ticket);

          // Get the project name
          const project = await supabaseService.getProjectById(ticket.project_id);
          setProjectName(project?.project_name || "Unknown Project");

          // Get related tickets (all tickets from the same project, excluding the current one)
          const projectTickets = await supabaseService.getTicketsByProjectId(ticket.project_id);
          setRelatedTickets(projectTickets.filter((t) => t.ticket_id !== ticketIdNum));
        }
      } catch (error) {
        console.error("Error fetching ticket data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    const fetchMapImage = async (url: string) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const mapImage = doc.querySelector("img.mapsize#O") as HTMLImageElement;
        if (mapImage) {
          setMapImageUrl(mapImage.src);
        }
      } catch (error) {
        console.error("Error fetching map image:", error);
      }
    };

    if (currentTicket?.map_url) {
      fetchMapImage(currentTicket.map_url);
    }
  }, [currentTicket?.map_url]);

  const handleBack = () => {
    navigate("/");
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-blue-200"></div>
          <div className="mt-4 h-4 w-24 bg-blue-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Ticket Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl font-semibold mb-2">Ticket Not Found</h2>
              <p className="text-muted-foreground">
                The ticket you're looking for doesn't exist or has been removed.
              </p>
            </div>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">Project</p>
                <CardTitle className="text-2xl">{projectName}</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Ticket Number</p>
                <p className="text-xl font-semibold">{currentTicket.ticket_number}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-2">Ticket Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium">{currentTicket.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expiration Date</p>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                      <p className="font-medium">{formatDate(currentTicket.expiration_date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Legal Date</p>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                      <p className="font-medium">{formatDate(currentTicket.legal_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Location</h3>
                  <a
                    href={currentTicket.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-500 hover:text-blue-700"
                  >
                    <span className="font-medium">View</span>
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </div>
                <div className="relative h-60 bg-gray-100 rounded-lg overflow-hidden">
                  {mapImageUrl ? (
                    <img
                      src={mapImageUrl}
                      alt="Map Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500 text-center absolute top-1/2 left-0 right-0 mt-6">
                        Loading map preview...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {relatedTickets.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Other Tickets for this Project</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {relatedTickets.map((ticket) => (
                    <Card
                      key={ticket.ticket_id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/project/${ticket.ticket_id}`)}
                    >
                      <CardContent className="pt-6">
                        <p className="font-semibold">{ticket.ticket_number}</p>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {ticket.description}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(ticket.expiration_date)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectView;
