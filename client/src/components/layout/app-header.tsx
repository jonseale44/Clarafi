import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  User, 
  Settings, 
  Bell,
  Search,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  className?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
}

export function AppHeader({ className, showSearch = true, onMenuClick }: AppHeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/dashboard?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Determine home destination based on auth state
  const homeDestination = user ? '/dashboard' : '/';
  
  // Get user initials for avatar fallback
  const userInitials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '';

  // Determine if we're in admin section
  const isAdminSection = location.startsWith('/admin');
  
  return (
    <header className={cn("bg-white border-b border-gray-200 sticky top-0 z-50", className)}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left section: Logo and Navigation */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="mr-3 p-2 rounded-md hover:bg-gray-100 lg:hidden"
                data-median="mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            {/* Logo - Clickable home button */}
            <Link href={homeDestination} className="flex items-center">
              <div className="flex items-center group cursor-pointer">
                {/* CLARAFI Brand */}
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    <span className="text-[#1e3a8a]">CLAR</span>
                    <span className="text-[#fbbf24]">AFI</span>
                  </span>
                </div>
                
                {/* Separator and context (hidden on mobile) */}
                {user && (
                  <div className="hidden sm:flex items-center ml-4 text-sm text-gray-500">
                    <div className="h-6 w-px bg-gray-300 mr-4" />
                    {isAdminSection ? 'Admin Dashboard' : 'Medical Records'}
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Center section: Search (desktop only) */}
          {showSearch && user && (
            <form 
              onSubmit={handleSearch} 
              className="hidden lg:block flex-1 max-w-md mx-8"
              data-median="hide-on-mobile-app"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search patients, MRN, or records..."
                  className="pl-10 pr-4 py-2 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          )}

          {/* Right section: User menu and actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications (desktop only) */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hidden sm:inline-flex"
                  data-median="hide-on-mobile-app"
                >
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Button>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 px-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {user.role}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem asChild>
                      <Link href="/user-settings">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/account-settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Admin menu items */}
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="mr-2 h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logoutMutation.mutate()}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Unauthenticated user actions */
              <div className="flex items-center space-x-3">
                <Link href="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth?mode=signup">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}