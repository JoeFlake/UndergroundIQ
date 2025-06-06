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
import { MapPin, ExternalLink, Search, Folder, Plus } from "lucide-react";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
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
    const { data, error } = await supabase
      .from("company_projects")
      .select("projects(*)")
      .eq("company_id", companyId);
    if (error) {
      setProjects([]);
    } else {
      // Flatten the projects array
      setProjects((data || []).map((row) => row.projects));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchUserCompany();
    }
  }, [user]);

  const filteredProjects = projects.filter(
    (project) =>
      !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (project: any) => {
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
              {companyName}
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
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {/* Projects table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Click on a project to view its tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-gray-500 py-8"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProjectClick(project)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {project.name || "Unknown Project"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
