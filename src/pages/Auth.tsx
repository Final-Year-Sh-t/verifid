import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Shield, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to VerifyID. You can now start verifying identities.',
          });
          navigate('/dashboard');
        }
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Invalid credentials',
              description: 'Please check your email and password.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign in failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
          });
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Background shapes */}
      <div 
        className={`fixed w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-primary/20 blur-3xl transition-all duration-700 ease-in-out ${
          isSignUp ? 'top-[-20%] right-[-10%]' : 'top-[-20%] left-[-10%]'
        }`}
      />
      <div 
        className={`fixed w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-accent/30 blur-3xl transition-all duration-700 ease-in-out ${
          isSignUp ? 'bottom-[-15%] left-[-5%]' : 'bottom-[-15%] right-[-5%]'
        }`}
      />

      {/* Back to home link */}
      <Link
        to="/"
        className="fixed top-6 left-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Main container */}
      <div className="relative w-full max-w-4xl h-[600px] flex rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
        
        {/* Welcome Section - slides left/right */}
        <div 
          className={`absolute inset-y-0 w-1/2 gradient-primary flex items-center justify-center transition-all duration-700 ease-in-out z-20 ${
            isSignUp ? 'left-0 rounded-r-[100px]' : 'left-1/2 rounded-l-[100px]'
          }`}
        >
          <div className="text-center text-primary-foreground px-8">
            <Shield className="w-16 h-16 mx-auto mb-6 animate-fade-in" />
            <h2 className="text-4xl font-display font-bold mb-4 animate-fade-in">WELCOME!</h2>
            <p className="text-primary-foreground/80 animate-fade-in">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={toggleMode}
              className="mt-4 px-8 py-2 border-2 border-primary-foreground/50 rounded-full text-primary-foreground hover:bg-primary-foreground/10 transition-colors animate-fade-in"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Sign In Form */}
        <div 
          className={`absolute inset-y-0 left-0 w-1/2 flex items-center justify-center p-8 transition-all duration-700 ease-in-out ${
            isSignUp ? 'opacity-0 pointer-events-none translate-x-[-50%]' : 'opacity-100 translate-x-0'
          }`}
        >
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-display font-bold text-foreground mb-8 text-center">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FloatingInput
                id="signin-email"
                name="email"
                type="email"
                label="Email"
                icon={<Mail className="h-5 w-5" />}
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />
              <FloatingInput
                id="signin-password"
                name="password"
                type="password"
                label="Password"
                icon={<Lock className="h-5 w-5" />}
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
            <p className="mt-6 text-center text-muted-foreground md:hidden">
              Don't have an account?{' '}
              <button onClick={toggleMode} className="text-primary font-medium hover:underline">
                Sign Up
              </button>
            </p>
          </div>
        </div>

        {/* Sign Up Form */}
        <div 
          className={`absolute inset-y-0 right-0 w-1/2 flex items-center justify-center p-8 transition-all duration-700 ease-in-out ${
            isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none translate-x-[50%]'
          }`}
        >
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-display font-bold text-foreground mb-8 text-center">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                id="signup-fullName"
                name="fullName"
                type="text"
                label="Full Name"
                icon={<User className="h-5 w-5" />}
                value={formData.fullName}
                onChange={handleInputChange}
                error={errors.fullName}
              />
              <FloatingInput
                id="signup-email"
                name="email"
                type="email"
                label="Email"
                icon={<Mail className="h-5 w-5" />}
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />
              <FloatingInput
                id="signup-password"
                name="password"
                type="password"
                label="Password"
                icon={<Lock className="h-5 w-5" />}
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
              />
              <FloatingInput
                id="signup-confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                icon={<Lock className="h-5 w-5" />}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Register'
                )}
              </button>
            </form>
            <p className="mt-6 text-center text-muted-foreground md:hidden">
              Already have an account?{' '}
              <button onClick={toggleMode} className="text-primary font-medium hover:underline">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating label input component
interface FloatingInputProps {
  id: string;
  name: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

function FloatingInput({ id, name, type, label, icon, value, onChange, error }: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || value.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-3 pl-12 bg-muted/50 border rounded-lg outline-none transition-all duration-300 text-foreground ${
            error 
              ? 'border-destructive focus:border-destructive' 
              : 'border-border focus:border-primary'
          }`}
        />
        <label
          htmlFor={id}
          className={`absolute left-12 transition-all duration-300 pointer-events-none ${
            isActive 
              ? 'top-0 -translate-y-1/2 text-xs bg-card px-1 text-primary' 
              : 'top-1/2 -translate-y-1/2 text-muted-foreground'
          }`}
        >
          {label}
        </label>
        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
          isActive ? 'text-primary' : 'text-muted-foreground'
        }`}>
          {icon}
        </span>
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
