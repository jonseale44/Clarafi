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
  Lightbulb
} from "lucide-react";

export default function MarketingInsights() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | undefined>();

  const { data: insights, isLoading } = useQuery({
    queryKey: filter 
      ? [`/api/marketing/insights?status=${filter}`]
      : ["/api/marketing/insights"],
  });

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  // Check if we have real insights from the API
  const realInsights = insights || [];
  
  // If no real insights exist, show placeholder message
  if (realInsights.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">AI Insights Not Yet Implemented</h3>
          <p className="text-muted-foreground mb-4">
            The AI-powered marketing insights engine is planned but not yet built.
          </p>
          <p className="text-sm text-muted-foreground">
            This feature will analyze your marketing data and provide actionable recommendations
            based on conversion patterns, user behavior, and campaign performance.
          </p>
        </CardContent>
      </Card>
    );
  }
  


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

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
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

      {/* Insights List */}
      <div className="space-y-4">
        {realInsights.map((insight: any) => (
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

      {(!realInsights || realInsights.length === 0) && (
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