import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  LogOut
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
      id: 'data-management',
      title: 'Data Management',
      description: 'Import clinics, manage migrations, and handle data transfers',
      icon: <Database className="h-6 w-6" />,
      actions: [
        { label: 'Clinic Import', href: '/admin/clinic-import', variant: 'default' },
        { label: 'Practice Migration', href: '/practice-migration', variant: 'secondary' }
      ],
      stats: [
        { label: 'Total Clinics', value: stats?.totalClinics || 0 },
        { label: 'Pending Migrations', value: stats?.pendingMigrations || 0 }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <Home className="h-4 w-4 mr-2" />
                  Main Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-navy-blue rounded-lg flex items-center justify-center mr-3">
                  <span className="text-gold font-bold text-sm">C</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.firstName} {user?.lastName} • Admin
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => {
                      setLocation("/login");
                    }
                  });
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}