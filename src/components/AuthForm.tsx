import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "../lib/supabaseClient";

interface AuthFormProps {
  type: "login" | "signup";
}

const AuthForm = ({ type }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (type === "signup") {
      // 1. Sign up with Supabase Auth only
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // 2. Insert into users table with role (no Blue Stakes credentials)
      if (data.user) {
        await supabase.from("users").insert([
          {
            id: data.user.id,
            email,
            role, // This will be "admin" if selected
          },
        ]);
      }

      toast({
        title: "Success",
        description: "Account created! You can now log in.",
      });
      navigate("/login");
      setLoading(false);
    } else {
      // LOGIN
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // Check if user exists in users table
      let { data: userMeta, error: metaError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (!userMeta) {
        // Insert user into users table
        const { error: dbError } = await supabase.from("users").insert([
          {
            id: userId,
            email,
            role, // Default to 'user' or use selected role
          },
        ]);
        if (dbError) {
          setError("Login succeeded, but failed to create user profile.");
          setLoading(false);
          return;
        }
        // Fetch the newly created userMeta
        ({ data: userMeta, error: metaError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single());
      }

      if (metaError) {
        setError("Login succeeded, but failed to fetch user metadata.");
      } else {
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
        navigate("/");
      }
      setLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {type === "login" ? "Sign in to your account" : "Create an account"}
        </CardTitle>
        <CardDescription>
          {type === "login"
            ? "Enter your email and password to sign in"
            : "Enter your email, password, and role to create an account"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
                onClick={toggleShowPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {(type === "signup" || role === "admin") && (
            <>
              {type === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border rounded px-2 py-2"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col">
          <Button
            type="submit"
            className="w-full transition-all duration-300 bg-gray-900 hover:bg-white hover:text-gray-900 border-2 border-gray-900 text-white"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                {type === "login" ? "Signing in..." : "Creating account..."}
              </div>
            ) : type === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>

          <div className="mt-4 text-center text-sm">
            {type === "login" ? (
              <p>
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-gray-900 hover:text-gray-500 underline transition-colors"
                >
                  Sign up
                </Link>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-gray-900 hover:text-gray-500 underline transition-colors"
                >
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AuthForm;
