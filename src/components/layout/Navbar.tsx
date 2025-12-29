import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Search, Settings, LogOut, Menu, X, Building2, Cog } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, isAdmin, isSuperAdmin, institution, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/verify', label: 'Verify', icon: Search, requiresAuth: true },
    { to: '/docs', label: 'Documentation', icon: FileText, requiresAuth: false },
    ...(isAdmin ? [
      { to: '/admin', label: 'Admin', icon: Settings, requiresAuth: true },
      { to: '/settings', label: 'Settings', icon: Cog, requiresAuth: true },
    ] : []),
    ...(isSuperAdmin ? [{ to: '/super-admin', label: 'Super Admin', icon: Building2, requiresAuth: true }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          {institution?.logo_url ? (
            <img src={institution.logo_url} alt={institution.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: institution?.primary_color ? `linear-gradient(135deg, ${institution.primary_color}, ${institution.secondary_color})` : undefined }}
              {...(!institution && { className: "flex h-9 w-9 items-center justify-center rounded-lg gradient-primary" })}
            >
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="hidden sm:inline">{institution?.name || 'VerifyID'}</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            if (link.requiresAuth && !user) return null;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="gradient-primary border-0">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-slide-up">
          <div className="container py-4 space-y-2">
            {navLinks.map((link) => {
              if (link.requiresAuth && !user) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-border">
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <div className="space-y-2">
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full gradient-primary border-0">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}