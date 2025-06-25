import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/button";
import { Navbar } from "../components/Navbar";
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
import { MapPin, ExternalLink, Folder, Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  created_by: string;
  ticket_count: number;
  created_at?: string;
  superintendent?: string;
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

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userRole, setUserRole] = useState<string>("");

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
      .select("project_id, projects(id, name, created_by, pm_user, super)")
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

        // Fetch PM data if exists
        let projectManager = null;
        if (project.pm_user) {
          const { data: pmUser } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", project.pm_user)
            .single();
          if (pmUser) {
            projectManager = pmUser.name || pmUser.email;
          }
        }

        // Get superintendent data from super jsonb
        const superintendent = project.super?.name || project.super?.email || null;

        return {
          id: project.id,
          name: project.name,
          created_by: project.created_by,
          ticket_count: countError ? 0 : count || 0,
          superintendent: superintendent,
          project_manager: projectManager,
        };
      })
    );
    setProjects(projectsWithCounts);
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchUserCompany();
    }
  }, [user]);

  const filteredProjects = projects.filter(
    (project) => project.ticket_count > 0
  );

  const handleProjectClick = (project: Project) => {
    navigate(`/tickets?project=${project.id}`);
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
          {userRole === "admin" && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="ml-4 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )}
        </div>
        {/* Create Project Modal */}
        {userRole === "admin" && showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
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
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <span className="font-bold text-lg">{project.name || "Unknown Project"}</span>
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
      </div>
    </div>
  );
}
