import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    institutionName: '',
    adminName: '',
    email: '',
    password: '',
  });

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
      const redirectUrl = `${window.location.origin}/auth`;
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
        return;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Create the institution
      const slug = formData.institutionName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { data: institution, error: instError } = await supabase
        .from('institutions')
        .insert({
          name: formData.institutionName.trim(),
          slug: `${slug}-${Date.now().toString(36)}`, // Ensure unique slug
          welcome_text: `Welcome to ${formData.institutionName.trim()} verification portal`,
        })
        .select('id')
        .single();

      if (instError) {
        console.error('Institution creation error:', instError);
        throw new Error('Failed to create institution. Please try again.');
      }

      // Step 3: Update the user's role to admin with institution_id
      // The trigger already created a 'user' role, so we update it
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ 
          role: 'admin' as const,
          institution_id: institution.id 
        })
        .eq('user_id', authData.user.id);

      if (roleError) {
        console.error('Role update error:', roleError);
        // Try inserting instead if update fails
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin' as const,
            institution_id: institution.id,
          });
        
        if (insertError) {
          console.error('Role insert error:', insertError);
        }
      }

      // Step 4: Update profile with institution_id
      await supabase
        .from('profiles')
        .update({ institution_id: institution.id })
        .eq('user_id', authData.user.id);

      setInstitutionId(institution.id);
      setIsSuccess(true);
      
      toast({
        title: 'Registration successful!',
        description: 'Your institution has been created.',
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center animate-scale-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20 mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Welcome Aboard!</h1>
            <p className="text-muted-foreground mb-6">
              Your institution has been successfully registered.
            </p>
            
            <div className="bg-secondary/50 rounded-lg p-4 mb-6">
              <div className="text-sm text-muted-foreground mb-1">Your Institution ID</div>
              <div className="font-mono text-sm font-medium break-all">{institutionId}</div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full gradient-primary border-0"
              >
                Sign In to Dashboard
              </Button>
              <p className="text-sm text-muted-foreground">
                You can now sign in with your email and password to access your admin dashboard.
              </p>
            </div>
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
