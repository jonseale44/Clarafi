import { ReactNode, useState } from 'react';
import { AppHeader } from './app-header';
import { NavigationBreadcrumb } from '@/components/ui/navigation-breadcrumb';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  showBreadcrumb?: boolean;
  showSearch?: boolean;
}

export function AppLayout({ 
  children, 
  className,
  showBreadcrumb = true,
  showSearch = true 
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Persistent header */}
      <AppHeader 
        showSearch={showSearch}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      
      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Breadcrumb navigation */}
      {showBreadcrumb && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
          <NavigationBreadcrumb />
        </div>
      )}
      
      {/* Main content */}
      <main className={cn("flex-1", className)}>
        {children}
      </main>
    </div>
  );
}