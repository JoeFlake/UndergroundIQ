import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/button";
import { Navbar } from "../components/Navbar";
import { TicketRequestModal } from "../components/TicketRequestModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { Input } from "../components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "../components/ui/dropdown-menu";
import { MapPin, ExternalLink, Folder, Plus, MoreVertical, Edit, Archive, Filter, FileText } from "lucide-react";
import { generateSlug } from "../utils/slug";

interface Project {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  ticket_count: number;
  created_at?: string;
  project_roles?: {
    project_manager?: {
      name?: string;
      email?: string;
      user_id?: string;
    };
    superintendent?: {
      name?: string;
      email?: string;
      user_id?: string;
    };
    // Can easily add more roles like foreman, safety_manager, etc.
  };
  // Keep these for backward compatibility during transition
  superintendent?: string;
  superintendent_email?: string;
  project_manager?: string;
}

interface ProjectData {
  project_id: string;
  projects: {
    id: string;
    name: string;
    created_by: string;
  };
  tickets: { count: number }[];
}

interface CompanyProject {
  projects: ProjectData;
}

type ProjectFilter = "my-projects" | "active-projects" | "all-projects";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showTicketRequestModal, setShowTicketRequestModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  // Filter state
  const [currentFilter, setCurrentFilter] = useState<ProjectFilter>("my-projects");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectManager, setEditProjectManager] = useState("");
  const [editSuperintendent, setEditSuperintendent] = useState("");
  const [editSuperintendentEmail, setEditSuperintendentEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirm");
  const [confirmButtonVariant, setConfirmButtonVariant] = useState<"default" | "destructive">("default");
  const [confirmProjectName, setConfirmProjectName] = useState("");

  async function fetchUserCompany() {
    if (!user) return;

    // First, let's see what user data we have
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userData?.role) setUserRole(userData.role);

    // Then try to get company data
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", userData?.company_id)
      .single();

    if (!companyError && companyData) {
      setCompanyName(companyData.name);
    }
  }

  async function fetchProjects() {
    setLoading(true);
    // Get user's company_id
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();
    
    if (userError || !userProfile?.company_id) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const companyId = userProfile.company_id;
    // Fetch projects for the company
    const { data: companyProjects, error: companyProjectsError } = await supabase
      .from("company_projects")
      .select("project_id, projects(id, name, created_by, project_roles)")
      .eq("company_id", companyId);
    if (companyProjectsError || !companyProjects) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // Fetch ticket counts and assignee data for each project
    const projectsWithCounts = await Promise.all(
      companyProjects.map(async (row: any) => {
        const project = row.projects;
        const { count, error: countError } = await supabase
          .from("project_tickets")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id)
          .eq("is_continue_update", true);

        // Extract roles from project_roles structure
        let projectManager = null;
        let superintendent = null;
        let superintendentEmail = null;

        if (project.project_roles) {
          projectManager = project.project_roles.project_manager?.name || null;
          superintendent = project.project_roles.superintendent?.name || null;
          superintendentEmail = project.project_roles.superintendent?.email || null;
        }

        return {
          id: project.id,
          name: project.name,
          slug: generateSlug(project.name),
          created_by: project.created_by,
          ticket_count: countError ? 0 : count || 0,
          project_roles: project.project_roles,
          // Legacy fields for backward compatibility
          superintendent: superintendent,
          superintendent_email: superintendentEmail,
          project_manager: projectManager,
        };
      })
    );
    setProjects(projectsWithCounts);
    setLoading(false);
  }

  // Function to check if user's email is in project roles
  const isUserInProjectRoles = (project: Project): boolean => {
    if (!user?.email || !project.project_roles) return false;
    
    const userEmail = user.email.toLowerCase();
    const roles = project.project_roles;
    
    // Check all role types for the user's email
    for (const roleKey in roles) {
      const role = roles[roleKey as keyof typeof roles];
      if (role && typeof role === 'object' && 'email' in role) {
        if (role.email?.toLowerCase() === userEmail) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Filter projects based on current filter
  const getFilteredProjects = (): Project[] => {
    switch (currentFilter) {
      case "my-projects":
        return projects.filter(project => isUserInProjectRoles(project));
      case "active-projects":
        return projects.filter(project => project.ticket_count > 0);
      case "all-projects":
        return projects;
      default:
        return projects.filter(project => isUserInProjectRoles(project));
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchUserCompany();
    }
  }, [user]);

  // Set default filter based on user role
  useEffect(() => {
    if (userRole) {
      if (userRole === "admin") {
        setCurrentFilter("active-projects");
      } else {
        setCurrentFilter("my-projects");
      }
    }
  }, [userRole]);

  const filteredProjects = getFilteredProjects();

  const handleProjectClick = (project: Project) => {
    navigate(`/tickets?project=${project.slug}`);
  };

  const handleCreateProject = async () => {
    setCreating(true);
    setCreateError("");
    if (!newProjectName.trim()) {
      setCreateError("Project name is required");
      setCreating(false);
      return;
    }
    // Get user's company_id
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (userError || !userProfile?.company_id) {
      setCreateError("Could not determine company");
      setCreating(false);
      return;
    }
    const companyId = userProfile.company_id;
    // Insert the new project
    const { data, error } = await supabase
      .from("projects")
      .insert([{ name: newProjectName.trim(), created_by: user.id }])
      .select();
    if (error) {
      setCreateError(error.message);
      setCreating(false);
      return;
    }
    if (data && data.length > 0) {
      const newProject = data[0];
      // Link the project to the company
      const { error: cpError } = await supabase
        .from("company_projects")
        .insert([{ company_id: companyId, project_id: newProject.id }]);
      if (cpError) {
        setCreateError("Project created, but failed to link to company.");
        setCreating(false);
        return;
      }
    }
    setShowCreateModal(false);
    setNewProjectName("");
    setCreating(false);
    fetchProjects();
  };

  const handleEditProject = (project: Project, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    // Use setTimeout to ensure the modal opens after dropdown closes
    setTimeout(() => {
      setEditingProject(project);
      setEditProjectName(project.name);
      
      // Extract data from project_roles structure
      if (project.project_roles) {
        setEditProjectManager(project.project_roles.project_manager?.name || "");
        setEditSuperintendent(project.project_roles.superintendent?.name || "");
        setEditSuperintendentEmail(project.project_roles.superintendent?.email || "");
      } else {
        // No project roles data yet - start with empty fields
        setEditProjectManager("");
        setEditSuperintendent("");
        setEditSuperintendentEmail("");
      }
      
      setEditError("");
      setShowEditModal(true);
    }, 100);
  };

  const handleArchiveProject = (project: Project, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    // Show custom confirmation dialog
    setConfirmTitle("Archive Project");
    setConfirmProjectName(project.name);
    setConfirmMessage(`Are you sure you want to archive "${project.name}"? All tickets for this project will no longer be updated and the project will be removed from active projects.`);
    setConfirmButtonText("Archive");
    setConfirmButtonVariant("destructive");
    setConfirmAction(() => () => performArchiveProject(project));
    setShowConfirmDialog(true);
  };

  const performArchiveProject = async (project: Project) => {
    try {
      // Update all tickets for this project to set is_continue_update = false
      const { error } = await supabase
        .from("project_tickets")
        .update({ is_continue_update: false })
        .eq("project_id", project.id);

      if (error) {
        console.error("Error archiving project:", error);
        showErrorDialog("Failed to archive project. Please try again.");
        return;
      }

      // Refresh the project list to remove the archived project
      fetchProjects();
      
      // Show success message
      showSuccessDialog(`Project "${project.name}" has been archived successfully.`);
      
    } catch (error) {
      console.error("Error archiving project:", error);
      showErrorDialog("Failed to archive project. Please try again.");
    }
  };

  const showErrorDialog = (message: string) => {
    setConfirmTitle("Error");
    setConfirmMessage(message);
    setConfirmButtonText("OK");
    setConfirmButtonVariant("default");
    setConfirmAction(() => () => {});
    setShowConfirmDialog(true);
  };

  const showSuccessDialog = (message: string) => {
    setConfirmTitle("Success");
    setConfirmMessage(message);
    setConfirmButtonText("OK");
    setConfirmButtonVariant("default");
    setConfirmAction(() => () => {});
    setShowConfirmDialog(true);
  };

  const handleSaveProject = async () => {
    if (!editingProject) return;
    
    setEditing(true);
    setEditError("");

    try {
      // Update project name
      const { error: projectError } = await supabase
        .from("projects")
        .update({ name: editProjectName.trim() })
        .eq("id", editingProject.id);

      if (projectError) {
        setEditError(projectError.message);
        setEditing(false);
        return;
      }

      // Update project roles using new JSONB structure
      const projectRoles: any = {};

      // Add project manager if provided
      if (editProjectManager.trim()) {
        projectRoles.project_manager = {
          name: editProjectManager.trim()
          // email: editProjectManagerEmail.trim() // Can be added later
          // user_id: "123" // Can link to users table if needed
        };
      }

      // Add superintendent if provided
      if (editSuperintendent.trim() || editSuperintendentEmail.trim()) {
        projectRoles.superintendent = {};
        if (editSuperintendent.trim()) {
          projectRoles.superintendent.name = editSuperintendent.trim();
        }
        if (editSuperintendentEmail.trim()) {
          projectRoles.superintendent.email = editSuperintendentEmail.trim();
        }
        // projectRoles.superintendent.user_id = "456"; // Can be added later
      }

      // Easy to add more roles in the future:
      // projectRoles.foreman = { name: "John Doe", email: "john@company.com" };
      // projectRoles.safety_manager = { name: "Jane Smith", phone: "555-0123" };
      // projectRoles.client_contact = { name: "Bob Wilson", company: "ABC Corp" };

      // Update the project_roles JSONB column
      const { error: rolesError } = await supabase
        .from("projects")
        .update({ project_roles: Object.keys(projectRoles).length > 0 ? projectRoles : null })
        .eq("id", editingProject.id);

      if (rolesError) {
        setEditError("Failed to update project roles");
        setEditing(false);
        return;
      }

      // Close modal and refresh projects
      setShowEditModal(false);
      setEditingProject(null);
      setEditing(false);
      fetchProjects();
    } catch (error) {
      setEditError("Failed to update project");
      setEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              Projects for {companyName}
            </h1>
          </div>
          <Button
            onClick={() => setShowTicketRequestModal(true)}
            className="ml-4 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Request Ticket
          </Button>
        </div>
        {/* Create Project Modal */}
        {userRole === "admin" && showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30" style={{zIndex: 10000}}>
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Project</h2>
              <Input
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="mb-4"
              />
              {createError && (
                <div className="text-red-500 mb-2">{createError}</div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30" style={{zIndex: 10000}}>
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Edit Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <Input
                    placeholder="Project Name"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Manager
                  </label>
                  <Input
                    placeholder="Project Manager Name"
                    value={editProjectManager}
                    onChange={(e) => setEditProjectManager(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Superintendent
                  </label>
                  <Input
                    placeholder="Superintendent Name"
                    value={editSuperintendent}
                    onChange={(e) => setEditSuperintendent(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Superintendent Email
                  </label>
                  <Input
                    type="email"
                    placeholder="superintendent@company.com"
                    value={editSuperintendentEmail}
                    onChange={(e) => setEditSuperintendentEmail(e.target.value)}
                  />
                </div>
              </div>

              {editError && (
                <div className="text-red-500 mt-4">{editError}</div>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveProject} disabled={editing}>
                  {editing ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30" style={{zIndex: 10000}}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{confirmTitle}</h2>
              
              <div className="mb-6">
                {confirmTitle === "Archive Project" ? (
                  <div>
                    <p className="text-gray-700 mb-4">
                      Are you sure you want to archive <span className="font-semibold">"{confirmProjectName}"</span>?
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-amber-800 text-sm font-medium mb-2">This action will:</p>
                      <ul className="text-amber-700 text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                          Stop all ticket updates for this project
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                          Remove the project from your active projects list
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700">{confirmMessage}</p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    confirmAction();
                    setShowConfirmDialog(false);
                  }}
                  variant={confirmButtonVariant}
                  className={confirmButtonVariant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                >
                  {confirmButtonText}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentFilter === "my-projects" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentFilter("my-projects")}
              className="text-sm"
            >
              My Projects
            </Button>
            <Button
              variant={currentFilter === "active-projects" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentFilter("active-projects")}
              className="text-sm"
            >
              Active Projects
            </Button>
            <Button
              variant={currentFilter === "all-projects" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentFilter("all-projects")}
              className="text-sm"
            >
              All Projects
            </Button>
          </div>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <Card className="col-span-full text-center py-12">
              <CardContent>
                <div className="text-gray-500">No projects found</div>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition relative"
                onClick={() => handleProjectClick(project)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      <span className="font-bold text-lg">{project.name || "Unknown Project"}</span>
                    </div>
                    {userRole === "admin" && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={
                            <button className="p-1 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 text-gray-600" />
                            </button>
                          }
                          align="right"
                        >
                          <DropdownMenuItem 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditProject(project, e);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project Info
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleArchiveProject(project, e);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Project
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {project.ticket_count} {project.ticket_count === 1 ? 'Ticket' : 'Tickets'}
                    </span>
                    <div className="flex flex-col items-end gap-1 text-sm text-gray-500">
                      <div>PM: {project.project_manager}</div>
                      <div>Sup: {project.superintendent}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Ticket Request Modal */}
        <TicketRequestModal
          open={showTicketRequestModal}
          onOpenChange={setShowTicketRequestModal}
        />
      </div>
    </div>
  );
}
