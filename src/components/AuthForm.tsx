
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthFormProps {
  type: 'login' | 'signup';
}

const AuthForm = ({ type }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      if (type === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "Success!",
          description: "You've been logged in.",
        });
        navigate('/');
      } else {
        const { error, user } = await signUp(email, password);
        if (error) throw error;
        
        toast({
          title: "Account created!",
          description: "Your account has been created and you're now logged in.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setFormError(error.message || "An unexpected error occurred");
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred",
        action: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {type === 'login' ? 'Sign in to your account' : 'Create an account'}
        </CardTitle>
        <CardDescription>
          {type === 'login'
            ? 'Enter your email and password to sign in'
            : 'Enter your email and password to create an account'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
        </CardContent>
        
        <CardFooter className="flex flex-col">
          <Button
            type="submit"
            className="w-full transition-all duration-200 bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                {type === 'login' ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : type === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </Button>
          
          <div className="mt-4 text-center text-sm">
            {type === 'login' ? (
              <p>
                Don't have an account?{' '}
                <a
                  href="/signup"
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Sign up
                </a>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <a
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Sign in
                </a>
              </p>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AuthForm;
