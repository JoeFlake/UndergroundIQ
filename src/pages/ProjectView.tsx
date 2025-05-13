import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseService, bluestakesService } from "@/lib/supabaseService";
import { Ticket, Project, UserProject } from "@/types";
import { ArrowLeft, Calendar, ExternalLink, MapPin, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ProjectView = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [currentTicket, setCurrentTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId || !user || !user.token) return;
      try {
        setLoading(true);
        const ticket = await bluestakesService.getTicketByNumber(
          ticketId,
          user.token
        );
        setCurrentTicket(ticket);
      } catch (error) {
        console.error("Error fetching ticket data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTicketData();
  }, [ticketId, user]);

  const handleBack = () => {
    navigate("/");
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
  // Fallbacks for description
  const description =
    currentTicket.comments ||
    currentTicket.description ||
    currentTicket.type ||
    "No description";
  // Dates
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options = { year: "numeric", month: "short", day: "numeric" };
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
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="mb-8 animate-fade-in">
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
                <div className="text-gray-600 text-sm mt-1">
                  Priority: {currentTicket.priority || "-"}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  Category: {currentTicket.category || "-"}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: General Info & Dates */}
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-medium mb-2">General Info</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Account:</span>{" "}
                      {currentTicket.account || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Name:</span>{" "}
                      {currentTicket.name || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Address:</span>{" "}
                      {currentTicket.address1 || "-"}{" "}
                      {currentTicket.address2 || ""},{" "}
                      {currentTicket.city || "-"}, {currentTicket.state || "-"}{" "}
                      {currentTicket.zip || ""}
                    </div>
                    <div>
                      <span className="font-semibold">Subdivision:</span>{" "}
                      {currentTicket.subdivision || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Lot:</span>{" "}
                      {currentTicket.lot || "-"}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-medium mb-2">Dates</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Completed:</span>{" "}
                      {formatDate(currentTicket.completed)}
                    </div>
                    <div>
                      <span className="font-semibold">Started:</span>{" "}
                      {formatDate(currentTicket.started)}
                    </div>
                    <div>
                      <span className="font-semibold">Original Date:</span>{" "}
                      {formatDate(currentTicket.original_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Replace By Date:</span>{" "}
                      {formatDate(currentTicket.replace_by_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Expiration:</span>{" "}
                      {formatDate(currentTicket.expires)}
                    </div>
                    <div>
                      <span className="font-semibold">Legal Date:</span>{" "}
                      {formatDate(currentTicket.legal_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Work Date:</span>{" "}
                      {formatDate(currentTicket.work_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Response Due:</span>{" "}
                      {formatDate(currentTicket.response_due)}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-medium mb-2">Contacts</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Caller:</span>{" "}
                      {currentTicket.caller || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Caller Phone:</span>{" "}
                      {currentTicket.caller_phone || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Contact:</span>{" "}
                      {currentTicket.contact || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Contact Phone:</span>{" "}
                      {currentTicket.contact_phone || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span>{" "}
                      {currentTicket.email || "-"}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-medium mb-2">
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
                    <div>
                      <span className="font-semibold">Header:</span>{" "}
                      {currentTicket.header || "-"}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-medium mb-2">Remarks/Notes</h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Location:</span>{" "}
                      {currentTicket.location || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Remarks:</span>{" "}
                      {currentTicket.remarks || "-"}
                    </div>
                  </div>
                </section>
              </div>
              {/* Right: Map & Location */}
              <div>
                <h3 className="text-lg font-medium mb-2">Map & Location</h3>
                {hasCoords ? (
                  <iframe
                    src={googleMapsUrl}
                    title="Google Map"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                  ></iframe>
                ) : currentTicket.map_url ? (
                  <iframe
                    src={currentTicket.map_url}
                    title="Ticket Map"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                  ></iframe>
                ) : (
                  <div className="text-gray-500">
                    No map available for this ticket.
                  </div>
                )}
                <div className="mt-4">
                  <div>
                    <span className="font-semibold">Centroid:</span>{" "}
                    {lat !== null && lng !== null ? `${lat}, ${lng}` : "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Extent:</span>{" "}
                    {currentTicket.extent_top &&
                    currentTicket.extent_left &&
                    currentTicket.extent_bottom &&
                    currentTicket.extent_right
                      ? `${currentTicket.extent_top}, ${currentTicket.extent_left}, ${currentTicket.extent_bottom}, ${currentTicket.extent_right}`
                      : "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Subdivision:</span>{" "}
                    {currentTicket.subdivision || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Street:</span>{" "}
                    {currentTicket.street || "-"}{" "}
                    {currentTicket.st_from_address || ""} -{" "}
                    {currentTicket.st_to_address || ""}
                  </div>
                  <div>
                    <span className="font-semibold">City/Place:</span>{" "}
                    {currentTicket.city || "-"} / {currentTicket.place || "-"}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectView;
