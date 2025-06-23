import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import { Map } from "./Map";
import { Loader2 } from "lucide-react";
import { bluestakesService } from "../lib/bluestakesService";
import { getTicketLatLng } from "../utils/ticketCoordinates";

interface TicketRowPopoverProps {
  ticketNumber: string;
  bluestakesToken: string;
  openPopoverTicket: string | null;
  onOpenChange: (ticketNumber: string | null) => void;
  popoverTicketData: Record<string, any>;
  onTicketDataLoaded: (ticketNumber: string, data: any) => void;
  children: React.ReactNode;
}

export function TicketRowPopover({
  ticketNumber,
  bluestakesToken,
  openPopoverTicket,
  onOpenChange,
  popoverTicketData,
  onTicketDataLoaded,
  children,
}: TicketRowPopoverProps) {
  const [popoverLoading, setPopoverLoading] = useState(false);

  const handleRowPopover = async (ticketNum: string) => {
    onOpenChange(ticketNum);
    setPopoverLoading(true);
    try {
      const ticket = await bluestakesService.getTicketByNumber(
        ticketNum,
        bluestakesToken
      );
      onTicketDataLoaded(ticketNum, ticket);
    } catch {
      onTicketDataLoaded(ticketNum, null);
    } finally {
      setPopoverLoading(false);
    }
  };

  const popTicket = popoverTicketData[ticketNumber];
  const { lat, lng } = popTicket ? getTicketLatLng(popTicket) : { lat: null, lng: null };
  const hasMap = popTicket && lat !== null && lng !== null && popTicket.work_area && popTicket.work_area.type && popTicket.work_area.geometry;

  return (
    <Popover
      open={openPopoverTicket === ticketNumber}
      onOpenChange={(open) => {
        if (!open) onOpenChange(null);
      }}
    >
      <PopoverTrigger asChild onClick={() => handleRowPopover(ticketNumber)}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={4}
        className="w-[350px] p-0"
      >
        {popoverLoading && openPopoverTicket === ticketNumber ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="animate-spin mr-2" /> Loading map...
          </div>
        ) : hasMap ? (
          <Map
            key={ticketNumber}
            lat={lat!}
            lng={lng!}
            workAreaGeoJSON={popTicket.work_area}
            height="300px"
            width="100%"
            showTooltips={false}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No map data available
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 