
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockDataService } from '@/lib/mockData';
import { Project, Ticket } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Calendar, ExternalLink, FileText, MapPin, Ticket } from 'lucide-react';

const ProjectView = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [previousTickets, setPreviousTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        if (!ticketId) {
          setError('Ticket ID is missing');
          setLoading(false);
          return;
        }
        
        // Get the ticket
        const foundTicket = mockDataService.getTicketById(ticketId);
        
        if (!foundTicket) {
          setError('Ticket not found');
          setLoading(false);
          return;
        }
        
        setTicket(foundTicket);
        
        // Get the project
        const foundProject = mockDataService.getProjectById(foundTicket.projectId);
        
        if (foundProject) {
          setProject(foundProject);
          
          // Get all tickets for this project excluding the current one
          const projectTickets = mockDataService.getTicketsByProjectId(foundProject.id)
            .filter(t => t.id !== ticketId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setPreviousTickets(projectTickets);
        }
      } catch (err) {
        setError('Failed to load project details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [ticketId]);

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center p-4">
        <Card className="w-full max-w-3xl animate-pulse">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !ticket || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                {error || 'Could not load project details'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-4">
      <Card className="w-full max-w-3xl animate-fade-in">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <CardDescription>
                Project ID: {project.id}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Ticket Details */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center mb-4">
              <Ticket className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium">Current Ticket: {ticket.number}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Expiration Date</p>
                  <p className="font-medium">{formatDate(ticket.expirationDate)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{ticket.description}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Map Location</p>
                  <a 
                    href={ticket.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 font-medium inline-flex items-center"
                  >
                    View on Map
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Previous Tickets Table */}
          <div>
            <h3 className="text-lg font-medium mb-3">Previous Tickets</h3>
            
            {previousTickets.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No previous tickets found</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previousTickets.map((prevTicket) => (
                      <TableRow 
                        key={prevTicket.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/project/${prevTicket.id}`)}
                      >
                        <TableCell className="font-medium">{prevTicket.number}</TableCell>
                        <TableCell>{formatDate(prevTicket.expirationDate)}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                          {prevTicket.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="inline-flex items-center px-2 py-1"
                          >
                            <span className="mr-1">View</span>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectView;
