import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { TicketRowPopover } from "./TicketRowPopover";
import { formatStreetAddress } from "../utils/ticketFormatters";
import type { BlueStakesTicket } from "../lib/bluestakesService";

interface UnassignedTicketsTableProps {
  tickets: BlueStakesTicket[];
  loading: boolean;
  openPopoverTicket: string | null;
  onOpenPopoverTicket: (ticketNumber: string | null) => void;
  popoverTicketData: Record<string, any>;
  onPopoverTicketDataUpdate: (ticketNumber: string, data: any) => void;
  onAssignTicket: (ticket: BlueStakesTicket) => void;
  bluestakesToken: string;
}

export function UnassignedTicketsTable({
  tickets,
  loading,
  openPopoverTicket,
  onOpenPopoverTicket,
  popoverTicketData,
  onPopoverTicketDataUpdate,
  onAssignTicket,
  bluestakesToken,
}: UnassignedTicketsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket Number</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Done For</TableHead>
          <TableHead>Address</TableHead>
          <TableHead className="w-40 text-center">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-gray-500 py-8"
            >
              All Tickets have been assigned
            </TableCell>
          </TableRow>
        ) : (
          tickets.map((ticket, index) => (
            <TicketRowPopover
              key={`unassigned-${ticket.ticket}-${index}`}
              ticketNumber={ticket.ticket}
              bluestakesToken={bluestakesToken}
              openPopoverTicket={openPopoverTicket}
              onOpenChange={onOpenPopoverTicket}
              popoverTicketData={popoverTicketData}
              onTicketDataLoaded={onPopoverTicketDataUpdate}
            >
              <TableRow className="cursor-pointer">
                <TableCell>{ticket.ticket}</TableCell>
                <TableCell>{ticket.contact}</TableCell>
                <TableCell>{ticket.done_for}</TableCell>
                <TableCell>
                  {formatStreetAddress(ticket)}
                </TableCell>
                <TableCell className="w-40 flex justify-center">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignTicket(ticket);
                    }}
                  >
                    Assign to Project
                  </Button>
                </TableCell>
              </TableRow>
            </TicketRowPopover>
          ))
        )}
      </TableBody>
    </Table>
  );
} 