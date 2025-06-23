import type { BlueStakesTicket } from "../lib/bluestakesService";
import { Button } from "./ui/button";

interface ConfirmRemoveDialogProps {
  ticket: BlueStakesTicket | null;
  onConfirm: (ticket: BlueStakesTicket) => void;
  onCancel: () => void;
}

export function ConfirmRemoveDialog({ ticket, onConfirm, onCancel }: ConfirmRemoveDialogProps) {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 99999 }}>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Remove from Update List?</h2>
          <p className="mt-2 text-sm text-gray-500">
            This action cannot be undone. Ticket {ticket.ticket} will be permanently removed from the update tracking list and will no longer appear here.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(ticket)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Remove from List
          </Button>
        </div>
      </div>
    </div>
  );
} 