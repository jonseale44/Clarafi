import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  LineChart,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";

interface Cohort {
  id: number;
  name: string;
  definition: string;
  createdAt: Date;
  monthKey: string;
  metrics: CohortMetrics;
}

interface CohortMetrics {
  totalUsers: number;
  activeUsers: number;
  retentionRate: number[];
  revenuePerUser: number;
  totalRevenue: number;
  featureAdoption: {
    [feature: string]: number;
  };
  churnRate: number;
  lifetimeValue: number;
}

interface RetentionMatrix {
  cohorts: {
    month: string;
    users: number;
    retention: number[];
  }[];
}

export function CohortAnalysisDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState("6months");

  // Fetch cohorts
  const { data: cohorts = [], isLoading } = useQuery<Cohort[]>({
    queryKey: ['/api/advanced-marketing/cohorts'],
  });

  // Fetch retention matrix
  const { data: retentionMatrix } = useQuery<RetentionMatrix>({
    queryKey: ['/api/advanced-marketing/cohorts/retention-matrix', selectedTimeRange],
  });

  // Create new cohort
  const createCohortMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-marketing/cohorts', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/cohorts'] });
      toast({ title: "Cohort created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create cohort", variant: "destructive" });
    }
  });

  const formatRetention = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getRetentionColor = (rate: number) => {
    if (rate >= 0.8) return "text-green-600";
    if (rate >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getChurnColor = (rate: number) => {
    if (rate <= 0.05) return "text-green-600";
    if (rate <= 0.15) return "text-yellow-600";
    return "text-red-600";
  };

  // Generate months for retention headers
  const getRetentionHeaders = () => {
    const headers = ["Month 0"];
    for (let i = 1; i <= 12; i++) {
      headers.push(`Month ${i}`);
    }
    return headers;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cohort Analysis</h2>
          <p className="text-muted-foreground">Track user behavior and retention across different cohorts</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="24months">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Users2 className="mr-2 h-4 w-4" />
                Create Cohort
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Cohort</DialogTitle>
                <DialogDescription>
                  Define a cohort based on user signup date or specific criteria
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createCohortMutation.mutate({
                  name: formData.get('name'),
                  definition: formData.get('definition'),
                  type: formData.get('type')
                });
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Cohort Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., January 2025 Signups"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Cohort Type</Label>
                    <Select name="type" defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly Signups</SelectItem>
                        <SelectItem value="weekly">Weekly Signups</SelectItem>
                        <SelectItem value="custom">Custom Definition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="definition">Definition</Label>
                    <Textarea
                      id="definition"
                      name="definition"
                      placeholder="Users who signed up in January 2025"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createCohortMutation.isPending}>
                    Create Cohort
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Retention Matrix */}
      {retentionMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Retention Matrix
            </CardTitle>
            <CardDescription>
              User retention by cohort over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Cohort</th>
                    <th className="text-center p-2 border-b">Users</th>
                    {getRetentionHeaders().map((header) => (
                      <th key={header} className="text-center p-2 border-b text-sm">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retentionMatrix.cohorts.map((cohort) => (
                    <tr key={cohort.month} className="hover:bg-muted/50">
                      <td className="p-2 border-b font-medium">{cohort.month}</td>
                      <td className="text-center p-2 border-b">{cohort.users}</td>
                      {cohort.retention.map((rate, idx) => (
                        <td 
                          key={idx} 
                          className={`text-center p-2 border-b text-sm ${getRetentionColor(rate)}`}
                        >
                          {formatRetention(rate)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohort Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading cohorts...
                </CardContent>
              </Card>
            ) : cohorts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <Users2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No cohorts created yet. Create your first cohort to start tracking!</p>
                </CardContent>
              </Card>
            ) : (
              cohorts.map((cohort) => (
                <Card key={cohort.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{cohort.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {format(new Date(cohort.createdAt), 'MMM yyyy')}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {cohort.metrics.totalUsers} users
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Users</span>
                      <span className="text-sm font-medium">
                        {cohort.metrics.activeUsers} ({formatRetention(cohort.metrics.activeUsers / cohort.metrics.totalUsers)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Month 1 Retention</span>
                      <span className={`text-sm font-medium ${getRetentionColor(cohort.metrics.retentionRate[1] || 0)}`}>
                        {formatRetention(cohort.metrics.retentionRate[1] || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Revenue/User</span>
                      <span className="text-sm font-medium">
                        ${cohort.metrics.revenuePerUser.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Churn Rate</span>
                      <span className={`text-sm font-medium ${getChurnColor(cohort.metrics.churnRate)}`}>
                        {formatRetention(cohort.metrics.churnRate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Revenue Analysis Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Cohort</CardTitle>
              <CardDescription>
                Compare lifetime value and revenue metrics across cohorts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cohorts.map((cohort) => (
                  <div key={cohort.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{cohort.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cohort.metrics.totalUsers} users
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${cohort.metrics.totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          LTV: ${cohort.metrics.lifetimeValue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={(cohort.metrics.lifetimeValue / 2000) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Adoption Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption by Cohort</CardTitle>
              <CardDescription>
                Track how different cohorts adopt key platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cohorts.length > 0 && (
                  <div className="grid gap-4">
                    {Object.keys(cohorts[0].metrics.featureAdoption).map((feature) => (
                      <div key={feature} className="space-y-2">
                        <h4 className="font-medium capitalize">
                          {feature.replace(/_/g, ' ')}
                        </h4>
                        <div className="space-y-1">
                          {cohorts.map((cohort) => (
                            <div key={cohort.id} className="flex justify-between items-center">
                              <span className="text-sm">{cohort.name}</span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={cohort.metrics.featureAdoption[feature] || 0} 
                                  className="w-24 h-2"
                                />
                                <span className="text-sm text-muted-foreground w-10 text-right">
                                  {cohort.metrics.featureAdoption[feature] || 0}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Analysis Tab */}
        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Churn Analysis</CardTitle>
              <CardDescription>
                Identify at-risk cohorts and churn patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {cohorts
                  .sort((a, b) => b.metrics.churnRate - a.metrics.churnRate)
                  .map((cohort) => (
                    <div key={cohort.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          cohort.metrics.churnRate > 0.15 ? 'bg-red-100' : 
                          cohort.metrics.churnRate > 0.05 ? 'bg-yellow-100' : 
                          'bg-green-100'
                        }`}>
                          {cohort.metrics.churnRate > 0.15 ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : cohort.metrics.churnRate > 0.05 ? (
                            <Activity className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{cohort.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cohort.metrics.totalUsers - cohort.metrics.activeUsers} churned users
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getChurnColor(cohort.metrics.churnRate)}`}>
                          {formatRetention(cohort.metrics.churnRate)}
                        </p>
                        <p className="text-xs text-muted-foreground">churn rate</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}