import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Key, Plus, RefreshCw, Ban, Copy, Loader2, Users, Building2, DollarSign, Clock, AlertCircle, CheckCircle, Send, ExternalLink, UserCheck, Calendar, Activity, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';

export function AdminSubscriptionKeys() {
  const [location] = useLocation();
  
  // Check for payment success/cancelled params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription keys have been generated and emailed to you. They should appear below momentarily.",
        duration: 8000,
      });
      // Clean up URL
      window.history.replaceState({}, '', '/admin/subscription-keys');
      // Refetch keys data
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys/list'] });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. No keys were generated.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/admin/subscription-keys');
    }
  }, []);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedKeyForSending, setSelectedKeyForSending] = useState<any>(null);
  const [sendForm, setSendForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    employeeId: '',
    npi: '',
    credentials: '',
    role: '',
    locationId: '',
    includeInstructions: true,
  });
  const [generateForm, setGenerateForm] = useState({
    providerCount: 5,
    nurseCount: 10,
    staffCount: 10,
    tier: 2, // Enterprise tier
    healthSystemId: undefined as number | undefined,
  });

  const { data: keysData, isLoading } = useQuery<{ keys: any[] }>({
    queryKey: ['/api/subscription-keys/list'],
  });

  // Fetch registered users for this health system
  const { data: registeredUsersData } = useQuery<any[]>({
    queryKey: ['/api/clinic-admin/users'],
  });

  const { data: userData } = useQuery<any>({
    queryKey: ['/api/user'],
  });

  const isSystemAdmin = userData?.username === 'admin';

  const { data: healthSystemsData } = useQuery<any[]>({
    queryKey: ['/api/health-systems'],
    enabled: isSystemAdmin,
  });

  // Fetch current user's health system to check tier
  const { data: userHealthSystemData } = useQuery<any>({
    queryKey: [`/api/health-systems/${userData?.healthSystemId}`],
    enabled: !!userData?.healthSystemId && !isSystemAdmin,
  });

  // Fetch trial status
  const { data: trialStatusData } = useQuery<any>({
    queryKey: ['/api/trial-status'],
    enabled: !!userData?.healthSystemId,
  });

  // Fetch locations for the health system
  const { data: locationsData } = useQuery<any[]>({
    queryKey: ['/api/clinic-admin/locations'],
    enabled: !!userData?.healthSystemId,
  });

  const generateKeysMutation = useMutation({
    mutationFn: async (data: typeof generateForm) => {
      const response = await apiRequest('POST', '/api/subscription-keys/create-checkout', {
        providerCount: data.providerCount,
        nurseCount: data.nurseCount,
        staffCount: data.staffCount
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast({
          title: "Redirecting to Payment",
          description: "You will be redirected to Stripe to complete your purchase.",
        });
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || 'Failed to create checkout session',
        variant: 'destructive',
      });
    },
  });

  const deactivateKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      return await apiRequest('POST', `/api/subscription-keys/deactivate/${keyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Key Deactivated",
        description: "The subscription key has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys/list'] });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      return await apiRequest('POST', `/api/subscription-keys/regenerate/${keyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Key Regenerated",
        description: "A new key has been generated to replace the old one.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys/list'] });
    },
  });

  const sendKeyMutation = useMutation({
    mutationFn: async (data: { keyId: number; employeeInfo: any }) => {
      return await apiRequest('POST', `/api/subscription-keys/send/${data.keyId}`, data.employeeInfo);
    },
    onSuccess: () => {
      toast({
        title: "Key Sent Successfully",
        description: "The subscription key has been emailed to the employee.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys/list'] });
      setShowSendDialog(false);
      setSendForm({
        email: '',
        firstName: '',
        lastName: '',
        username: '',
        employeeId: '',
        npi: '',
        credentials: '',
        role: '',
        locationId: '',
        includeInstructions: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Key",
        description: error.message || "Could not send the key. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: number; email: string }) => {
      const response = await apiRequest('POST', `/api/clinic-admin/users/${userId}/reset-password`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Password Reset Email Sent",
        description: `A password reset link has been sent to ${variables.email}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Key copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "destructive" | "secondary"> = {
      active: 'default',
      used: 'success',
      expired: 'destructive',
      deactivated: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getKeyTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "outline"> = {
      provider: 'default',
      nurse: 'default',
      staff: 'outline',
      admin: 'default',
    };
    return <Badge variant={variants[type] || 'outline'}>{type}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeKeys = keysData?.keys?.filter((k: any) => k.status === 'active') || [];
  const usedKeys = keysData?.keys?.filter((k: any) => k.status === 'used') || [];
  const inactiveKeys = keysData?.keys?.filter((k: any) => ['expired', 'deactivated'].includes(k.status)) || [];

  // Determine current health system tier
  const currentTier = isSystemAdmin ? 2 : (userHealthSystemData?.subscriptionTier || 1);
  const isTier2 = currentTier === 2;

  // Show upgrade message for non-Tier 2 health systems
  if (!isSystemAdmin && !isTier2) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Subscription Keys - Enterprise Feature
            </CardTitle>
            <CardDescription>
              Subscription keys are only available for Enterprise (Tier 2) health systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold mb-2">Upgrade to Enterprise</h3>
              <p className="text-gray-700 mb-4">
                Subscription keys allow you to invite providers and staff to join your health system. 
                This feature is exclusive to Enterprise (Tier 2) subscriptions.
              </p>
              <div className="space-y-2 mb-6">
                <p className="font-medium">Enterprise benefits include:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Unlimited subscription keys for providers and staff</li>
                  <li>Multi-location support</li>
                  <li>Advanced reporting and analytics</li>
                  <li>Priority support</li>
                  <li>Custom integrations</li>
                </ul>
              </div>
              <Button 
                onClick={() => window.location.href = '/admin/health-system-upgrade'}
                className="w-full sm:w-auto"
              >
                Upgrade to Enterprise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate trial allocations for tier 2
  const trialAllocations = {
    provider: 1,
    nurse: 2,
    staff: 0
  };

  const isOnTrial = trialStatusData?.trialStatus?.status === 'active' || 
                    trialStatusData?.trialStatus?.status === 'warning';
  const trialDaysRemaining = trialStatusData?.trialStatus?.daysRemaining || 0;

  return (
    <div className="space-y-6">
      {/* Trial Status Alert */}
      {isOnTrial && (
        <Alert className={trialDaysRemaining <= 7 ? "border-amber-500 bg-amber-50" : "border-blue-500 bg-blue-50"}>
          <Clock className={`h-4 w-4 ${trialDaysRemaining <= 7 ? "text-amber-600" : "text-blue-600"}`} />
          <AlertTitle className={trialDaysRemaining <= 7 ? "text-amber-900" : "text-blue-900"}>
            Trial Status: {trialDaysRemaining} days remaining
          </AlertTitle>
          <AlertDescription className={trialDaysRemaining <= 7 ? "text-amber-800" : "text-blue-800"}>
            <div className="mt-2 space-y-2">
              <p>Your trial includes the following allocations:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>{trialAllocations.provider} Provider key{trialAllocations.provider !== 1 ? 's' : ''}</li>
                <li>{trialAllocations.nurse} Nurse key{trialAllocations.nurse !== 1 ? 's' : ''}</li>
                <li>{trialAllocations.staff} Staff key{trialAllocations.staff !== 1 ? 's' : ''}</li>
              </ul>
              {trialDaysRemaining <= 7 && (
                <p className="font-semibold mt-3">
                  ⚠️ Your trial expires soon. Complete payment to continue accessing your account.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Pricing Information and Billing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Subscription & Billing
          </CardTitle>
          <CardDescription>
            Your current subscription breakdown and monthly costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pricing Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3"></th>
                    <th className="text-center p-3 font-semibold">Provider</th>
                    <th className="text-center p-3 font-semibold">Nurse</th>
                    <th className="text-center p-3 font-semibold">Front Staff</th>
                    <th className="text-right p-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Price/month</td>
                    <td className="text-center p-3 text-lg">$399</td>
                    <td className="text-center p-3 text-lg">$99</td>
                    <td className="text-center p-3 text-lg">$49</td>
                    <td className="text-right p-3"></td>
                  </tr>
                  {isOnTrial && (
                    <tr className="border-b bg-blue-50">
                      <td className="p-3 font-medium">Trial Allocation</td>
                      <td className="text-center p-3 text-lg text-blue-700 font-semibold">
                        {trialAllocations.provider}
                      </td>
                      <td className="text-center p-3 text-lg text-blue-700 font-semibold">
                        {trialAllocations.nurse}
                      </td>
                      <td className="text-center p-3 text-lg text-blue-700 font-semibold">
                        {trialAllocations.staff}
                      </td>
                      <td className="text-right p-3 text-sm text-blue-600">
                        (included free)
                      </td>
                    </tr>
                  )}
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-medium">Used Keys</td>
                    <td className="text-center p-3 text-lg font-semibold">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'provider' && k.status === 'used').length || 0}
                    </td>
                    <td className="text-center p-3 text-lg font-semibold">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'nurse' && k.status === 'used').length || 0}
                    </td>
                    <td className="text-center p-3 text-lg font-semibold">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'staff' && k.status === 'used').length || 0}
                    </td>
                    <td className="text-right p-3 text-lg font-semibold">
                      {(keysData?.keys?.filter((k: any) => k.status === 'used').length || 0)} users
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Total Price/month</td>
                    <td className="text-center p-3 text-lg font-bold text-green-600">
                      ${(keysData?.keys?.filter((k: any) => k.keyType === 'provider' && k.status === 'used').length || 0) * 399}
                    </td>
                    <td className="text-center p-3 text-lg font-bold text-green-600">
                      ${(keysData?.keys?.filter((k: any) => k.keyType === 'nurse' && k.status === 'used').length || 0) * 99}
                    </td>
                    <td className="text-center p-3 text-lg font-bold text-green-600">
                      ${(keysData?.keys?.filter((k: any) => k.keyType === 'staff' && k.status === 'used').length || 0) * 49}
                    </td>
                    <td className="text-right p-3 text-xl font-bold text-green-600">
                      ${
                        (keysData?.keys?.filter((k: any) => k.keyType === 'provider' && k.status === 'used').length || 0) * 399 +
                        (keysData?.keys?.filter((k: any) => k.keyType === 'nurse' && k.status === 'used').length || 0) * 99 +
                        (keysData?.keys?.filter((k: any) => k.keyType === 'staff' && k.status === 'used').length || 0) * 49
                      }
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="p-3 font-medium">Unused Keys</td>
                    <td className="text-center p-3 text-sm text-gray-600">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'provider' && k.status === 'active').length || 0}
                    </td>
                    <td className="text-center p-3 text-sm text-gray-600">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'nurse' && k.status === 'active').length || 0}
                    </td>
                    <td className="text-center p-3 text-sm text-gray-600">
                      {keysData?.keys?.filter((k: any) => k.keyType === 'staff' && k.status === 'active').length || 0}
                    </td>
                    <td className="text-right p-3 text-sm text-gray-600">
                      {keysData?.keys?.filter((k: any) => k.status === 'active').length || 0} available
                    </td>
                  </tr>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="p-3 font-bold">Total Access Available</td>
                    <td className="text-center p-3 text-lg font-bold">
                      {(keysData?.keys?.filter((k: any) => k.keyType === 'provider' && (k.status === 'active' || k.status === 'used')).length || 0) + (isOnTrial ? trialAllocations.provider : 0)}
                    </td>
                    <td className="text-center p-3 text-lg font-bold">
                      {(keysData?.keys?.filter((k: any) => k.keyType === 'nurse' && (k.status === 'active' || k.status === 'used')).length || 0) + (isOnTrial ? trialAllocations.nurse : 0)}
                    </td>
                    <td className="text-center p-3 text-lg font-bold">
                      {(keysData?.keys?.filter((k: any) => k.keyType === 'staff' && (k.status === 'active' || k.status === 'used')).length || 0) + (isOnTrial ? trialAllocations.staff : 0)}
                    </td>
                    <td className="text-right p-3 text-sm font-bold">
                      {isOnTrial ? 'Trial + Purchased' : 'Total Purchased'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Explanation Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">How Subscription Keys Work</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {isOnTrial && (
                  <>
                    <li>• <span className="font-semibold">Trial Allocation:</span> Free keys included during your trial period</li>
                    <li>• <span className="font-semibold">Used Keys:</span> Keys that have been assigned to users (what you're paying for after trial)</li>
                  </>
                )}
                {!isOnTrial && (
                  <li>• <span className="font-semibold">Used Keys:</span> Keys that have been assigned to users (what you're paying for)</li>
                )}
                <li>• <span className="font-semibold">Unused Keys:</span> Purchased keys ready to be assigned to new users</li>
                <li>• <span className="font-semibold">Total Access:</span> The total number of users who can access your system</li>
                {isOnTrial && (
                  <li className="text-amber-700 font-semibold mt-2">⚠️ After your trial ends, you'll only pay for used keys (currently $0/month)</li>
                )}
              </ul>
            </div>
            
            {/* Purchase More Keys Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Need more users?</p>
                <p className="text-xs text-muted-foreground">Purchase additional subscription keys to add more staff</p>
              </div>
              <Button 
                onClick={() => setShowGenerateDialog(true)} 
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Purchase More Keys
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Subscription Key Details
            </span>
          </CardTitle>
          <CardDescription>
            View and manage individual subscription keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Available ({activeKeys.length})</TabsTrigger>
              <TabsTrigger value="used">Used ({usedKeys.length})</TabsTrigger>
              <TabsTrigger value="registered-users">Registered Users ({registeredUsersData?.length || 0})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({inactiveKeys.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Key & Registration Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key: any) => {
                    const sentTo = key.metadata?.sentTo;
                    const alreadySent = !!sentTo?.email;
                    const clickTracking = key.metadata?.clickTracking;
                    
                    return (
                      <TableRow key={key.id}>
                        <TableCell className="w-[300px]">
                          <div className="space-y-3">
                            <div className="font-mono text-sm">{key.key}</div>
                            
                            {/* Registration Journey Tracking */}
                            {(sentTo || clickTracking) && (
                              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                                {/* Key Sent */}
                                {sentTo && (
                                  <div className="flex items-start gap-2">
                                    <Send className="h-3 w-3 text-blue-500 mt-0.5" />
                                    <div className="text-xs">
                                      <p className="font-medium">Sent to {sentTo.firstName} {sentTo.lastName}</p>
                                      <p className="text-muted-foreground">{sentTo.email}</p>
                                      {key.metadata?.sentAt && (
                                        <p className="text-muted-foreground">
                                          {format(new Date(key.metadata.sentAt), 'MMM d, h:mm a')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Registration Started */}
                                {clickTracking?.firstClickedAt && (
                                  <div className="flex items-start gap-2">
                                    <Clock className="h-3 w-3 text-yellow-500 mt-0.5" />
                                    <div className="text-xs">
                                      <p className="font-medium">Registration Started</p>
                                      <p className="text-muted-foreground">
                                        {format(new Date(clickTracking.firstClickedAt), 'MMM d, h:mm a')}
                                        {clickTracking.clickCount > 1 && 
                                          ` (${clickTracking.clickCount} views)`
                                        }
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Not Yet Started */}
                                {sentTo && !clickTracking?.firstClickedAt && (
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-3 w-3 text-gray-400 mt-0.5" />
                                    <div className="text-xs text-muted-foreground">
                                      Registration link not clicked yet
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getKeyTypeBadge(key.keyType)}</TableCell>
                        <TableCell>
                          {sentTo ? (
                            <Badge variant="secondary" className="text-xs">
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(key.createdAt), 'MMM d')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(key.key)}
                              title="Copy key"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedKeyForSending(key);
                                setSendForm({
                                  email: '',
                                  firstName: '',
                                  lastName: '',
                                  username: '',
                                  employeeId: '',
                                  npi: '',
                                  credentials: '',
                                  role: key.keyType === 'provider' ? 'provider' : 
                                       key.keyType === 'nurse' ? 'nurse' : 
                                       'staff',
                                  locationId: '',
                                  includeInstructions: true,
                                });
                                setShowSendDialog(true);
                              }}
                              title={alreadySent ? "Already sent - click to resend to new person" : "Send key to employee"}
                              disabled={alreadySent}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateKeyMutation.mutate(key.id)}
                              title="Deactivate key"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="used">
              <div className="space-y-4">
                {usedKeys.map((key: any) => {
                  const sentTo = key.metadata?.sentTo;
                  const clickTracking = key.metadata?.clickTracking;
                  
                  return (
                    <Card key={key.id}>
                      <CardContent className="pt-6">
                        <div className="grid gap-4">
                          {/* Key Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Key</p>
                                <p className="font-mono text-sm">{key.key}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Type</p>
                                <div className="mt-1">{getKeyTypeBadge(key.keyType)}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateKeyMutation.mutate(key.id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Tracking Timeline */}
                          <div className="space-y-3 pl-2 border-l-2 border-muted">
                            {/* Sent To */}
                            {sentTo && (
                              <div className="flex items-start gap-3 -ml-[9px]">
                                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-background" />
                                <div className="flex-1 -mt-0.5">
                                  <p className="text-sm font-medium">Key Sent</p>
                                  <p className="text-sm text-muted-foreground">
                                    To: {sentTo.firstName} {sentTo.lastName} ({sentTo.email})
                                    {sentTo.locationId && ` • Location ID: ${sentTo.locationId}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(sentTo.sentAt), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Registration Started */}
                            {clickTracking?.registrationStarted && (
                              <div className="flex items-start gap-3 -ml-[9px]">
                                <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-background" />
                                <div className="flex-1 -mt-0.5">
                                  <p className="text-sm font-medium">Registration Started</p>
                                  <p className="text-sm text-muted-foreground">
                                    Clicked link {clickTracking.clickCount || 1} time{(clickTracking.clickCount || 1) !== 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {clickTracking.firstClickedAt && format(new Date(clickTracking.firstClickedAt), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Registration Completed */}
                            <div className="flex items-start gap-3 -ml-[9px]">
                              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                              <div className="flex-1 -mt-0.5">
                                <p className="text-sm font-medium">Registration Completed</p>
                                <p className="text-sm text-muted-foreground">
                                  By: {key.userName} {key.userLastName} ({key.userEmail})
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(key.usedAt), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {usedKeys.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No keys have been used yet
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="registered-users">
              <div className="space-y-4">
                {registeredUsersData && registeredUsersData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Location Count</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registeredUsersData.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                            {user.credentials && <span className="text-muted-foreground ml-1">{user.credentials}</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{user.username}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={
                              user.role === 'admin' ? 'destructive' :
                              user.role === 'provider' ? 'default' :
                              user.role === 'nurse' ? 'secondary' :
                              'outline'
                            }>
                              {user.role === 'admin' ? 'Administrator' :
                               user.role === 'provider' ? 'Provider' :
                               user.role === 'nurse' ? 'Nurse' :
                               'Staff'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{user.locationCount || 0}</TableCell>
                          <TableCell>
                            {user.lastLogin ? (
                              <div className="text-sm">
                                <p>{format(new Date(user.lastLogin), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(user.lastLogin), 'h:mm a')}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.active ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <Activity className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                  <Ban className="h-3 w-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                resetPasswordMutation.mutate({ userId: user.id, email: user.email });
                              }}
                              className="ml-2"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reset Password
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No registered users yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Users who register using subscription keys will appear here
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="inactive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveKeys.map((key: any) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-mono">{key.key}</TableCell>
                      <TableCell>{getKeyTypeBadge(key.keyType)}</TableCell>
                      <TableCell>{getStatusBadge(key.status)}</TableCell>
                      <TableCell>{format(new Date(key.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {key.status !== 'used' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerateKeyMutation.mutate(key.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Additional Subscription Keys</DialogTitle>
            <DialogDescription>
              Add more users to your subscription. You will be charged monthly for each key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isSystemAdmin && (
              <div>
                <Label htmlFor="health-system">Select Health System</Label>
                <Select
                  value={generateForm.healthSystemId?.toString()}
                  onValueChange={(value) => {
                    const healthSystem = healthSystemsData?.find((hs: any) => hs.id.toString() === value);
                    setGenerateForm({
                      ...generateForm,
                      healthSystemId: healthSystem?.id,
                      tier: healthSystem?.subscriptionTier || 2
                    });
                  }}
                >
                  <SelectTrigger id="health-system">
                    <SelectValue placeholder="Select a health system" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthSystemsData?.map((hs: any) => (
                      <SelectItem key={hs.id} value={hs.id.toString()}>
                        {hs.name} (Tier {hs.subscriptionTier || 1})
                        {(hs.subscriptionTier || 1) < 2 && <span className="text-amber-600"> - Upgrade Required</span>}
                      </SelectItem>
                    ))}
                    {healthSystemsData?.length === 0 && (
                      <SelectItem value="none" disabled>No health systems available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {generateForm.healthSystemId && healthSystemsData?.find((hs: any) => hs.id === generateForm.healthSystemId)?.subscriptionTier < 2 ? (
                    <span className="text-amber-600">⚠️ This health system needs to upgrade to Tier 2 to generate subscription keys</span>
                  ) : (
                    "Only Tier 2 health systems can generate subscription keys"
                  )}
                </p>
              </div>
            )}
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="provider-count">Provider Keys ($399/mo each)</Label>
                <Input
                  id="provider-count"
                  type="number"
                  min="0"
                  value={generateForm.providerCount}
                  onChange={(e) => setGenerateForm({ ...generateForm, providerCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="nurse-count">Nurse Keys ($99/mo each)</Label>
                <Input
                  id="nurse-count"
                  type="number"
                  min="0"
                  value={generateForm.nurseCount}
                  onChange={(e) => setGenerateForm({ ...generateForm, nurseCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="staff-count">Staff Keys ($49/mo each)</Label>
                <Input
                  id="staff-count"
                  type="number"
                  min="0"
                  value={generateForm.staffCount}
                  onChange={(e) => setGenerateForm({ ...generateForm, staffCount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            {/* Cost Summary */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <h4 className="font-semibold text-sm">Monthly Cost Summary</h4>
              <div className="space-y-1 text-sm">
                {generateForm.providerCount > 0 && (
                  <div className="flex justify-between">
                    <span>{generateForm.providerCount} Provider{generateForm.providerCount > 1 ? 's' : ''}</span>
                    <span>${generateForm.providerCount * 399}/month</span>
                  </div>
                )}
                {generateForm.nurseCount > 0 && (
                  <div className="flex justify-between">
                    <span>{generateForm.nurseCount} Nurse{generateForm.nurseCount > 1 ? 's' : ''}</span>
                    <span>${generateForm.nurseCount * 99}/month</span>
                  </div>
                )}
                {generateForm.staffCount > 0 && (
                  <div className="flex justify-between">
                    <span>{generateForm.staffCount} Staff</span>
                    <span>${generateForm.staffCount * 49}/month</span>
                  </div>
                )}
                <div className="border-t pt-2 font-semibold">
                  <div className="flex justify-between">
                    <span>Additional Monthly Cost</span>
                    <span className="text-green-600">
                      ${generateForm.providerCount * 399 + generateForm.nurseCount * 99 + generateForm.staffCount * 49}/month
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateKeysMutation.mutate(generateForm)}
                disabled={generateKeysMutation.isPending || (isSystemAdmin && (!generateForm.healthSystemId || (healthSystemsData?.find((hs: any) => hs.id === generateForm.healthSystemId)?.subscriptionTier || 1) < 2))}
                className="bg-green-600 hover:bg-green-700"
              >
                {generateKeysMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Purchase & Generate Keys
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Key Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Subscription Key to Employee</DialogTitle>
            <DialogDescription>
              Enter the employee's information. The key will be emailed with setup instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Role at the TOP - emphasized and auto-filled */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <Label htmlFor="role" className="text-lg font-semibold text-blue-900">
                Employee Role
              </Label>
              <div className="mt-2 text-xl font-bold text-blue-900">
                {selectedKeyForSending?.keyType === 'provider' ? 'Provider (MD, DO, NP, PA)' :
                 selectedKeyForSending?.keyType === 'nurse' ? 'Nurse (RN, LPN)' :
                 selectedKeyForSending?.keyType === 'staff' ? 'Administrative Staff' : ''}
              </div>
              <p className="text-sm text-blue-700 mt-1">
                This key is specifically for this role and cannot be changed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="key-type">Key Type</Label>
                <Input
                  id="key-type"
                  value={selectedKeyForSending ? `${selectedKeyForSending.keyType.charAt(0).toUpperCase() + selectedKeyForSending.keyType.slice(1)} Key` : ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="key-value">Key</Label>
                <Input
                  id="key-value"
                  value={selectedKeyForSending?.key || ''}
                  disabled
                  className="bg-gray-50 font-mono text-xs"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-4">
                {/* Required Fields */}
                <div>
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="employee@example.com"
                    value={sendForm.email}
                    onChange={(e) => setSendForm({ ...sendForm, email: e.target.value })}
                    required
                  />
                </div>

                {/* Optional but Recommended */}
                <div>
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input
                    id="username"
                    placeholder="jdoe"
                    value={sendForm.username}
                    onChange={(e) => setSendForm({ ...sendForm, username: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Some clinics prefer standardized usernames (e.g., first initial + last name)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name (Optional)</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={sendForm.firstName}
                      onChange={(e) => setSendForm({ ...sendForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name (Optional)</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={sendForm.lastName}
                      onChange={(e) => setSendForm({ ...sendForm, lastName: e.target.value })}
                    />
                  </div>
                </div>

                {/* Provider-specific fields */}
                {selectedKeyForSending?.keyType === 'provider' && (
                  <>
                    <div>
                      <Label htmlFor="npi">NPI Number (Optional)</Label>
                      <Input
                        id="npi"
                        placeholder="1234567890"
                        value={sendForm.npi}
                        onChange={(e) => setSendForm({ ...sendForm, npi: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="credentials">Credentials (Optional)</Label>
                      <Input
                        id="credentials"
                        placeholder="MD, DO, NP, PA"
                        value={sendForm.credentials}
                        onChange={(e) => setSendForm({ ...sendForm, credentials: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                  <Input
                    id="employeeId"
                    placeholder="EMP12345"
                    value={sendForm.employeeId}
                    onChange={(e) => setSendForm({ ...sendForm, employeeId: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="locationId">Assign to Location <span className="text-red-500">*</span></Label>
                  <Select
                    value={sendForm.locationId}
                    onValueChange={(value) => setSendForm({ ...sendForm, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationsData && locationsData.length > 0 ? (
                        locationsData.map((location: any) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name} - {location.city}, {location.state}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-4 text-sm text-muted-foreground">
                          No locations found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">
                      User will be assigned to this location when they register.
                    </p>
                    <Link 
                      to="/clinic-admin/locations?from=subscription-keys" 
                      className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      Need to add a location?
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeInstructions"
                    checked={sendForm.includeInstructions}
                    onChange={(e) => setSendForm({ ...sendForm, includeInstructions: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="includeInstructions" className="text-sm font-normal">
                    Include setup instructions in the email
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Pre-filled Information:</strong> All information you provide here will automatically populate when the employee registers, saving them time and ensuring consistency.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!sendForm.email) {
                  toast({
                    title: "Email Required",
                    description: "Please enter the employee's email address.",
                    variant: "destructive",
                  });
                  return;
                }
                if (!sendForm.locationId) {
                  toast({
                    title: "Location Required",
                    description: "Please select a location to assign the employee to.",
                    variant: "destructive",
                  });
                  return;
                }
                sendKeyMutation.mutate({
                  keyId: selectedKeyForSending.id,
                  employeeInfo: sendForm,
                });
              }}
              disabled={sendKeyMutation.isPending || !sendForm.email || !sendForm.locationId}
            >
              {sendKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}