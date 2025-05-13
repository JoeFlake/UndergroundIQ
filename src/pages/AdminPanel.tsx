import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Navbar } from "../components/Navbar";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Plus, Trash2 } from "lucide-react";

interface User {
  user_id: string;
  email: string;
  project_ids: number[];
}

interface Project {
  project_id: number;
  project_name: string;
}

type DatabaseUser = {
  user_id: string;
  user_management: {
    email: string;
  };
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("users_info")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error checking admin status:", error);
        setError("Failed to verify admin status");
        navigate("/login");
        return;
      }

      if (!data?.is_admin) {
        navigate("/login");
        return;
      }

      await fetchUsers();
      await fetchProjects();
      setLoading(false);
    };

    checkAdminStatus();
  }, [user, navigate]);

  const fetchUsers = async () => {
    const { data: usersData, error: usersError } = await supabase.from("user_management").select(`
        user_id,
        email
      `);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      setError("Failed to fetch users");
      return;
    }

    const { data: associationsData, error: associationsError } = await supabase
      .from("users-projects")
      .select("user_id, project_id");

    if (associationsError) {
      console.error("Error fetching user-project associations:", associationsError);
      setError("Failed to fetch user-project associations");
      return;
    }

    // Group project IDs by user
    const userProjects = associationsData.reduce((acc, curr) => {
      if (!acc[curr.user_id]) {
        acc[curr.user_id] = [];
      }
      acc[curr.user_id].push(curr.project_id);
      return acc;
    }, {} as Record<string, number[]>);

    // Combine user data with their project IDs
    const usersWithProjects = usersData.map((user) => ({
      user_id: user.user_id,
      email: user.email,
      project_ids: userProjects[user.user_id] || []
    }));

    setUsers(usersWithProjects);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase.from("projects").select("project_id, project_name");

    if (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to fetch projects");
      return;
    }

    setProjects(data);
  };

  const handleAddProject = async (userId: string, projectId: number) => {
    const { error } = await supabase.from("users-projects").insert({
      user_id: userId,
      project_id: projectId
    });

    if (error) {
      console.error("Error adding project to user:", error);
      setError("Failed to add project to user");
      return;
    }

    await fetchUsers();
  };

  const handleRemoveProject = async (userId: string, projectId: number) => {
    const { error } = await supabase
      .from("users-projects")
      .delete()
      .eq("user_id", userId)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error removing project from user:", error);
      setError("Failed to remove project from user");
      return;
    }

    await fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
        <Card className="w-full max-w-6xl animate-fade-in">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">User Project Management</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Add Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.project_ids.map((projectId) => {
                            const project = projects.find((p) => p.project_id === projectId);
                            return (
                              <div
                                key={projectId}
                                className="flex items-center bg-gray-100 px-2 py-1 rounded-md text-sm"
                              >
                                {project?.project_name}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                                  onClick={() => handleRemoveProject(user.user_id, projectId)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          onValueChange={(value) => handleAddProject(user.user_id, parseInt(value))}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects
                              .filter((project) => !user.project_ids.includes(project.project_id))
                              .map((project) => (
                                <SelectItem
                                  key={project.project_id}
                                  value={project.project_id.toString()}
                                >
                                  {project.project_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
