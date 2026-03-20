import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsAdmin } from '../hooks/useQueries';
import { Button } from './ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const { data: isAdmin, refetch: refetchIsAdmin, isFetching: isAdminFetching } = useIsAdmin();
  const queryClient = useQueryClient();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = !!identity;

  // Refetch admin status when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      refetchIsAdmin();
    }
  }, [isAuthenticated, refetchIsAdmin]);

  const handleAuth = async () => {
    setMobileMenuOpen(false);
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      navigate({ to: '/' });
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const navLinks = [
    { label: 'About', path: '/about' },
    { label: 'Writing', path: '/writing' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNavClick = (path: string) => {
    navigate({ to: path });
    setMobileMenuOpen(false);
  };

  // Show admin link only when authenticated and confirmed admin (not during loading)
  const showAdminLink = isAuthenticated && !isAdminFetching && isAdmin === true;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border relative">
        <div className="container max-w-4xl mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-2xl font-bold tracking-tight hover:opacity-70 transition-opacity"
            >
              Tomwm
            </button>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate({ to: link.path })}
                    className={`text-sm font-medium transition-colors hover:text-foreground ${
                      currentPath === link.path ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {showAdminLink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/admin' })}
                    className="text-sm"
                  >
                    Admin
                  </Button>
                )}
                <Button
                  variant={isAuthenticated ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleAuth}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : isAuthenticated ? 'Log out' : 'Log in'}
                </Button>
              </div>
            </div>

            {/* Mobile Hamburger Menu Button */}
            <div className="flex md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </div>
          </nav>
        </div>

        {/* Mobile Dropdown Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-50">
            <div className="container max-w-4xl mx-auto px-6 py-4">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`text-left text-base font-medium transition-colors hover:text-foreground py-3 px-2 rounded-md hover:bg-accent ${
                      currentPath === link.path ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                {showAdminLink && (
                  <button
                    onClick={() => handleNavClick('/admin')}
                    className={`text-left text-base font-medium transition-colors hover:text-foreground py-3 px-2 rounded-md hover:bg-accent ${
                      currentPath === '/admin' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    Admin
                  </button>
                )}
                <div className="pt-2 mt-2 border-t border-border">
                  <Button
                    variant={isAuthenticated ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleAuth}
                    disabled={isLoggingIn}
                    className="w-full"
                  >
                    {isLoggingIn ? 'Logging in...' : isAuthenticated ? 'Log out' : 'Log in'}
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
            © 2025. Built with <Heart className="w-3.5 h-3.5 fill-current text-destructive" /> using{' '}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
