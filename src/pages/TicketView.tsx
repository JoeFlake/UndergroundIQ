import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  bluestakesService,
  type TicketSecondaryFunction,
} from "@/lib/bluestakesService";
import { ArrowLeft, MoreVertical, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBluestakesAuth } from "@/hooks/useBluestakesAuth";
import { supabase } from "@/lib/supabaseClient";
import { Map } from "../components/Map";
import { useToast } from "@/components/ui/use-toast";
import { generateSlug } from "../utils/slug";


interface SecondaryFunctions {
  ticket: string;
  revision: string;
  cancel: boolean;
  comment: boolean;
  remark: boolean;
  retransmit: boolean;
  secondNotice: boolean;
  update: boolean;
}

const TicketView = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === 'true';

  // Helper function to resolve project slug to ID
  const getProjectIdFromSlug = async (slug: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name");

      if (error || !data) return null;

      // Find project by matching slug generated from name
      const project = data.find(p => generateSlug(p.name) === slug);
      return project ? Number(project.id) : null;
    } catch {
      return null;
    }
  };
  const [currentTicket, setCurrentTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responsesLoading, setResponsesLoading] = useState(true);
  const { user } = useAuth();
  const {
    bluestakesToken,
    isLoading: authLoading,
    error: authError,
  } = useBluestakesAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [secondaryFunctions, setSecondaryFunctions] =
    useState<TicketSecondaryFunction | null>(null);
  const [loadingSecondaryFunctions, setLoadingSecondaryFunctions] =
    useState(true);
  const { toast } = useToast();

  // Handle print mode
  useEffect(() => {
    if (isPrintMode) {
      // Add print styles
      const printStyles = document.createElement('style');
      printStyles.id = 'ticket-print-styles';
      printStyles.innerHTML = `
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-hide {
            display: none !important;
          }
          
          .ticket-card {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          
          .map-container {
            height: 400px !important;
            page-break-inside: avoid;
          }
          
          .ticket-section {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          
          h1, h2, h3 {
            page-break-after: avoid;
          }
        }
      `;
      document.head.appendChild(printStyles);

      // Wait for content to load, then print
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => {
        clearTimeout(timer);
        const existingStyles = document.getElementById('ticket-print-styles');
        if (existingStyles) {
          existingStyles.remove();
        }
      };
    }
  }, [isPrintMode, currentTicket]);

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId || !bluestakesToken) return;
      try {
        setLoading(true);
        const ticket = await bluestakesService.getTicketByNumber(
          ticketId,
          bluestakesToken
        );
        setCurrentTicket(ticket);
      } catch (error) {
        // REMOVE DEBUG LOGGING FOR SECURITY
      } finally {
        setLoading(false);
      }
    };
    fetchTicketData();
  }, [ticketId, bluestakesToken]);

  useEffect(() => {
    async function fetchProjectName() {
      const projectSlug = searchParams.get("project");
      if (!projectSlug) return;

      const projectId = await getProjectIdFromSlug(projectSlug);
      if (projectId) {
        const { data } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();
        setProjectName(data?.name || null);
      }
    }
    fetchProjectName();
  }, [searchParams]);

  useEffect(() => {
    const fetchResponses = async () => {
      if (!ticketId || !bluestakesToken) {
        return;
      }
      try {
        setResponsesLoading(true);
        const responsesData = await bluestakesService.getResponsesByTicket(
          ticketId,
          bluestakesToken
        );
        setResponses(responsesData);
      } catch (error) {
        // REMOVE DEBUG LOGGING FOR SECURITY
      } finally {
        setResponsesLoading(false);
      }
    };
    fetchResponses();
  }, [ticketId, bluestakesToken]);

  useEffect(() => {
    const fetchSecondaryFunctions = async () => {
      if (!ticketId || !bluestakesToken) return;
      try {
        setLoadingSecondaryFunctions(true);
        const response = await bluestakesService.getTicketSecondaryFunction(
          ticketId,
          bluestakesToken
        );
        setSecondaryFunctions(response);
      } catch (error) {
        // REMOVE DEBUG LOGGING FOR SECURITY
      } finally {
        setLoadingSecondaryFunctions(false);
      }
    };
    fetchSecondaryFunctions();
  }, [ticketId, bluestakesToken]);

  const handleBack = () => {
    const projectSlug = searchParams.get("project");
    if (projectSlug) {
      navigate(`/tickets?project=${encodeURIComponent(projectSlug)}`);
    } else {
      navigate("/");
    }
  };

  const handleSecondaryFunction = async (action: string) => {
    if (!ticketId || !bluestakesToken) return;
    
    if (action === "export") {
      toast({
        title: "Coming Soon",
        description: "PDF export will be available via backend generation.",
      });
      return;
    }
    
    try {
      // REMOVE DEBUG LOGGING FOR SECURITY
    } catch (error) {
      // REMOVE DEBUG LOGGING FOR SECURITY
      toast({
        title: "Error",
        description: `Failed to perform ${action}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-blue-200"></div>
          <div className="mt-4 h-4 w-24 bg-blue-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl font-semibold mb-2">
                Authentication Error
              </h2>
              <p className="text-muted-foreground">{authError}</p>
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
            <CardTitle className="text-center text-red-500">
              Ticket Not Found
            </CardTitle>
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

  // Compute status
  const isActive =
    currentTicket.expires && new Date(currentTicket.expires) > new Date();
  const status = isActive
    ? "Active"
    : currentTicket.expires
      ? "Expired"
      : currentTicket.status ||
        currentTicket.type ||
        currentTicket.revision ||
        "No status";
  // Dates
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long" as const,
      year: "numeric" as const,
      month: "short" as const,
      day: "numeric" as const,
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  // Google Maps URL from centroid or extent
  const parseCoord = (val) => {
    if (typeof val === "number") return val;
    if (!val) return null;
    const trimmed = String(val).trim();
    if (trimmed === "" || trimmed === " ") return null;
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  };
  let lat = parseCoord(currentTicket.centroid_y);
  let lng = parseCoord(currentTicket.centroid_x);
  // Fallback to extent average if centroid is not valid
  if (
    (lat === null || lng === null) &&
    currentTicket.extent_top &&
    currentTicket.extent_left &&
    currentTicket.extent_bottom &&
    currentTicket.extent_right
  ) {
    const top = parseCoord(currentTicket.extent_top);
    const left = parseCoord(currentTicket.extent_left);
    const bottom = parseCoord(currentTicket.extent_bottom);
    const right = parseCoord(currentTicket.extent_right);
    if ([top, left, bottom, right].every((v) => v !== null)) {
      lat = (top + bottom) / 2;
      lng = (left + right) / 2;
    }
  }
  const hasCoords = lat !== null && lng !== null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className={`flex justify-between items-center mb-4 ${isPrintMode ? 'print-hide' : ''}`}>
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {projectName ? `${projectName}` : "Dashboard"}
          </Button>
                      {!loadingSecondaryFunctions && secondaryFunctions && (
             <DropdownMenu
               trigger={
                 <Button variant="ghost" className="h-8 w-8 p-0">
                   <span className="sr-only">Open menu</span>
                   <MoreVertical className="h-4 w-4" />
                 </Button>
               }
             >
               {secondaryFunctions.cancel && (
                 <DropdownMenuItem onMouseDown={() => handleSecondaryFunction("cancel")}>
                   Cancel
                 </DropdownMenuItem>
               )}
               {secondaryFunctions.remark && (
                 <DropdownMenuItem onMouseDown={() => handleSecondaryFunction("remark")}>
                   Remark
                 </DropdownMenuItem>
               )}
               {secondaryFunctions.secondNotice && (
                 <DropdownMenuItem onMouseDown={() => handleSecondaryFunction("second notice")}>
                   Second Notice
                 </DropdownMenuItem>
               )}
               {secondaryFunctions.update && (
                 <DropdownMenuItem onMouseDown={() => handleSecondaryFunction("update")}>
                   Update
                 </DropdownMenuItem>
               )}
               <DropdownMenuItem onMouseDown={() => handleSecondaryFunction("export")}>
                 <FileDown className="mr-2 h-4 w-4" />
                 Export as PDF
               </DropdownMenuItem>
             </DropdownMenu>
            )}
        </div>

        <Card className={`mb-8 animate-fade-in ticket-card ${isPrintMode ? 'ticket-section' : ''}`}>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Ticket Number</p>
                <CardTitle className="text-2xl">
                  {currentTicket.ticket}
                </CardTitle>
                <div className="text-gray-600 text-sm mt-1">
                  Revision: {currentTicket.revision || "-"}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="text-xl font-semibold">{status}</p>
                <div className="text-gray-600 text-sm mt-1">
                  Type: {currentTicket.type || "-"}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: General Info & Dates */}
              <div className="space-y-8">
                <section>
                  <h3 className="text-3xl font-medium mb-2 text-gray-600">
                    General Info
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Previous Ticket:</span>{" "}
                      {currentTicket.original_ticket
                        ? currentTicket.original_ticket === currentTicket.ticket
                          ? "Original Ticket"
                          : currentTicket.original_ticket
                        : "-"}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xl font-medium mb-2">Dates</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Legal Date:</span>{" "}
                      {formatDate(currentTicket.legal_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Update Date:</span>{" "}
                      {formatDate(currentTicket.replace_by_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Expiration Date:</span>{" "}
                      {formatDate(currentTicket.expires)}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xl font-medium mb-2">
                    Work/Project Details
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Work Type:</span>{" "}
                      {currentTicket.work_type || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Done For:</span>{" "}
                      {currentTicket.done_for || "-"}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xl font-medium mb-2">Remarks/Notes</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Location:</span>{" "}
                      {currentTicket.location || "-"}
                    </div>
                  </div>
                </section>
              </div>
              {/* Right: Map & Location */}
              <div>
                <h3 className="text-3xl font-medium mb-2 text-gray-600">
                  Map & Location
                </h3>
                <div className="map-container">
                  {hasCoords &&
                  currentTicket.work_area &&
                  currentTicket.work_area.type === "Feature" &&
                  currentTicket.work_area.geometry ? (
                    <Map
                      lat={lat}
                      lng={lng}
                      workAreaGeoJSON={currentTicket.work_area}
                      showTooltips={false}
                    />
                  ) : currentTicket.map_url ? (
                    <iframe
                      src={currentTicket.map_url}
                      title="Ticket Map"
                      width="100%"
                      height="350"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                    ></iframe>
                  ) : (
                    <div className="text-gray-500">
                      No map available for this ticket.
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div>
                    <span className="font-semibold">Street:</span>{" "}
                    {currentTicket.street || "-"}{" "}
                  </div>
                  <div>
                    <span className="font-semibold">City:</span>{" "}
                    {currentTicket.place || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">County:</span>{" "}
                    {currentTicket.county || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">State:</span>{" "}
                    {currentTicket.state || "-"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-3xl font-medium mb-4 text-gray-600">
                Ticket Responses
              </h3>
              {(() => {
                return responsesLoading ? (
                  <div className="animate-pulse flex flex-col items-center p-4">
                    <div className="h-4 w-24 bg-blue-200 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-blue-200 rounded"></div>
                  </div>
                ) : responses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utility Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                            Response
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {responses.map((response, index) => {
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {response.response || ""}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {response.mbname || ""}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-[300px] break-words">
                                {response.description || "PENDING" || ""}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-[300px] break-words">
                                {response.mbdescription || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No responses available for this ticket.
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketView;
