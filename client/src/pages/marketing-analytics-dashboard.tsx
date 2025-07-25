import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Activity, 
  Target, AlertCircle, CheckCircle, Clock, BarChart2,
  Stethoscope, FileText, Pill, FlaskConical, Calendar
} from "lucide-react";
import { addDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock data for initial development - will be replaced with real API data
const COLORS = ['#1e3a8a', '#fbbf24', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export function MarketingAnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [selectedHealthSystem, setSelectedHealthSystem] = useState<string>("all");

  // Fetch analytics summary
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<any>({
    queryKey: ['/api/analytics/summary', dateFrom, dateTo, selectedHealthSystem],
    enabled: !!dateFrom && !!dateTo,
  });

  // Fetch conversion metrics
  const { data: conversionData, isLoading: isLoadingConversions } = useQuery<any>({
    queryKey: ['/api/analytics/conversions', dateFrom, dateTo, selectedHealthSystem],
    enabled: !!dateFrom && !!dateTo,
  });

  // Fetch feature usage data
  const { data: featureUsageData, isLoading: isLoadingFeatures } = useQuery<any>({
    queryKey: ['/api/analytics/feature-usage', dateFrom, dateTo, selectedHealthSystem],
    enabled: !!dateFrom && !!dateTo,
  });

  // Fetch acquisition metrics
  const { data: acquisitionData, isLoading: isLoadingAcquisition } = useQuery<any>({
    queryKey: ['/api/analytics/acquisition', dateFrom, dateTo, selectedHealthSystem],
    enabled: !!dateFrom && !!dateTo,
  });

  // Key metrics cards
  const renderKeyMetrics = () => {
    const metrics = analyticsData?.keyMetrics || {
      totalUsers: 0,
      activeUsers: 0,
      newPatients: 0,
      totalEncounters: 0,
      conversionRate: 0,
      avgSessionDuration: 0,
      customerLifetimeValue: 0,
      patientAcquisitionCost: 0
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Active Users
              <Users className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-600">+12%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Customer LTV
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.customerLifetimeValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              Per provider account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Patient Acquisition Cost
              <Target className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.patientAcquisitionCost}</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-red-600">-8%</span> improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Conversion Rate
              <Activity className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">
              Trial to paid conversion
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Feature usage chart
  const renderFeatureUsageChart = () => {
    const data = featureUsageData?.features || [];

    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Feature Usage Analytics</CardTitle>
          <CardDescription>Most used features by providers</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="feature" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usageCount" fill="#1e3a8a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Conversion funnel
  const renderConversionFunnel = () => {
    const funnelData = conversionData?.funnel || [
      { stage: "Landing Page Visits", count: 10000, percentage: 100 },
      { stage: "Sign Up Started", count: 3000, percentage: 30 },
      { stage: "Account Created", count: 1500, percentage: 15 },
      { stage: "First Patient Added", count: 1200, percentage: 12 },
      { stage: "First SOAP Note", count: 900, percentage: 9 },
      { stage: "Paid Conversion", count: 450, percentage: 4.5 }
    ];

    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>User journey from visit to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((stage: any, index: number) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <span className="text-sm text-gray-500">{stage.count.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-navy-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${stage.percentage}%` }}
                  >
                    <span className="text-xs text-white font-medium">{stage.percentage}%</span>
                  </div>
                </div>
                {index < funnelData.length - 1 && (
                  <div className="absolute right-0 top-8 text-xs text-gray-500">
                    ↓ {((stage.count / funnelData[index + 1].count - 1) * 100).toFixed(1)}% drop
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Clinical efficiency metrics
  const renderClinicalEfficiencyMetrics = () => {
    const efficiencyData = analyticsData?.clinicalEfficiency || {
      avgSOAPTime: 0,
      avgEncounterDuration: 0,
      documentsProcessedPerDay: 0,
      ordersPerEncounter: 0
    };

    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Clinical Efficiency Metrics</CardTitle>
          <CardDescription>Provider productivity and time savings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Stethoscope className="h-8 w-8 mx-auto mb-2 text-navy-blue-600" />
              <div className="text-2xl font-bold">{efficiencyData.avgSOAPTime}min</div>
              <p className="text-sm text-gray-600">Avg SOAP Note Time</p>
              <p className="text-xs text-green-600 mt-1">70% faster than typing</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-navy-blue-600" />
              <div className="text-2xl font-bold">{efficiencyData.avgEncounterDuration}min</div>
              <p className="text-sm text-gray-600">Avg Encounter Duration</p>
              <p className="text-xs text-green-600 mt-1">25% reduction</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-navy-blue-600" />
              <div className="text-2xl font-bold">{efficiencyData.documentsProcessedPerDay}</div>
              <p className="text-sm text-gray-600">Documents/Day</p>
              <p className="text-xs text-gray-500 mt-1">AI-processed</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-navy-blue-600" />
              <div className="text-2xl font-bold">{efficiencyData.ordersPerEncounter}</div>
              <p className="text-sm text-gray-600">Orders/Encounter</p>
              <p className="text-xs text-gray-500 mt-1">Average efficiency</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // User engagement over time
  const renderUserEngagementChart = () => {
    const engagementData = analyticsData?.userEngagement || [];

    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>User Engagement Over Time</CardTitle>
          <CardDescription>Daily active users and session metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="activeUsers" stroke="#1e3a8a" name="Active Users" />
              <Line yAxisId="left" type="monotone" dataKey="newUsers" stroke="#10b981" name="New Users" />
              <Line yAxisId="right" type="monotone" dataKey="avgSessionDuration" stroke="#fbbf24" name="Avg Session (min)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Marketing opportunities alert
  const renderMarketingOpportunities = () => {
    const opportunities = analyticsData?.opportunities || [
      { type: "high_usage", message: "Dr. Smith has high engagement - perfect for case study", priority: "high" },
      { type: "churn_risk", message: "3 providers haven't logged in for 2 weeks", priority: "urgent" },
      { type: "upsell", message: "5 providers approaching patient limit - upgrade opportunity", priority: "medium" },
      { type: "referral", message: "Dr. Johnson's practice showed 40% efficiency gain", priority: "high" }
    ];

    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Marketing Opportunities & Alerts</CardTitle>
          <CardDescription>Real-time insights for marketing actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {opportunities.map((opp: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {opp.priority === 'urgent' && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                {opp.priority === 'high' && <TrendingUp className="h-5 w-5 text-orange-500 mt-0.5" />}
                {opp.priority === 'medium' && <Target className="h-5 w-5 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{opp.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {opp.type.replace('_', ' ').charAt(0).toUpperCase() + opp.type.slice(1).replace('_', ' ')}
                  </p>
                </div>
                <Button size="sm" variant="outline">Take Action</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketing Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights for data-driven decisions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedHealthSystem} onValueChange={setSelectedHealthSystem}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Health Systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health Systems</SelectItem>
              <SelectItem value="trial">Trial Accounts</SelectItem>
              <SelectItem value="paid">Paid Accounts</SelectItem>
              <SelectItem value="enterprise">Enterprise Only</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <div>
              <Label htmlFor="dateFrom" className="text-xs">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="text-xs">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          
          <Button>Export Report</Button>
        </div>
      </div>

      {/* Key Metrics */}
      {renderKeyMetrics()}

      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Overview</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderFeatureUsageChart()}
            {renderConversionFunnel()}
          </div>
          {renderUserEngagementChart()}
          {renderClinicalEfficiencyMetrics()}
          {renderMarketingOpportunities()}
        </TabsContent>

        <TabsContent value="acquisition" className="space-y-4">
          {/* Acquisition-specific charts */}
          <Card>
            <CardHeader>
              <CardTitle>User Acquisition Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Channel performance metrics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {/* Engagement-specific charts */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption & Usage Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Detailed engagement analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          {/* Clinical efficiency charts */}
          {renderClinicalEfficiencyMetrics()}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {/* Revenue analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">MRR, churn, and revenue metrics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}