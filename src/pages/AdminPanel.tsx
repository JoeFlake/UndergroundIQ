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
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { supabase } from "../lib/supabaseClient";

interface Employee {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<Employee | null>(null);
  const [removingUser, setRemovingUser] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Fetch employees for the company
  const fetchEmployees = async (companyId: number) => {
    const { data: employeesData, error: employeesError } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("company_id", companyId);
    if (employeesError) {
      setError("Failed to fetch employees");
      setLoading(false);
      return;
    }
    setEmployees(employeesData);
  };

  useEffect(() => {
    const checkAdminStatusAndFetch = async () => {
      if (!user) return;
      // Check admin status
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, company_id")
        .eq("id", user.id)
        .single();
      if (userError || userData?.role !== "admin") {
        navigate("/login");
        return;
      }
      // Fetch company name
      const companyId = userData.company_id;
      if (!companyId) {
        setError("No company assigned to this user.");
        setLoading(false);
        return;
      }
      setCompanyId(companyId);
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();
      if (companyError) {
        setError("Failed to fetch company name");
        setLoading(false);
        return;
      }
      setCompanyName(companyData.name);
      // Fetch all employees of this company
      await fetchEmployees(companyId);
      setLoading(false);
    };
    checkAdminStatusAndFetch();
    // eslint-disable-next-line
  }, [user, navigate]);

  // Add user handler
  const handleAddUser = async () => {
    if (!companyId) return;
    setAddingUser(true);
    setAddUserError(null);

    try {
      const response = await fetch(
        "https://kvlfpyfvifspllbtafnj.functions.supabase.co/invite-user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newUserEmail.trim(),
            role: newUserRole,
            company_id: companyId,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setAddUserError(result.error || "Failed to invite user.");
        setAddingUser(false);
        return;
      }
      setShowAddUser(false);
      setNewUserEmail("");
      setNewUserRole("user");
      setAddingUser(false);
      await fetchEmployees(companyId);
    } catch (err) {
      setAddUserError("Unexpected error occurred.");
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    setRemovingUser(true);
    setRemoveError(null);

    try {
      // Remove user from company by setting company_id to null
      const { error } = await supabase
        .from("users")
        .update({ company_id: null })
        .eq("id", userToRemove.id);

      if (error) throw error;

      // Refresh the employees list
      if (companyId) {
        await fetchEmployees(companyId);
      }
      setUserToRemove(null);
    } catch (err) {
      setRemoveError("Failed to remove user from company");
    } finally {
      setRemovingUser(false);
    }
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
        <Card className="w-full max-w-3xl animate-fade-in">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
            <h3 className="text-lg font-semibold mb-6">
              Company: <span className="text-blue-700">{companyName}</span>
            </h3>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddUser(true)}>Add User</Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>
                        {new Date(emp.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setUserToRemove(emp)}
                          disabled={emp.id === user?.id}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-xl font-bold mb-4">Add User</h2>
              {addUserError && (
                <p className="text-red-500 mb-2">{addUserError}</p>
              )}
              <div className="mb-4">
                <label className="block mb-1 font-medium">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Role</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddUser(false);
                    setAddUserError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={
                    addingUser || !newUserEmail || !newUserEmail.includes("@")
                  }
                >
                  {addingUser ? "Adding..." : "Add User"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Remove User Confirmation Modal */}
        {userToRemove && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-xl font-bold mb-4">Remove User</h2>
              {removeError && (
                <p className="text-red-500 mb-2">{removeError}</p>
              )}
              <p className="mb-4">
                Are you sure you want to remove {userToRemove.email} from the
                company? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUserToRemove(null);
                    setRemoveError(null);
                  }}
                  disabled={removingUser}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveUser}
                  disabled={removingUser}
                >
                  {removingUser ? "Removing..." : "Remove User"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
