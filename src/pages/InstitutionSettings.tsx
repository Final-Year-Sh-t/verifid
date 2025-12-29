import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  Upload, 
  Palette, 
  Shield,
  Users,
  Settings,
  Save,
  UserPlus,
  Trash2,
  Camera,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface StaffMember {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  staff_type: string | null;
  created_at: string;
}

const staffInviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  staffType: z.enum(['verifier', 'registrar', 'security', 'viewer']),
});

export default function InstitutionSettings() {
  const { user, isAdmin, institutionId, institution, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  
  const [settings, setSettings] = useState({
    name: '',
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    welcome_text: '',
    require_photo: true,
    enforce_expiry: true,
    allow_public_verification: false,
  });

  const [staffForm, setStaffForm] = useState({
    email: '',
    staffType: 'verifier' as const,
  });
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (institutionId && isAdmin) {
      fetchData();
    }
  }, [institutionId, isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch institution settings
      const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .maybeSingle();

      if (instError) throw instError;
      
      if (instData) {
        setSettings({
          name: instData.name || '',
          logo_url: instData.logo_url || '',
          primary_color: instData.primary_color || '#3B82F6',
          secondary_color: instData.secondary_color || '#1E40AF',
          welcome_text: instData.welcome_text || '',
          require_photo: instData.require_photo ?? true,
          enforce_expiry: instData.enforce_expiry ?? true,
          allow_public_verification: instData.allow_public_verification ?? false,
        });
      }

      // Fetch staff members
      const { data: staffData, error: staffError } = await supabase
        .from('user_roles')
        .select('id, user_id, staff_type, created_at')
        .eq('institution_id', institutionId)
        .neq('role', 'admin');

      if (staffError) throw staffError;
      
      setStaff(staffData?.map(s => ({
        id: s.id,
        user_id: s.user_id,
        staff_type: s.staff_type,
        created_at: s.created_at,
      })) || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${institutionId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('institution-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('institution-logos')
        .getPublicUrl(fileName);

      // Add cache buster to URL
      const logoUrl = `${publicUrl}?t=${Date.now()}`;
      setSettings(prev => ({ ...prev, logo_url: logoUrl }));

      toast({ title: 'Logo uploaded successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          name: settings.name,
          logo_url: settings.logo_url || null,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          welcome_text: settings.welcome_text,
          require_photo: settings.require_photo,
          enforce_expiry: settings.enforce_expiry,
          allow_public_verification: settings.allow_public_verification,
        })
        .eq('id', institutionId);

      if (error) throw error;

      toast({ title: 'Settings saved successfully' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffErrors({});

    const validation = staffInviteSchema.safeParse(staffForm);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setStaffErrors(fieldErrors);
      return;
    }

    toast({
      title: 'Staff Invitation',
      description: `To add staff, they need to first create an account. Then you can assign them using the backend with email: ${staffForm.email}`,
    });
    
    setIsStaffDialogOpen(false);
    setStaffForm({ email: '', staffType: 'verifier' });
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      toast({ title: 'Staff member removed' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff.',
        variant: 'destructive',
      });
    }
  };

  const getStaffTypeBadge = (type: string | null) => {
    const styles: Record<string, string> = {
      verifier: 'bg-blue-500/20 text-blue-700',
      registrar: 'bg-green-500/20 text-green-700',
      security: 'bg-orange-500/20 text-orange-700',
      viewer: 'bg-gray-500/20 text-gray-700',
    };
    return (
      <Badge className={styles[type || 'viewer'] || styles.viewer}>
        {type || 'Unknown'}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin || !institutionId) {
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only institution administrators can access settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Institution Settings</h1>
            <p className="text-muted-foreground">Configure your institution's branding and verification rules.</p>
          </div>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="gradient-primary border-0 gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList>
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="verification" className="gap-2">
                <Shield className="h-4 w-4" />
                Verification Rules
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                Staff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Logo Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Institution Logo
                    </CardTitle>
                    <CardDescription>
                      Upload your institution's logo. Recommended size: 200x200px
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div 
                        className="h-24 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {settings.logo_url ? (
                          <img 
                            src={settings.logo_url} 
                            alt="Institution logo" 
                            className="h-full w-full object-cover"
                          />
                        ) : isUploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          JPG, PNG or WebP. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Institution Name */}
                <Card>
                  <CardHeader>
                    <CardTitle>Institution Name</CardTitle>
                    <CardDescription>
                      This name will be displayed throughout the portal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      placeholder="Acme University"
                    />
                  </CardContent>
                </Card>

                {/* Theme Colors */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Theme Colors
                    </CardTitle>
                    <CardDescription>
                      Customize your institution's brand colors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-3">
                          <Input
                            type="color"
                            value={settings.primary_color}
                            onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.primary_color}
                            onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Color</Label>
                        <div className="flex gap-3">
                          <Input
                            type="color"
                            value={settings.secondary_color}
                            onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.secondary_color}
                            onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div className="mt-6">
                      <Label className="mb-2 block">Preview</Label>
                      <div 
                        className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
                        style={{ 
                          background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` 
                        }}
                      >
                        {settings.name || 'Your Institution'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Welcome Text */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Welcome Message</CardTitle>
                    <CardDescription>
                      Displayed on your institution's verification portal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={settings.welcome_text}
                      onChange={(e) => setSettings({ ...settings, welcome_text: e.target.value })}
                      placeholder="Welcome to our verification portal"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="verification">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Verification Rules
                  </CardTitle>
                  <CardDescription>
                    Configure how identity verification works for your institution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <div className="font-medium">Require Photo</div>
                      <div className="text-sm text-muted-foreground">
                        Require a photo for all identity records
                      </div>
                    </div>
                    <Switch
                      checked={settings.require_photo}
                      onCheckedChange={(checked) => setSettings({ ...settings, require_photo: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <div className="font-medium">Enforce Expiry</div>
                      <div className="text-sm text-muted-foreground">
                        Show expired status for IDs past their expiry date
                      </div>
                    </div>
                    <Switch
                      checked={settings.enforce_expiry}
                      onCheckedChange={(checked) => setSettings({ ...settings, enforce_expiry: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <div className="font-medium">Public Verification</div>
                      <div className="text-sm text-muted-foreground">
                        Allow anyone to verify IDs without logging in
                      </div>
                    </div>
                    <Switch
                      checked={settings.allow_public_verification}
                      onCheckedChange={(checked) => setSettings({ ...settings, allow_public_verification: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff Members
                      </CardTitle>
                      <CardDescription>
                        Manage staff who can access your institution's portal.
                      </CardDescription>
                    </div>
                    <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary border-0 gap-2">
                          <UserPlus className="h-4 w-4" />
                          Add Staff
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Staff Member</DialogTitle>
                          <DialogDescription>
                            Invite a new staff member to your institution.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleInviteStaff} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="staff_email">Email Address</Label>
                            <Input
                              id="staff_email"
                              type="email"
                              placeholder="staff@institution.edu"
                              value={staffForm.email}
                              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                              className={staffErrors.email ? 'border-destructive' : ''}
                            />
                            {staffErrors.email && (
                              <p className="text-sm text-destructive">{staffErrors.email}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staff_type">Role</Label>
                            <Select
                              value={staffForm.staffType}
                              onValueChange={(value: any) => setStaffForm({ ...staffForm, staffType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verifier">Verifier - Can verify identities</SelectItem>
                                <SelectItem value="registrar">Registrar - Can add/edit records</SelectItem>
                                <SelectItem value="security">Security - Can verify and view logs</SelectItem>
                                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsStaffDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" className="gradient-primary border-0">
                              Send Invite
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {staff.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No staff members yet. Add your first team member.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-mono text-sm">{member.user_id}</TableCell>
                            <TableCell>{getStaffTypeBadge(member.staff_type)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(member.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveStaff(member.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
