import { useState, useEffect } from "react";
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
import { MoreVertical } from "lucide-react";
import { TicketRowPopover } from "./TicketRowPopover";
import { formatDate } from "../utils/ticketFormatters";
import type { BlueStakesTicket } from "../lib/bluestakesService";

interface TicketsToUpdateProps {
  tickets: BlueStakesTicket[];
  loading: boolean;
  ticketProjects: Record<string, string>;
  openPopoverTicket: string | null;
  onOpenPopoverTicket: (ticketNumber: string | null) => void;
  popoverTicketData: Record<string, any>;
  onPopoverTicketDataUpdate: (ticketNumber: string, data: any) => void;
  onUpdateTicket: (ticket: BlueStakesTicket) => void;
  onRemoveFromUpdateList: (ticket: BlueStakesTicket) => void;
  bluestakesToken: string;
}

export function TicketsToUpdate({
  tickets,
  loading,
  ticketProjects,
  openPopoverTicket,
  onOpenPopoverTicket,
  popoverTicketData,
  onPopoverTicketDataUpdate,
  onUpdateTicket,
  onRemoveFromUpdateList,
  bluestakesToken,
}: TicketsToUpdateProps) {
  const [openDropdownTicket, setOpenDropdownTicket] = useState<string | null>(null);

  // Helper function to check if a ticket is overdue
  const isTicketOverdue = (ticket: BlueStakesTicket): boolean => {
    if (!ticket.replace_by_date) return false;
    const today = new Date();
    const replaceByDate = new Date(ticket.replace_by_date);
    // Set time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    replaceByDate.setHours(0, 0, 0, 0);
    return replaceByDate < today;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setOpenDropdownTicket(null);
    }
    
    if (openDropdownTicket) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownTicket]);

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
          <TableHead>Project</TableHead>
          <TableHead>Update Date</TableHead>
          <TableHead className="w-40 text-center">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-center text-gray-500 py-8"
            >
              No tickets need updates
            </TableCell>
          </TableRow>
        ) : (
          tickets.map((ticket, index) => {
            const isOverdue = isTicketOverdue(ticket);
            const textColorClass = isOverdue ? "text-red-600" : "";
            
            return (
              <TicketRowPopover
                key={`update-${ticket.ticket}-${index}`}
                ticketNumber={ticket.ticket}
                bluestakesToken={bluestakesToken}
                openPopoverTicket={openPopoverTicket}
                onOpenChange={onOpenPopoverTicket}
                popoverTicketData={popoverTicketData}
                onTicketDataLoaded={onPopoverTicketDataUpdate}
              >
                <TableRow className="cursor-pointer">
                  <TableCell className={textColorClass}>{ticket.ticket}</TableCell>
                  <TableCell className={textColorClass}>
                    {ticketProjects[ticket.ticket] || (
                      <span className="text-gray-400">Loading...</span>
                    )}
                  </TableCell>
                  <TableCell className={textColorClass}>
                    {formatDate(ticket.replace_by_date).split(",")[0]}
                  </TableCell>
                <TableCell className="w-40 flex justify-center items-center gap-1">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTicket(ticket);
                    }}
                  >
                    Update
                  </Button>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownTicket(
                          openDropdownTicket === ticket.ticket
                            ? null
                            : ticket.ticket
                        );
                      }}
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openDropdownTicket === ticket.ticket && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-white p-1 shadow-md z-50">
                        <button
                          className="w-full rounded-sm px-2 py-1.5 text-sm text-left text-red-600 hover:text-red-700 hover:bg-red-50"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setOpenDropdownTicket(null);
                            onRemoveFromUpdateList(ticket);
                          }}
                        >
                          Remove from Update List
                        </button>
                      </div>
                    )}
                  </div>
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