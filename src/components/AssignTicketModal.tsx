import { useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabaseClient";
import { bluestakesService, type BlueStakesTicket } from "../lib/bluestakesService";
import type { Project } from "../types";
import { isErrorWithMessage } from "../utils/errorHandling";
import { NewProjectModal } from "./NewProjectModal";

interface AssignTicketModalProps {
  ticket: BlueStakesTicket | null;
  projects: Project[];
  onClose: () => void;
  onTicketAssigned: (ticketNumber: string) => void;
  onProjectsUpdated: (projects: Project[]) => void;
  bluestakesToken: string;
}

export function AssignTicketModal({
  ticket,
  projects,
  onClose,
  onTicketAssigned,
  onProjectsUpdated,
  bluestakesToken,
}: AssignTicketModalProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  if (!ticket) return null;

  const handleAssign = async () => {
    if (!selectedProject) {
      setAssignError("Please select a project");
      return;
    }
    
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    
    try {
      // Fetch ticket details to get replace_by_date
      const ticketDetails = await bluestakesService.getTicketByNumber(
        ticket.ticket,
        bluestakesToken
      );

      const { error } = await supabase.from("project_tickets").insert([
        {
          project_id: selectedProject,
          ticket_number: ticket.ticket,
          replace_by_date: ticketDetails.replace_by_date,
        },
      ]);
      
      if (error) {
        setAssignError(error.message);
      } else {
        setAssignSuccess("Ticket assigned successfully!");
        onTicketAssigned(ticket.ticket);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: unknown) {
      setAssignError(
        isErrorWithMessage(err) ? err.message : "Failed to assign ticket"
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    const updatedProjects = [...projects, newProject];
    onProjectsUpdated(updatedProjects);
    setSelectedProject(newProject.project_id.toString());
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">
            Assign Ticket {ticket.ticket} to Project
          </h2>
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <select
                className="flex-1 border rounded p-2"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={assigning}
              >
                <option value="">-- Select a project --</option>
                {projects.map((project) => (
                  <option
                    key={project.project_id}
                    value={project.project_id}
                  >
                    {project.project_name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => setIsNewProjectModalOpen(true)}
                disabled={assigning}
              >
                New Project
              </Button>
            </div>
          </div>
          {assignError && (
            <div className="text-red-500 mb-2">{assignError}</div>
          )}
          {assignSuccess && (
            <div className="text-green-600 mb-2">{assignSuccess}</div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedProject}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </div>
      
      <NewProjectModal
        open={isNewProjectModalOpen}
        onOpenChange={setIsNewProjectModalOpen}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
} 