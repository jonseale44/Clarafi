import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Brain, 
  Zap,
  DollarSign,
  BarChart3,
  Activity,
  Calendar,
  LineChart,
  Search,
  Globe
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MarketingMetricsDashboard from "@/components/marketing/marketing-metrics-dashboard";
import AcquisitionTracking from "@/components/marketing/acquisition-tracking";
import ConversionEvents from "@/components/marketing/conversion-events";
import MarketingInsights from "@/components/marketing/marketing-insights";
import MarketingAutomations from "@/components/marketing/marketing-automations";
import MarketingCampaigns from "@/components/marketing/marketing-campaigns";
import MarketingStatusTracker from "@/components/marketing/marketing-status-tracker";
import AdvancedAnalyticsDashboard from "@/components/marketing/advanced-analytics-dashboard";
import SEODashboard from "@/components/marketing/seo-dashboard";

export default function AdminMarketingDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Check if user has admin access
  const { data: user } = useQuery({ queryKey: ["/api/user"] });
  
  if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketing & Analytics Intelligence</h1>
        <p className="text-muted-foreground">
          Physician-centric marketing analytics and insights platform
        </p>
      </div>

      {/* Status Tracker */}
      <div className="mb-8">
        <MarketingStatusTracker />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden lg:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="acquisition" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden lg:inline">Acquisition</span>
          </TabsTrigger>
          <TabsTrigger value="conversions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden lg:inline">Conversions</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden lg:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden lg:inline">Automations</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden lg:inline">Campaigns</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Dashboard */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Overview Dashboard</CardTitle>
              <CardDescription>
                Real-time metrics and KPIs for your marketing performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingMetricsDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Analytics */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedAnalyticsDashboard />
        </TabsContent>

        {/* SEO Dashboard */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Performance & Management</CardTitle>
              <CardDescription>
                Search engine optimization metrics, rankings, and technical SEO health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SEODashboard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 2: Acquisition Source Tracking */}
        <TabsContent value="acquisition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acquisition Source Tracking</CardTitle>
              <CardDescription>
                Track user signups by source, including UTM parameters and referrers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcquisitionTracking />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 3: Conversion Event Logging */}
        <TabsContent value="conversions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Event Tracking</CardTitle>
              <CardDescription>
                Monitor key events: signup, trial start, onboarding, first chart note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionEvents />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 4: Automated Insights (Stub) */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Insights & Recommendations</CardTitle>
              <CardDescription>
                AI-driven analysis of metrics with actionable recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingInsights />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 5: Automated Triggers/Actions (Stub) */}
        <TabsContent value="automations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Automations</CardTitle>
              <CardDescription>
                Configure automated responses: pause campaigns, A/B tests, notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingAutomations />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Campaigns */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Campaigns</CardTitle>
              <CardDescription>
                Manage and track marketing campaigns across channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingCampaigns />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}