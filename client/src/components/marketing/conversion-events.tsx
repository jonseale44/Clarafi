import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Clock, Smartphone, Monitor, Tablet } from "lucide-react";

export default function ConversionEvents() {
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  // Get real conversion funnel data
  const { data: conversionData, isLoading } = useQuery({
    queryKey: ["/api/analytics/conversions"],
  });

  // Get real conversion events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/conversion-events"],
  });

  if (isLoading || eventsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Use real conversion funnel data from the API
  const funnelData = conversionData?.funnel || [
    { stage: "Page Visit", count: 0, percentage: 100 },
    { stage: "Sign Up", count: 0, percentage: 0 },
    { stage: "First Patient", count: 0, percentage: 0 },
    { stage: "First SOAP Note", count: 0, percentage: 0 },
    { stage: "Paid Conversion", count: 0, percentage: 0 },
  ];

  const eventTypes = [
    { value: "all", label: "All Events" },
    { value: "signup", label: "Signups" },
    { value: "trial_start", label: "Trial Starts" },
    { value: "onboarding_complete", label: "Onboarding Complete" },
    { value: "first_chart_note", label: "First Chart Note" },
    { value: "subscription_upgrade", label: "Subscription Upgrades" },
  ];

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" data-median="conversion-events">
      {/* Controls */}
      <div className="flex gap-4" data-median="conversion-controls">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversion Funnel */}
      <Card data-median="conversion-funnel-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <span className="text-sm text-muted-foreground">
                    {stage.count.toLocaleString()} ({stage.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-6">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${stage.percentage}%` }}
                  >
                    {index < funnelData.length - 1 && (
                      <span className="text-xs text-white">
                        {((stage.count / funnelData[index + 1].count) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Conversion Events</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events && events.length > 0 ? (
                events.slice(0, 10).map((event: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline">{event.eventType}</Badge>
                    </TableCell>
                    <TableCell>{event.userEmail || 'Anonymous'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.metadata ? JSON.stringify(event.metadata).substring(0, 50) + '...' : '-'}
                    </TableCell>
                    <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={4}>
                    No conversion events recorded yet. Events will appear as users interact with the platform.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Event Statistics - Using Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversions</p>
                <p className="text-2xl font-bold">{conversionData?.totalConversions || 0}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
                <p className="text-2xl font-bold">{conversionData?.conversionRate || 0}%</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Period</p>
                <p className="text-xl font-semibold">{conversionData?.period || 'Last 30 days'}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}