import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Clock, 
  Search, 
  Sparkles, 
  Mic, 
  FileText, 
  Brain,
  Zap,
  Shield,
  TrendingUp,
  Users,
  ChevronRight,
  Star,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';

interface VideoData {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail?: string;
  isNew?: boolean;
  isPremium?: boolean;
  comingSoon?: boolean;
  tags?: string[];
}

const videos: VideoData[] = [
  // Getting Started
  {
    id: 'intro-clarafi',
    title: 'Welcome to CLARAFI',
    description: 'See how CLARAFI transforms your practice in under 3 minutes',
    duration: '',
    category: 'getting-started',
    isNew: true,
    comingSoon: true,
    tags: ['overview', 'benefits']
  },
  {
    id: 'first-patient',
    title: 'Your First Patient Visit',
    description: 'Complete documentation in minutes, not hours',
    duration: '',
    category: 'getting-started',
    comingSoon: true,
    tags: ['workflow', 'basics']
  },
  {
    id: 'ai-assistant',
    title: 'Meet Your AI Assistant',
    description: 'Understanding how AI suggestions work to save you time',
    duration: '',
    category: 'getting-started',
    comingSoon: true,
    tags: ['AI', 'automation']
  },

  // Core Features
  {
    id: 'voice-to-soap',
    title: 'Voice to SOAP in Seconds',
    description: 'Just talk naturally - AI captures everything and creates perfect documentation',
    duration: '',
    category: 'core-features',
    isNew: true,
    comingSoon: true,
    tags: ['voice', 'SOAP', 'documentation']
  },
  {
    id: 'attachment-magic',
    title: 'Attachment Processing Magic',
    description: 'Upload any document format and watch it transform into structured data',
    duration: '',
    category: 'core-features',
    comingSoon: true,
    tags: ['attachments', 'OCR', 'data extraction']
  },
  {
    id: 'auto-coding',
    title: 'Automated CPT Coding',
    description: 'Never miss billing opportunities with AI-powered code suggestions',
    duration: '',
    category: 'core-features',
    comingSoon: true,
    tags: ['billing', 'CPT', 'revenue']
  },
  {
    id: 'lab-intelligence',
    title: 'Lab Intelligence Revolution',
    description: 'Natural language queries across all patient lab results',
    duration: '',
    category: 'core-features',
    comingSoon: true,
    tags: ['labs', 'analytics', 'insights']
  },

  // Time Savers
  {
    id: 'bulk-processing',
    title: 'Bulk Document Processing',
    description: 'Process hundreds of documents in minutes',
    duration: '',
    category: 'time-savers',
    comingSoon: true,
    tags: ['efficiency', 'batch', 'migration']
  },
  {
    id: 'smart-orders',
    title: 'Smart Order Sets',
    description: 'AI learns your preferences and suggests complete order sets',
    duration: '',
    category: 'time-savers',
    comingSoon: true,
    tags: ['orders', 'AI', 'personalization']
  },
  {
    id: 'pre-visit-planning',
    title: 'Pre-Visit Planning AI',
    description: 'Start every visit prepared with AI-generated summaries',
    duration: '',
    category: 'time-savers',
    comingSoon: true,
    tags: ['planning', 'efficiency', 'preparation']
  },

  // Advanced Features
  {
    id: 'custom-templates',
    title: 'Custom Templates & Workflows',
    description: 'Tailor CLARAFI to your specific practice needs',
    duration: '',
    category: 'advanced',
    isPremium: true,
    comingSoon: true,
    tags: ['customization', 'templates', 'workflows']
  },
  {
    id: 'analytics-insights',
    title: 'Practice Analytics & Insights',
    description: 'Data-driven insights to optimize your practice',
    duration: '',
    category: 'advanced',
    isPremium: true,
    comingSoon: true,
    tags: ['analytics', 'reporting', 'insights']
  },
  {
    id: 'team-collaboration',
    title: 'Team Collaboration Features',
    description: 'Seamless coordination between providers and staff',
    duration: '',
    category: 'advanced',
    comingSoon: true,
    tags: ['team', 'collaboration', 'communication']
  }
];

const categories = [
  {
    id: 'all',
    label: 'All Videos',
    icon: Sparkles,
    description: 'Browse our complete video library'
  },
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: Zap,
    description: 'Everything you need to begin'
  },
  {
    id: 'core-features',
    label: 'Core Features',
    icon: Brain,
    description: 'Master the essentials'
  },
  {
    id: 'time-savers',
    label: 'Time Savers',
    icon: Clock,
    description: 'Maximize your efficiency'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: TrendingUp,
    description: 'Take your practice to the next level'
  }
];

export default function LearnPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Track page view
  useEffect(() => {
    import('@/lib/analytics').then(({ analytics }) => {
      analytics.trackPageView({
        page: '/learn'
      });
    });
  }, []);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const VideoCard = ({ video }: { video: VideoData }) => (
    <Card 
      className={cn(
        "group transition-all duration-300 overflow-hidden",
        video.comingSoon 
          ? "opacity-75 cursor-not-allowed" 
          : "hover:shadow-lg cursor-pointer"
      )}
    >
      {/* Video Thumbnail Area */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-900 to-blue-950 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            video.comingSoon 
              ? "bg-gray-700/80" 
              : "bg-white/90 group-hover:bg-white group-hover:scale-110"
          )}>
            {video.comingSoon ? (
              <Lock className="w-6 h-6 text-gray-400" />
            ) : (
              <Play className="w-6 h-6 text-blue-900 ml-1" />
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {video.isNew && !video.comingSoon && (
            <Badge className="bg-yellow-500 text-black border-0">
              New
            </Badge>
          )}
          {video.isPremium && !video.comingSoon && (
            <Badge variant="secondary" className="bg-purple-600 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
          {video.comingSoon && (
            <Badge variant="secondary" className="bg-gray-700 text-gray-200 border-0">
              <Clock className="w-3 h-3 mr-1" />
              Coming Soon
            </Badge>
          )}
        </div>

        {/* Duration - Only show if not coming soon and duration exists */}
        {!video.comingSoon && video.duration && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="bg-black/70 text-white border-0">
              <Clock className="w-3 h-3 mr-1" />
              {video.duration}
            </Badge>
          </div>
        )}

        {/* Category Icon */}
        <div className="absolute top-3 right-3">
          {categories.find(c => c.id === video.category)?.icon && (
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              {(() => {
                const Icon = categories.find(c => c.id === video.category)?.icon;
                return Icon ? <Icon className="w-5 h-5 text-white" /> : null;
              })()}
            </div>
          )}
        </div>
      </div>

      <CardHeader>
        <CardTitle className="text-lg line-clamp-1">
          {video.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {video.description}
        </CardDescription>
      </CardHeader>

      {video.tags && video.tags.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo with custom color scheme */}
            <Link href="/">
              <div className="font-black text-3xl tracking-tight cursor-pointer">
                <span style={{ color: '#1e3a8a' }}>CLAR</span>
                <span className="text-yellow-500">A</span>
                <span style={{ color: '#1e3a8a' }}>F</span>
                <span className="text-yellow-500">I</span>
              </div>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="/#solution" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                Features
              </a>
              <a href="/#pricing" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                Pricing
              </a>
              <Link href="/about-us" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                About
              </Link>
              <Link href="/learn" className="text-white font-medium text-lg border-b-2 border-yellow-500">
                Learn
              </Link>
            </div>
            
            {/* Auth CTAs */}
            <div className="flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 hover:text-white hover:bg-white/10"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth?tab=register">
                    <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => {
                  toast({
                    title: "Mobile Menu",
                    description: "Mobile menu coming soon",
                  });
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16 min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <Badge className="bg-yellow-500 text-black border-0 mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Video Learning Center
              </Badge>
              
              <h1 className="text-4xl md:text-5xl font-bold">
                See CLARAFI in Action
              </h1>
              
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Discover how physicians are saving hours every day with our AI-powered EMR
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto mt-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search videos by topic, feature, or keyword..."
                  className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 shadow-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center gap-8 mt-8 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-400" />
                  <span>{videos.length} Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>~30 min total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-yellow-400" />
                  <span>Updated Weekly</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  Video tutorials are currently in production
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  We're creating comprehensive video content to help you master CLARAFI. Check back soon or explore our interactive demo and documentation in the meantime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="container mx-auto px-4 py-8">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto p-1 bg-gray-100">
              {categories.map(category => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm p-3"
                >
                  <div className="flex items-center gap-2">
                    <category.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.label}</span>
                    <span className="sm:hidden">{category.label.split(' ')[0]}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Category Description */}
            <div className="mt-6 mb-8 text-center">
              <p className="text-gray-600">
                {categories.find(c => c.id === selectedCategory)?.description}
              </p>
            </div>

            {/* Video Grid */}
            <TabsContent value={selectedCategory} className="mt-0">
              {filteredVideos.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredVideos.map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <CardContent>
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg text-gray-600">No videos found matching your search.</p>
                    <p className="text-sm text-gray-500 mt-2">Try different keywords or browse all videos.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="container mx-auto px-4 py-12">
            <Card className="bg-gradient-to-r from-blue-900 to-blue-950 text-white border-0">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Ready to Transform Your Practice?
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                  Join thousands of physicians who are already saving hours every day
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth?tab=register">
                    <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                      Start Free 30-Day Trial
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}