import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { useToast } from "./ui/use-toast";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import type { Project } from "../types";
import { isErrorWithMessage } from "../utils/errorHandling";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: Project) => void;
}

export function NewProjectModal({ open, onOpenChange, onProjectCreated }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Insert new project
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([{ name: projectName.trim() }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Add user to project
      const { error: userProjectError } = await supabase
        .from("user_projects")
        .insert([
          {
            user_id: user.id,
            project_id: newProject.id,
          },
        ]);

      if (userProjectError) throw userProjectError;

      // Call callback with new project
      onProjectCreated({
        project_id: newProject.id,
        project_name: newProject.name,
      });

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      onOpenChange(false);
      setProjectName("");
    } catch (error) {
      toast({
        title: "Error",
        description: isErrorWithMessage(error)
          ? error.message
          : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={creating}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateProject}
            disabled={creating || !projectName.trim()}
          >
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 