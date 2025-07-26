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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FlaskConical, TrendingUp, Users, Target, BarChart3, Play, Pause, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface AbTest {
  id: number;
  healthSystemId: number;
  name: string;
  description: string | null;
  featureKey: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  winningVariant: string | null;
  variants: {
    control: any;
    treatment: any;
  };
  metrics: {
    control: {
      users: number;
      conversions: number;
      conversionRate: number;
    };
    treatment: {
      users: number;
      conversions: number;
      conversionRate: number;
    };
    significance: number;
    confidence: number;
  };
  createdAt: Date;
}

export function AbTestingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AbTest | null>(null);

  // Fetch A/B tests
  const { data: tests = [], isLoading } = useQuery<AbTest[]>({
    queryKey: ['/api/advanced-marketing/ab-tests'],
  });

  // Create new A/B test
  const createTestMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-marketing/ab-tests', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/ab-tests'] });
      toast({ title: "A/B test created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create A/B test", variant: "destructive" });
    }
  });

  // Update test status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest(`/api/advanced-marketing/ab-tests/${id}/status`, 'PUT', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/ab-tests'] });
      toast({ title: "Test status updated" });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateLift = (control: number, treatment: number) => {
    if (control === 0) return 0;
    return ((treatment - control) / control * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing</h2>
          <p className="text-muted-foreground">Run experiments to optimize your healthcare platform</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FlaskConical className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new experiment to test variations of your platform features
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createTestMutation.mutate({
                name: formData.get('name'),
                description: formData.get('description'),
                featureKey: formData.get('featureKey'),
                variants: {
                  control: formData.get('control'),
                  treatment: formData.get('treatment')
                }
              });
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Test Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Homepage CTA Button Color"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe what you're testing and why"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="featureKey">Feature Key</Label>
                  <Select name="featureKey" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select feature to test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homepage_cta">Homepage CTA</SelectItem>
                      <SelectItem value="signup_flow">Signup Flow</SelectItem>
                      <SelectItem value="pricing_page">Pricing Page</SelectItem>
                      <SelectItem value="onboarding">Onboarding Process</SelectItem>
                      <SelectItem value="dashboard_layout">Dashboard Layout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="control">Control (Original)</Label>
                    <Input
                      id="control"
                      name="control"
                      placeholder="e.g., Blue Button"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="treatment">Treatment (Variation)</Label>
                    <Input
                      id="treatment"
                      name="treatment"
                      placeholder="e.g., Green Button"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTestMutation.isPending}>
                  Create Test
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tests */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading A/B tests...
            </CardContent>
          </Card>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No A/B tests yet. Create your first experiment!</p>
            </CardContent>
          </Card>
        ) : (
          tests.map((test) => (
            <Card key={test.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {test.name}
                      <Badge className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {test.description || `Testing ${test.featureKey}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {test.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'running' })}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {test.status === 'running' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'paused' })}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {test.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'running' })}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variants Performance */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Control</span>
                      <span className="text-sm text-muted-foreground">
                        {test.variants.control}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span>{test.metrics.control.users}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversions</span>
                        <span>{test.metrics.control.conversions}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Conversion Rate</span>
                        <span>{test.metrics.control.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Treatment</span>
                      <span className="text-sm text-muted-foreground">
                        {test.variants.treatment}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span>{test.metrics.treatment.users}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversions</span>
                        <span>{test.metrics.treatment.conversions}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Conversion Rate</span>
                        <span className="flex items-center gap-1">
                          {test.metrics.treatment.conversionRate}%
                          {test.metrics.treatment.conversionRate > test.metrics.control.conversionRate && (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistical Significance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Statistical Significance</span>
                    <span className="font-medium">{test.metrics.confidence}% confidence</span>
                  </div>
                  <Progress value={test.metrics.confidence} className="h-2" />
                  {test.metrics.confidence >= 95 && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Test has reached statistical significance
                    </p>
                  )}
                </div>

                {/* Lift Calculation */}
                {test.metrics.treatment.conversionRate !== test.metrics.control.conversionRate && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-center">
                      <span className="font-medium">Lift: </span>
                      <span className={`font-bold ${
                        test.metrics.treatment.conversionRate > test.metrics.control.conversionRate
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {test.metrics.treatment.conversionRate > test.metrics.control.conversionRate ? '+' : ''}
                        {calculateLift(test.metrics.control.conversionRate, test.metrics.treatment.conversionRate)}%
                      </span>
                    </p>
                  </div>
                )}

                {/* Test Duration */}
                {test.startedAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Running since {format(new Date(test.startedAt), 'MMM d, yyyy')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}