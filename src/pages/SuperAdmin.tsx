import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Loader2, 
  Building2, 
  Users,
  Edit,
  Trash2,
  XCircle,
  UserPlus,
  Palette,
  Shield,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Institution {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_text: string;
  created_at: string;
}

interface InstitutionAdmin {
  id: string;
  user_id: string;
  institution_id: string;
  profiles?: { full_name: string | null; } | null;
  institutions?: { name: string } | null;
}

interface SuperAdminUser {
  id: string;
  user_id: string;
  profile?: { full_name: string | null; user_id: string } | null;
}

export default function SuperAdmin() {
  const { user, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [admins, setAdmins] = useState<InstitutionAdmin[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isSuperAdminDialogOpen, setIsSuperAdminDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    welcome_text: 'Welcome to our verification portal',
  });

  const [adminFormData, setAdminFormData] = useState({
    email: '',
    institution_id: '',
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch institutions
      const { data: institutionsData, error: institutionsError } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (institutionsError) throw institutionsError;
      setInstitutions(institutionsData || []);

      // Fetch institution admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('user_roles')
        .select('id, user_id, institution_id, role')
        .eq('role', 'admin')
        .not('institution_id', 'is', null);

      if (adminsError) throw adminsError;
      setAdmins(adminsData?.map(a => ({
        id: a.id,
        user_id: a.user_id,
        institution_id: a.institution_id!,
        profiles: null,
        institutions: null,
      })) || []);

      // Fetch super admins
      const { data: superAdminsData, error: superAdminsError } = await supabase
        .from('user_roles')
        .select('id, user_id')
        .eq('role', 'super_admin');

      if (superAdminsError) throw superAdminsError;
      
      // Fetch profiles for super admins
      const superAdminUserIds = superAdminsData?.map(sa => sa.user_id) || [];
      let profilesMap: Record<string, { full_name: string | null; user_id: string }> = {};
      
      if (superAdminUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', superAdminUserIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      setSuperAdmins(superAdminsData?.map(sa => ({
        id: sa.id,
        user_id: sa.user_id,
        profile: profilesMap[sa.user_id] || null,
      })) || []);

      // Fetch all profiles for the dropdown
      const { data: allProfilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });
      
      setAllProfiles(allProfilesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (editingInstitution) {
        const { error } = await supabase
          .from('institutions')
          .update({
            name: formData.name,
            slug,
            logo_url: formData.logo_url || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            welcome_text: formData.welcome_text,
          })
          .eq('id', editingInstitution.id);

        if (error) throw error;
        toast({ title: 'Institution updated successfully' });
      } else {
        const { error } = await supabase
          .from('institutions')
          .insert({
            name: formData.name,
            slug,
            logo_url: formData.logo_url || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            welcome_text: formData.welcome_text,
          });

        if (error) throw error;
        toast({ title: 'Institution created successfully' });
      }

      setIsDialogOpen(false);
      setEditingInstitution(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save institution.',
        variant: 'destructive',
      });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First, find the user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('full_name', `%${adminFormData.email}%`)
        .limit(1);

      // If no profile found by name, we need to check if user exists by other means
      // For now, we'll create the admin role if they provide a valid user_id
      
      toast({
        title: 'Info',
        description: 'To add an admin, the user must first sign up. Then you can assign them as admin using their user ID from the backend.',
      });
      
      setIsAdminDialogOpen(false);
      setAdminFormData({ email: '', institution_id: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add admin.',
        variant: 'destructive',
      });
    }
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if user already has super_admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUserId)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Info',
          description: 'This user is already a super admin.',
        });
        return;
      }

      // Insert super_admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: 'super_admin',
        });

      if (error) throw error;

      toast({ title: 'Super admin added successfully' });
      setIsSuperAdminDialogOpen(false);
      setSelectedUserId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add super admin.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSuperAdmin = async (roleId: string, userId: string) => {
    if (userId === user?.id) {
      toast({
        title: 'Error',
        description: 'You cannot remove your own super admin role.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to remove this user\'s super admin role?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({ title: 'Super admin role removed' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove super admin.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (institution: Institution) => {
    setEditingInstitution(institution);
    setFormData({
      name: institution.name,
      slug: institution.slug,
      logo_url: institution.logo_url || '',
      primary_color: institution.primary_color,
      secondary_color: institution.secondary_color,
      welcome_text: institution.welcome_text,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this institution? This will delete all associated records.')) return;

    try {
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Institution deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete institution.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      logo_url: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      welcome_text: 'Welcome to our verification portal',
    });
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

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only super administrators can access this page.
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
            <h1 className="font-display text-3xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-muted-foreground">Manage institutions and their administrators.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isSuperAdminDialogOpen} onOpenChange={setIsSuperAdminDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Crown className="h-4 w-4" />
                  Add Super Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Add Super Admin</DialogTitle>
                  <DialogDescription>
                    Grant super admin privileges to an existing user.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSuperAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="super_admin_user">Select User</Label>
                    <select
                      id="super_admin_user"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                    >
                      <option value="">Select a user...</option>
                      {allProfiles
                        .filter(p => !superAdmins.some(sa => sa.user_id === p.user_id))
                        .map((profile) => (
                          <option key={profile.user_id} value={profile.user_id}>
                            {profile.full_name || 'Unnamed User'} ({profile.user_id.slice(0, 8)}...)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsSuperAdminDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-primary border-0">
                      Grant Super Admin
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Add Institution Admin</DialogTitle>
                  <DialogDescription>
                    Assign an existing user as an institution administrator.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">User Email</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_institution">Institution</Label>
                    <select
                      id="admin_institution"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={adminFormData.institution_id}
                      onChange={(e) => setAdminFormData({ ...adminFormData, institution_id: e.target.value })}
                      required
                    >
                      <option value="">Select institution...</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-primary border-0">
                      Add Admin
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingInstitution(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Institution
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    {editingInstitution ? 'Edit Institution' : 'Add New Institution'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingInstitution ? 'Update the institution details.' : 'Create a new institution with custom branding.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Institution Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme University"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      placeholder="acme-university"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to auto-generate from name</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Primary Color
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary_color"
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome_text">Welcome Text</Label>
                    <Input
                      id="welcome_text"
                      placeholder="Welcome to our verification portal"
                      value={formData.welcome_text}
                      onChange={(e) => setFormData({ ...formData, welcome_text: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-primary border-0">
                      {editingInstitution ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Institutions</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{institutions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Institution Admins</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{admins.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{superAdmins.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="institutions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="institutions" className="gap-2">
              <Building2 className="h-4 w-4" />
              Institutions
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Users className="h-4 w-4" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="super-admins" className="gap-2">
              <Crown className="h-4 w-4" />
              Super Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="institutions">
            <Card>
              <CardHeader>
                <CardTitle>All Institutions</CardTitle>
                <CardDescription>Manage all institutions in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : institutions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No institutions yet. Create your first one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Colors</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {institutions.map((institution) => (
                          <TableRow key={institution.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {institution.logo_url ? (
                                  <img
                                    src={institution.logo_url}
                                    alt={institution.name}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: institution.primary_color }}
                                  >
                                    {institution.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-medium">{institution.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{institution.slug}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <div 
                                  className="h-6 w-6 rounded border"
                                  style={{ backgroundColor: institution.primary_color }}
                                  title={`Primary: ${institution.primary_color}`}
                                />
                                <div 
                                  className="h-6 w-6 rounded border"
                                  style={{ backgroundColor: institution.secondary_color }}
                                  title={`Secondary: ${institution.secondary_color}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(institution.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(institution)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(institution.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle>Institution Administrators</CardTitle>
                <CardDescription>Users with admin access to specific institutions.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : admins.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No institution admins assigned yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Institution ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell className="font-mono text-sm">
                              {admin.user_id}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {admin.institution_id}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="super-admins">
            <Card>
              <CardHeader>
                <CardTitle>Super Administrators</CardTitle>
                <CardDescription>Users with full system access across all institutions.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : superAdmins.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No super admins assigned yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {superAdmins.map((sa) => (
                          <TableRow key={sa.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {sa.profile?.full_name || 'Unknown User'}
                                </span>
                                {sa.user_id === user?.id && (
                                  <Badge variant="secondary" className="text-xs">You</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {sa.user_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveSuperAdmin(sa.id, sa.user_id)}
                                disabled={sa.user_id === user?.id}
                                title={sa.user_id === user?.id ? "You cannot remove yourself" : "Remove super admin"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
