import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Shield, Search, Lock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const features = [
  {
    icon: Search,
    title: 'Instant Verification',
    description: 'Verify identity credentials in seconds with our streamlined lookup system.',
  },
  {
    icon: Lock,
    title: 'Secure & Private',
    description: 'Enterprise-grade security with end-to-end encryption and role-based access control.',
  },
  {
    icon: Users,
    title: 'Admin Dashboard',
    description: 'Comprehensive management tools for administrators to oversee all verifications.',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '<1s', label: 'Verification Time' },
  { value: '256-bit', label: 'Encryption' },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(220_90%_50%/0.15),transparent_50%)]" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary-foreground mb-6 animate-fade-in">
              <Shield className="h-4 w-4" />
              <span>Trusted Identity Verification</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Digital Identity{' '}
              <span className="text-gradient">Verification</span>{' '}
              Made Simple
            </h1>
            <p className="text-lg text-primary-foreground/70 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Securely verify identities using identification numbers. Fast, reliable, and compliant with the highest security standards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {user ? (
                <Link to="/verify">
                  <Button size="lg" className="gradient-primary border-0 gap-2 w-full sm:w-auto">
                    Start Verifying
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button size="lg" className="gradient-primary border-0 gap-2 w-full sm:w-auto">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/docs">
                    <Button size="lg" variant="outline" className="border-primary/30 text-primary-foreground hover:bg-primary/10 w-full sm:w-auto">
                      View Documentation
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg">
              A complete solution for identity verification with powerful admin tools.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/30 animate-slide-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-secondary/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to verify any identity.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            {[
              { step: '01', title: 'Sign In', description: 'Create an account or sign in to access the verification portal.' },
              { step: '02', title: 'Enter Identification Number', description: 'Input the unique identification number you want to verify.' },
              { step: '03', title: 'Get Results', description: 'Instantly receive verified identity information including name, photo, and organization.' },
            ].map((item, index) => (
              <div
                key={item.step}
                className="flex gap-6 items-start mb-8 last:mb-0 animate-slide-up"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center font-display text-xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div className="pt-2">
                  <h3 className="font-display text-xl font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center rounded-3xl gradient-hero p-12">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-6" />
            <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
              Join thousands of organizations using VerifyID for secure identity verification.
            </p>
            {user ? (
              <Link to="/verify">
                <Button size="lg" className="gradient-accent border-0 gap-2">
                  Go to Verification
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-accent border-0 gap-2">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}