import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Globe, DollarSign, TrendingUp } from "lucide-react";

export default function AcquisitionTracking() {
  const { data: acquisitions, isLoading } = useQuery({
    queryKey: ["/api/marketing/acquisition"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Stub data for channels
  const channelData = [
    { channel: "Organic Search", users: 3245, percentage: 37, isPaid: false },
    { channel: "Google Ads", users: 2134, percentage: 24, isPaid: true },
    { channel: "Direct", users: 1543, percentage: 18, isPaid: false },
    { channel: "Social Media", users: 987, percentage: 11, isPaid: false },
    { channel: "Facebook Ads", users: 654, percentage: 7, isPaid: true },
    { channel: "Email", users: 234, percentage: 3, isPaid: false },
  ];

  return (
    <div className="space-y-6">
      {/* Channel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Acquisition Channels</h3>
            <div className="space-y-3">
              {channelData.map((channel) => (
                <div key={channel.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm">{channel.channel}</span>
                    {channel.isPaid && (
                      <Badge variant="secondary" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {channel.users.toLocaleString()} ({channel.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Channel Performance</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>Channel performance chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Acquisitions Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent User Acquisitions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground text-center" colSpan={6}>
                  No acquisition data available yet. Data will populate as users sign up.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* UTM Parameters */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">UTM Campaign Performance</h3>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>UTM campaign tracking data will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}