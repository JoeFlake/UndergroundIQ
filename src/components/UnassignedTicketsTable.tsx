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

// Combined ticket type for unassigned tickets
type UnassignedTicket = BlueStakesTicket | {
  ticket_number: string;
  replace_by_date?: string;
  bluestakes_data?: BlueStakesTicket;
};

// Type guard to check if ticket is a BlueStakesTicket
function isBlueStakesTicket(ticket: UnassignedTicket): ticket is BlueStakesTicket {
  return 'ticket' in ticket && typeof ticket.ticket === 'string';
}

// Helper to get ticket number from either type
function getTicketNumber(ticket: UnassignedTicket): string {
  return isBlueStakesTicket(ticket) ? ticket.ticket : ticket.ticket_number;
}

// Helper to get BlueStakes data from either type
function getBlueStakesData(ticket: UnassignedTicket): BlueStakesTicket | undefined {
  return isBlueStakesTicket(ticket) ? ticket : ticket.bluestakes_data;
}

interface UnassignedTicketsTableProps {
  tickets: UnassignedTicket[];
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
          tickets.map((ticket, index) => {
            const ticketNumber = getTicketNumber(ticket);
            const blueStakesData = getBlueStakesData(ticket);
            const hasBlueStakesData = !!blueStakesData;
            
            return (
              <TicketRowPopover
                key={`unassigned-${ticketNumber}-${index}`}
                ticketNumber={ticketNumber}
                bluestakesToken={bluestakesToken}
                openPopoverTicket={openPopoverTicket}
                onOpenChange={onOpenPopoverTicket}
                popoverTicketData={popoverTicketData}
                onTicketDataLoaded={onPopoverTicketDataUpdate}
              >
                <TableRow className="cursor-pointer">
                  <TableCell className="font-mono text-sm">{ticketNumber}</TableCell>
                  <TableCell>{hasBlueStakesData ? blueStakesData.contact : '-'}</TableCell>
                  <TableCell>{hasBlueStakesData ? blueStakesData.done_for : '-'}</TableCell>
                  <TableCell>
                    {hasBlueStakesData ? formatStreetAddress(blueStakesData) : '-'}
                  </TableCell>
                  <TableCell className="w-40 flex justify-center">
                    <Button
                      size="sm"
                      disabled={!hasBlueStakesData}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (blueStakesData) {
                          onAssignTicket(blueStakesData);
                        }
                      }}
                      title={!hasBlueStakesData ? "BlueStakes data required to assign ticket" : ""}
                    >
                      {hasBlueStakesData ? 'Assign to Project' : 'No Data'}
                    </Button>
                  </TableCell>
                </TableRow>
              </TicketRowPopover>
            );
          })
        )}
      </TableBody>
    </Table>
  );
} 