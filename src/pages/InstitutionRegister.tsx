import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Building2, User, Mail, Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const registrationSchema = z.object({
  institutionName: z.string().trim().min(2, 'Institution name must be at least 2 characters').max(100, 'Institution name must be less than 100 characters'),
  adminName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be less than 72 characters'),
});

export default function InstitutionRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInstitutionName, setPendingInstitutionName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    institutionName: '',
    adminName: '',
    email: '',
    password: '',
  });

  // After signup, user becomes available. Then create institution.
  useEffect(() => {
    const createInstitutionAfterSignup = async () => {
      if (user && pendingInstitutionName) {
        try {
          const { error } = await supabase.rpc('create_institution_for_current_user', {
            _name: pendingInstitutionName,
          });

          if (error) throw error;

          toast({
            title: 'Institution created!',
            description: 'Welcome to your new institution.',
          });

          await refreshAuth();
          setPendingInstitutionName(null);
          navigate('/dashboard');
        } catch (error: any) {
          console.error('Institution creation error:', error);
          toast({
            title: 'Error creating institution',
            description: error.message || 'Failed to create institution.',
            variant: 'destructive',
          });
          setPendingInstitutionName(null);
          setIsLoading(false);
        }
      }
    };

    createInstitutionAfterSignup();
  }, [user, pendingInstitutionName, navigate, refreshAuth, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const validation = registrationSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create the user account
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.adminName.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Please sign in instead.' });
        } else {
          throw authError;
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Store institution name; the useEffect above will create the institution once user is set
      setPendingInstitutionName(formData.institutionName.trim());

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Loading state while creating institution after signup
  if (isLoading && pendingInstitutionName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold mb-2">Setting Up Your Institution</h1>
            <p className="text-muted-foreground">
              Creating your institution and configuring your admin account...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="w-full max-w-lg">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary mx-auto mb-4">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Register Your Institution</h1>
            <p className="text-muted-foreground">
              Create your institution account and start verifying identities
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Institution Name */}
            <div className="space-y-2">
              <Label htmlFor="institutionName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Institution Name
              </Label>
              <Input
                id="institutionName"
                placeholder="Acme University"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                className={errors.institutionName ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.institutionName && (
                <p className="text-sm text-destructive">{errors.institutionName}</p>
              )}
            </div>

            <div className="border-t border-border pt-5">
              <p className="text-sm text-muted-foreground mb-4">Admin Account Details</p>
            </div>

            {/* Admin Name */}
            <div className="space-y-2">
              <Label htmlFor="adminName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Your Full Name
              </Label>
              <Input
                id="adminName"
                placeholder="John Doe"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className={errors.adminName ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.adminName && (
                <p className="text-sm text-destructive">{errors.adminName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@institution.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-primary border-0 h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating your institution...
                </>
              ) : (
                'Create Institution'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/auth" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
