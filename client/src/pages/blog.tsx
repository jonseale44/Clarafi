import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Eye, ChevronRight, Search, Home, ArrowLeft, ArrowUp } from "lucide-react";

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  targetAudience: string;
  authorName: string;
  featuredImage?: string;
  readingTime: number;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
}

interface BlogMetadata {
  categories: Record<string, string>;
  audiences: Record<string, string>;
}

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 9;

  // Fetch blog metadata
  const { data: metadata } = useQuery<BlogMetadata>({
    queryKey: ["/api/blog/metadata"],
  });

  // Fetch articles
  const { data: articlesData, isLoading } = useQuery<{ articles: Article[] }>({
    queryKey: ["/api/blog/articles", selectedCategory, selectedAudience, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: articlesPerPage.toString(),
      });
      
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedAudience) params.append("audience", selectedAudience);
      
      const response = await fetch(`/api/blog/articles?${params}`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
  });

  const articles = articlesData?.articles || [];
  
  // Filter articles by search term
  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      case_studies: "bg-pink-100 text-pink-800",
      industry_insights: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-3xl font-bold cursor-pointer">
              <span className="text-[#1e3a8a]">CLAR</span>
              <span className="text-[#fbbf24]">A</span>
              <span className="text-[#1e3a8a]">F</span>
              <span className="text-[#fbbf24]">I</span>
            </h1>
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Clarafi Blog</h1>
          <p className="text-xl opacity-90">
            Insights and innovations in healthcare technology, EMR best practices, and the future of medicine
          </p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 pt-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/">
            <span className="hover:text-[#003366] cursor-pointer">Home</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Blog</span>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Browse Articles</h2>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Quick links:</span>
              <Link href="#newsletter">
                <Button variant="link" size="sm" className="text-[#003366]">Newsletter</Button>
              </Link>
              <Link href="/">
                <Button variant="link" size="sm" className="text-[#003366]">Dashboard</Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {metadata && Object.entries(metadata.categories).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAudience} onValueChange={(value) => setSelectedAudience(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Audiences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                {metadata && Object.entries(metadata.audiences).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
            <p className="mt-2 text-gray-600">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No articles found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow">
                {article.featuredImage && (
                  <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    <img 
                      src={article.featuredImage} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getCategoryColor(article.category)}>
                      {metadata?.categories[article.category] || article.category}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {metadata?.audiences[article.targetAudience] || article.targetAudience}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                  <CardDescription className="line-clamp-3 mt-2">
                    {article.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(article.publishedAt)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {article.readingTime} min read
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {article.viewCount}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/blog/${article.slug}`}>
                    <Button variant="outline" className="w-full">
                      Read More <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {articles.length === articlesPerPage && (
          <div className="mt-8 flex justify-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Newsletter Signup */}
        <div id="newsletter" className="mt-16 bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded-lg p-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="mb-6">
              Get the latest insights on healthcare technology and EMR best practices delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-white text-gray-900"
              />
              <Button className="bg-[#FFD700] text-[#003366] hover:bg-[#FFC700]">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 border-t pt-8 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center space-x-2"
              >
                <ArrowUp className="h-4 w-4" />
                <span>Back to Top</span>
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              © 2025 Clarafi. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}