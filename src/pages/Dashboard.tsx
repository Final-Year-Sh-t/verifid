import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ClipboardList, 
  ArrowRight,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';

interface DashboardStats {
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  recentVerifications: Array<{
    id: string;
    index_number: string;
    verification_result: boolean;
    created_at: string;
  }>;
}

export default function Dashboard() {
  const { user, institution, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user's verification logs
      const { data: logs, error } = await supabase
        .from('verification_logs')
        .select('id, index_number, verification_result, created_at')
        .eq('verified_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      // Calculate stats
      const { count: totalCount } = await supabase
        .from('verification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('verified_by', user?.id);

      const { count: successCount } = await supabase
        .from('verification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('verified_by', user?.id)
        .eq('verification_result', true);

      setStats({
        totalVerifications: totalCount || 0,
        successfulVerifications: successCount || 0,
        failedVerifications: (totalCount || 0) - (successCount || 0),
        recentVerifications: logs || [],
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <Layout>
      <div className="container py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-2">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            {institution ? `${institution.name} • ` : ''}Ready to verify identities? Start searching below.
          </p>
        </div>

        {/* Quick Action Card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Search className="h-5 w-5 text-primary" />
              Start Verifying
            </CardTitle>
            <CardDescription>
              Enter an identification number to verify someone's identity instantly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/verify">
              <Button className="gradient-primary border-0 gap-2">
                Go to Verification
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalVerifications || 0}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-success">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.successfulVerifications || 0}
              </div>
              <p className="text-xs text-muted-foreground">Identities verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Not Found</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-destructive">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.failedVerifications || 0}
              </div>
              <p className="text-xs text-muted-foreground">No matching records</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <ClipboardList className="h-5 w-5" />
              Recent Verifications
            </CardTitle>
            <CardDescription>Your latest verification attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats?.recentVerifications && stats.recentVerifications.length > 0 ? (
              <div className="space-y-3">
                {stats.recentVerifications.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        log.verification_result ? 'bg-success/20' : 'bg-destructive/20'
                      }`}>
                        {log.verification_result ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium font-mono text-sm">{log.index_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.verification_result ? 'Verified' : 'Not found'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No verifications yet</p>
                <p className="text-sm">Start by verifying your first identity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
