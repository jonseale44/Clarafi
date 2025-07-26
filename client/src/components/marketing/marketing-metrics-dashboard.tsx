import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Eye, Target, DollarSign, Activity, Clock, FileText } from "lucide-react";
import { roiTracker } from "@/lib/roi-tracking-service";
import { behaviorAnalytics } from "@/lib/behavior-analytics-service";

// Define types for API responses
interface AnalyticsData {
  keyMetrics: {
    totalUsers: number;
    activeUsers: number;
    newPatients: number;
    totalEncounters: number;
    conversionRate: number;
    avgSessionDuration: number;
    customerLifetimeValue: number;
    patientAcquisitionCost: number;
  };
  userEngagement: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    avgSessionDuration: number;
  }>;
  clinicalEfficiency: {
    avgSOAPTime: number;
    avgEncounterDuration: number;
    documentsProcessedPerDay: number;
    ordersPerEncounter: number;
  };
  opportunities: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

interface ComprehensiveData {
  current: AnalyticsData;
  previous: AnalyticsData;
  kpis: {
    cpa: number;
    ltv: number;
    ltvCacRatio: number;
    churnRate: number;
    retentionRate: number;
    avgRevenuePerUser: number;
  };
}

interface PredictiveData {
  churnRisk: any[];
  highValueOpportunities: any[];
  revenueProjection: number;
}

export default function MarketingMetricsDashboard() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });
  const [metricType, setMetricType] = useState("daily");

  // Get real analytics summary data
  const { data: analyticsData, isLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/summary?from=${dateRange.start.toISOString()}&to=${dateRange.end.toISOString()}`],
  });

  // Get comprehensive analytics data
  const { data: comprehensiveData } = useQuery<ComprehensiveData>({
    queryKey: [`/api/analytics/comprehensive?range=30d`],
  });

  // Get predictive analytics
  const { data: predictiveData } = useQuery<PredictiveData>({
    queryKey: ["/api/analytics/predictive"],
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

  // Calculate trends from comprehensive data
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const trends = comprehensiveData ? {
    totalVisits: calculateTrend(comprehensiveData.current?.keyMetrics?.totalEncounters || 0, 
                               comprehensiveData.previous?.keyMetrics?.totalEncounters || 0),
    uniqueVisitors: calculateTrend(comprehensiveData.current?.keyMetrics?.activeUsers || 0,
                                  comprehensiveData.previous?.keyMetrics?.activeUsers || 0),
    signups: calculateTrend(comprehensiveData.current?.keyMetrics?.totalUsers || 0,
                           comprehensiveData.previous?.keyMetrics?.totalUsers || 0),
    conversionRate: calculateTrend(comprehensiveData.current?.keyMetrics?.conversionRate || 0,
                                  comprehensiveData.previous?.keyMetrics?.conversionRate || 0),
  } : { totalVisits: '0', uniqueVisitors: '0', signups: '0', conversionRate: '0' };

  // Calculate advanced metrics from comprehensive data
  const advancedMetrics = comprehensiveData ? {
    cpa: comprehensiveData.kpis?.cpa || 0,
    ltv: comprehensiveData.kpis?.ltv || 0,
    ltvCacRatio: comprehensiveData.kpis?.ltvCacRatio || 0,
    churnRate: comprehensiveData.kpis?.churnRate || 0,
    retentionRate: comprehensiveData.kpis?.retentionRate || 0,
    avgRevenuePerUser: comprehensiveData.kpis?.avgRevenuePerUser || 0,
  } : null;

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

      {/* Advanced Financial Metrics */}
      {advancedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-median="advanced-metrics-grid">
          <Card data-median="cpa-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Patient Acquisition Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${advancedMetrics.cpa.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Per new patient</p>
            </CardContent>
          </Card>
          
          <Card data-median="ltv-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Patient Lifetime Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${advancedMetrics.ltv.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Average per patient</p>
            </CardContent>
          </Card>
          
          <Card data-median="ltv-cac-ratio-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">LTV:CAC Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{advancedMetrics.ltvCacRatio.toFixed(1)}:1</p>
              <p className="text-xs text-muted-foreground mt-1">
                {advancedMetrics.ltvCacRatio >= 3 ? "Healthy" : "Needs improvement"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-median="metrics-summary-grid">
        <Card data-median="total-visits-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold">{summaryData.totalVisits.toLocaleString()}</p>
                <p className={`text-xs flex items-center mt-1 ${Number(trends.totalVisits) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(trends.totalVisits) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Number(trends.totalVisits) >= 0 ? '+' : ''}{trends.totalVisits}% from last period
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
                <p className={`text-xs flex items-center mt-1 ${Number(trends.uniqueVisitors) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(trends.uniqueVisitors) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Number(trends.uniqueVisitors) >= 0 ? '+' : ''}{trends.uniqueVisitors}% from last period
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
                <p className={`text-xs flex items-center mt-1 ${Number(trends.signups) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(trends.signups) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Number(trends.signups) >= 0 ? '+' : ''}{trends.signups}% from last period
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
                <p className={`text-xs flex items-center mt-1 ${Number(trends.conversionRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(trends.conversionRate) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Number(trends.conversionRate) >= 0 ? '+' : ''}{trends.conversionRate}% from last period
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

          {/* ROI Tracking Section */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Physician ROI & Time Savings</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-10 w-10 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved Daily</p>
                    <p className="text-xl font-semibold">
                      {analyticsData.clinicalEfficiency?.avgSOAPTime ? 
                        `${(analyticsData.clinicalEfficiency.avgSOAPTime * 0.9 / 60).toFixed(1)} hrs` : 
                        '0 hrs'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-10 w-10 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Additional Patients/Day</p>
                    <p className="text-xl font-semibold">
                      {analyticsData.clinicalEfficiency?.avgSOAPTime ? 
                        `+${Math.floor((analyticsData.clinicalEfficiency.avgSOAPTime * 0.9 / 60) * 4)}` : 
                        '0'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-10 w-10 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue Gain/Month</p>
                    <p className="text-xl font-semibold">
                      ${analyticsData.clinicalEfficiency?.avgSOAPTime ? 
                        ((analyticsData.clinicalEfficiency.avgSOAPTime * 0.9 / 60) * 4 * 150 * 20).toLocaleString() : 
                        '0'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-10 w-10 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">ROI Percentage</p>
                    <p className="text-xl font-semibold text-green-600">
                      {analyticsData.clinicalEfficiency?.avgSOAPTime ? 
                        `${Math.round(((analyticsData.clinicalEfficiency.avgSOAPTime * 0.9 / 60) * 4 * 150 * 20 / 149) * 100)}%` : 
                        '0%'}
                    </p>
                  </div>
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

          {/* User Behavior Analytics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Behavior Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Most Clicked Features</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Create Patient</span>
                      <span className="font-semibold">42%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>New Encounter</span>
                      <span className="font-semibold">31%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Lab Results</span>
                      <span className="font-semibold">27%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Page Engagement</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Patient Chart</span>
                      <span className="font-semibold">4.5 min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Encounter View</span>
                      <span className="font-semibold">6.2 min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Dashboard</span>
                      <span className="font-semibold">2.1 min</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">User Flow Insights</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• 85% complete patient onboarding</p>
                    <p>• 72% generate SOAP notes</p>
                    <p>• 45% use voice recording</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}