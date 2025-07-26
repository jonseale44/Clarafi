import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  Plus,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  channel: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
  cpa: number;
}

export default function CampaignsROITracker() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  // Query for campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: [`/api/marketing/campaigns?range=${selectedTimeRange}`],
  });

  // Query for ROI metrics
  const { data: roiMetrics } = useQuery({
    queryKey: [`/api/marketing/roi-metrics?range=${selectedTimeRange}`],
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (data: Partial<Campaign>) => {
      const response = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      setIsCreateOpen(false);
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully.",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  // Calculate aggregate metrics
  const totalSpend = campaigns?.reduce((sum: number, c: Campaign) => sum + c.spent, 0) || 0;
  const totalRevenue = campaigns?.reduce((sum: number, c: Campaign) => sum + c.revenue, 0) || 0;
  const totalConversions = campaigns?.reduce((sum: number, c: Campaign) => sum + c.conversions, 0) || 0;
  const overallROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100) : 0;
  const overallCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

  // Mock campaigns if none exist
  const displayCampaigns: Campaign[] = campaigns?.length > 0 ? campaigns : [
    {
      id: 1,
      name: "Google Ads - Healthcare Keywords",
      channel: "Google Ads",
      status: 'active',
      startDate: '2025-07-01',
      budget: 5000,
      spent: 3200,
      impressions: 45000,
      clicks: 1800,
      conversions: 24,
      revenue: 14400,
      roi: 350,
      cpa: 133
    },
    {
      id: 2,
      name: "Facebook - Medical Professionals",
      channel: "Facebook",
      status: 'active',
      startDate: '2025-07-05',
      budget: 3000,
      spent: 2100,
      impressions: 120000,
      clicks: 2400,
      conversions: 18,
      revenue: 8100,
      roi: 286,
      cpa: 117
    },
    {
      id: 3,
      name: "LinkedIn - Healthcare Decision Makers",
      channel: "LinkedIn",
      status: 'paused',
      startDate: '2025-06-15',
      endDate: '2025-07-15',
      budget: 4000,
      spent: 4000,
      impressions: 25000,
      clicks: 800,
      conversions: 12,
      revenue: 10800,
      roi: 170,
      cpa: 333
    },
    {
      id: 4,
      name: "Content Marketing - SEO",
      channel: "Organic",
      status: 'active',
      startDate: '2025-05-01',
      budget: 2000,
      spent: 2000,
      impressions: 80000,
      clicks: 4000,
      conversions: 35,
      revenue: 31500,
      roi: 1475,
      cpa: 57
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Performance & ROI</h3>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createCampaign.mutate({
                  name: formData.get('name') as string,
                  channel: formData.get('channel') as string,
                  budget: Number(formData.get('budget')),
                  startDate: formData.get('startDate') as string,
                  status: 'active',
                  spent: 0,
                  impressions: 0,
                  clicks: 0,
                  conversions: 0,
                  revenue: 0,
                  roi: 0,
                  cpa: 0
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="channel">Channel</Label>
                    <Select name="channel" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Google Ads">Google Ads</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Organic">Organic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget</Label>
                    <Input id="budget" name="budget" type="number" min="0" step="100" required />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>
                  <Button type="submit" className="w-full">Create Campaign</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overall ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Generated revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{overallROI.toFixed(0)}%</div>
              {overallROI > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">New subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overallCPA)}</div>
            <p className="text-xs text-muted-foreground">Cost per acquisition</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {displayCampaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{campaign.channel}</Badge>
                    <Badge 
                      variant={
                        campaign.status === 'active' ? 'default' : 
                        campaign.status === 'paused' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {campaign.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(campaign.startDate).toLocaleDateString()}
                      {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      {campaign.roi}% ROI
                    </span>
                    {campaign.roi > 200 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Budget Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget: {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}</span>
                  <span>{((campaign.spent / campaign.budget) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="text-lg font-semibold">{formatNumber(campaign.impressions)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                  <p className="text-lg font-semibold">{formatNumber(campaign.clicks)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((campaign.clicks / campaign.impressions) * 100).toFixed(2)}% CTR
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">{campaign.conversions}</p>
                  <p className="text-xs text-muted-foreground">
                    {((campaign.conversions / campaign.clicks) * 100).toFixed(1)}% CVR
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(campaign.revenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPA</p>
                  <p className="text-lg font-semibold">{formatCurrency(campaign.cpa)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                {campaign.status === 'active' && (
                  <Button variant="outline" size="sm">
                    Pause Campaign
                  </Button>
                )}
                {campaign.status === 'paused' && (
                  <Button variant="outline" size="sm">
                    Resume Campaign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {(!displayCampaigns || displayCampaigns.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No campaigns found. Create your first campaign to start tracking ROI.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}