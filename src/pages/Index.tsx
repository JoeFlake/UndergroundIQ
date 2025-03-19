
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl text-center">Welcome to your dashboard</CardTitle>
          <CardDescription className="text-center">You're now signed in to your account</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center p-4 bg-gray-100 rounded-lg">
            <User className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center" 
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;
