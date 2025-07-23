import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Globe, DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AcquisitionStats {
  totalSignups: number;
  signupsBySource: Record<string, number>;
  signupsByMedium: Record<string, number>;
  signupsByCampaign: Record<string, number>;
  signupsByChannel: Record<string, number>;
  recentSignups: Array<{
    id: number;
    userId: number;
    acquisitionDate: Date;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    channelGroup: string | null;
    referrerUrl: string | null;
    user?: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function AcquisitionTracking() {
  const { data: stats, isLoading } = useQuery<AcquisitionStats>({
    queryKey: ["/api/admin/acquisition/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const sourceChartData = Object.entries(stats.signupsBySource || {})
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Top 6 sources

  const channelData = Object.entries(stats.signupsByChannel || {})
    .map(([channel, count]) => ({ 
      channel, 
      users: count,
      percentage: stats.totalSignups > 0 ? ((count / stats.totalSignups) * 100).toFixed(1) : 0,
      isPaid: channel.toLowerCase().includes('paid') || channel.toLowerCase().includes('cpc')
    }))
    .sort((a, b) => b.users - a.users);

  return (
    <div className="space-y-6" data-median="acquisition-tracking">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-median="acquisition-summary-grid">
        <Card data-median="total-signups-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Signups (30d)</p>
                <p className="text-2xl font-bold mt-1">{stats.totalSignups}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-median="top-source-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Source</p>
                <p className="text-2xl font-bold mt-1">
                  {Object.entries(stats.signupsBySource || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Channels</p>
                <p className="text-2xl font-bold mt-1">{Object.keys(stats.signupsByChannel || {}).length}</p>
              </div>
              <Globe className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold mt-1">{Object.keys(stats.signupsByCampaign || {}).length}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Overview and Source Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Acquisition Channels</h3>
            <div className="space-y-3">
              {channelData.length > 0 ? (
                channelData.map((channel) => (
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
                      {channel.users} ({channel.percentage}%)
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No channel data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Traffic Sources</h3>
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>No source data available</p>
              </div>
            )}
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
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Referrer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSignups && stats.recentSignups.length > 0 ? (
                stats.recentSignups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell>
                      {format(new Date(signup.acquisitionDate), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{signup.user?.firstName} {signup.user?.lastName}</p>
                        <p className="text-sm text-muted-foreground">{signup.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{signup.source || 'direct'}</Badge>
                    </TableCell>
                    <TableCell>{signup.medium || '-'}</TableCell>
                    <TableCell>{signup.campaign || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={signup.referrerUrl || ''}>
                      {signup.referrerUrl || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={6}>
                    No acquisition data available yet. Data will populate as users sign up.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* UTM Campaign Performance */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">UTM Campaign Performance</h3>
          {Object.keys(stats.signupsByCampaign || {}).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.signupsByCampaign || {})
                .sort(([,a], [,b]) => b - a)
                .map(([campaign, count]) => (
                  <div key={campaign} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{campaign}</p>
                      <p className="text-sm text-muted-foreground">Campaign</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">Signups</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p>No UTM campaign data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}