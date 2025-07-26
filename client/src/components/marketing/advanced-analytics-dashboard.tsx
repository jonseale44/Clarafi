import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Brain, 
  Target, AlertTriangle, Activity, BarChart3, PieChart,
  Clock, UserCheck, UserX, Mail, Phone, Globe, Share2,
  ChevronRight, Zap, Eye, MousePointer, MessageSquare
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

// Industry benchmark constants based on research
const INDUSTRY_BENCHMARKS = {
  cpaHealthcare: 75, // $30-150 range, using midpoint
  conversionRate: 2.6, // 2.6% for paid search
  emailCtr: 2.38, // 2.07-2.69% CTR average
  patientRetention: 85, // 85% retention is good
  appointmentCompletion: 72, // 72% want online booking
  averageLTV: 4500, // Typical patient LTV
};

export default function AdvancedAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30d");
  const [channel, setChannel] = useState("all");
  const [comparisonMode, setComparisonMode] = useState(false);

  // Fetch comprehensive analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/analytics/comprehensive?range=${timeRange}&channel=${channel}`],
  });

  const { data: predictiveData } = useQuery({
    queryKey: ["/api/analytics/predictive"],
  });

  const { data: campaignROI } = useQuery({
    queryKey: ["/api/marketing/campaigns/roi"],
  });

  // Calculate real metrics from actual data
  const calculateMetrics = () => {
    if (!analyticsData) return null;

    const currentPeriodData = analyticsData.current || {};
    const previousPeriodData = analyticsData.previous || {};

    // User Acquisition Cost (CPA) - CLARAFI acquires users
    const totalSpend = currentPeriodData.marketingSpend || 0;
    const newUsers = currentPeriodData.newPatients || 0; // API still returns 'newPatients'
    const cpa = newUsers > 0 ? totalSpend / newUsers : 0;

    // Patient Lifetime Value (LTV)
    const avgRevenuePerPatient = currentPeriodData.avgRevenuePerPatient || 0;
    const avgPatientLifespan = currentPeriodData.avgPatientLifespanMonths || 24;
    const ltv = avgRevenuePerPatient * avgPatientLifespan;

    // LTV:CAC Ratio
    const ltvCacRatio = cpa > 0 ? ltv / cpa : 0;

    // Conversion funnel metrics
    const websiteVisitors = currentPeriodData.websiteVisitors || 0;
    const leads = currentPeriodData.leads || 0;
    const appointments = currentPeriodData.appointments || 0;
    const newPatientsFromWeb = currentPeriodData.newPatientsFromWeb || 0;

    // Calculate conversion rates
    const visitorToLeadRate = websiteVisitors > 0 ? (leads / websiteVisitors) * 100 : 0;
    const leadToAppointmentRate = leads > 0 ? (appointments / leads) * 100 : 0;
    const appointmentToPatientRate = appointments > 0 ? (newPatientsFromWeb / appointments) * 100 : 0;

    // Channel attribution
    const channelData = currentPeriodData.channelAttribution || {};
    
    // Engagement metrics
    const emailMetrics = currentPeriodData.emailMetrics || {};
    const socialMetrics = currentPeriodData.socialMetrics || {};

    // Calculate period-over-period changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      cpa,
      ltv,
      ltvCacRatio,
      newUsers,
      totalSpend,
      conversionRates: {
        visitorToLead: visitorToLeadRate,
        leadToAppointment: leadToAppointmentRate,
        appointmentToPatient: appointmentToPatientRate,
      },
      channelPerformance: channelData,
      engagement: {
        email: emailMetrics,
        social: socialMetrics,
      },
      changes: {
        cpa: calculateChange(cpa, previousPeriodData.cpa || 0),
        ltv: calculateChange(ltv, previousPeriodData.ltv || 0),
        newUsers: calculateChange(newUsers, previousPeriodData.newPatients || 0),
      },
      benchmarkComparison: {
        cpaDiff: ((cpa - INDUSTRY_BENCHMARKS.cpaHealthcare) / INDUSTRY_BENCHMARKS.cpaHealthcare) * 100,
        conversionDiff: ((visitorToLeadRate - INDUSTRY_BENCHMARKS.conversionRate) / INDUSTRY_BENCHMARKS.conversionRate) * 100,
      }
    };
  };

  const metrics = calculateMetrics();

  // Predictive insights component
  const PredictiveInsights = () => {
    if (!predictiveData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Predictive Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Churn Risk Patients */}
          {predictiveData.churnRisk && predictiveData.churnRisk.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{predictiveData.churnRisk.length} patients at high churn risk</strong>
                <ul className="mt-2 text-sm">
                  {predictiveData.churnRisk.slice(0, 3).map((patient: any) => (
                    <li key={patient.id}>
                      {patient.name} - Last visit: {patient.lastVisitDays} days ago
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-2">
                  Launch Re-engagement Campaign
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* High-Value Patient Opportunities */}
          {predictiveData.highValueOpportunities && (
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>High-value patient opportunities detected</strong>
                <p className="text-sm mt-1">
                  {predictiveData.highValueOpportunities.count} patients show indicators 
                  for additional services worth ${predictiveData.highValueOpportunities.potentialRevenue}
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  View Opportunities
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Campaign Optimization Suggestions */}
          {predictiveData.campaignOptimizations && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Campaign Optimization Suggestions</h4>
              {predictiveData.campaignOptimizations.map((opt: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{opt.suggestion}</span>
                  <Badge variant="outline" className="text-xs">
                    +{opt.expectedImprovement}% ROI
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Channel Attribution Component
  const ChannelAttribution = () => {
    if (!metrics?.channelPerformance) return null;

    const channelColors = {
      organic: "#10b981",
      paid: "#3b82f6", 
      social: "#8b5cf6",
      email: "#f59e0b",
      referral: "#ec4899",
      direct: "#6b7280"
    };

    const chartData = Object.entries(metrics.channelPerformance).map(([channel, data]: [string, any]) => ({
      name: channel.charAt(0).toUpperCase() + channel.slice(1),
      patients: data.patients || 0,
      revenue: data.revenue || 0,
      roi: data.roi || 0,
      cost: data.cost || 0,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Channel Attribution Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Acquisition by Channel */}
            <div>
              <h4 className="text-sm font-medium mb-4">Patient Acquisition by Channel</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie data={chartData}>
                  <Pie
                    dataKey="patients"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(channelColors)[index % channelColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* ROI by Channel */}
            <div>
              <h4 className="text-sm font-medium mb-4">ROI by Channel</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Bar dataKey="roi" fill="#3b82f6">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.roi > 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel Performance Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Channel</th>
                  <th className="text-right py-2">Patients</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">CPA</th>
                  <th className="text-right py-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((channel) => (
                  <tr key={channel.name} className="border-b">
                    <td className="py-2">{channel.name}</td>
                    <td className="text-right">{channel.patients}</td>
                    <td className="text-right">${channel.cost.toLocaleString()}</td>
                    <td className="text-right">${channel.revenue.toLocaleString()}</td>
                    <td className="text-right">
                      ${channel.patients > 0 ? (channel.cost / channel.patients).toFixed(0) : 0}
                    </td>
                    <td className="text-right">
                      <Badge variant={channel.roi > 0 ? "default" : "destructive"}>
                        {channel.roi}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // User Acquisition Journey Analytics
  const UserJourneyAnalytics = () => {
    // Fetch real journey data from API
    const { data: journeyData } = useQuery({
      queryKey: ['/api/analytics/user-journey'],
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    });
    
    // Icon mapping for string icon names from API
    const iconMap: Record<string, any> = {
      Globe,
      Mail,
      UserCheck,
      Users,
      Activity
    };
    
    // Default journey stages for CLARAFI's user acquisition
    const defaultJourney = [
      { stage: "Website Visit", count: 0, icon: Globe },
      { stage: "Sign Up Started", count: 0, icon: Mail },
      { stage: "Account Created", count: 0, icon: UserCheck },
      { stage: "First Patient Added", count: 0, icon: Users },
      { stage: "Active Subscriber", count: 0, icon: Activity },
    ];
    
    // Map API data with actual icon components
    const displayData = journeyData?.stages 
      ? journeyData.stages.map((stage: any) => ({
          ...stage,
          icon: iconMap[stage.icon] || Globe
        }))
      : defaultJourney;

    return (
      <Card>
        <CardHeader>
          <CardTitle>User Acquisition Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.map((stage, index) => {
              const Icon = stage.icon;
              const conversionRate = index > 0 && displayData[index - 1].count > 0
                ? ((stage.count / displayData[index - 1].count) * 100).toFixed(1)
                : "100";
              
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{stage.count.toLocaleString()}</span>
                      {index > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({conversionRate}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress value={(stage.count / journeyData[0].count) * 100} className="h-2" />
                  {index < journeyData.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-auto my-2 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>Optimization Opportunity:</strong> Your lead-to-appointment rate 
              ({((187/260)*100).toFixed(1)}%) is above industry average (65%). 
              Focus on improving appointment-to-patient conversion.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div>Loading advanced analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="organic">Organic</SelectItem>
              <SelectItem value="paid">Paid Search</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant={comparisonMode ? "default" : "outline"}
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            Compare to Industry
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Patient Acquisition Cost</p>
                  <p className="text-2xl font-bold">${metrics.cpa.toFixed(0)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {metrics.changes.cpa !== 0 && (
                      <p className={`text-xs flex items-center ${metrics.changes.cpa < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.changes.cpa < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                        {Math.abs(metrics.changes.cpa).toFixed(1)}%
                      </p>
                    )}
                    {comparisonMode && (
                      <Badge variant={metrics.benchmarkComparison.cpaDiff < 0 ? "default" : "destructive"} className="text-xs">
                        {metrics.benchmarkComparison.cpaDiff < 0 ? "Below" : "Above"} industry avg
                      </Badge>
                    )}
                  </div>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">User Lifetime Value</p>
                  <p className="text-2xl font-bold">${metrics.ltv.toLocaleString()}</p>
                  <p className={`text-xs mt-1 flex items-center ${metrics.changes.ltv > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.changes.ltv > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(metrics.changes.ltv).toFixed(1)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                  <p className="text-2xl font-bold">{metrics.ltvCacRatio.toFixed(1)}:1</p>
                  <Badge variant={metrics.ltvCacRatio > 3 ? "default" : "destructive"} className="mt-1">
                    {metrics.ltvCacRatio > 3 ? "Healthy" : "Needs Improvement"}
                  </Badge>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New Users</p>
                  <p className="text-2xl font-bold">{metrics.newUsers}</p>
                  <p className={`text-xs mt-1 flex items-center ${metrics.changes.newUsers > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.changes.newUsers > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(metrics.changes.newUsers).toFixed(1)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Sections */}
      <Tabs defaultValue="journey" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="journey">User Journey</TabsTrigger>
          <TabsTrigger value="attribution">Channel Attribution</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Insights</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign ROI</TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="space-y-4">
          <UserJourneyAnalytics />
        </TabsContent>

        <TabsContent value="attribution" className="space-y-4">
          <ChannelAttribution />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <PredictiveInsights />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Campaign ROI Analysis would go here */}
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">
                Campaign ROI tracking will display here once campaigns are configured
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}