import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { bluestakesService } from "../lib/bluestakesService";
import { useBluestakesAuth } from "../hooks/useBluestakesAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
// Removed problematic Command component import
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import { format, addDays } from "date-fns";
import { CalendarIcon, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Project {
  id: string;
  name: string;
}

interface TicketRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WorkType {
  abbrev?: string;
  description?: string;
  // For backward compatibility, also handle strings
  toString?: () => string;
}

interface RequestForm {
  projectName: string;
  workBeginsDate: Date | undefined;
  address: string;
  superintendentName: string;
  superintendentEmail: string;
  projectManagerName: string;
  projectManagerEmail: string;
  isCurrentUserPM: boolean;
  workTypes: string[];
  workDoneFor: string;
  workMethods: string[];
}

export function TicketRequestModal({ open, onOpenChange }: TicketRequestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { bluestakesToken } = useBluestakesAuth();
  
  // Form state
  const [form, setForm] = useState<RequestForm>({
    projectName: "",
    workBeginsDate: undefined,
    address: "",
    superintendentName: "",
    superintendentEmail: "",
    projectManagerName: "",
    projectManagerEmail: "",
    isCurrentUserPM: true, // Default to checked
    workTypes: [],
    workDoneFor: "",
    workMethods: [],
  });

  // Component state
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workTypes, setWorkTypes] = useState<Array<{value: string, label: string}>>(() => {
    // Initialize with fallback work types immediately
    const fallbackTypes = [
      "Underground Utility Installation",
      "Excavation", 
      "Boring",
      "Trenching",
      "Road Work",
      "Foundation Work",
      "Landscaping",
      "Emergency Repair"
    ];
    return fallbackTypes.map(type => ({ value: type, label: type }));
  });
  const [projectSuggestions, setProjectSuggestions] = useState<Project[]>([]);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [loadingWorkTypes, setLoadingWorkTypes] = useState(false);
  const [workTypeSearchTerm, setWorkTypeSearchTerm] = useState("");
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  // Available work methods
  const workMethodOptions = [
    { id: "boring", label: "Boring" },
    { id: "blasting", label: "Blasting" },
    { id: "digging_in_road", label: "Digging in the Road" },
  ];

  // Fetch company projects for autocomplete
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || !open) return;

      try {
        // Get user's company_id
        const { data: userProfile, error: userError } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (userError || !userProfile?.company_id) return;

        // Fetch all company projects
        const { data: companyProjects, error: projectsError } = await supabase
          .from("company_projects")
          .select("project_id, projects(id, name)")
          .eq("company_id", userProfile.company_id);

        if (!projectsError && companyProjects) {
          const projectsList = companyProjects.map((row: any) => ({
            id: row.projects.id,
            name: row.projects.name,
          }));
          setProjects(projectsList);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [user, open]);

  // Normalize work types - handle both strings and objects
  const normalizeWorkTypes = (types: any[]): Array<{value: string, label: string}> => {
    return types.map((type, index) => {
      if (typeof type === 'string') {
        return { value: type, label: type };
      } else if (type && typeof type === 'object') {
        // Handle objects with abbrev/description
        const value = type.abbrev || type.description || `type-${index}`;
        const label = type.description || type.abbrev || value;
        return { value, label };
      } else {
        // Fallback for any other type
        return { value: `type-${index}`, label: String(type) };
      }
    });
  };

  // Fetch work types when modal opens
  useEffect(() => {
    const fetchWorkTypes = async () => {
      if (!open || !bluestakesToken) return;

      setLoadingWorkTypes(true);
      try {
        const types = await bluestakesService.getWorkTypes(bluestakesToken);
        const normalizedTypes = normalizeWorkTypes(types);
        setWorkTypes(normalizedTypes);
      } catch (error) {
        console.error("Error fetching work types:", error);
        // Keep the pre-loaded fallback types on error
      } finally {
        setLoadingWorkTypes(false);
      }
    };

    fetchWorkTypes();
  }, [open, bluestakesToken]);

  // Set default user info when modal opens
  useEffect(() => {
    if (open && user && form.isCurrentUserPM) {
      setForm(prev => ({
        ...prev,
        projectManagerName: user.name || user.email?.split("@")[0] || "",
        projectManagerEmail: user.email || "",
      }));
    }
  }, [open, user, form.isCurrentUserPM]);

  // Handle project name input and show suggestions
  const handleProjectNameChange = (value: string) => {
    setForm(prev => ({ ...prev, projectName: value }));

    if (value.length > 0) {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(value.toLowerCase())
      );
      setProjectSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowProjectSuggestions(filtered.length > 0);
    } else {
      setShowProjectSuggestions(false);
    }
  };

  // Handle project selection from suggestions
  const handleProjectSelect = (project: Project) => {
    setForm(prev => ({ ...prev, projectName: project.name }));
    setShowProjectSuggestions(false);
  };

  // Handle checkbox change for current user as PM
  const handleCurrentUserPMChange = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      isCurrentUserPM: checked,
      projectManagerName: checked ? (user?.name || user?.email?.split("@")[0] || "") : "",
      projectManagerEmail: checked ? (user?.email || "") : "",
    }));
  };

  // Handle work method toggle
  const handleWorkMethodToggle = (methodId: string) => {
    setForm(prev => ({
      ...prev,
      workMethods: prev.workMethods.includes(methodId)
        ? prev.workMethods.filter(m => m !== methodId)
        : [...prev.workMethods, methodId]
    }));
  };

  // Remove work method
  const removeWorkMethod = (methodId: string) => {
    setForm(prev => ({
      ...prev,
      workMethods: prev.workMethods.filter(m => m !== methodId)
    }));
  };

  // Toggle work type selection
  const handleWorkTypeToggle = (typeValue: string) => {
    setForm(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(typeValue)
        ? prev.workTypes.filter(t => t !== typeValue)
        : [...prev.workTypes, typeValue]
    }));
  };

  // Remove work type
  const removeWorkType = (typeValue: string) => {
    setForm(prev => ({
      ...prev,
      workTypes: prev.workTypes.filter(t => t !== typeValue)
    }));
  };

  // Form validation
  const validateForm = (): { isValid: boolean; errors: Set<string>; message: string | null } => {
    const errors = new Set<string>();
    let message = null;

    if (!form.projectName.trim()) {
      errors.add("projectName");
      if (!message) message = "Project name is required";
    }
    if (!form.workBeginsDate) {
      errors.add("workBeginsDate");
      if (!message) message = "Work begins date is required";
    }
    if (!form.address.trim()) {
      errors.add("address");
      if (!message) message = "Address is required";
    }
    if (!form.superintendentName.trim()) {
      errors.add("superintendentName");
      if (!message) message = "Superintendent name is required";
    }
    if (!form.superintendentEmail.trim()) {
      errors.add("superintendentEmail");
      if (!message) message = "Superintendent email is required";
    }
    if (!form.projectManagerName.trim()) {
      errors.add("projectManagerName");
      if (!message) message = "Project manager name is required";
    }
    if (!form.projectManagerEmail.trim()) {
      errors.add("projectManagerEmail");
      if (!message) message = "Project manager email is required";
    }
    if (form.workTypes.length === 0) {
      errors.add("workTypes");
      if (!message) message = "At least one work type is required";
    }
    if (!form.workDoneFor.trim()) {
      errors.add("workDoneFor");
      if (!message) message = "Work done for is required";
    }
    if (form.workMethods.length === 0) {
      errors.add("workMethods");
      if (!message) message = "At least one work method is required";
    }

    // Date validation (must be at least 3 days from now)
    const minDate = addDays(new Date(), 3);
    if (form.workBeginsDate && form.workBeginsDate < minDate) {
      errors.add("workBeginsDate");
      if (!message) message = "Work begins date must be at least 3 days from today";
    }

    return {
      isValid: errors.size === 0,
      errors,
      message
    };
  };

  // Submit form
  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    // Clear validation errors on successful validation
    setValidationErrors(new Set());

    setLoading(true);

    try {
      // Get user's company_id
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (userError || !userProfile?.company_id) {
        throw new Error("Could not determine company");
      }

      // Prepare request data
      const requestData = {
        project_name: form.projectName.trim(),
        work_begins_date: format(form.workBeginsDate!, "yyyy-MM-dd"),
        address: form.address.trim(),
        superintendent: {
          name: form.superintendentName.trim(),
          email: form.superintendentEmail.trim(),
        },
        project_manager: {
          name: form.projectManagerName.trim(),
          email: form.projectManagerEmail.trim(),
          is_current_user: form.isCurrentUserPM,
        },
        work_types: form.workTypes,
        work_done_for: form.workDoneFor.trim(),
        work_methods: form.workMethods,
      };

      // Insert request into database
      const { error } = await supabase
        .from("requests")
        .insert({
          company_id: userProfile.company_id,
          requested_by: user.id,
          request_type: "ticket_request",
          request_data: requestData,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket request submitted successfully!",
      });

      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit ticket request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({
      projectName: "",
      workBeginsDate: undefined,
      address: "",
      superintendentName: "",
      superintendentEmail: "",
      projectManagerName: "",
      projectManagerEmail: "",
      isCurrentUserPM: true,
      workTypes: [],
      workDoneFor: "",
      workMethods: [],
    });
    setShowProjectSuggestions(false);
    setWorkTypeSearchTerm("");
    setValidationErrors(new Set());
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Minimum date (3 days from today)
  const minDate = addDays(new Date(), 3);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request New Ticket</DialogTitle>
          <DialogDescription>
            Please fill out the form below to request a new ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2 relative">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={form.projectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              placeholder="Enter project name or select existing..."
              className={validationErrors.has("projectName") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {showProjectSuggestions && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                {projectSuggestions.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Work Begins Date */}
          <div className="space-y-2">
            <Label>Work Begins Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.workBeginsDate && "text-muted-foreground",
                    validationErrors.has("workBeginsDate") && "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.workBeginsDate ? (
                    format(form.workBeginsDate, "PPP")
                  ) : (
                    <span>Pick a date (minimum 3 days from today)</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                <Calendar
                  mode="single"
                  selected={form.workBeginsDate}
                  onSelect={(date) => setForm(prev => ({ ...prev, workBeginsDate: date }))}
                  disabled={(date) => date < minDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address or Intersection *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., Main St & 5th Ave or 123 Main Street"
              className={validationErrors.has("address") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            {/* Superintendent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="superintendentName">Superintendent Name *</Label>
                <Input
                  id="superintendentName"
                  value={form.superintendentName}
                  onChange={(e) => setForm(prev => ({ ...prev, superintendentName: e.target.value }))}
                  placeholder="Superintendent name"
                  className={validationErrors.has("superintendentName") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="superintendentEmail">Superintendent Email *</Label>
                <Input
                  id="superintendentEmail"
                  type="email"
                  value={form.superintendentEmail}
                  onChange={(e) => setForm(prev => ({ ...prev, superintendentEmail: e.target.value }))}
                  placeholder="superintendent@company.com"
                  className={validationErrors.has("superintendentEmail") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                />
              </div>
            </div>

            {/* Project Manager */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCurrentUserPM"
                  checked={form.isCurrentUserPM}
                  onCheckedChange={handleCurrentUserPMChange}
                />
                <Label htmlFor="isCurrentUserPM">I am the Project Manager</Label>
              </div>
            </div>

            {!form.isCurrentUserPM && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectManagerName">Project Manager Name *</Label>
                  <Input
                    id="projectManagerName"
                    value={form.projectManagerName}
                    onChange={(e) => setForm(prev => ({ ...prev, projectManagerName: e.target.value }))}
                    placeholder="Project manager name"
                    className={validationErrors.has("projectManagerName") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectManagerEmail">Project Manager Email *</Label>
                  <Input
                    id="projectManagerEmail"
                    type="email"
                    value={form.projectManagerEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, projectManagerEmail: e.target.value }))}
                    placeholder="pm@company.com"
                    className={validationErrors.has("projectManagerEmail") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Work Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Work Specifications</h3>
            
            {/* Work Types */}
            <div className="space-y-2">
              <Label>Work Types * (Select all that apply)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between ${validationErrors.has("workTypes") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  >
                    {form.workTypes.length === 0
                      ? loadingWorkTypes 
                        ? "Loading work types..." 
                        : "Select work types..."
                      : `${form.workTypes.length} work type${form.workTypes.length > 1 ? 's' : ''} selected`
                    }
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[10000]">
                  {loadingWorkTypes ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading work types...
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search work types..."
                          value={workTypeSearchTerm}
                          onChange={(e) => setWorkTypeSearchTerm(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="max-h-64 overflow-auto">
                        {workTypes && workTypes.length > 0 ? (
                          workTypes
                            .filter(type => 
                              type.label.toLowerCase().includes(workTypeSearchTerm.toLowerCase())
                            )
                            .map((type) => (
                              <div
                                key={type.value}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleWorkTypeToggle(type.value)}
                              >
                                <Checkbox
                                  checked={form.workTypes.includes(type.value)}
                                />
                                <span className="text-sm">{type.label}</span>
                              </div>
                            ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No work types available
                          </div>
                        )}
                        {workTypes && workTypes.length > 0 && 
                         workTypes.filter(type => 
                           type.label.toLowerCase().includes(workTypeSearchTerm.toLowerCase())
                         ).length === 0 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No work types found matching "{workTypeSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Selected work types as badges */}
              {form.workTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.workTypes.map((workTypeValue) => {
                    const workType = workTypes.find(t => t.value === workTypeValue);
                    return (
                      <Badge key={workTypeValue} variant="secondary" className="flex items-center gap-1">
                        {workType?.label || workTypeValue}
                        <button
                          onClick={() => removeWorkType(workTypeValue)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Work Done For */}
            <div className="space-y-2">
              <Label htmlFor="workDoneFor">Work Done For *</Label>
              <Input
                id="workDoneFor"
                value={form.workDoneFor}
                onChange={(e) => setForm(prev => ({ ...prev, workDoneFor: e.target.value }))}
                placeholder="e.g., City Public Works, Private Developer, etc."
                className={validationErrors.has("workDoneFor") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
            </div>

            {/* Work Methods */}
            <div className="space-y-2">
              <Label className={validationErrors.has("workMethods") ? "text-red-500" : ""}>
                Work Methods * (Select all that apply)
              </Label>
              <div className={`space-y-2 p-2 rounded-md ${validationErrors.has("workMethods") ? "border border-red-500" : ""}`}>
                {workMethodOptions.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={method.id}
                      checked={form.workMethods.includes(method.id)}
                      onCheckedChange={() => handleWorkMethodToggle(method.id)}
                    />
                    <Label htmlFor={method.id}>{method.label}</Label>
                  </div>
                ))}
              </div>
              
              {/* Selected work methods as badges */}
              {form.workMethods.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.workMethods.map((methodId) => {
                    const method = workMethodOptions.find(m => m.id === methodId);
                    return (
                      <Badge key={methodId} variant="secondary" className="flex items-center gap-1">
                        {method?.label}
                        <button
                          onClick={() => removeWorkMethod(methodId)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 