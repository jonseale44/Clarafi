import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, DollarSign, TrendingUp, Zap, RefreshCw } from "lucide-react";

interface TokenUsageMetrics {
  service: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageCostPerCall: number;
}

interface DashboardData {
  systemOverview: {
    totalCosts: number;
    totalTokens: number;
    totalCalls: number;
    averageCostPerEncounter: number;
  };
  serviceBreakdown: TokenUsageMetrics[];
  costProjections: {
    daily: string;
    monthly: string;
    yearly: string;
  };
  recommendations: string[];
}

export default function TokenCostDashboard() {
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/token-usage/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const resetMetricsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/token-usage/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to reset metrics");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/token-usage/dashboard"] });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/token-usage/summary", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate summary");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">AI Token Cost Dashboard</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-gray-200"></CardHeader>
              <CardContent className="h-16 bg-gray-100"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Error Loading Token Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to load token usage data. Please check your connection and try again.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount < 0.001) {
      return `$${(amount * 1000).toFixed(3)}‰`;
    }
    return `$${amount.toFixed(6)}`;
  };

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      'Medical_Problems_Delta': 'bg-blue-500',
      'Medication_Delta': 'bg-green-500',
      'CPT_Extractor': 'bg-purple-500',
      'Orders_Extractor': 'bg-orange-500',
    };
    return colors[service] || 'bg-gray-500';
  };

  const highestCostService = dashboard?.serviceBreakdown[0];
  const totalBudgetUsed = dashboard?.systemOverview.totalCosts || 0;
  const monthlyBudget = 100; // $100 monthly budget assumption
  const budgetUsagePercent = (totalBudgetUsed / monthlyBudget) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Token Cost Dashboard</h2>
          <p className="text-muted-foreground">Monitor AI usage costs across all medical processing systems</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateSummaryMutation.mutate()}
            disabled={generateSummaryMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button
            variant="outline"
            onClick={() => resetMetricsMutation.mutate()}
            disabled={resetMetricsMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard?.systemOverview.totalCosts || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {dashboard?.systemOverview.totalCalls || 0} API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboard?.systemOverview.totalTokens || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Input + Output tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Encounter</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard?.systemOverview.averageCostPerEncounter || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per medical encounter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${budgetUsagePercent > 80 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetUsagePercent.toFixed(1)}%
            </div>
            <Progress value={Math.min(budgetUsagePercent, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              of ${monthlyBudget} monthly budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
            <CardDescription>Cost and usage by medical processing system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.serviceBreakdown.map((service, index) => (
                <div key={service.service} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getServiceColor(service.service)}`}></div>
                    <div>
                      <p className="text-sm font-medium">
                        {service.service.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.totalCalls} calls
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(service.totalCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(service.averageCostPerCall)}/call
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Projections</CardTitle>
            <CardDescription>Estimated costs based on current usage patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Daily (50 encounters)</span>
                <Badge variant="outline">{dashboard?.costProjections.daily}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly</span>
                <Badge variant="outline">{dashboard?.costProjections.monthly}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Yearly</span>
                <Badge variant="secondary">{dashboard?.costProjections.yearly}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {dashboard?.recommendations && dashboard.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Optimization Recommendations
            </CardTitle>
            <CardDescription>AI-generated suggestions to reduce token costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-yellow-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High-cost Service Alert */}
      {highestCostService && highestCostService.totalCost > 0.01 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              High Cost Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              <strong>{highestCostService.service.replace(/_/g, ' ')}</strong> is consuming{" "}
              {((highestCostService.totalCost / (dashboard?.systemOverview.totalCosts || 1)) * 100).toFixed(1)}%{" "}
              of total costs ({formatCurrency(highestCostService.totalCost)}). Consider optimization.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}