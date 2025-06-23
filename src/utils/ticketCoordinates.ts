// Helper to parse coordinates robustly (matches TicketView logic)
export function getTicketLatLng(ticket: any): {
  lat: number | null;
  lng: number | null;
} {
  function parseCoord(val: any): number | null {
    if (typeof val === "number") return val;
    if (!val) return null;
    const trimmed = String(val).trim();
    if (trimmed === "" || trimmed === " ") return null;
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  }
  
  let lat = parseCoord(ticket.centroid_y);
  let lng = parseCoord(ticket.centroid_x);
  
  if (
    (lat === null || lng === null) &&
    ticket.extent_top &&
    ticket.extent_left &&
    ticket.extent_bottom &&
    ticket.extent_right
  ) {
    const top = parseCoord(ticket.extent_top);
    const left = parseCoord(ticket.extent_left);
    const bottom = parseCoord(ticket.extent_bottom);
    const right = parseCoord(ticket.extent_right);
    if ([top, left, bottom, right].every((v) => v !== null)) {
      lat = (top + bottom) / 2;
      lng = (left + right) / 2;
    }
  }
  
  if (lat === null || lng === null) {
    lat = parseCoord(ticket.latitude);
    lng = parseCoord(ticket.longitude);
  }
  
  return { lat, lng };
} 