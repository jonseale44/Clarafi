import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Key, 
  CreditCard, 
  Settings, 
  Building2,
  UserPlus,
  DollarSign,
  Activity,
  ArrowLeft,
  Home,
  LogOut,
  AlertCircle,
  Check,
  Clock,
  Mail,
  Copy
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClinicStats {
  totalUsers: number;
  activeProviders: number;
  totalStaff: number;
  unusedKeys: number;
  currentTier: number;
  subscriptionStatus: string;
  monthlySubscriptionCost: number;
  nextBillingDate: string;
  locationsCount: number;
  patientsCount: number;
}

interface SubscriptionKey {
  id: number;
  key: string;
  createdAt: string;
  usedAt: string | null;
  usedBy: number | null;
  role: string;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
}

export default function ClinicAdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  
  // Fetch clinic-specific statistics
  const { data: stats } = useQuery<ClinicStats>({
    queryKey: ['/api/clinic-admin/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clinic-admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch clinic stats');
      }
      return response.json();
    },
    enabled: user?.role === 'admin'
  });

  // Fetch subscription keys for this health system
  const { data: subscriptionKeys } = useQuery<SubscriptionKey[]>({
    queryKey: ['/api/subscription-keys'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription keys');
      }
      return response.json();
    },
    enabled: user?.role === 'admin'
  });

  // Generate new subscription key
  const generateKeyMutation = useMutation({
    mutationFn: async (data: { role: string; maxUses: number }) => {
      // Add required fields for key generation
      const requestData = {
        ...data,
        providerCount: data.role === 'provider' ? 1 : 0,
        staffCount: data.role === 'staff' ? 1 : 0,
        tier: stats?.currentTier || 2
      };
      const response = await apiRequest('POST', '/api/subscription-keys/generate', requestData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate subscription key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clinic-admin/stats'] });
      toast({
        title: "Success",
        description: "New subscription key generated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyToClipboard = async (key: string, keyId: number) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
      toast({
        title: "Copied!",
        description: "Subscription key copied to clipboard"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy key",
        variant: "destructive"
      });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access the clinic admin dashboard.
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

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return 'Personal EMR';
      case 2: return 'Enterprise EMR';
      default: return 'Unknown';
    }
  };

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
                <Building2 className="h-6 w-6 text-navy-blue mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Clinic Administration</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.firstName} {user?.lastName} • Clinic Admin
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => {
                      setLocation("/auth");
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
            Manage your health system's users, subscriptions, and access keys.
          </p>
        </div>

        {/* Subscription Status Alert */}
        {stats?.subscriptionStatus === 'trial' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your trial period ends soon. <Link href="/admin/subscription" className="underline">Upgrade now</Link> to continue using all features.
            </AlertDescription>
          </Alert>
        )}

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
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unused Keys</p>
                <p className="text-2xl font-bold">{stats?.unusedKeys || 0}</p>
              </div>
              <Key className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Cost</p>
                <p className="text-2xl font-bold">${stats?.monthlySubscriptionCost || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage providers and staff in your health system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Total Staff</p>
                    <p className="text-sm text-gray-600">{stats?.totalStaff || 0} users across all roles</p>
                  </div>
                  <Link href="/clinic-admin/users">
                    <Button size="sm">
                      Manage Users
                    </Button>
                  </Link>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Locations</p>
                    <p className="text-sm text-gray-600">{stats?.locationsCount || 0} active locations</p>
                  </div>
                  <Link href="/clinic-admin/locations">
                    <Button size="sm" variant="outline">
                      Manage Locations
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">Current Plan</p>
                    <Badge variant="default">{getTierName(stats?.currentTier || 2)}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    ${stats?.monthlySubscriptionCost || 0}/month
                  </p>
                  {stats?.nextBillingDate && (
                    <p className="text-sm text-gray-600 mt-1">
                      Next billing: {new Date(stats.nextBillingDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/subscription">
                    <Button size="sm" className="flex-1">
                      Manage Subscription
                    </Button>
                  </Link>
                  <Link href="/billing/management">
                    <Button size="sm" variant="outline" className="flex-1">
                      Billing & Payments
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Keys - Only show for Tier 2 (Enterprise) */}
          {stats?.currentTier === 2 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Subscription Keys
                    </CardTitle>
                    <CardDescription>
                      Generate access keys for your providers and staff
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      generateKeyMutation.mutate({ role: 'provider', maxUses: 1 });
                    }}
                    disabled={generateKeyMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Generate New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subscriptionKeys && subscriptionKeys.length > 0 ? (
                    subscriptionKeys.slice(0, 5).map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {key.key}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(key.key, key.id)}
                            >
                              {copiedKeyId === key.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>Role: {key.role}</span>
                            <span>Uses: {key.currentUses}/{key.maxUses}</span>
                            {key.usedAt ? (
                              <span className="text-green-600">Used</span>
                            ) : (
                              <span className="text-blue-600">Available</span>
                            )}
                          </div>
                        </div>
                        {key.usedAt && (
                          <Badge variant="outline" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Used
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No subscription keys generated yet</p>
                      <p className="text-sm mt-1">Generate keys to invite providers and staff</p>
                    </div>
                  )}
                  {subscriptionKeys && subscriptionKeys.length > 5 && (
                    <Link href="/admin/subscription-keys">
                      <Button variant="outline" className="w-full mt-2">
                        View All Keys ({subscriptionKeys.length})
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/admin/invite-staff" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Staff Members
                  </Button>
                </Link>
                <Link href="/admin/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Health System Settings
                  </Button>
                </Link>
                <Link href="/admin/support" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Health System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Health System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-xl font-semibold">{stats?.patientsCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Since</p>
                  <p className="text-xl font-semibold">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verification Status</p>
                  <Badge variant={user?.verificationStatus === 'admin_verified' ? 'default' : 'secondary'}>
                    {user?.verificationStatus === 'admin_verified' ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}