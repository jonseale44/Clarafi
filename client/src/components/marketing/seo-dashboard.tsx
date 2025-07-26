import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Globe, Zap, Shield, Smartphone, 
  CheckCircle, XCircle, AlertCircle, TrendingUp,
  FileText, Link, Code, Activity, Clock, Eye
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function SEODashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch SEO metrics from backend
  const { data: seoData, isLoading } = useQuery({
    queryKey: ["/api/analytics/seo-metrics"],
  });

  // Mock data for demonstration - would come from backend
  const technicalSEOScore = 92;
  const pageSpeedScore = 85;
  const mobileScore = 88;
  const schemaImplementation = 100;

  const metaTagsStatus = {
    totalPages: 24,
    optimized: 22,
    missing: 2,
    issues: [
      { page: "/blog/article-1", issue: "Missing meta description" },
      { page: "/about", issue: "Title tag too long (72 characters)" }
    ]
  };

  const crawlData = {
    lastCrawl: "2025-07-25T12:00:00Z",
    pagesIndexed: 45,
    pagesBlocked: 2,
    crawlErrors: 0,
    sitemapStatus: "valid"
  };

  const keywordRankings = [
    { keyword: "AI medical scribe", position: 3, change: 2, volume: 2400 },
    { keyword: "EMR software", position: 8, change: -1, volume: 5600 },
    { keyword: "physician documentation", position: 5, change: 0, volume: 1800 },
    { keyword: "medical transcription AI", position: 2, change: 4, volume: 3200 }
  ];

  const organicTrafficData = [
    { month: "Jan", visitors: 4200, growth: 12 },
    { month: "Feb", visitors: 4800, growth: 14 },
    { month: "Mar", visitors: 5200, growth: 8 },
    { month: "Apr", visitors: 5900, growth: 13 },
    { month: "May", visitors: 6500, growth: 10 },
    { month: "Jun", visitors: 7200, growth: 11 }
  ];

  const ScoreCard = ({ title, score, icon: Icon, status }: any) => {
    const getStatusColor = (score: number) => {
      if (score >= 90) return "text-green-600";
      if (score >= 70) return "text-yellow-600";
      return "text-red-600";
    };

    const getStatusBadge = (score: number) => {
      if (score >= 90) return "Excellent";
      if (score >= 70) return "Good";
      return "Needs Work";
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <Badge variant={score >= 90 ? "default" : score >= 70 ? "secondary" : "destructive"}>
              {getStatusBadge(score)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${getStatusColor(score)}`}>{score}/100</p>
          <Progress value={score} className="mt-2" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* SEO Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScoreCard 
          title="Technical SEO" 
          score={technicalSEOScore} 
          icon={Shield}
        />
        <ScoreCard 
          title="Page Speed" 
          score={pageSpeedScore} 
          icon={Zap}
        />
        <ScoreCard 
          title="Mobile Optimization" 
          score={mobileScore} 
          icon={Smartphone}
        />
        <ScoreCard 
          title="Schema Markup" 
          score={schemaImplementation} 
          icon={Code}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Organic Traffic Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Organic Traffic Growth</CardTitle>
              <CardDescription>
                Monthly organic search visitors and growth rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={organicTrafficData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#3b82f6" 
                    name="Visitors"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="growth" 
                    stroke="#10b981" 
                    name="Growth %"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Quick Actions</CardTitle>
              <CardDescription>
                Immediate optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>2 pages missing meta descriptions</strong>
                  <p className="text-sm mt-1">Fix these to improve click-through rates from search results</p>
                  <Button size="sm" variant="outline" className="mt-2">
                    View & Fix Pages
                  </Button>
                </AlertDescription>
              </Alert>
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Sitemap is up to date</strong>
                  <p className="text-sm mt-1">Last submitted: {new Date(crawlData.lastCrawl).toLocaleDateString()}</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical SEO Tab */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical SEO Audit</CardTitle>
              <CardDescription>
                Core Web Vitals and technical implementation status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Core Web Vitals */}
              <div>
                <h4 className="font-medium mb-3">Core Web Vitals</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Largest Contentful Paint (LCP)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">2.1s</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">First Input Delay (FID)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">45ms</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cumulative Layout Shift (CLS)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">0.08</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Implementation */}
              <div>
                <h4 className="font-medium mb-3">Technical Implementation</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">SSL Certificate</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Mobile Responsive</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">XML Sitemap</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Robots.txt</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Schema Markup</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>

              <Button className="w-full">
                Run Full Technical Audit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Optimization Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Optimization Status</CardTitle>
              <CardDescription>
                Meta tags, headings, and content quality metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Meta Tags Status */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Meta Tags Optimization</h4>
                  <Badge variant="secondary">
                    {metaTagsStatus.optimized}/{metaTagsStatus.totalPages} Optimized
                  </Badge>
                </div>
                <Progress 
                  value={(metaTagsStatus.optimized / metaTagsStatus.totalPages) * 100} 
                  className="mb-4"
                />
                
                {metaTagsStatus.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600">Issues Found:</p>
                    {metaTagsStatus.issues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm">{issue.page}</span>
                        <span className="text-sm text-red-600">{issue.issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Quality Metrics */}
              <div>
                <h4 className="font-medium mb-3">Content Quality Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Avg. Word Count</p>
                    <p className="text-xl font-semibold">1,247</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Readability Score</p>
                    <p className="text-xl font-semibold">72</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Internal Links/Page</p>
                    <p className="text-xl font-semibold">4.8</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Image Alt Tags</p>
                    <p className="text-xl font-semibold">98%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Rankings</CardTitle>
              <CardDescription>
                Track your search engine rankings for target keywords
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Keyword</th>
                      <th className="text-center py-2">Position</th>
                      <th className="text-center py-2">Change</th>
                      <th className="text-right py-2">Search Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywordRankings.map((keyword, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{keyword.keyword}</td>
                        <td className="text-center">
                          <Badge variant={keyword.position <= 3 ? "default" : "secondary"}>
                            #{keyword.position}
                          </Badge>
                        </td>
                        <td className="text-center">
                          {keyword.change > 0 ? (
                            <span className="text-green-600 flex items-center justify-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{keyword.change}
                            </span>
                          ) : keyword.change < 0 ? (
                            <span className="text-red-600">
                              {keyword.change}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="text-right">{keyword.volume.toLocaleString()}/mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Alert className="mt-4">
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <strong>Visibility Score: 84%</strong>
                  <p className="text-sm mt-1">
                    Your pages appear for 84% of relevant healthcare software searches
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}