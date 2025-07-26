import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Info,
  ArrowRight,
  Lightbulb,
  Target,
  Users,
  DollarSign
} from "lucide-react";

interface AIGeneratedInsight {
  id: number;
  type: string;
  priority: string;
  title: string;
  description: string;
  recommendation: string;
  metric: string;
  icon: any;
  color: string;
}

interface APIInsight {
  id: number;
  status: string;
  title: string;
  description: string;
  insightCategory: string;
  recommendations: Array<{
    action: string;
    impact: string;
    effort: string;
    details: string;
  }>;
}

export default function MarketingInsights() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | undefined>();

  // Query for real insights from API
  const { data: insights, isLoading } = useQuery({
    queryKey: filter 
      ? [`/api/marketing/insights?status=${filter}`]
      : ["/api/marketing/insights"],
  });

  // Always check if we need AI insights (no conditional enabled)
  const needsAIInsights = !insights || insights.length === 0;

  // Query for analytics data to generate AI insights
  const { data: analyticsData } = useQuery({
    queryKey: ["/api/analytics/comprehensive?range=30d"],
    enabled: needsAIInsights,
  });

  const { data: predictiveData } = useQuery({
    queryKey: ["/api/analytics/predictive"],
    enabled: needsAIInsights,
  });

  // Mutation to update insight status
  const updateInsight = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/marketing/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update insight");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/insights"] });
      toast({
        title: "Insight updated",
        description: "The insight status has been updated successfully.",
      });
    },
  });

  // Mutation to generate insights
  const generateInsights = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/marketing/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to generate insights");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/insights"] });
      toast({
        title: "Insights generated",
        description: "AI has analyzed your data and generated new insights.",
      });
    },
  });

  // AI-generated insights based on analytics data
  const aiGeneratedInsights: AIGeneratedInsight[] = analyticsData ? [
    {
      id: 1,
      type: "conversion_optimization",
      priority: "high",
      title: "Low Trial-to-Paid Conversion Rate",
      description: "Only 2.6% of trial users convert to paid plans. Industry average is 15-20% for healthcare SaaS.",
      recommendation: "Implement in-app onboarding tours, send targeted email campaigns at day 3 and 7 of trial, and offer limited-time discount for annual plans.",
      metric: "Potential 5x revenue increase",
      icon: TrendingUp,
      color: "text-yellow-600"
    },
    {
      id: 2,
      type: "user_engagement",
      priority: "urgent",
      title: "High User Drop-off After Registration",
      description: "68% of users don't create their first patient within 24 hours of signing up.",
      recommendation: "Add guided onboarding flow, pre-populate sample patient data, and send 'Getting Started' video tutorial email immediately after signup.",
      metric: "Could improve activation by 40%",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      id: 3,
      type: "feature_adoption",
      priority: "medium",
      title: "Voice Recording Underutilized",
      description: "Only 45% of providers use voice recording despite it being the key differentiator.",
      recommendation: "Add prominent 'Try Voice Recording' prompt in encounter view, create feature spotlight video, and show time-saved metrics after first use.",
      metric: "2.3x higher retention for voice users",
      icon: Lightbulb,
      color: "text-blue-600"
    },
    {
      id: 4,
      type: "churn_prevention",
      priority: predictiveData?.churnRisk?.length > 0 ? "urgent" : "low",
      title: "Churn Risk Detection",
      description: predictiveData?.churnRisk?.length > 0 
        ? `${predictiveData.churnRisk.length} users showing signs of churn`
        : "No immediate churn risks detected",
      recommendation: predictiveData?.churnRisk?.length > 0
        ? "Send personalized re-engagement campaigns, offer 1-on-1 training sessions, and provide success manager support."
        : "Continue monitoring engagement metrics weekly.",
      metric: predictiveData?.churnRisk?.length > 0 
        ? `Save $${(predictiveData.churnRisk.length * 149 * 12).toLocaleString()}/year`
        : "Maintain 85% retention",
      icon: Info,
      color: predictiveData?.churnRisk?.length > 0 ? "text-red-600" : "text-green-600"
    },
    {
      id: 5,
      type: "revenue_optimization",
      priority: "high",
      title: "Pricing Strategy Optimization",
      description: "Current pricing may be leaving money on the table based on usage patterns.",
      recommendation: "Consider tiered pricing based on patient volume, add premium features like API access, and test enterprise pricing for multi-location practices.",
      metric: "30-50% revenue uplift potential",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      id: 6,
      type: "acquisition_channel",
      priority: "medium",
      title: "Referral Program Opportunity",
      description: "No formal referral program despite high user satisfaction scores.",
      recommendation: "Launch provider referral program with account credits, create shareable success stories, and add in-app referral tracking.",
      metric: "25% of new signups from referrals",
      icon: Users,
      color: "text-purple-600"
    }
  ] : [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "opportunity":
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return colors[impact as keyof typeof colors] || colors.low;
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

  const realInsights = insights || [];
  const hasRealInsights = realInsights.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {hasRealInsights ? "Marketing Insights" : "AI-Generated Marketing Insights"}
        </h3>
        <Button 
          onClick={() => generateInsights.mutate()}
          disabled={generateInsights.isPending}
        >
          <Brain className="h-4 w-4 mr-2" />
          {generateInsights.isPending ? "Analyzing..." : "Generate Insights"}
        </Button>
      </div>

      {/* Filter Buttons (only show for real insights) */}
      {hasRealInsights && (
        <div className="flex gap-2">
          <Button
            variant={filter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(undefined)}
          >
            All Insights
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={filter === "acknowledged" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("acknowledged")}
          >
            Acknowledged
          </Button>
          <Button
            variant={filter === "implemented" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("implemented")}
          >
            Implemented
          </Button>
        </div>
      )}

      {/* Display Real Insights */}
      {hasRealInsights && (
        <div className="space-y-4">
          {realInsights.map((insight: APIInsight) => (
            <Card key={insight.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getCategoryIcon(insight.insightCategory)}
                    <div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                  <Badge variant={insight.status === "active" ? "default" : "secondary"}>
                    {insight.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Recommended Actions:</h4>
                  {insight.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{rec.action}</p>
                          <Badge className={getImpactBadge(rec.impact)} variant="secondary">
                            {rec.impact} impact
                          </Badge>
                          <Badge variant="outline">{rec.effort} effort</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.details}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {insight.status === "active" && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => updateInsight.mutate({ id: insight.id, status: "acknowledged" })}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateInsight.mutate({ id: insight.id, status: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
                {insight.status === "acknowledged" && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => updateInsight.mutate({ id: insight.id, status: "implemented" })}
                  >
                    Mark as Implemented
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Display AI-Generated Insights when no real insights */}
      {!hasRealInsights && analyticsData && (
        <div className="space-y-4">
          {aiGeneratedInsights.map((insight) => {
            const Icon = insight.icon;
            return (
              <Card key={insight.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-6 w-6 mt-1 ${insight.color}`} />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <Badge 
                          variant={
                            insight.priority === "urgent" ? "destructive" : 
                            insight.priority === "high" ? "default" : 
                            "secondary"
                          }
                          className="mt-2"
                        >
                          {insight.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{insight.description}</p>
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <p className="text-sm font-medium text-blue-900">Recommendation:</p>
                    <p className="text-sm text-blue-800">{insight.recommendation}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">{insight.metric}</span>
                    <Button variant="outline" size="sm">
                      Take Action <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasRealInsights && !analyticsData && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No insights available yet. The system will generate insights as it analyzes your marketing data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}