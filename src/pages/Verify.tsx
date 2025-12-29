import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle2, XCircle, User, Building2, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationResult {
  found: boolean;
  data?: {
    index_number: string;
    full_name: string;
    photo_url: string | null;
    organization: string;
    issued_at: string;
    expires_at: string;
    status: string;
  };
}

export default function Verify() {
  const { user, institutionId, isLoading: authLoading } = useAuth();
  const [indexNumber, setIndexNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!indexNumber.trim()) {
      toast({
        title: 'Identification number required',
        description: 'Please enter an identification number to verify.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      // Search for the index number
      const { data, error } = await supabase
        .from('index_records')
        .select('index_number, full_name, photo_url, organization, issued_at, expires_at, status')
        .eq('index_number', indexNumber.trim().toUpperCase())
        .eq('status', 'verified')
        .maybeSingle();

      if (error) {
        console.error('Search error:', error);
        toast({
          title: 'Search failed',
          description: 'An error occurred while searching. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Log the verification attempt
      await supabase.from('verification_logs').insert({
        index_number: indexNumber.trim().toUpperCase(),
        verified_by: user.id,
        verification_result: data !== null,
        user_agent: navigator.userAgent,
        institution_id: institutionId,
      });

      setResult({
        found: data !== null,
        data: data || undefined,
      });

    } catch (err) {
      console.error('Verification error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const isExpired = result?.data?.expires_at && new Date(result.data.expires_at) < new Date();

  return (
    <Layout>
      <div className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              Verify Identity
            </h1>
            <p className="text-muted-foreground">
              Enter an identification number to verify someone's identity.
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter identification number (e.g., ID-2024-001)"
                    value={indexNumber}
                    onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                  />
                </div>
                <Button type="submit" disabled={isSearching} className="gradient-primary border-0">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <Card className={`animate-scale-in ${result.found ? 'border-success/50' : 'border-destructive/50'}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {result.found ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">Identity Verified</CardTitle>
                        <CardDescription>Record found in the database</CardDescription>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                        <XCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">Not Found</CardTitle>
                        <CardDescription>No verified record matches this identification number</CardDescription>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>

              {result.found && result.data && (
                <CardContent className="pt-0">
                  {isExpired && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-warning/20 p-3 text-warning-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">This ID has expired</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-6">
                    {result.data.photo_url ? (
                      <div className="flex-shrink-0">
                        <img
                          src={result.data.photo_url}
                          alt={result.data.full_name}
                          className="h-32 w-32 rounded-xl object-cover border border-border"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-32 w-32 rounded-xl bg-secondary flex items-center justify-center border border-border">
                        <User className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                        <div className="font-display text-lg font-semibold">{result.data.full_name}</div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Organization
                          </div>
                          <div className="font-medium">{result.data.organization}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Valid Period
                          </div>
                          <div className="font-medium">
                            {new Date(result.data.issued_at).toLocaleDateString()} -{' '}
                            {new Date(result.data.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={isExpired ? 'destructive' : 'default'} className={!isExpired ? 'bg-success' : ''}>
                          {isExpired ? 'Expired' : 'Active'}
                        </Badge>
                        <Badge variant="outline" className="uppercase">
                          {result.data.index_number}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {!result && (
            <div className="text-center text-muted-foreground py-12">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter an identification number above to verify an identity</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}