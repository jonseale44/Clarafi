import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Calendar, 
  Users, 
  Key, 
  TrendingUp, 
  Download, 
  AlertCircle,
  Check,
  Shield,
  Building2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

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

interface BillingHistory {
  id: number;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

const TIER_BENEFITS = {
  1: {
    name: 'Professional EMR',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    price: 149,
    features: [
      'Single provider account',
      'Full EMR features',
      'AI SOAP notes',
      'E-prescribing',
      'Lab integrations',
      'Document management',
      'Basic support'
    ]
  },
  2: {
    name: 'Advanced EMR',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    price: 399,
    features: [
      'Up to 5 providers',
      'Everything in Professional',
      'Multi-location support',
      'Staff accounts',
      'Advanced reporting',
      'Priority support',
      'Custom workflows'
    ]
  },
  3: {
    name: 'Enterprise EMR',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    price: null,
    features: [
      'Unlimited providers',
      'Everything in Advanced',
      'Health system integration',
      'Custom subscription keys',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ]
  }
};

export default function AdminSubscriptionPage() {
  const { user } = useAuth();

  // Fetch clinic statistics
  const { data: stats } = useQuery<ClinicStats>({
    queryKey: ['/api/clinic-admin/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clinic-admin/stats');
      if (!response.ok) throw new Error('Failed to fetch clinic stats');
      return response.json();
    },
  });

  // Mock billing history - in real app this would come from API
  const billingHistory: BillingHistory[] = [
    {
      id: 1,
      date: new Date().toISOString(),
      description: 'Monthly subscription - Advanced EMR',
      amount: 399,
      status: 'paid',
    },
    {
      id: 2,
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Monthly subscription - Advanced EMR',
      amount: 399,
      status: 'paid',
    },
  ];

  const currentTier = stats?.currentTier || 2;
  const tierInfo = TIER_BENEFITS[currentTier as keyof typeof TIER_BENEFITS];
  const TierIcon = tierInfo.icon;

  // Calculate usage percentages
  const providerUsage = stats ? (stats.activeProviders / (currentTier === 1 ? 1 : currentTier === 2 ? 5 : 100)) * 100 : 0;
  const keyUsage = stats && stats.unusedKeys > 0 ? ((stats.totalUsers / (stats.totalUsers + stats.unusedKeys)) * 100) : 100;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and view billing information
        </p>
      </div>

      {/* Current Plan Overview */}
      <Card className={`mb-6 ${tierInfo.borderColor} border-2`}>
        <CardHeader className={tierInfo.bgColor}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-white ${tierInfo.color}`}>
                <TierIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Tier {currentTier} - {tierInfo.name}</CardTitle>
                <CardDescription className="text-base">
                  Your current subscription plan
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              {stats?.subscriptionStatus === 'active' ? 'Active' : stats?.subscriptionStatus || 'Unknown'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3">Plan Features</h4>
              <ul className="space-y-2">
                {tierInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${tierInfo.color}`} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Provider Usage</span>
                  <span>{stats?.activeProviders || 0} / {currentTier === 1 ? 1 : currentTier === 2 ? 5 : '∞'}</span>
                </div>
                <Progress value={providerUsage} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Subscription Keys Used</span>
                  <span>{stats?.totalUsers || 0} / {(stats?.totalUsers || 0) + (stats?.unusedKeys || 0)}</span>
                </div>
                <Progress value={keyUsage} className="h-2" />
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-3xl font-bold">
                  ${stats?.monthlySubscriptionCost || tierInfo.price || 'Custom'}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              Your payment details and billing cycle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>•••• •••• •••• 4242</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Next Billing Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{stats?.nextBillingDate ? format(new Date(stats.nextBillingDate), 'MMMM d, yyyy') : 'N/A'}</span>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will automatically renew on the next billing date. 
                You can update your payment method or cancel anytime.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline">Update Payment Method</Button>
              <Button variant="outline">Change Billing Cycle</Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentTier < 3 && (
              <Link href="/health-system-upgrade">
                <Button className="w-full" variant="default">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Button>
              </Link>
            )}
            <Link href="/admin/subscription-keys">
              <Button className="w-full" variant="outline">
                <Key className="mr-2 h-4 w-4" />
                Manage Keys
              </Button>
            </Link>
            <Link href="/admin/invite-staff">
              <Button className="w-full" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Invite Staff
              </Button>
            </Link>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Your recent transactions and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === 'paid' ? 'default' : item.status === 'pending' ? 'secondary' : 'destructive'}
                      className={item.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${item.amount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>
            Overview of your health system usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Active Providers</p>
              <p className="text-2xl font-bold">{stats?.activeProviders || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Locations</p>
              <p className="text-2xl font-bold">{stats?.locationsCount || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Patients</p>
              <p className="text-2xl font-bold">{stats?.patientsCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}