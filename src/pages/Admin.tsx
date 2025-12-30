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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BulkUpload } from '@/components/BulkUpload';
import { 
  Plus, 
  Loader2, 
  Users, 
  FileCheck, 
  Activity,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  UserCog,
  Building2,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IndexRecord {
  id: string;
  index_number: string;
  full_name: string;
  photo_url: string | null;
  organization: string;
  issued_at: string;
  expires_at: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  created_at: string;
}

interface VerificationLog {
  id: string;
  index_number: string;
  verification_result: boolean;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'user' | 'super_admin';
  staff_type: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

type RecordStatus = 'pending' | 'verified' | 'rejected' | 'expired';

interface UserInstitution {
  institution_id: string;
  institution_name: string;
  institution_slug: string;
  role: string;
  is_active: boolean;
}

export default function Admin() {
  const { user, isAdmin, institution, institutionId, isLoading: authLoading, refreshAuth } = useAuth();
  const [records, setRecords] = useState<IndexRecord[]>([]);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IndexRecord | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [userInstitutions, setUserInstitutions] = useState<UserInstitution[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    index_number: string;
    full_name: string;
    photo_url: string;
    organization: string;
    issued_at: string;
    expires_at: string;
    status: RecordStatus;
  }>({
    index_number: '',
    full_name: '',
    photo_url: '',
    organization: '',
    issued_at: '',
    expires_at: '',
    status: 'pending',
  });

  useEffect(() => {
    if (user) {
      fetchUserInstitutions();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, institutionId]);

  const fetchUserInstitutions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_institutions', {
        _user_id: user.id
      });
      if (error) throw error;
      setUserInstitutions(data || []);
    } catch (err) {
      console.error('Error fetching user institutions:', err);
    }
  };

  const handleSwitchInstitution = async (instId: string) => {
    if (!user || instId === institutionId) return;
    
    setIsSwitching(true);
    try {
      const { error } = await supabase.rpc('switch_active_institution', {
        _institution_id: instId,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Switched institution',
        description: 'Now viewing a different institution.',
      });
      
      await refreshAuth();
      await fetchUserInstitutions();
    } catch (error: any) {
      console.error('Switch error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch institution.',
        variant: 'destructive',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch records
      const { data: recordsData, error: recordsError } = await supabase
        .from('index_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // Fetch verification logs
      const { data: logsData, error: logsError } = await supabase
        .from('verification_logs')
        .select('id, index_number, verification_result, created_at, verified_by')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      
      // Map logs with placeholder for profile name
      const mappedLogs: VerificationLog[] = (logsData || []).map(log => ({
        id: log.id,
        index_number: log.index_number,
        verification_result: log.verification_result,
        created_at: log.created_at,
        profiles: null,
      }));
      setLogs(mappedLogs);

      // Fetch members of this institution
      if (institutionId) {
        const { data: membersData, error: membersError } = await supabase
          .from('user_roles')
          .select(`
            id,
            user_id,
            role,
            staff_type,
            profiles!user_roles_user_id_fkey (full_name, avatar_url)
          `)
          .eq('institution_id', institutionId);

        if (membersError) {
          console.error('Error fetching members:', membersError);
        } else {
          // Transform the data to match our interface
          const transformedMembers: Member[] = (membersData || []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            staff_type: m.staff_type,
            profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
          }));
          setMembers(transformedMembers);
        }
      }
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
      if (editingRecord) {
        const { error } = await supabase
          .from('index_records')
          .update({
            index_number: formData.index_number.toUpperCase(),
            full_name: formData.full_name,
            photo_url: formData.photo_url || null,
            organization: formData.organization,
            issued_at: formData.issued_at,
            expires_at: formData.expires_at,
            status: formData.status,
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast({ title: 'Record updated successfully' });
      } else {
        const { error } = await supabase
          .from('index_records')
          .insert({
            index_number: formData.index_number.toUpperCase(),
            full_name: formData.full_name,
            photo_url: formData.photo_url || null,
            organization: formData.organization,
            issued_at: formData.issued_at,
            expires_at: formData.expires_at,
            status: formData.status,
            created_by: user?.id,
            institution_id: institutionId,
          });

        if (error) throw error;
        toast({ title: 'Record created successfully' });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save record.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (record: IndexRecord) => {
    setEditingRecord(record);
    setFormData({
      index_number: record.index_number,
      full_name: record.full_name,
      photo_url: record.photo_url || '',
      organization: record.organization,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      status: record.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase
        .from('index_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Record deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete record.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (memberId: string, userId: string, newRole: 'admin' | 'user') => {
    if (userId === user?.id) {
      toast({
        title: 'Cannot change your own role',
        description: 'You cannot modify your own admin status.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingRole(memberId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: `Member has been ${newRole === 'admin' ? 'promoted to admin' : 'set as regular member'}.`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const resetForm = () => {
    setFormData({
      index_number: '',
      full_name: '',
      photo_url: '',
      organization: '',
      issued_at: '',
      expires_at: '',
      status: 'pending',
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the admin panel.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const filteredRecords = records.filter((record) =>
    record.index_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.organization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: records.length,
    verified: records.filter((r) => r.status === 'verified').length,
    pending: records.filter((r) => r.status === 'pending').length,
    verifications: logs.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              {userInstitutions.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={isSwitching}>
                      {isSwitching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                      {institution?.name || 'Select Institution'}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Switch Institution</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userInstitutions.map((inst) => (
                      <DropdownMenuItem
                        key={inst.institution_id}
                        onClick={() => handleSwitchInstitution(inst.institution_id)}
                        className={inst.is_active ? 'bg-primary/10' : ''}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{inst.institution_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{inst.institution_slug}</p>
                          </div>
                          {inst.is_active && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-muted-foreground">Manage identity records and view verification logs.</p>
          </div>
          <div className="flex gap-2">
            <BulkUpload 
              institutionId={institutionId} 
              userId={user?.id || ''} 
              onComplete={fetchData} 
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingRecord(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Record
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingRecord ? 'Edit Record' : 'Add New Record'}
                </DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the identity record details.' : 'Create a new identity record.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="index_number">Identification Number</Label>
                    <Input
                      id="index_number"
                      placeholder="ID-2024-001"
                      value={formData.index_number}
                      onChange={(e) => setFormData({ ...formData, index_number: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    placeholder="Acme Corporation"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo_url">Photo URL (optional)</Label>
                  <Input
                    id="photo_url"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issued_at">Issue Date</Label>
                    <Input
                      id="issued_at"
                      type="date"
                      value={formData.issued_at}
                      onChange={(e) => setFormData({ ...formData, issued_at: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expiry Date</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gradient-primary border-0">
                    {editingRecord ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verifications</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.verifications}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="records" className="space-y-4">
          <TabsList>
            <TabsTrigger value="records" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Records
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <UserCog className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle>Identity Records</CardTitle>
                    <CardDescription>Manage all identity records in the system.</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Index Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono">{record.index_number}</TableCell>
                            <TableCell>{record.full_name}</TableCell>
                            <TableCell>{record.organization}</TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>{new Date(record.expires_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
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

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Institution Members</CardTitle>
                <CardDescription>Manage members and their roles. Only members of your institution are shown.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No members found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Staff Type</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  {member.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span>{member.profiles?.full_name || 'Unknown'}</span>
                                {member.user_id === user?.id && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.role === 'admin' || member.role === 'super_admin' ? (
                                <Badge className="gap-1 bg-primary">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Member</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.staff_type ? (
                                <Badge variant="outline" className="capitalize">{member.staff_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {member.user_id !== user?.id && member.role !== 'super_admin' && (
                                <Select
                                  value={member.role}
                                  onValueChange={(value: 'admin' | 'user') => handleUpdateRole(member.id, member.user_id, value)}
                                  disabled={isUpdatingRole === member.id}
                                >
                                  <SelectTrigger className="w-32">
                                    {isUpdatingRole === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
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

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Verification Logs</CardTitle>
                <CardDescription>Recent verification attempts (last 50).</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No verification logs yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Index Number</TableHead>
                          <TableHead>Verified By</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono">{log.index_number}</TableCell>
                            <TableCell>{log.profiles?.full_name || 'Unknown'}</TableCell>
                            <TableCell>
                              {log.verification_result ? (
                                <Badge className="bg-success gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Found
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Not Found
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
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