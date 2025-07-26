import { storage } from '../storage';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SEOScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  mobile: number;
}

interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
}

interface PageSEOAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  score: SEOScore;
  issues: SEOIssue[];
  opportunities: string[];
}

export class SEOMonitoringService {
  private landingPagePath = path.join(process.cwd(), 'client', 'index.html');
  private coreWebVitals = {
    LCP: 2.5, // Largest Contentful Paint (seconds)
    FID: 100, // First Input Delay (milliseconds)
    CLS: 0.1, // Cumulative Layout Shift
    FCP: 1.8, // First Contentful Paint (seconds)
    TTFB: 0.8 // Time to First Byte (seconds)
  };
  
  // Analyze overall SEO health
  async analyzeSEOHealth(healthSystemId: number): Promise<{
    score: SEOScore;
    issues: SEOIssue[];
    recommendations: string[];
    pages: PageSEOAnalysis[];
  }> {
    const issues: SEOIssue[] = [];
    const recommendations: string[] = [];
    const pages: PageSEOAnalysis[] = [];
    
    // Analyze main landing page
    const landingPageAnalysis = await this.analyzePage('/', 'landing');
    pages.push(landingPageAnalysis);
    issues.push(...landingPageAnalysis.issues);
    
    // Check technical SEO
    const technicalScore = await this.checkTechnicalSEO();
    
    // Check content SEO
    const contentScore = await this.checkContentSEO(healthSystemId);
    
    // Check performance metrics
    const performanceScore = await this.checkPerformance();
    
    // Check mobile optimization
    const mobileScore = await this.checkMobileOptimization();
    
    // Calculate overall score
    const overallScore = Math.round(
      (technicalScore + contentScore + performanceScore + mobileScore) / 4
    );
    
    // Generate recommendations based on scores
    if (technicalScore < 80) {
      recommendations.push('Improve technical SEO by adding schema markup and fixing crawlability issues');
    }
    if (contentScore < 80) {
      recommendations.push('Create more targeted content for specific medical specialties and procedures');
    }
    if (performanceScore < 80) {
      recommendations.push('Optimize page load speed by implementing lazy loading and image compression');
    }
    if (mobileScore < 80) {
      recommendations.push('Enhance mobile experience with better touch targets and responsive design');
    }
    
    return {
      score: {
        overall: overallScore,
        technical: technicalScore,
        content: contentScore,
        performance: performanceScore,
        mobile: mobileScore
      },
      issues,
      recommendations,
      pages
    };
  }
  
  // Analyze individual page SEO
  private async analyzePage(url: string, pageType: string): Promise<PageSEOAnalysis> {
    const issues: SEOIssue[] = [];
    const opportunities: string[] = [];
    
    try {
      // Read the HTML file
      const htmlContent = await fs.readFile(this.landingPagePath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Extract meta information
      const title = document.querySelector('title')?.textContent || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
      
      // Check title optimization
      if (title.length < 30) {
        issues.push({
          type: 'warning',
          category: 'Title',
          message: 'Title tag is too short (< 30 characters)',
          impact: 'medium',
          fix: 'Expand title to 50-60 characters with relevant keywords'
        });
      } else if (title.length > 60) {
        issues.push({
          type: 'warning',
          category: 'Title',
          message: 'Title tag is too long (> 60 characters)',
          impact: 'low',
          fix: 'Shorten title to under 60 characters to prevent truncation'
        });
      }
      
      // Check meta description
      if (metaDescription.length < 120) {
        issues.push({
          type: 'warning',
          category: 'Meta Description',
          message: 'Meta description is too short (< 120 characters)',
          impact: 'medium',
          fix: 'Expand description to 150-160 characters with call-to-action'
        });
      } else if (metaDescription.length > 160) {
        issues.push({
          type: 'warning',
          category: 'Meta Description',
          message: 'Meta description is too long (> 160 characters)',
          impact: 'low',
          fix: 'Shorten description to under 160 characters'
        });
      }
      
      // Check for schema markup
      const schemaScript = document.querySelector('script[type="application/ld+json"]');
      if (!schemaScript) {
        issues.push({
          type: 'error',
          category: 'Structured Data',
          message: 'No schema.org structured data found',
          impact: 'high',
          fix: 'Add Medical Organization or HealthCare schema markup'
        });
      }
      
      // Check Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      
      if (!ogTitle || !ogDescription || !ogImage) {
        issues.push({
          type: 'warning',
          category: 'Social Media',
          message: 'Missing Open Graph tags for social sharing',
          impact: 'medium',
          fix: 'Add complete Open Graph tags for better social media presence'
        });
      }
      
      // Check for canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        issues.push({
          type: 'warning',
          category: 'Technical',
          message: 'No canonical URL specified',
          impact: 'medium',
          fix: 'Add canonical tag to prevent duplicate content issues'
        });
      }
      
      // Calculate page score
      const scoreDeductions = issues.reduce((total, issue) => {
        if (issue.type === 'error') return total + 10;
        if (issue.type === 'warning') return total + 5;
        return total;
      }, 0);
      
      const pageScore = Math.max(0, 100 - scoreDeductions);
      
      // Add opportunities
      if (pageType === 'landing' && !metaKeywords.includes('telemedicine')) {
        opportunities.push('Add telemedicine-related keywords to capture growing search demand');
      }
      if (!title.includes('2025')) {
        opportunities.push('Include current year in title for freshness signals');
      }
      
      return {
        url,
        title,
        metaDescription,
        score: {
          overall: pageScore,
          technical: pageScore,
          content: pageScore,
          performance: 85, // Placeholder
          mobile: 88 // Placeholder
        },
        issues,
        opportunities
      };
    } catch (error) {
      console.error('Error analyzing page:', error);
      return {
        url,
        title: '',
        metaDescription: '',
        score: {
          overall: 0,
          technical: 0,
          content: 0,
          performance: 0,
          mobile: 0
        },
        issues: [{
          type: 'error',
          category: 'System',
          message: 'Failed to analyze page',
          impact: 'high',
          fix: 'Check page accessibility and file permissions'
        }],
        opportunities: []
      };
    }
  }
  
  // Check technical SEO factors
  private async checkTechnicalSEO(): Promise<number> {
    let score = 100;
    
    // Check robots.txt
    try {
      await fs.access(path.join(process.cwd(), 'client', 'public', 'robots.txt'));
    } catch {
      score -= 10; // No robots.txt
    }
    
    // Check sitemap
    try {
      await fs.access(path.join(process.cwd(), 'client', 'public', 'sitemap.xml'));
    } catch {
      score -= 15; // No sitemap
    }
    
    // SSL is handled by Replit
    // Check for proper redirects (would need actual server testing)
    
    return score;
  }
  
  // Check content SEO
  private async checkContentSEO(healthSystemId: number): Promise<number> {
    let score = 100;
    
    // Check if we have blog/content pages
    const events = await storage.getAnalyticsEvents({
      healthSystemId,
      eventType: 'page_view',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    });
    
    const contentPages = events.filter(e => 
      e.eventData?.page?.includes('/blog') || 
      e.eventData?.page?.includes('/resources')
    );
    
    if (contentPages.length === 0) {
      score -= 20; // No content marketing
    }
    
    // Check for keyword diversity in page titles
    const uniquePages = new Set(events.map(e => e.eventData?.page).filter(Boolean));
    if (uniquePages.size < 10) {
      score -= 10; // Limited page diversity
    }
    
    return score;
  }
  
  // Check performance metrics
  private async checkPerformance(): Promise<number> {
    // In production, this would use real Core Web Vitals data
    // For now, return a calculated score based on known factors
    let score = 100;
    
    // Deduct points for known performance issues
    // React bundle size
    score -= 5;
    
    // No CDN configured
    score -= 10;
    
    // Large images without optimization
    score -= 5;
    
    return Math.max(0, score);
  }
  
  // Check mobile optimization
  private async checkMobileOptimization(): Promise<number> {
    let score = 100;
    
    try {
      const htmlContent = await fs.readFile(this.landingPagePath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Check viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        score -= 20;
      } else {
        const content = viewport.getAttribute('content') || '';
        if (!content.includes('width=device-width')) {
          score -= 10;
        }
      }
      
      // Check for mobile-specific meta tags
      const mobileCapable = document.querySelector('meta[name="mobile-web-app-capable"]');
      if (!mobileCapable) {
        score -= 5;
      }
      
    } catch (error) {
      console.error('Error checking mobile optimization:', error);
      score = 70; // Default fallback
    }
    
    return score;
  }
  
  // Get keyword rankings (mock data - would integrate with SEO API)
  async getKeywordRankings(healthSystemId: number): Promise<Array<{
    keyword: string;
    position: number;
    previousPosition: number;
    searchVolume: number;
    difficulty: number;
    url: string;
  }>> {
    // In production, this would integrate with SEMrush, Ahrefs, or Google Search Console API
    return [
      {
        keyword: 'AI medical scribe',
        position: 12,
        previousPosition: 15,
        searchVolume: 2400,
        difficulty: 68,
        url: '/'
      },
      {
        keyword: 'EMR software',
        position: 24,
        previousPosition: 28,
        searchVolume: 8100,
        difficulty: 82,
        url: '/'
      },
      {
        keyword: 'medical documentation AI',
        position: 8,
        previousPosition: 10,
        searchVolume: 880,
        difficulty: 45,
        url: '/'
      },
      {
        keyword: 'SOAP note generator',
        position: 5,
        previousPosition: 7,
        searchVolume: 1300,
        difficulty: 38,
        url: '/'
      },
      {
        keyword: 'physician burnout solution',
        position: 18,
        previousPosition: 22,
        searchVolume: 590,
        difficulty: 42,
        url: '/'
      }
    ];
  }
  
  // Get competitor analysis
  async getCompetitorAnalysis(): Promise<Array<{
    competitor: string;
    domain: string;
    trafficShare: number;
    keywords: number;
    backlinks: number;
  }>> {
    // Mock competitor data
    return [
      {
        competitor: 'Epic Systems',
        domain: 'epic.com',
        trafficShare: 35.2,
        keywords: 12500,
        backlinks: 85000
      },
      {
        competitor: 'Cerner/Oracle Health',
        domain: 'oracle.com/health',
        trafficShare: 28.4,
        keywords: 9800,
        backlinks: 62000
      },
      {
        competitor: 'Athenahealth',
        domain: 'athenahealth.com',
        trafficShare: 15.8,
        keywords: 6200,
        backlinks: 41000
      },
      {
        competitor: 'eClinicalWorks',
        domain: 'eclinicalworks.com',
        trafficShare: 12.3,
        keywords: 4800,
        backlinks: 28000
      },
      {
        competitor: 'NextGen',
        domain: 'nextgen.com',
        trafficShare: 8.3,
        keywords: 3200,
        backlinks: 19000
      }
    ];
  }
}

// Export singleton instance
export const seoMonitoring = new SEOMonitoringService();