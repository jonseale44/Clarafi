import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Key, Plus, RefreshCw, Ban, Copy, Loader2, Users, Building2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export function AdminSubscriptionKeys() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    providerCount: 5,
    nurseCount: 10,
    staffCount: 10,
    tier: 2, // Enterprise tier
    healthSystemId: undefined as number | undefined,
  });

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['/api/subscription-keys/list'],
  });

  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
  });

  const isSystemAdmin = userData?.username === 'admin';

  const { data: healthSystemsData } = useQuery({
    queryKey: ['/api/health-systems'],
    enabled: isSystemAdmin,
  });

  // Fetch current user's health system to check tier
  const { data: userHealthSystemData } = useQuery({
    queryKey: [`/api/health-systems/${userData?.healthSystemId}`],
    enabled: !!userData?.healthSystemId && !isSystemAdmin,
  });

  const generateKeysMutation = useMutation({
    mutationFn: async (data: typeof generateForm) => {
      return await apiRequest('POST', '/api/subscription-keys/generate', data);
    },
    onSuccess: () => {
      toast({
        title: "Keys Generated",
        description: "New subscription keys have been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys/list'] });
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || 'Failed to generate keys',
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

  return (
    <div className="space-y-6">
      {/* Pricing Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Enterprise Subscription Pricing
          </CardTitle>
          <CardDescription>
            Monthly pricing per user type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-2xl font-bold">$399/month</div>
              <p className="text-sm text-muted-foreground">Provider Keys</p>
              <p className="text-xs">Full EMR access for physicians and providers</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">$99/month</div>
              <p className="text-sm text-muted-foreground">Nurse Keys</p>
              <p className="text-xs">Clinical access for nursing staff</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">$49/month</div>
              <p className="text-sm text-muted-foreground">Staff Keys</p>
              <p className="text-xs">Administrative access for non-clinical staff</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Subscription Key Management
            </span>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Keys
            </Button>
          </CardTitle>
          <CardDescription>
            Manage subscription keys for your health system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keysData?.counts?.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <Key className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keysData?.counts?.available || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Used</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keysData?.counts?.used || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health System</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  Providers: {keysData?.counts?.providers || 0}<br />
                  Nurses: {keysData?.counts?.nurses || 0}<br />
                  Staff: {keysData?.counts?.staff || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Available ({activeKeys.length})</TabsTrigger>
              <TabsTrigger value="used">Used ({usedKeys.length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({inactiveKeys.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key: any) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-mono">{key.key}</TableCell>
                      <TableCell>{getKeyTypeBadge(key.keyType)}</TableCell>
                      <TableCell>{getStatusBadge(key.status)}</TableCell>
                      <TableCell>{format(new Date(key.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(key.expiresAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deactivateKeyMutation.mutate(key.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="used">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Used At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usedKeys.map((key: any) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-mono">{key.key}</TableCell>
                      <TableCell>{getKeyTypeBadge(key.keyType)}</TableCell>
                      <TableCell>{getStatusBadge(key.status)}</TableCell>
                      <TableCell>
                        {key.userName} {key.userLastName} ({key.userEmail})
                      </TableCell>
                      <TableCell>{format(new Date(key.usedAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deactivateKeyMutation.mutate(key.id)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Subscription Keys</DialogTitle>
            <DialogDescription>
              Generate new subscription keys for your health system staff
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
            <div>
              <Label htmlFor="provider-count">Number of Provider Keys</Label>
              <Input
                id="provider-count"
                type="number"
                min="0"
                value={generateForm.providerCount}
                onChange={(e) => setGenerateForm({ ...generateForm, providerCount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="nurse-count">Number of Nurse Keys</Label>
              <Input
                id="nurse-count"
                type="number"
                min="0"
                value={generateForm.nurseCount}
                onChange={(e) => setGenerateForm({ ...generateForm, nurseCount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="staff-count">Number of Staff Keys</Label>
              <Input
                id="staff-count"
                type="number"
                min="0"
                value={generateForm.staffCount}
                onChange={(e) => setGenerateForm({ ...generateForm, staffCount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateKeysMutation.mutate(generateForm)}
                disabled={generateKeysMutation.isPending || (isSystemAdmin && (!generateForm.healthSystemId || (healthSystemsData?.find((hs: any) => hs.id === generateForm.healthSystemId)?.subscriptionTier || 1) < 2))}
              >
                {generateKeysMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Keys'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}