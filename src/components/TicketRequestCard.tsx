import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { 
  Calendar,
  MapPin,
  User,
  Mail,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import { format } from "date-fns";

interface TicketRequest {
  id: string;
  company_id: number;
  requested_by: string;
  request_type: string;
  request_data: {
    project_name: string;
    work_begins_date: string;
    address: string;
    superintendent: {
      name: string;
      email: string;
    };
    project_manager: {
      name: string;
      email: string;
      is_current_user?: boolean;
    };
    work_type: string;
    work_done_for: string;
    work_methods: string[];
  };
  status: 'pending' | 'in_progress' | 'completed';
  requested_at: string;
  requested_by_user?: {
    email: string;
    name?: string;
  };
}

interface TicketRequestCardProps {
  userRole: string;
}

export function TicketRequestCard({ userRole }: TicketRequestCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TicketRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Fetch ticket requests for the company
  useEffect(() => {
    fetchTicketRequests();
  }, [user]);

  const fetchTicketRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's company_id first
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (userError || !userProfile?.company_id) {
        throw new Error("Could not determine company");
      }

      // Fetch pending ticket requests for the company
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select(`
          *,
          requested_by_user:users!requests_requested_by_fkey(email, name)
        `)
        .eq("company_id", userProfile.company_id)
        .eq("request_type", "ticket_request")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error fetching ticket requests:", error);
      toast({
        title: "Error",
        description: "Failed to load ticket requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    setProcessingRequest(requestId);

    try {
      // Update request status to completed
      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "completed",
          completed_by: user.id,
          completed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));

      toast({
        title: "Success",
        description: "Ticket request marked as completed",
      });
    } catch (error) {
      console.error("Error completing request:", error);
      toast({
        title: "Error",
        description: "Failed to complete request",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

// Removed reject functionality

  if (userRole !== "admin" || requests.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ticket Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Ticket Requests ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">
                    {request.request_data.project_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Requested by {request.requested_by_user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {format(new Date(request.requested_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Work Begins:</span>
                    {format(new Date(request.request_data.work_begins_date), "MMM d, yyyy")}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Address:</span>
                    {request.request_data.address}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Superintendent:</span>
                    {request.request_data.superintendent.name}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Sup. Email:</span>
                    {request.request_data.superintendent.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Project Manager:</span>
                    {request.request_data.project_manager.name}
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Work Type:</span>
                    <Badge variant="secondary" className="ml-2">
                      {request.request_data.work_type}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Work Done For:</span>
                    <span className="ml-2">{request.request_data.work_done_for}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Methods:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.request_data.work_methods.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Button
                  onClick={() => handleCompleteRequest(request.id)}
                  disabled={processingRequest === request.id}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  {processingRequest === request.id ? "Processing..." : "Complete"}
                </Button>
                
                {/* Removed reject button */}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 