import type { BlueStakesTicket } from "../lib/bluestakesService";

export function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function formatAddress(ticket: BlueStakesTicket) {
  const parts = [
    ticket.address1,
    ticket.city,
    ticket.cstate,
    ticket.zip,
    ticket.county ? `${ticket.county} County` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatStreetAddress(ticket: BlueStakesTicket) {
  const parts = [];

  // Handle street address with from/to if available
  const fromAddress = ticket.st_from_address?.trim();
  const toAddress = ticket.st_to_address?.trim();

  if (fromAddress && toAddress && fromAddress !== "0" && toAddress !== "0") {
    if (fromAddress === toAddress) {
      parts.push(`${fromAddress} ${ticket.street?.trim()}`);
    } else {
      parts.push(
        `${ticket.street?.trim()} from ${fromAddress} to ${toAddress}`
      );
    }
  } else if (ticket.cross1?.trim() && ticket.cross2?.trim()) {
    // If no from/to addresses, show cross streets
    parts.push(
      `${ticket.street?.trim()} from ${ticket.cross1.trim()} to ${ticket.cross2.trim()}`
    );
  } else if (ticket.street?.trim()) {
    // Fallback to just street name if no other location data
    parts.push(ticket.street.trim());
  }

  if (ticket.place?.trim()) parts.push(ticket.place.trim());
  return parts.join(", ");
} 