import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Megaphone, 
  Target, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  Eye,
  MousePointer
} from "lucide-react";
import { format } from "date-fns";

interface AdAccount {
  id: number;
  platform: 'google_ads' | 'facebook_ads' | 'microsoft_ads';
  accountId: string;
  accountName: string;
  status: string;
  connected: boolean;
  lastSync: Date | null;
  campaigns: AdCampaign[];
}

interface AdCampaign {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'ended';
  dailyBudget: number;
  totalSpend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  costPerClick: number;
  costPerConversion: number;
  roas: number;
  startDate: Date;
  endDate: Date | null;
}

export function AdPlatformDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('google_ads');

  // Fetch ad accounts
  const { data: accounts = [], isLoading } = useQuery<AdAccount[]>({
    queryKey: ['/api/advanced-marketing/ad-accounts'],
  });

  // Fetch aggregated metrics
  const { data: metrics } = useQuery<{
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageRoas: number;
  }>({
    queryKey: ['/api/advanced-marketing/ad-metrics/aggregate'],
  });

  // Connect new ad account
  const connectAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-marketing/ad-accounts/connect', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/ad-accounts'] });
      toast({ title: "Ad account connected successfully" });
      setIsConnectDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to connect ad account", variant: "destructive" });
    }
  });

  // Sync ad account data
  const syncAccountMutation = useMutation({
    mutationFn: (accountId: number) => apiRequest(`/api/advanced-marketing/ad-accounts/${accountId}/sync`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/ad-accounts'] });
      toast({ title: "Account sync initiated" });
    }
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google_ads':
        return <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">G</div>;
      case 'facebook_ads':
        return <div className="w-5 h-5 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">F</div>;
      case 'microsoft_ads':
        return <div className="w-5 h-5 bg-green-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">M</div>;
      default:
        return <Megaphone className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: amount < 10 ? 2 : 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ad Platform Integration</h2>
          <p className="text-muted-foreground">Manage and monitor your advertising campaigns across platforms</p>
        </div>
        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Megaphone className="mr-2 h-4 w-4" />
              Connect Ad Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Ad Account</DialogTitle>
              <DialogDescription>
                Connect your advertising account to track campaigns and performance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              connectAccountMutation.mutate({
                platform: formData.get('platform'),
                accountId: formData.get('accountId'),
                accountName: formData.get('accountName')
              });
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select name="platform" defaultValue="google_ads" onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="microsoft_ads">Microsoft Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountId">Account ID</Label>
                  <Input
                    id="accountId"
                    name="accountId"
                    placeholder={selectedPlatform === 'google_ads' ? '123-456-7890' : 'act_123456789'}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    name="accountName"
                    placeholder="e.g., Main Healthcare Account"
                    required
                  />
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Note: You'll need to authenticate with {selectedPlatform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                    and grant permissions for us to access your campaign data.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={connectAccountMutation.isPending}>
                  Connect Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Aggregate Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalSpend || 0)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(metrics.totalImpressions || 0)}</div>
              <p className="text-xs text-muted-foreground">Across all platforms</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(metrics.totalClicks || 0)}</div>
              <p className="text-xs text-muted-foreground">
                CTR: {metrics.totalImpressions ? ((metrics.totalClicks / metrics.totalImpressions) * 100).toFixed(2) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.averageRoas || 0).toFixed(2)}x</div>
              <p className="text-xs text-muted-foreground">Return on ad spend</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Platforms</TabsTrigger>
          <TabsTrigger value="google_ads">Google Ads</TabsTrigger>
          <TabsTrigger value="facebook_ads">Facebook Ads</TabsTrigger>
          <TabsTrigger value="microsoft_ads">Microsoft Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading ad accounts...
              </CardContent>
            </Card>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Megaphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ad accounts connected yet. Connect your first account to start tracking campaigns!</p>
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {account.accountName}
                          <Badge variant={account.connected ? "default" : "secondary"}>
                            {account.connected ? "Connected" : "Disconnected"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Account ID: {account.accountId}
                          {account.lastSync && (
                            <span className="ml-2">
                              • Last synced: {format(new Date(account.lastSync), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncAccountMutation.mutate(account.id)}
                        disabled={syncAccountMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Active Campaigns */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Active Campaigns</h4>
                    {account.campaigns && account.campaigns.filter(c => c.status === 'active').length > 0 ? (
                      <div className="space-y-2">
                        {account.campaigns.filter(c => c.status === 'active').slice(0, 3).map((campaign) => (
                          <div key={campaign.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{campaign.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Budget: {formatCurrency(campaign.dailyBudget)}/day • 
                                Spent: {formatCurrency(campaign.totalSpend)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                ROAS: {campaign.roas.toFixed(2)}x
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.conversions} conversions
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active campaigns</p>
                    )}
                  </div>

                  {/* Account Performance Summary */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Total Spend</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(account.campaigns?.reduce((sum, c) => sum + c.totalSpend, 0) || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Impressions</p>
                      <p className="text-sm font-medium">
                        {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.impressions, 0) || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="text-sm font-medium">
                        {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.clicks, 0) || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Conversions</p>
                      <p className="text-sm font-medium">
                        {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.conversions, 0) || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Platform-specific tabs */}
        {['google_ads', 'facebook_ads', 'microsoft_ads'].map((platform) => (
          <TabsContent key={platform} value={platform} className="space-y-4">
            {accounts.filter(a => a.platform === platform).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} accounts connected.
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setSelectedPlatform(platform);
                      setIsConnectDialogOpen(true);
                    }}
                  >
                    Connect {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              accounts.filter(a => a.platform === platform).map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(account.platform)}
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {account.accountName}
                            <Badge variant={account.connected ? "default" : "secondary"}>
                              {account.connected ? "Connected" : "Disconnected"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Account ID: {account.accountId}
                            {account.lastSync && (
                              <span className="ml-2">
                                • Last synced: {format(new Date(account.lastSync), 'MMM d, h:mm a')}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncAccountMutation.mutate(account.id)}
                          disabled={syncAccountMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Active Campaigns</h4>
                      {account.campaigns && account.campaigns.filter(c => c.status === 'active').length > 0 ? (
                        <div className="space-y-2">
                          {account.campaigns.filter(c => c.status === 'active').slice(0, 3).map((campaign) => (
                            <div key={campaign.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{campaign.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Budget: {formatCurrency(campaign.dailyBudget)}/day • 
                                  Spent: {formatCurrency(campaign.totalSpend)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  ROAS: {campaign.roas.toFixed(2)}x
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {campaign.conversions} conversions
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No active campaigns</p>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Total Spend</p>
                        <p className="text-sm font-medium">
                          {formatCurrency(account.campaigns?.reduce((sum, c) => sum + c.totalSpend, 0) || 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Impressions</p>
                        <p className="text-sm font-medium">
                          {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.impressions, 0) || 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="text-sm font-medium">
                          {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.clicks, 0) || 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Conversions</p>
                        <p className="text-sm font-medium">
                          {formatNumber(account.campaigns?.reduce((sum, c) => sum + c.conversions, 0) || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}