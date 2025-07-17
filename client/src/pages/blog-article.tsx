import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Eye, User, Share2, Twitter, Linkedin, Facebook, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  targetAudience: string;
  authorName: string;
  featuredImage?: string;
  readingTime: number;
  viewCount: number;
  publishedAt: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

interface Comment {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
  parentId?: number;
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentData, setCommentData] = useState({
    authorName: "",
    authorEmail: "",
    content: ""
  });

  // Fetch article with comments
  const { data, isLoading, error } = useQuery<{ article: Article; comments: Comment[] }>({
    queryKey: ["/api/blog/articles", slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/articles/${slug}`);
      if (!response.ok) throw new Error("Article not found");
      return response.json();
    },
    enabled: !!slug,
  });

  // Submit comment mutation
  const submitCommentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/blog/articles/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });
      if (!response.ok) throw new Error("Failed to submit comment");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment submitted",
        description: "Your comment has been submitted for moderation.",
      });
      setCommentData({ authorName: "", authorEmail: "", content: "" });
      setShowCommentForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const article = data?.article;
  const comments = data?.comments || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shareArticle = (platform: string) => {
    const url = window.location.href;
    const title = article?.title || "";
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
            <p className="text-gray-600 mb-4">The article you're looking for doesn't exist.</p>
            <Link href="/blog">
              <Button>Back to Blog</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {article.featuredImage && (
            <div className="h-[28rem] overflow-hidden relative">
              <img 
                src={article.featuredImage} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
          
          <div className="px-8 py-10 lg:px-12">
            {/* Article Header */}
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <Badge className="bg-[#003366]/10 text-[#003366] border-0 px-3 py-1 text-xs font-medium">
                  {article.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600 font-medium">{article.targetAudience.replace(/_/g, ' ')}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight tracking-tight text-gray-900">{article.title}</h1>
              
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center text-sm text-gray-500 space-x-6">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-700">{article.authorName}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{formatDate(article.publishedAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{article.readingTime} min read</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{article.viewCount} views</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={() => shareArticle('twitter')}>
                    <Twitter className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={() => shareArticle('linkedin')}>
                    <Linkedin className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={() => shareArticle('facebook')}>
                    <Facebook className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>
              </div>
            </header>

            <div className="my-10 border-t border-gray-200" />

            {/* Article Content */}
            <div className="prose prose-lg max-w-none font-inter
                        prose-headings:font-bold 
                        prose-headings:tracking-tight
                        prose-headings:text-gray-900
                        prose-h1:text-2xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:font-bold
                        prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:font-semibold
                        prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6 prose-h3:font-medium
                        prose-p:text-gray-600 prose-p:leading-7 prose-p:mb-5 prose-p:text-base
                        prose-a:text-[#003366] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-800 prose-strong:font-semibold
                        prose-ul:my-5 prose-ul:space-y-2 prose-li:text-gray-600 prose-li:leading-7
                        prose-ol:my-5 prose-ol:space-y-2
                        prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                        prose-blockquote:border-l-4 prose-blockquote:border-[#003366]/30
                        prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-6
                        prose-blockquote:bg-gray-50 prose-blockquote:rounded-r-lg
                        prose-blockquote:italic prose-blockquote:text-gray-700
                        prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-md
                        prose-code:text-sm prose-code:font-mono
                        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-5
                        prose-hr:my-8 prose-hr:border-gray-200">
              <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>

            {/* Keywords */}
            {article.keywords && article.keywords.length > 0 && (
              <>
                <div className="my-10 border-t border-gray-200" />
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">Keywords:</span>
                  {article.keywords.map((keyword, index) => (
                    <Badge key={index} className="bg-gray-100 text-gray-700 border-0 px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {/* Comments Section */}
            <div className="my-12 border-t border-gray-200" />
            
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
              
              {/* Comment Form */}
              {!showCommentForm ? (
                <Button onClick={() => setShowCommentForm(true)} className="mb-6">
                  Leave a Comment
                </Button>
              ) : (
                <Card className="mb-6">
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Add Your Comment</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Your Name"
                      value={commentData.authorName}
                      onChange={(e) => setCommentData({ ...commentData, authorName: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Your Email (will not be published)"
                      value={commentData.authorEmail}
                      onChange={(e) => setCommentData({ ...commentData, authorEmail: e.target.value })}
                    />
                    <Textarea
                      placeholder="Your Comment"
                      rows={4}
                      value={commentData.content}
                      onChange={(e) => setCommentData({ ...commentData, content: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => submitCommentMutation.mutate()}
                        disabled={submitCommentMutation.isPending || !commentData.authorName || !commentData.authorEmail || !commentData.content}
                      >
                        Submit Comment
                      </Button>
                      <Button variant="outline" onClick={() => setShowCommentForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{comment.authorName}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </CardContent>
                  </Card>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
            <p className="mb-6">
              Get the latest healthcare technology insights delivered to your inbox.
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
      </article>
    </div>
  );
}