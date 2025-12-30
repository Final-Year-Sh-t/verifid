import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  Clock,
  Activity,
  Shield,
  Users,
  Settings,
  FileText
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

  const quickActions = [
    {
      icon: Search,
      title: 'Verify Identity',
      description: 'Search and verify records',
      href: '/verify',
      primary: true,
    },
    {
      icon: Users,
      title: 'Manage Records',
      description: 'View all records',
      href: '/admin',
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Configure your account',
      href: '/settings',
    },
    {
      icon: FileText,
      title: 'Documentation',
      description: 'API & guides',
      href: '/docs',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Hero Welcome Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
          <div className="container px-4 py-8 md:py-12">
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">VerifyID Dashboard</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">
                {getGreeting()}, {firstName}!
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                {institution ? `${institution.name} • ` : ''}
                Ready to verify identities and manage your records.
              </p>
            </div>
          </div>
        </div>

        <div className="container px-4 py-6 md:py-8 space-y-6 md:space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Card className="relative overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary mb-2" />
                  <span className="text-xl md:text-3xl font-bold font-display">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats?.totalVerifications || 0
                    )}
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground mt-1">
                    Total
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 h-16 w-16 md:h-24 md:w-24 rounded-full bg-primary/5" />
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success mb-2" />
                  <span className="text-xl md:text-3xl font-bold font-display text-success">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats?.successfulVerifications || 0
                    )}
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground mt-1">
                    Verified
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 h-16 w-16 md:h-24 md:w-24 rounded-full bg-success/5" />
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col">
                  <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive mb-2" />
                  <span className="text-xl md:text-3xl font-bold font-display text-destructive">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats?.failedVerifications || 0
                    )}
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground mt-1">
                    Not Found
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 h-16 w-16 md:h-24 md:w-24 rounded-full bg-destructive/5" />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {quickActions.map((action, index) => (
                <Link key={action.title} to={action.href}>
                  <Card 
                    className={`h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group ${
                      action.primary 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0' 
                        : 'hover:border-primary/30'
                    }`}
                  >
                    <CardContent className="p-4 md:p-5">
                      <action.icon className={`h-5 w-5 md:h-6 md:w-6 mb-3 ${
                        action.primary ? 'text-primary-foreground' : 'text-primary'
                      }`} />
                      <h3 className={`font-medium text-sm md:text-base mb-1 ${
                        action.primary ? '' : 'text-foreground'
                      }`}>
                        {action.title}
                      </h3>
                      <p className={`text-xs hidden sm:block ${
                        action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {action.description}
                      </p>
                      <ArrowRight className={`h-4 w-4 mt-2 transition-transform group-hover:translate-x-1 ${
                        action.primary ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
              {stats?.recentVerifications && stats.recentVerifications.length > 0 && (
                <Link to="/verify" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats?.recentVerifications && stats.recentVerifications.length > 0 ? (
              <div className="space-y-2">
                {stats.recentVerifications.map((log) => (
                  <Card key={log.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3 md:p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full shrink-0 ${
                          log.verification_result 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {log.verification_result ? (
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                          ) : (
                            <XCircle className="h-4 w-4 md:h-5 md:w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium truncate">
                            {log.index_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.verification_result ? 'Verified successfully' : 'No match found'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span className="hidden sm:inline">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="sm:hidden">
                          {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No verifications yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by verifying your first identity
                  </p>
                  <Link to="/verify">
                    <Button size="sm" className="gap-2">
                      <Search className="h-4 w-4" />
                      Start Verifying
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
