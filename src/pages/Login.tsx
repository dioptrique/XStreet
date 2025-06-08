
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back to xStreet!',
      });
      navigate('/');
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Simulate loading for visual feedback
    setTimeout(() => {
      toast({
        title: 'Google Sign In Disabled',
        description: 'This feature is currently not available.',
        variant: 'destructive'
      });
      setIsGoogleLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-satstreet-medium p-8 rounded-lg border border-satstreet-light shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome to xStreet</h1>
            <p className="text-muted-foreground">Login to access your wallet and shop with XRP</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 border border-red-500/50">
              <AlertDescription className="text-red-500">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="satoshi@example.com"
                disabled={isLoading}
                {...register('email', { required: 'Email is required' })}
                className="bg-satstreet-light border-satstreet-light"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('password', { required: 'Password is required' })}
                className="bg-satstreet-light border-satstreet-light"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-bitcoin hover:bg-bitcoin-dark"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : 'Login'}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-satstreet-light" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-satstreet-medium px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google logo"
                  className="w-5 h-5 mr-2"
                />
                Login with Google
              </>
            )}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-bitcoin hover:text-bitcoin-dark"
              onClick={() => navigate('/register')}
            >
              Sign up
            </Button>
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Login;
