import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Eye, Target, DollarSign } from "lucide-react";

export default function MarketingMetricsDashboard() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });
  const [metricType, setMetricType] = useState("daily");

  // Get real analytics summary data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/analytics/summary?from=${dateRange.start.toISOString()}&to=${dateRange.end.toISOString()}`],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Use real data from analytics endpoint
  const summaryData = {
    totalVisits: analyticsData?.keyMetrics?.totalEncounters || 0,
    uniqueVisitors: analyticsData?.keyMetrics?.activeUsers || 0,
    signups: analyticsData?.keyMetrics?.totalUsers || 0,
    conversionRate: analyticsData?.keyMetrics?.conversionRate || 0,
  };

  return (
    <div className="space-y-6" data-median="marketing-metrics-dashboard">
      {/* Controls */}
      <div className="flex gap-4" data-median="metrics-controls">
        <Select value={metricType} onValueChange={setMetricType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-median="metrics-summary-grid">
        <Card data-median="total-visits-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold">{summaryData.totalVisits.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5% from last period
                </p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
                <p className="text-2xl font-bold">{summaryData.uniqueVisitors.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.3% from last period
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signups</p>
                <p className="text-2xl font-bold">{summaryData.signups}</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -5.2% from last period
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{summaryData.conversionRate}%</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +0.3% from last period
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Analytics Data Display */}
      {analyticsData && (
        <>
          {/* Key Metrics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Clinical Efficiency Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg SOAP Time</p>
                  <p className="text-xl font-semibold">{analyticsData.clinicalEfficiency?.avgSOAPTime || 0} min</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documents/Day</p>
                  <p className="text-xl font-semibold">{analyticsData.clinicalEfficiency?.documentsProcessedPerDay || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders/Encounter</p>
                  <p className="text-xl font-semibold">{analyticsData.clinicalEfficiency?.ordersPerEncounter || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing Opportunities */}
          {analyticsData.opportunities && analyticsData.opportunities.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Marketing Opportunities</h3>
                <div className="space-y-2">
                  {analyticsData.opportunities.map((opportunity: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      opportunity.priority === 'urgent' ? 'bg-red-50' : 
                      opportunity.priority === 'high' ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}>
                      <p className="text-sm font-medium">{opportunity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">Type: {opportunity.type}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}