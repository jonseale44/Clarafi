import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Calendar,
  Target,
  TrendingUp,
  Pause,
  Play,
  Plus,
  BarChart
} from "lucide-react";

export default function MarketingCampaigns() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: [
      "/api/marketing/campaigns",
      statusFilter ? { status: statusFilter } : {},
    ],
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/marketing/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      toast({
        title: "Campaign updated",
        description: "The campaign has been updated successfully.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  // Stub campaigns for demonstration
  const stubCampaigns = [
    {
      id: 1,
      name: "Q1 Provider Acquisition - Google",
      status: "active",
      campaignType: "ppc",
      channel: "google_ads",
      budget: 10000,
      spentAmount: 3457.23,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-31"),
      performanceMetrics: {
        impressions: 125430,
        clicks: 3421,
        conversions: 89,
        cost_per_click: 1.01,
        cost_per_acquisition: 38.82
      },
      targetAudience: {
        demographics: { profession: "physicians", experience: "5+ years" },
        locations: ["Texas", "California", "Florida"]
      }
    },
    {
      id: 2,
      name: "Social Media Brand Awareness",
      status: "active",
      campaignType: "social",
      channel: "linkedin",
      budget: 5000,
      spentAmount: 1234.56,
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-02-28"),
      performanceMetrics: {
        impressions: 89234,
        clicks: 1234,
        conversions: 23,
        cost_per_click: 1.00,
        cost_per_acquisition: 53.68
      },
      targetAudience: {
        demographics: { role: "practice_managers", practice_size: "10-50" },
        interests: ["healthcare technology", "practice management"]
      }
    },
    {
      id: 3,
      name: "Email Nurture Campaign",
      status: "paused",
      campaignType: "email",
      channel: "email",
      budget: 2000,
      spentAmount: 567.89,
      startDate: new Date("2025-01-10"),
      performanceMetrics: {
        impressions: 45678,
        clicks: 2345,
        conversions: 67,
        cost_per_click: 0.24,
        cost_per_acquisition: 8.48
      },
      targetAudience: {
        demographics: { segment: "trial_users" },
        behaviors: ["inactive_7_days", "incomplete_onboarding"]
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "google_ads":
      case "facebook":
      case "linkedin":
        return <Target className="h-4 w-4" />;
      case "email":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <BarChart className="h-4 w-4" />;
    }
  };

  const calculateROI = (spent: number, conversions: number, avgValue: number = 1200) => {
    const revenue = conversions * avgValue;
    return ((revenue - spent) / spent * 100).toFixed(1);
  };

  return (
    <div className="space-y-6" data-median="marketing-campaigns">
      {/* Controls */}
      <div className="flex justify-between items-center" data-median="campaigns-controls">
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-median="campaigns-grid">
        {stubCampaigns.map((campaign) => {
          const spentPercentage = (campaign.spentAmount / campaign.budget) * 100;
          const roi = calculateROI(campaign.spentAmount, campaign.performanceMetrics.conversions);

          return (
            <Card key={campaign.id} data-median="campaign-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getChannelIcon(campaign.channel)}
                      <span className="text-sm text-muted-foreground capitalize">
                        {campaign.channel.replace(/_/g, " ")}
                      </span>
                      <Badge className={getStatusColor(campaign.status)} variant="secondary">
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCampaign.mutate({ id: campaign.id, updates: { status: "paused" } })}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCampaign.mutate({ id: campaign.id, updates: { status: "active" } })}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Budget Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Budget Spent</span>
                    <span className="font-medium">
                      ${campaign.spentAmount.toLocaleString()} / ${campaign.budget.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={spentPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{spentPercentage.toFixed(1)}% used</p>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                    <p className="text-sm font-medium">
                      {campaign.performanceMetrics.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-sm font-medium">
                      {campaign.performanceMetrics.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                    <p className="text-sm font-medium">
                      {campaign.performanceMetrics.conversions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPA</p>
                    <p className="text-sm font-medium">
                      ${campaign.performanceMetrics.cost_per_acquisition.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* ROI */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated ROI</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`h-4 w-4 ${parseFloat(roi) > 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`text-sm font-medium ${parseFloat(roi) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {roi}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campaign Duration */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {campaign.startDate.toLocaleDateString()} - {campaign.endDate?.toLocaleDateString() || "Ongoing"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Campaign Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">$17,000</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">$5,259.68</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Conversions</p>
              <p className="text-2xl font-bold">179</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. CPA</p>
              <p className="text-2xl font-bold">$29.38</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}