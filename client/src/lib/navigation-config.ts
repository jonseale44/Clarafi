import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  CreditCard,
  Key,
  Upload,
  Verified,
  BarChart3,
  UserCheck,
  Building2,
  MessageSquare
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon?: any;
  roles?: string[];
  hideOnMobile?: boolean;
  variant?: 'default' | 'warning' | 'success';
}

// Main navigation items available to all authenticated users
export const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Scheduling',
    href: '/scheduling',
    icon: Calendar,
    hideOnMobile: true,
  },
  {
    label: 'Blog',
    href: '/blog',
    icon: MessageSquare,
    hideOnMobile: true,
  },
];

// Role-specific navigation items
export const roleNavItems: Record<string, NavItem[]> = {
  provider: [
    {
      label: 'Practice Migration',
      href: '/practice-migration',
      icon: Upload,
      hideOnMobile: true,
    },
  ],
  admin: [
    {
      label: 'Admin Dashboard',
      href: '/admin',
      icon: Settings,
    },
    {
      label: 'User Management',
      href: '/admin/users',
      icon: Users,
      hideOnMobile: true,
    },
    {
      label: 'Prompts',
      href: '/admin/prompts',
      icon: FileText,
      hideOnMobile: true,
    },
    {
      label: 'Subscription Config',
      href: '/admin/subscription-config',
      icon: CreditCard,
      hideOnMobile: true,
    },
    {
      label: 'Health System Upgrade',
      href: '/admin/health-system-upgrade',
      icon: Building2,
      hideOnMobile: true,
      variant: 'warning',
    },
    {
      label: 'Subscription Keys',
      href: '/admin/subscription-keys',
      icon: Key,
      hideOnMobile: true,
    },
    {
      label: 'Clinic Import',
      href: '/admin/clinic-import',
      icon: Upload,
      hideOnMobile: true,
    },
    {
      label: 'Verification Review',
      href: '/admin/verification-review',
      icon: UserCheck,
      hideOnMobile: true,
      variant: 'success',
    },
    {
      label: 'Marketing',
      href: '/admin/marketing',
      icon: BarChart3,
      hideOnMobile: true,
    },
  ],
  clinic_admin: [
    {
      label: 'Clinic Dashboard',
      href: '/clinic-admin',
      icon: Building2,
    },
  ],
};

// Public navigation items (for landing page)
export const publicNavItems: NavItem[] = [
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Pricing',
    href: '/pricing',
  },
  {
    label: 'Blog',
    href: '/blog',
  },
];

// Footer navigation groups
export const footerNavGroups = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About Us', href: '/about' },
    { label: 'Blog', href: '/blog' },
  ],
  resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Support', href: '#' },
    { label: 'Status', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Business Associate Agreement', href: '/legal/business-associate-agreement' },
  ],
};

/**
 * Get navigation items for a specific user based on their role
 */
export function getNavigationItems(userRole?: string): NavItem[] {
  if (!userRole) return [];
  
  const items = [...mainNavItems];
  
  // Add role-specific items
  if (userRole === 'admin') {
    // System admin gets all admin items
    items.push(...roleNavItems.admin);
  } else if (userRole === 'clinic_admin') {
    items.push(...roleNavItems.clinic_admin);
  } else if (userRole === 'provider') {
    items.push(...roleNavItems.provider);
  }
  
  return items;
}

/**
 * Get breadcrumb items for a given path
 */
export function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];
  
  // Always start with dashboard for authenticated pages
  if (segments[0] !== 'auth' && segments.length > 0) {
    breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });
  }
  
  // Build breadcrumbs from path segments
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Map common segments to friendly names
    const labelMap: Record<string, string> = {
      'admin': 'Admin',
      'patients': 'Patients',
      'encounters': 'Encounters',
      'create': 'Create',
      'edit': 'Edit',
      'settings': 'Settings',
      'user-settings': 'User Settings',
      'account-settings': 'Account Settings',
      'scheduling': 'Scheduling',
      'blog': 'Blog',
      'about': 'About Us',
      'pricing': 'Pricing',
      'clinic-admin': 'Clinic Admin',
      'verification-review': 'Verification Review',
      'marketing': 'Marketing',
    };
    
    // Skip numeric IDs in breadcrumbs
    if (!isNaN(Number(segment))) {
      return;
    }
    
    const label = labelMap[segment] || segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({ label, href: currentPath });
  });
  
  return breadcrumbs;
}