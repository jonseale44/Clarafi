import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, 
  Clock, 
  Eye, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  FileText,
  Bot,
  Sparkles,
  Search,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  ArrowLeft,
  LogOut,
  MessageSquare,
  Send,
  History,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useLocation } from "wouter";

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  targetAudience: string;
  keywords: string[];
  status: string;
  authorName: string;
  seoTitle?: string;
  seoDescription?: string;
  aiGenerated: boolean;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface GenerationSettings {
  articlesPerWeek: number;
  autoGenerate: boolean;
  categories: string[];
  audiences: string[];
  minWordCount: number;
  maxWordCount: number;
  includeDiagrams: boolean;
  includeInfographics: boolean;
}

export default function AdminBlogManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("queue");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [revisionHistory, setRevisionHistory] = useState<Array<{
    id: number;
    revisionNote: string;
    createdAt: string;
    content?: string;
    revisionType?: string;
  }>>([]);
  const [generateFormData, setGenerateFormData] = useState({
    category: "",
    audience: "",
    topic: "",
    customPrompt: "",
    includeDiagrams: true,
    includeInfographics: true,
    performCompetitorAnalysis: true,
    checkPlagiarism: true
  });
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    articlesPerWeek: 3,
    autoGenerate: false,
    categories: ["clinical_efficiency", "ehr_modernization", "practice_management"],
    audiences: ["physicians", "clinical_administrators", "ceos"],
    minWordCount: 800,
    maxWordCount: 1500,
    includeDiagrams: true,
    includeInfographics: true
  });

  // Fetch articles in review queue
  const { data: queueData, isLoading: queueLoading } = useQuery<{ articles: Article[] }>({
    queryKey: ["/api/admin/blog/articles?status=review"],
  });

  // Fetch published articles
  const { data: publishedData, isLoading: publishedLoading } = useQuery<{ articles: Article[] }>({
    queryKey: ["/api/admin/blog/articles?status=published"],
  });

  // Fetch generation statistics
  const { data: statsData } = useQuery<any>({
    queryKey: ["/api/admin/blog/stats"],
  });

  // Generate new article mutation (two-step process)
  const generateArticleMutation = useMutation({
    mutationFn: async (params: { category: string; audience: string; topic?: string; customPrompt?: string }) => {
      console.log('📝 [Blog Generation] Starting generation with params:', params);
      
      // Step 1: Add to generation queue
      console.log('📤 [Blog Generation] Step 1: Creating queue item...');
      const queueResponse = await apiRequest(
        "POST",
        "/api/admin/blog/generation-queue",
        {
          category: params.category,
          targetAudience: params.audience,
          topic: params.topic || null,
          customPrompt: params.customPrompt || null,
          keywords: [],
          competitorMentions: []
        }
      );
      
      const queueData = await queueResponse.json();
      console.log('✅ [Blog Generation] Queue item created:', queueData);
      
      // Step 2: Trigger generation for the queue item
      console.log('🚀 [Blog Generation] Step 2: Triggering generation for queue ID:', queueData.queueItem.id);
      const generateResponse = await apiRequest(
        "POST",
        `/api/admin/blog/generate/${queueData.queueItem.id}`,
        {}
      );
      
      const generateData = await generateResponse.json();
      console.log('✅ [Blog Generation] Generation triggered successfully:', generateData);
      
      return generateData;
    },
    onSuccess: () => {
      toast({
        title: "Article Generation Started",
        description: "The AI is generating a new article. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate article",
        variant: "destructive"
      });
    }
  });

  // Approve article mutation
  const approveArticleMutation = useMutation({
    mutationFn: async (articleId: number) => {
      console.log('🎯 [Frontend] Calling approve endpoint for article:', articleId);
      const response = await fetch(`/api/admin/blog/articles/${articleId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log('📡 [Frontend] Approve response status:', response.status);
      const data = await response.json();
      console.log('📦 [Frontend] Approve response data:', data);
      if (!response.ok) throw new Error(data.error || "Failed to approve article");
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ [Frontend] Approve success, invalidating queries');
      toast({
        title: "Article Approved",
        description: "The article has been published successfully.",
      });
      // Invalidate both review and published article queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=published"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/stats"] });
      setSelectedArticle(null);
    },
    onError: (error) => {
      console.error('❌ [Frontend] Approve error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve article",
        variant: "destructive"
      });
    }
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Article>) => {
      const response = await fetch(`/api/admin/blog/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update article");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Article Updated",
        description: "The article has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=published"] });
      setEditMode(false);
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: number) => {
      const response = await fetch(`/api/admin/blog/articles/${articleId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete article");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Article Deleted",
        description: "The article has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=published"] });
      setSelectedArticle(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete article",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      clinical_efficiency: "bg-blue-100 text-blue-800",
      ehr_modernization: "bg-purple-100 text-purple-800",
      practice_management: "bg-green-100 text-green-800",
      regulatory_compliance: "bg-red-100 text-red-800",
      patient_engagement: "bg-yellow-100 text-yellow-800",
      healthcare_innovation: "bg-indigo-100 text-indigo-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const ArticleCard = ({ article, onSelect }: { article: Article; onSelect: () => void }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{article.title}</CardTitle>
            <CardDescription className="mt-2">{article.excerpt}</CardDescription>
          </div>
          {article.aiGenerated && (
            <Badge variant="secondary" className="ml-2">
              <Bot className="h-3 w-3 mr-1" />
              AI Generated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <Badge className={getCategoryColor(article.category)}>
              {article.category.replace(/_/g, ' ')}
            </Badge>
            <span className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {article.targetAudience}
            </span>
          </div>
          <span className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(article.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // Logout handler
  const logoutMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      setLocation("/auth");
    }
  });

  // Fetch generation settings
  const { data: settingsData } = useQuery<GenerationSettings>({
    queryKey: ["/api/admin/blog/generation-settings"],
    onSuccess: (data) => {
      if (data) {
        setGenerationSettings(data);
      }
    }
  });

  // Save generation settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: GenerationSettings) => {
      const response = await apiRequest("PUT", "/api/admin/blog/generation-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Blog generation settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  });

  // Request revision mutation
  const requestRevisionMutation = useMutation({
    mutationFn: async ({ articleId, feedback }: { articleId: number; feedback: string }) => {
      const response = await apiRequest("POST", `/api/admin/blog/articles/${articleId}/revise`, {
        feedback
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Revision Requested",
        description: "GPT is working on your revision. This may take a moment...",
      });
      // Update the selected article with the revised content
      if (selectedArticle && data.revisedArticle) {
        setSelectedArticle(data.revisedArticle);
        // Add to revision history
        setRevisionHistory(prev => [...prev, {
          id: Date.now(),
          revisionNote: revisionFeedback,
          createdAt: new Date().toISOString(),
          content: data.revisedArticle.content,
          revisionType: 'ai_feedback'
        }]);
        setRevisionFeedback("");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/articles?status=review"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to request revision",
        variant: "destructive"
      });
    }
  });

  // Load revision history
  const loadRevisionHistory = async (articleId: number) => {
    try {
      const response = await fetch(`/api/admin/blog/articles/${articleId}/revisions`);
      if (response.ok) {
        const data = await response.json();
        setRevisionHistory(data.revisions || []);
      }
    } catch (error) {
      console.error("Failed to load revision history:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blog Management</h1>
            <p className="text-gray-600">Manage AI-generated articles and blog content</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setLocation("/admin")}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={() => logoutMutation.mutate()}
              variant="outline"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="published">Published Articles</TabsTrigger>
          <TabsTrigger value="generate">Generate Articles</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Articles Pending Review</h2>
                <Badge variant="outline">
                  {queueData?.articles.length || 0} articles
                </Badge>
              </div>
              
              {queueLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {queueData?.articles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onSelect={() => setSelectedArticle(article)}
                    />
                  ))}
                  {queueData?.articles.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No articles in the review queue. Generate new articles in the Generate tab.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <div>
              {selectedArticle && (
                <Card className="sticky top-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Article Preview</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditMode(!editMode)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          {editMode ? 'Cancel' : 'Edit'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteArticleMutation.mutate(selectedArticle.id)}
                          disabled={deleteArticleMutation.isPending}
                        >
                          {deleteArticleMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedArticle.title}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              title: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label>Excerpt</Label>
                          <Textarea
                            value={selectedArticle.excerpt}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              excerpt: e.target.value
                            })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Content</Label>
                          <Textarea
                            value={selectedArticle.content}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              content: e.target.value
                            })}
                            rows={15}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label>SEO Title</Label>
                          <Input
                            value={selectedArticle.seoTitle || ''}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              seoTitle: e.target.value
                            })}
                            placeholder="Leave empty to use article title"
                          />
                        </div>
                        <div>
                          <Label>SEO Description</Label>
                          <Textarea
                            value={selectedArticle.seoDescription || ''}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              seoDescription: e.target.value
                            })}
                            rows={2}
                            placeholder="Leave empty to use excerpt"
                          />
                        </div>
                        <div>
                          <Label>Keywords</Label>
                          <Input
                            value={selectedArticle.keywords.join(', ')}
                            onChange={(e) => setSelectedArticle({
                              ...selectedArticle,
                              keywords: e.target.value.split(',').map(k => k.trim())
                            })}
                            placeholder="comma, separated, keywords"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => updateArticleMutation.mutate(selectedArticle)}
                        >
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-4 pr-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{selectedArticle.title}</h3>
                            <p className="text-gray-600 mb-4">{selectedArticle.excerpt}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                              <Badge className={getCategoryColor(selectedArticle.category)}>
                                {selectedArticle.category.replace(/_/g, ' ')}
                              </Badge>
                              <span>Target: {selectedArticle.targetAudience}</span>
                              <span>By: {selectedArticle.authorName}</span>
                            </div>
                          </div>
                          
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                          </div>

                          {selectedArticle.keywords.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Keywords</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedArticle.keywords.map((keyword, i) => (
                                  <Badge key={i} variant="secondary">{keyword}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  {!editMode && (
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedArticle(null)}
                      >
                        Cancel
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRevisionDialogOpen(true);
                            // Load revision history when dialog opens
                            if (selectedArticle) {
                              loadRevisionHistory(selectedArticle.id);
                            }
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Request Revision
                        </Button>
                        <Button
                          onClick={() => approveArticleMutation.mutate(selectedArticle.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Publish
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="published">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Published Articles</h2>
              <Badge variant="outline">
                {publishedData?.articles.length || 0} articles
              </Badge>
            </div>
            
            {publishedLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedData?.articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                      <CardDescription>{article.excerpt}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {article.viewCount} views
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {article.publishedAt && formatDate(article.publishedAt)}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      >
                        View Article
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Article</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{article.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteArticleMutation.mutate(article.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Article
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="generate">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Generate New Article</CardTitle>
                <CardDescription>
                  Use AI to generate a new article based on current healthcare trends and keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={generateFormData.category}
                      onValueChange={(value) => setGenerateFormData({ ...generateFormData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinical_efficiency">Clinical Efficiency</SelectItem>
                        <SelectItem value="ehr_modernization">EHR Modernization</SelectItem>
                        <SelectItem value="practice_management">Practice Management</SelectItem>
                        <SelectItem value="regulatory_compliance">Regulatory Compliance</SelectItem>
                        <SelectItem value="patient_engagement">Patient Engagement</SelectItem>
                        <SelectItem value="healthcare_innovation">Healthcare Innovation</SelectItem>
                        <SelectItem value="misc">Miscellaneous (Custom Prompt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Audience</Label>
                    <Select
                      value={generateFormData.audience}
                      onValueChange={(value) => setGenerateFormData({ ...generateFormData, audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physicians">Physicians</SelectItem>
                        <SelectItem value="clinical_administrators">Clinical Administrators</SelectItem>
                        <SelectItem value="ceos">CEOs</SelectItem>
                        <SelectItem value="it_managers">IT Managers</SelectItem>
                        <SelectItem value="nurse_practitioners">Nurse Practitioners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Topic (Optional)</Label>
                    <Input
                      value={generateFormData.topic}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, topic: e.target.value })}
                      placeholder="Specific topic to focus on..."
                    />
                  </div>

                  {generateFormData.category === "misc" && (
                    <div>
                      <Label>Custom Prompt</Label>
                      <Textarea
                        value={generateFormData.customPrompt}
                        onChange={(e) => setGenerateFormData({ ...generateFormData, customPrompt: e.target.value })}
                        placeholder="Write your custom prompt here. Be specific about the topic, style, target audience, and any key points to cover..."
                        className="min-h-[150px]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Article Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Include diagrams</span>
                        <Switch 
                          checked={generateFormData.includeDiagrams}
                          onCheckedChange={(checked) => setGenerateFormData({ ...generateFormData, includeDiagrams: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Include infographics</span>
                        <Switch 
                          checked={generateFormData.includeInfographics}
                          onCheckedChange={(checked) => setGenerateFormData({ ...generateFormData, includeInfographics: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Perform competitor analysis</span>
                        <Switch 
                          checked={generateFormData.performCompetitorAnalysis}
                          onCheckedChange={(checked) => setGenerateFormData({ ...generateFormData, performCompetitorAnalysis: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Check for plagiarism</span>
                        <Switch 
                          checked={generateFormData.checkPlagiarism}
                          onCheckedChange={(checked) => setGenerateFormData({ ...generateFormData, checkPlagiarism: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      The AI will research current trends, analyze competitor content, and generate a unique article optimized for SEO.
                      Articles are attributed to "Clarafi Team" for credibility.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    className="w-full" 
                    onClick={() => {
                      console.log('🖱️ [Blog Generation] Generate button clicked');
                      console.log('📊 [Blog Generation] Form data:', generateFormData);
                      
                      if (!generateFormData.category || !generateFormData.audience) {
                        console.warn('⚠️ [Blog Generation] Missing required fields:', {
                          category: generateFormData.category,
                          audience: generateFormData.audience
                        });
                        toast({
                          title: "Missing Information",
                          description: "Please select both a category and target audience",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // For misc category, custom prompt is required
                      if (generateFormData.category === "misc" && !generateFormData.customPrompt?.trim()) {
                        console.warn('⚠️ [Blog Generation] Missing custom prompt for misc category');
                        toast({
                          title: "Missing Custom Prompt",
                          description: "Please provide a custom prompt for the miscellaneous category",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      console.log('🚀 [Blog Generation] Submitting generation request...');
                      console.log('📊 [Blog Generation] customPrompt value:', generateFormData.customPrompt);
                      console.log('📊 [Blog Generation] category check:', generateFormData.category === "misc");
                      generateArticleMutation.mutate({
                        category: generateFormData.category,
                        audience: generateFormData.audience,
                        topic: generateFormData.topic || undefined,
                        customPrompt: generateFormData.category === "misc" ? generateFormData.customPrompt : undefined
                      });
                    }}
                    disabled={generateArticleMutation.isPending || !generateFormData.category || !generateFormData.audience}
                  >
                    {generateArticleMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Article...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Article
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Article Generation Settings</CardTitle>
                <CardDescription>
                  Configure automated article generation preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label>Articles per week</Label>
                    <Select
                      value={generationSettings.articlesPerWeek.toString()}
                      onValueChange={(value) => setGenerationSettings({
                        ...generationSettings,
                        articlesPerWeek: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 article per week</SelectItem>
                        <SelectItem value="2">2 articles per week</SelectItem>
                        <SelectItem value="3">3 articles per week</SelectItem>
                        <SelectItem value="5">5 articles per week</SelectItem>
                        <SelectItem value="7">7 articles per week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Automated Generation</Label>
                        <p className="text-sm text-gray-500">
                          Automatically generate articles based on schedule
                        </p>
                      </div>
                      <Switch 
                        checked={generationSettings.autoGenerate}
                        onCheckedChange={(checked) => setGenerationSettings({
                          ...generationSettings,
                          autoGenerate: checked
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Word count range</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Input
                          type="number"
                          value={generationSettings.minWordCount}
                          onChange={(e) => setGenerationSettings({
                            ...generationSettings,
                            minWordCount: parseInt(e.target.value)
                          })}
                          placeholder="Min words"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={generationSettings.maxWordCount}
                          onChange={(e) => setGenerationSettings({
                            ...generationSettings,
                            maxWordCount: parseInt(e.target.value)
                          })}
                          placeholder="Max words"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Target Categories</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Select categories for automated generation
                    </p>
                    <div className="space-y-2">
                      {[
                        { value: 'clinical_efficiency', label: 'Clinical Efficiency' },
                        { value: 'ehr_modernization', label: 'EHR Modernization' },
                        { value: 'practice_management', label: 'Practice Management' },
                        { value: 'regulatory_compliance', label: 'Regulatory Compliance' },
                        { value: 'patient_engagement', label: 'Patient Engagement' },
                        { value: 'healthcare_innovation', label: 'Healthcare Innovation' }
                      ].map((category) => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={category.value}
                            checked={generationSettings.categories.includes(category.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGenerationSettings({
                                  ...generationSettings,
                                  categories: [...generationSettings.categories, category.value]
                                });
                              } else {
                                setGenerationSettings({
                                  ...generationSettings,
                                  categories: generationSettings.categories.filter(c => c !== category.value)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={category.value}>{category.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => saveSettingsMutation.mutate(generationSettings)}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.totalArticles || 0}</div>
                <p className="text-xs text-gray-500">All time</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.totalViews || 0}</div>
                <p className="text-xs text-gray-500">All articles</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Reading Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.avgReadingTime || 0} min</div>
                <p className="text-xs text-gray-500">Per article</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Newsletter Signups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.newsletterSignups || 0}</div>
                <p className="text-xs text-gray-500">From blog</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsData?.topArticles?.map((article: any, index: number) => (
                  <div key={article.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-gray-500">{article.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{article.viewCount} views</p>
                      <p className="text-sm text-gray-500">{article.engagementRate}% engagement</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Request Article Revision</DialogTitle>
            <DialogDescription>
              Provide feedback to GPT to iteratively improve this article. Be specific about what you'd like changed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 h-[500px]">
            {/* Current Article Preview */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Current Article
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="prose prose-sm max-w-none pr-4">
                  <h4 className="text-lg font-semibold">{selectedArticle?.title}</h4>
                  <ReactMarkdown>{selectedArticle?.content || ''}</ReactMarkdown>
                </div>
              </ScrollArea>
            </div>

            {/* Revision Interface */}
            <div className="border rounded-lg p-4 flex flex-col">
              <h3 className="font-semibold mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Revision Feedback
              </h3>

              {/* Revision History */}
              {revisionHistory.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <History className="h-3 w-3 mr-1" />
                    Previous Revisions
                  </h4>
                  <ScrollArea className="h-[150px] border rounded p-2">
                    <div className="space-y-2">
                      {revisionHistory.map((revision) => (
                        <div key={revision.id} className="text-sm">
                          <div className="font-medium text-gray-600">
                            {new Date(revision.createdAt).toLocaleString()}
                          </div>
                          <div className="italic">"{revision.revisionNote}"</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Feedback Input */}
              <div className="flex-1 flex flex-col">
                <Textarea
                  placeholder="Example: 'Make the introduction more engaging' or 'Add more specific examples of clinical efficiency improvements' or 'Be more aggressive about the benefits of AI'"
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  className="flex-1 resize-none"
                  rows={6}
                />

                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Be specific about what you want changed or improved
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRevisionDialogOpen(false);
                        setRevisionFeedback("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedArticle && revisionFeedback.trim()) {
                          requestRevisionMutation.mutate({
                            articleId: selectedArticle.id,
                            feedback: revisionFeedback
                          });
                        }
                      }}
                      disabled={!revisionFeedback.trim() || requestRevisionMutation.isPending}
                    >
                      {requestRevisionMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Request Revision
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}