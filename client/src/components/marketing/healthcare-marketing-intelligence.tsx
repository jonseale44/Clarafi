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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Heart,
  Users,
  TrendingUp,
  Shield,
  DollarSign,
  Activity,
  Building2,
  UserPlus,
  Target,
  AlertCircle,
  CreditCard,
  Stethoscope,
  Briefcase,
  FileText,
  PieChart,
  Building,
  Brain,
  Search
} from "lucide-react";
import { format } from "date-fns";

interface HealthcareMarketMetrics {
  patientAcquisition: {
    totalNewPatients: number;
    acquisitionCost: number;
    conversionRate: number;
    sourcesBreakdown: {
      referrals: number;
      directSearch: number;
      insurance: number;
      campaigns: number;
    };
  };
  providerMetrics: {
    referringProviders: number;
    referralVolume: number;
    topReferrers: Array<{
      name: string;
      specialty: string;
      referrals: number;
      revenue: number;
    }>;
  };
  payerMix: {
    commercial: number;
    medicare: number;
    medicaid: number;
    selfPay: number;
    other: number;
  };
  complianceScore: {
    hipaaCompliant: boolean;
    marketingCompliant: boolean;
    dataPrivacy: number;
    issues: string[];
  };
  outcomeMarketing: {
    patientSatisfaction: number;
    clinicalOutcomes: {
      metric: string;
      value: number;
      improvement: number;
    }[];
    testimonials: number;
  };
}

interface HealthcareCampaign {
  id: number;
  name: string;
  type: 'patient_acquisition' | 'provider_outreach' | 'wellness' | 'specialty';
  status: 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  results: {
    appointments: number;
    newPatients: number;
    revenue: number;
    roi: number;
  };
}

export function HealthcareMarketingIntelligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30days");

  // Fetch healthcare metrics
  const { data: metrics, isLoading } = useQuery<HealthcareMarketMetrics>({
    queryKey: ['/api/advanced-marketing/healthcare-metrics', selectedTimeRange],
  });

  // Fetch healthcare campaigns
  const { data: campaigns = [] } = useQuery<HealthcareCampaign[]>({
    queryKey: ['/api/advanced-marketing/healthcare-campaigns'],
  });

  // Create healthcare campaign
  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-marketing/healthcare-campaigns', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-marketing/healthcare-campaigns'] });
      toast({ title: "Healthcare campaign created successfully" });
      setIsCreateCampaignOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getComplianceColor = (compliant: boolean) => {
    return compliant ? "text-green-600" : "text-red-600";
  };

  const getROIColor = (roi: number) => {
    if (roi >= 3) return "text-green-600";
    if (roi >= 1.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Healthcare Marketing Intelligence</h2>
          <p className="text-muted-foreground">Healthcare-specific marketing insights and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
            <DialogTrigger asChild>
              <Button>
                <Heart className="mr-2 h-4 w-4" />
                New Healthcare Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Healthcare Campaign</DialogTitle>
                <DialogDescription>
                  Launch a targeted campaign for patient acquisition or provider outreach
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createCampaignMutation.mutate({
                  name: formData.get('name'),
                  type: formData.get('type'),
                  budget: Number(formData.get('budget')),
                  target: formData.get('target'),
                  compliance: formData.get('compliance') === 'on'
                });
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Cardiology Awareness Month"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Campaign Type</Label>
                    <Select name="type" defaultValue="patient_acquisition">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient_acquisition">Patient Acquisition</SelectItem>
                        <SelectItem value="provider_outreach">Provider Outreach</SelectItem>
                        <SelectItem value="wellness">Wellness Program</SelectItem>
                        <SelectItem value="specialty">Specialty Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      name="budget"
                      type="number"
                      placeholder="10000"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="target">Target Audience</Label>
                    <Textarea
                      id="target"
                      name="target"
                      placeholder="Adults 45-65 with cardiovascular risk factors"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="compliance"
                      name="compliance"
                      type="checkbox"
                      className="h-4 w-4"
                      defaultChecked
                    />
                    <Label htmlFor="compliance">HIPAA compliant campaign</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createCampaignMutation.isPending}>
                    Create Campaign
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading healthcare metrics...</div>
      ) : metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Patients</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.patientAcquisition.totalNewPatients}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost per acquisition: {formatCurrency(metrics.patientAcquisition.acquisitionCost)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Provider Referrals</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.providerMetrics.referralVolume}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {metrics.providerMetrics.referringProviders} providers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patient Satisfaction</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.outcomeMarketing.patientSatisfaction * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.outcomeMarketing.testimonials} testimonials
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getComplianceColor(metrics.complianceScore.hipaaCompliant)}`}>
                    {metrics.complianceScore.hipaaCompliant ? "✓" : "✗"}
                  </span>
                  <span className="text-sm">HIPAA Compliant</span>
                </div>
                {metrics.complianceScore.issues.length > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    {metrics.complianceScore.issues.length} issues
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for detailed analysis */}
          <Tabs defaultValue="acquisition" className="space-y-4">
            <TabsList>
              <TabsTrigger value="acquisition">Patient Acquisition</TabsTrigger>
              <TabsTrigger value="referrals">Provider Network</TabsTrigger>
              <TabsTrigger value="payer">Payer Mix</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Patient Acquisition Tab */}
            <TabsContent value="acquisition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Acquisition Sources</CardTitle>
                  <CardDescription>
                    Breakdown of how new patients find your practice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.patientAcquisition.sourcesBreakdown).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {source === 'referrals' && <Users className="h-4 w-4" />}
                          {source === 'directSearch' && <Search className="h-4 w-4" />}
                          {source === 'insurance' && <CreditCard className="h-4 w-4" />}
                          {source === 'campaigns' && <Target className="h-4 w-4" />}
                          <span className="capitalize">{source.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / metrics.patientAcquisition.totalNewPatients) * 100} 
                            className="w-24"
                          />
                          <span className="text-sm w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Conversion Rate</span>
                      <span className="font-medium">
                        {(metrics.patientAcquisition.conversionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Provider Network Tab */}
            <TabsContent value="referrals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Referring Providers</CardTitle>
                  <CardDescription>
                    Your most valuable referral partners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.providerMetrics.topReferrers.map((provider, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{provider.referrals} referrals</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(provider.revenue)} revenue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payer Mix Tab */}
            <TabsContent value="payer" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Payer Mix</CardTitle>
                  <CardDescription>
                    Distribution of payment sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.payerMix).map(([payer, percentage]) => (
                      <div key={payer} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="capitalize">{payer}</span>
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-4">
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {campaign.type.replace(/_/g, ' ')}
                          </CardDescription>
                        </div>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-medium">{formatCurrency(campaign.budget)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Spent</p>
                          <p className="font-medium">{formatCurrency(campaign.spent)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">New Patients</p>
                          <p className="font-medium">{campaign.results.newPatients}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROI</p>
                          <p className={`font-medium ${getROIColor(campaign.results.roi)}`}>
                            {campaign.results.roi.toFixed(1)}x
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={(campaign.spent / campaign.budget) * 100} 
                        className="mt-4"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing Compliance Status</CardTitle>
                  <CardDescription>
                    Healthcare marketing regulatory compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>HIPAA Compliance</span>
                      </div>
                      <Badge variant={metrics.complianceScore.hipaaCompliant ? "default" : "destructive"}>
                        {metrics.complianceScore.hipaaCompliant ? "Compliant" : "Non-Compliant"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Marketing Guidelines</span>
                      </div>
                      <Badge variant={metrics.complianceScore.marketingCompliant ? "default" : "destructive"}>
                        {metrics.complianceScore.marketingCompliant ? "Compliant" : "Non-Compliant"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <span>Data Privacy Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={metrics.complianceScore.dataPrivacy} className="w-24" />
                        <span className="text-sm">{metrics.complianceScore.dataPrivacy}%</span>
                      </div>
                    </div>
                  </div>
                  {metrics.complianceScore.issues.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-900 mb-2">Compliance Issues</h4>
                      <ul className="space-y-1">
                        {metrics.complianceScore.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}