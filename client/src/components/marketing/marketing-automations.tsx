import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  Zap, 
  Play, 
  Pause, 
  Settings,
  AlertCircle,
  Calendar,
  DollarSign
} from "lucide-react";

export default function MarketingAutomations() {
  const queryClient = useQueryClient();
  const [showEnabled, setShowEnabled] = useState<boolean | undefined>(undefined);

  const { data: automations, isLoading } = useQuery({
    queryKey: [
      "/api/marketing/automations",
      showEnabled !== undefined ? { enabled: showEnabled } : {},
    ],
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/marketing/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update automation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/automations"] });
      toast({
        title: "Automation updated",
        description: "The automation has been updated successfully.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  // Stub automations for demonstration
  const stubAutomations = [
    {
      id: 1,
      name: "Pause Underperforming Campaigns",
      description: "Automatically pause campaigns with CPA above threshold",
      automationType: "campaign_pause",
      enabled: false,
      testMode: true,
      triggerConditions: {
        metric: "cost_per_acquisition",
        operator: "greater_than",
        threshold: 50,
        timeWindow: "24h"
      },
      actions: [
        { type: "pause_campaign", parameters: { platform: "google_ads" } },
        { type: "send_notification", parameters: { channel: "email" } }
      ],
      executionCount: 0
    },
    {
      id: 2,
      name: "A/B Test Landing Pages",
      description: "Automatically run A/B tests on new landing page variations",
      automationType: "ab_test",
      enabled: false,
      testMode: true,
      schedule: "0 0 * * MON", // Every Monday
      triggerConditions: {
        metric: "conversion_rate",
        operator: "changes_by",
        threshold: 10,
        timeWindow: "7d"
      },
      actions: [
        { type: "create_ab_test", parameters: { split: 50 } },
        { type: "track_performance", parameters: { duration: "14d" } }
      ],
      executionCount: 0
    },
    {
      id: 3,
      name: "Budget Reallocation",
      description: "Move budget from low-performing to high-performing channels",
      automationType: "budget_adjustment",
      enabled: false,
      testMode: true,
      schedule: "0 9 * * *", // Daily at 9 AM
      triggerConditions: {
        metric: "roi",
        operator: "less_than",
        threshold: 1.5,
        timeWindow: "48h"
      },
      actions: [
        { type: "reallocate_budget", parameters: { maxShift: 20 } },
        { type: "log_changes", parameters: {} }
      ],
      executionCount: 0
    }
  ];

  const getAutomationIcon = (type: string) => {
    switch (type) {
      case "campaign_pause":
        return <Pause className="h-5 w-5" />;
      case "ab_test":
        return <Settings className="h-5 w-5" />;
      case "budget_adjustment":
        return <DollarSign className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getOperatorText = (operator: string) => {
    const operators: Record<string, string> = {
      greater_than: ">",
      less_than: "<",
      equals: "=",
      changes_by: "±"
    };
    return operators[operator] || operator;
  };

  return (
    <div className="space-y-6">
      {/* Filter Toggle */}
      <div className="flex items-center gap-4">
        <Button
          variant={showEnabled === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEnabled(undefined)}
        >
          All Automations
        </Button>
        <Button
          variant={showEnabled === true ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEnabled(true)}
        >
          Enabled Only
        </Button>
        <Button
          variant={showEnabled === false ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEnabled(false)}
        >
          Disabled Only
        </Button>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {stubAutomations.map((automation) => (
          <Card key={automation.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAutomationIcon(automation.automationType)}
                  <div>
                    <CardTitle className="text-lg">{automation.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {automation.testMode && (
                    <Badge variant="secondary">Test Mode</Badge>
                  )}
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={(checked) => 
                      updateAutomation.mutate({ 
                        id: automation.id, 
                        updates: { enabled: checked } 
                      })
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Trigger Conditions */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Trigger Condition</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {automation.triggerConditions.metric}
                    </Badge>
                    <span className="font-mono">
                      {getOperatorText(automation.triggerConditions.operator)}
                    </span>
                    <Badge variant="outline">
                      {automation.triggerConditions.threshold}
                    </Badge>
                    {automation.triggerConditions.timeWindow && (
                      <>
                        <span className="text-muted-foreground">within</span>
                        <Badge variant="outline">
                          {automation.triggerConditions.timeWindow}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                {automation.schedule && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Schedule</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Runs on schedule: {automation.schedule}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Actions</h4>
                  <div className="space-y-1">
                    {automation.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Play className="h-3 w-3 text-muted-foreground" />
                        <span>{action.type.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution Stats */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Executed {automation.executionCount} times
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning Message */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Automations are currently in test mode
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                All automations will simulate actions without making actual changes. 
                Remove test mode when ready to enable live automations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}