import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!ticket) return null;

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(true);
    // Clear selected project if search term doesn't match
    const exactMatch = projects.find(p => p.project_name === value);
    if (exactMatch) {
      setSelectedProject(exactMatch.project_id.toString());
    } else {
      setSelectedProject("");
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSearchTerm(project.project_name);
    setSelectedProject(project.project_id.toString());
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

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
    setSearchTerm(newProject.project_name);
    setSelectedProject(newProject.project_id.toString());
    setShowDropdown(false);
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
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search or select a project..."
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleInputFocus}
                  disabled={assigning}
                  className="w-full"
                />
                {showDropdown && filteredProjects.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
                  >
                    {filteredProjects.map((project) => (
                      <div
                        key={project.project_id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleProjectSelect(project)}
                      >
                        {project.project_name}
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && filteredProjects.length === 0 && searchTerm && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10"
                  >
                    <div className="px-3 py-2 text-gray-500">
                      No projects found
                    </div>
                  </div>
                )}
              </div>
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