import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  Users, 
  Key, 
  Settings, 
  FileText, 
  Building, 
  Shield,
  UserPlus,
  DollarSign,
  Database,
  BarChart,
  ArrowLeft,
  Home,
  ChevronRight,
  LogOut,
  MapPin,
  Building2,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  actions?: {
    label: string;
    href: string;
    variant?: "default" | "secondary" | "outline";
  }[];
  stats?: {
    label: string;
    value: string | number;
    change?: string;
  }[];
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Fetch admin statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      return response.json();
    },
    enabled: user?.role === 'admin'
  });

  const adminSections: AdminSection[] = [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage users, roles, and permissions across your health system',
      icon: <Users className="h-6 w-6" />,
      actions: [
        { label: 'Manage Users', href: '/admin/users', variant: 'default' },
        { label: 'Subscription Keys', href: '/admin/subscription-keys', variant: 'secondary' }
      ],
      stats: [
        { label: 'Total Users', value: stats?.totalUsers || 0 },
        { label: 'Active Providers', value: stats?.activeProviders || 0 },
        { label: 'Pending Invites', value: stats?.pendingInvites || 0 }
      ]
    },
    {
      id: 'verification',
      title: 'Admin Verification',
      description: 'Review and approve new clinic administrator requests',
      icon: <Shield className="h-6 w-6" />,
      actions: [
        { label: 'Review Requests', href: '/admin/verification-review', variant: 'default' },
        { label: 'Request Admin Access', href: '/admin-verification', variant: 'outline' }
      ],
      stats: [
        { label: 'Pending Reviews', value: stats?.pendingVerifications || 0 },
        { label: 'Approved Today', value: stats?.approvedToday || 0 }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      description: 'Manage subscription tiers, pricing, and payment settings',
      icon: <DollarSign className="h-6 w-6" />,
      actions: [
        { label: 'Subscription Config', href: '/admin/subscription-config', variant: 'default' },
        { label: 'Test Upgrade', href: '/admin/health-system-upgrade', variant: 'secondary' }
      ],
      stats: [
        { label: 'Monthly Revenue', value: `$${stats?.monthlyRevenue || 0}` },
        { label: 'Active Subscriptions', value: stats?.activeSubscriptions || 0 }
      ]
    },
    {
      id: 'marketing-analytics',
      title: 'Marketing & Analytics',
      description: 'Track acquisition, conversions, and marketing performance insights',
      icon: <TrendingUp className="h-6 w-6" />,
      actions: [
        { label: 'Marketing Dashboard', href: '/admin/marketing', variant: 'default' },
        { label: 'View Analytics', href: '/admin/marketing-analytics', variant: 'secondary' }
      ],
      stats: [
        { label: 'Monthly Signups', value: stats?.monthlySignups || 0 },
        { label: 'Conversion Rate', value: `${stats?.conversionRate || 0}%` },
        { label: 'Active Campaigns', value: stats?.activeCampaigns || 0 }
      ]
    },
    {
      id: 'system-config',
      title: 'System Configuration',
      description: 'Configure AI prompts, templates, and system settings',
      icon: <Settings className="h-6 w-6" />,
      actions: [
        { label: 'Admin Prompts', href: '/admin/prompts', variant: 'default' },
        { label: 'Prompt Configuration', href: '/admin/prompts', variant: 'secondary' }
      ]
    },
    {
      id: 'healthcare-data',
      title: 'Healthcare Data Management',
      description: 'Import nationwide clinic data from NPPES and manage healthcare facilities',
      icon: <MapPin className="h-6 w-6" />,
      actions: [
        { label: 'US Healthcare Data', href: '/admin/healthcare-data', variant: 'default' },
        { label: 'Clinic Import', href: '/admin/clinic-import', variant: 'secondary' },
        { label: 'Import Pharmacies', href: '/admin/pharmacy-import', variant: 'secondary' }
      ],
      stats: [
        { label: 'Health Systems', value: stats?.totalHealthSystems || 0 },
        { label: 'Clinical Locations', value: stats?.totalLocations || 0 },
        { label: 'Coverage', value: 'Nationwide' }
      ]
    },
    {
      id: 'data-management',
      title: 'System Data Management',
      description: 'Manage patient data, migrations, and system transfers',
      icon: <Database className="h-6 w-6" />,
      actions: [
        { label: 'Test Patients', href: '/admin/test-patients', variant: 'default' },
        { label: 'Practice Migration', href: '/practice-migration', variant: 'secondary' }
      ],
      stats: [
        { label: 'Test Patients', value: stats?.testPatients || 0 },
        { label: 'Pending Migrations', value: stats?.pendingMigrations || 0 }
      ]
    },
    {
      id: 'blog-management',
      title: 'Blog & SEO Management',
      description: 'Manage AI-generated blog content and SEO optimization',
      icon: <FileText className="h-6 w-6" />,
      actions: [
        { label: 'Manage Blog', href: '/admin/blog', variant: 'default' },
        { label: 'View Public Blog', href: '/blog', variant: 'secondary' }
      ],
      stats: [
        { label: 'Articles Pending', value: stats?.pendingArticles || 0 },
        { label: 'Published Articles', value: stats?.publishedArticles || 0 },
        { label: 'Total Views', value: stats?.totalBlogViews || 0 }
      ]
    }
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access the admin dashboard.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-gray-600">
            Manage your health system settings, users, and configurations from one central location.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold">{stats?.activeProviders || 0}</p>
              </div>
              <UserPlus className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Health Systems</p>
                <p className="text-2xl font-bold">{stats?.totalHealthSystems || 0}</p>
              </div>
              <Building className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold">${stats?.monthlyRevenue || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Card key={section.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {section.icon}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {section.title}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {section.description}
              </p>

              {section.stats && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {section.stats.slice(0, 2).map((stat, index) => (
                      <div key={index}>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-lg font-semibold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section.actions && (
                <div className="space-y-2">
                  {section.actions.map((action, index) => (
                    <Link key={index} href={action.href}>
                      <Button 
                        variant={action.variant || "default"} 
                        className="w-full justify-between"
                      >
                        {action.label}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats?.recentActivity?.length > 0 ? (
              stats.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">{activity.description}</span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.timestamp}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity to display</p>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}