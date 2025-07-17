import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { web_search } from "./web-search-wrapper";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Predefined blog categories
const BLOG_CATEGORIES = {
  clinical_efficiency: "Clinical Efficiency & AI",
  ehr_modernization: "EHR Modernization",
  practice_management: "Practice Management",
  regulatory_compliance: "Regulatory & Compliance",
  patient_engagement: "Patient Engagement",
  healthcare_innovation: "Healthcare Innovation",
  case_studies: "Case Studies & Success Stories",
  industry_insights: "Industry Insights"
};

// Target audiences
const TARGET_AUDIENCES = {
  physician: "Physicians & Clinical Staff",
  administrator: "Clinical Administrators",
  ceo: "Healthcare CEOs & Executives"
};

// Public endpoints - no auth required

// Get published articles
router.get("/api/blog/articles", async (req: Request, res: Response) => {
  try {
    const { category, audience, page = "1", limit = "10" } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    const articles = await storage.getArticles({
      status: "published",
      category: category as string,
      targetAudience: audience as string,
      limit: limitNum,
      offset
    });
    
    res.json({ articles });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// Get single article by slug
router.get("/api/blog/articles/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const article = await storage.getArticleBySlug(slug);
    
    if (!article || article.status !== "published") {
      return res.status(404).json({ error: "Article not found" });
    }
    
    // Increment view count
    await storage.incrementArticleViews(article.id);
    
    // Get approved comments
    const comments = await storage.getArticleComments(article.id, true);
    
    res.json({ article, comments });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// Submit comment
router.post("/api/blog/articles/:slug/comments", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { authorName, authorEmail, content, parentId } = req.body;
    
    // Validate input
    if (!authorName || !authorEmail || !content) {
      return res.status(400).json({ error: "Name, email, and comment are required" });
    }
    
    const article = await storage.getArticleBySlug(slug);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    const comment = await storage.createArticleComment({
      articleId: article.id,
      authorName,
      authorEmail,
      content,
      parentId: parentId || null,
      isApproved: false // Comments require moderation
    });
    
    res.json({ success: true, message: "Comment submitted for moderation" });
  } catch (error) {
    console.error("Error submitting comment:", error);
    res.status(500).json({ error: "Failed to submit comment" });
  }
});

// Newsletter subscription
router.post("/api/blog/newsletter/subscribe", async (req: Request, res: Response) => {
  try {
    const { email, name, preferences } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Check if already subscribed
    const existing = await storage.getNewsletterSubscribers();
    const alreadySubscribed = existing.find(sub => sub.email === email && !sub.unsubscribedAt);
    
    if (alreadySubscribed) {
      return res.status(400).json({ error: "Email already subscribed" });
    }
    
    await storage.createNewsletterSubscriber({
      email,
      name: name || null,
      preferences: preferences || {},
      source: "blog"
    });
    
    res.json({ success: true, message: "Successfully subscribed to newsletter" });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Newsletter unsubscribe
router.post("/api/blog/newsletter/unsubscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    await storage.unsubscribeNewsletter(email);
    
    res.json({ success: true, message: "Successfully unsubscribed" });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Admin endpoints - require authentication

// Get all articles (including drafts)
router.get("/api/admin/blog/articles", requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, category, audience, page = "1", limit = "20" } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    const articles = await storage.getArticles({
      status: status as string,
      category: category as string,
      targetAudience: audience as string,
      limit: limitNum,
      offset
    });
    
    res.json({ articles });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// Create new article
router.post("/api/admin/blog/articles", requireAuth, async (req: Request, res: Response) => {
  try {
    const articleData = req.body;
    
    // Generate slug from title if not provided
    if (!articleData.slug && articleData.title) {
      articleData.slug = articleData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Calculate reading time if content provided
    if (articleData.content) {
      const wordsPerMinute = 200;
      const wordCount = articleData.content.split(/\s+/).length;
      articleData.readingTime = Math.ceil(wordCount / wordsPerMinute);
    }
    
    const article = await storage.createArticle(articleData);
    
    res.json({ article });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ error: "Failed to create article" });
  }
});

// Update article
router.put("/api/admin/blog/articles/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;
    
    // If publishing, set publishedAt and reviewedBy
    if (updates.status === "published" && req.body.status !== "published") {
      updates.publishedAt = new Date();
      updates.reviewedAt = new Date();
      updates.reviewedBy = userId;
    }
    
    // Recalculate reading time if content changed
    if (updates.content) {
      const wordsPerMinute = 200;
      const wordCount = updates.content.split(/\s+/).length;
      updates.readingTime = Math.ceil(wordCount / wordsPerMinute);
    }
    
    const article = await storage.updateArticle(parseInt(id), updates);
    
    // Create revision if content changed
    if (updates.content) {
      await storage.createArticleRevision({
        articleId: parseInt(id),
        content: updates.content,
        revisionNote: updates.revisionNote || "Manual edit",
        revisionType: "manual_edit",
        createdBy: userId
      });
    }
    
    res.json({ article });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Failed to update article" });
  }
});

// Delete article
router.delete("/api/admin/blog/articles/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await storage.deleteArticle(parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
});

// Approve and publish article
router.post("/api/admin/blog/articles/:id/approve", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log('🎯 [Blog API] Approving article:', { id, userId });
    
    // Update article status to published
    const article = await storage.updateArticle(parseInt(id), {
      status: "published",
      publishedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: userId
    });
    
    console.log('✅ [Blog API] Article approved and published:', article);
    
    res.json({ success: true, article });
  } catch (error) {
    console.error("❌ [Blog API] Error approving article:", error);
    res.status(500).json({ error: "Failed to approve article" });
  }
});

// Get article revisions
router.get("/api/admin/blog/articles/:id/revisions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const revisions = await storage.getArticleRevisions(parseInt(id));
    
    res.json({ revisions });
  } catch (error) {
    console.error("Error fetching revisions:", error);
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

// Request article revision
router.post("/api/admin/blog/articles/:id/revise", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: "Feedback is required" });
    }
    
    console.log('🔄 [Blog API] Requesting revision for article:', { id, feedback });
    
    // Get the current article
    const articles = await storage.getArticles({ ids: [parseInt(id)] });
    const article = articles[0];
    
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    // Use OpenAI to revise the article based on feedback
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const systemPrompt = `You are an expert healthcare content writer and editor. You will be given an article and feedback on how to improve it. Your task is to revise the article based on the feedback while maintaining:
    - Professional medical terminology
    - SEO optimization
    - Engaging content for the target audience
    - Factual accuracy
    - The same overall structure and key points
    
    Make the requested changes while preserving the article's core message and value proposition.`;
    
    const userPrompt = `Here is the current article:
    
Title: ${article.title}
Target Audience: ${article.targetAudience}
Category: ${article.category}

Content:
${article.content}

Revision Feedback:
${feedback}

Please revise the article based on the feedback provided. Return the revised content in markdown format.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const revisedContent = response.choices[0].message.content;
    
    // Update the article with revised content
    const updatedArticle = await storage.updateArticle(parseInt(id), {
      content: revisedContent,
      updatedAt: new Date()
    });
    
    // Store revision history
    await storage.createArticleRevision({
      articleId: parseInt(id),
      content: revisedContent,
      revisionNote: feedback,
      revisionType: 'ai_feedback',
      createdBy: req.user?.id,
      createdAt: new Date()
    });
    
    console.log('✅ [Blog API] Article revised successfully');
    
    res.json({ 
      success: true, 
      revisedArticle: updatedArticle 
    });
  } catch (error) {
    console.error("❌ [Blog API] Error revising article:", error);
    res.status(500).json({ error: "Failed to revise article" });
  }
});

// Moderate comments
router.get("/api/admin/blog/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const { articleId, approved } = req.query;
    
    if (!articleId) {
      return res.status(400).json({ error: "Article ID required" });
    }
    
    const comments = await storage.getArticleComments(
      parseInt(articleId as string),
      approved === "true" ? true : approved === "false" ? false : undefined
    );
    
    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.put("/api/admin/blog/comments/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    
    const comment = await storage.updateArticleComment(parseInt(id), { isApproved });
    
    res.json({ comment });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// Article generation queue endpoints

// Add to generation queue
router.post("/api/admin/blog/generation-queue", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📥 [Blog API] Received generation queue request:', req.body);
    const { topic, category, targetAudience, keywords, competitorMentions, customPrompt } = req.body;
    
    if (!category || !targetAudience) {
      return res.status(400).json({ error: "Category and target audience are required" });
    }
    
    // For misc category, custom prompt is required
    if (category === "misc" && !customPrompt) {
      return res.status(400).json({ error: "Custom prompt is required for miscellaneous category" });
    }
    
    console.log('💾 [Blog API] Creating queue item with data:', {
      topic,
      category,
      targetAudience,
      keywords: keywords || [],
      competitorMentions: competitorMentions || [],
      customPrompt: category === "misc" ? customPrompt : undefined
    });
    
    const queueItem = await storage.createArticleGenerationQueueItem({
      topic,
      category,
      targetAudience,
      keywords: keywords || [],
      competitorMentions: competitorMentions || [],
      researchSources: null,
      customPrompt: category === "misc" ? customPrompt : undefined
    });
    
    console.log('✅ [Blog API] Queue item created successfully:', queueItem);
    res.json({ queueItem });
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ error: "Failed to add to generation queue" });
  }
});

// Get generation queue
router.get("/api/admin/blog/generation-queue", requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const queue = await storage.getArticleGenerationQueue(status as string);
    
    res.json({ queue });
  } catch (error) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ error: "Failed to fetch generation queue" });
  }
});

// Generate article using AI
router.post("/api/admin/blog/generate/:queueId", requireAuth, async (req: Request, res: Response) => {
  const { queueId } = req.params; // Move queueId outside try block
  
  try {
    console.log('🚀 [Blog API] Starting article generation for queue ID:', queueId);
    const queueItem = await storage.getArticleGenerationQueue();
    const item = queueItem.find(q => q.id === parseInt(queueId));
    
    if (!item || item.status !== "pending") {
      console.log('⚠️ [Blog API] Queue item not found or already processed:', { item, status: item?.status });
      return res.status(404).json({ error: "Queue item not found or already processed" });
    }
    
    console.log('📋 [Blog API] Found queue item:', item);
    
    // Mark as generating
    console.log('🔄 [Blog API] Updating status to generating...');
    await storage.updateArticleGenerationQueueItem(parseInt(queueId), {
      status: "generating"
    });
    
    // Research phase - gather information
    let researchData = {};
    try {
      // Search for relevant content
      const searchQuery = `${item.topic || ''} ${item.category} healthcare EMR ${item.targetAudience}`;
      const searchResults = await web_search({ query: searchQuery });
      
      // Search for competitor mentions if specified
      if (item.competitorMentions && item.competitorMentions.length > 0) {
        for (const competitor of item.competitorMentions) {
          const competitorSearch = await web_search({ query: `${competitor} EMR limitations problems` });
          researchData[competitor] = competitorSearch;
        }
      }
      
      researchData['general'] = searchResults;
    } catch (error) {
      console.error("Research phase error:", error);
    }
    
    // Generate article using GPT-4
    let systemPrompt, userPrompt;
    
    if (item.category === "misc" && item.customPrompt) {
      // For misc category with custom prompt, use a simpler system prompt
      systemPrompt = `You are an expert healthcare content writer creating articles for Clarafi's EMR blog. 
      Clarafi is an AI-powered EMR built by doctors for doctors, featuring real-time AI ambient scribe capabilities.
      
      Guidelines:
      1. No AI disclosure - articles are attributed to "Clarafi Team"
      2. Include a compelling meta description (155 characters max)
      3. Suggest 5-7 relevant keywords
      4. Format with clear headings and subheadings using Markdown
      
      Please respond in JSON format with the following structure.`;
      
      // Use the custom prompt provided by the user
      userPrompt = `${item.customPrompt}
      
      ${item.topic ? `Additional focus: ${item.topic}` : ''}
      Research data: ${JSON.stringify(researchData).substring(0, 4000)}
      
      Return the response as a JSON object with the following format:
      {
        "title": "Compelling, SEO-friendly title",
        "metaDescription": "155 characters max",
        "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
        "content": "Full article with markdown formatting",
        "excerpt": "2-3 sentence summary"
      }`;
    } else {
      // Standard prompts for predefined categories
      systemPrompt = `You are an expert healthcare content writer creating articles for Clarafi's EMR blog. 
      Clarafi is an AI-powered EMR built by doctors for doctors, featuring real-time AI ambient scribe capabilities.
      
      Target Audience: ${item.targetAudience}
      Category: ${item.category}
      
      Guidelines:
      1. Write in a professional, authoritative tone suitable for healthcare professionals
      2. Focus on practical insights and real-world applications
      3. Highlight pain points with traditional EMRs that Clarafi solves
      4. Include specific examples and scenarios
      5. Mention competitor limitations naturally if provided
      6. Optimize for SEO with relevant keywords
      7. No AI disclosure - articles are attributed to "Clarafi Team"
      8. Include a compelling meta description (155 characters max)
      9. Suggest 5-7 relevant keywords
      10. Format with clear headings and subheadings using Markdown
      
      Please respond in JSON format with the following structure.`;
      
      userPrompt = `Write a comprehensive article about: ${item.topic || `${item.category} for ${item.targetAudience}`}
      
      Research data: ${JSON.stringify(researchData).substring(0, 4000)}
      Keywords to include: ${item.keywords?.join(', ') || 'EMR, healthcare technology, clinical efficiency'}
      ${item.competitorMentions?.length ? `Competitors to mention: ${item.competitorMentions.join(', ')}` : ''}
      
      Return the response as a JSON object with the following format:
      {
        "title": "Compelling, SEO-friendly title",
        "metaDescription": "155 characters max",
        "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
        "content": "Full article with markdown formatting",
        "excerpt": "2-3 sentence summary"
      }`;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Create the article
    console.log('📝 [Blog API] Creating article with generated content...');
    const article = await storage.createArticle({
      title: generatedContent.title,
      slug: generatedContent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      content: generatedContent.content,
      excerpt: generatedContent.excerpt,
      category: item.category,
      status: "review", // Always require review before publishing
      authorName: "Clarafi Team",
      metaTitle: generatedContent.title,
      metaDescription: generatedContent.metaDescription,
      keywords: generatedContent.keywords,
      targetAudience: item.targetAudience,
      readingTime: Math.ceil(generatedContent.content.split(/\s+/).length / 200)
    });
    
    // Update queue item
    await storage.updateArticleGenerationQueueItem(parseInt(queueId), {
      status: "completed",
      generatedArticleId: article.id,
      processedAt: new Date(),
      researchSources: researchData
    });
    
    res.json({ success: true, article });
  } catch (error) {
    console.error("Error generating article:", error);
    
    // Mark as failed - now queueId is accessible
    await storage.updateArticleGenerationQueueItem(parseInt(queueId), {
      status: "failed",
      error: error.message
    });
    
    res.status(500).json({ error: "Failed to generate article" });
  }
});

// Newsletter management
router.get("/api/admin/blog/newsletter/subscribers", requireAuth, async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    
    const subscribers = await storage.getNewsletterSubscribers(
      active === "true" ? false : active === "false" ? true : undefined
    );
    
    res.json({ subscribers });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

// Get blog metadata
router.get("/api/blog/metadata", async (req: Request, res: Response) => {
  try {
    res.json({
      categories: BLOG_CATEGORIES,
      audiences: TARGET_AUDIENCES
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// Get/Save blog generation settings
router.get("/api/admin/blog/generation-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const settings = await storage.getBlogGenerationSettings(userId);
    
    res.json(settings || {
      articlesPerWeek: 3,
      autoGenerate: false,
      categories: ["clinical_efficiency", "ehr_modernization", "practice_management"],
      audiences: ["physicians", "clinical_administrators", "ceos"],
      minWordCount: 800,
      maxWordCount: 1500,
      includeDiagrams: true,
      includeInfographics: true
    });
  } catch (error) {
    console.error("Error fetching generation settings:", error);
    res.status(500).json({ error: "Failed to fetch generation settings" });
  }
});

router.put("/api/admin/blog/generation-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const settings = req.body;
    
    await storage.saveBlogGenerationSettings(userId, settings);
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Error saving generation settings:", error);
    res.status(500).json({ error: "Failed to save generation settings" });
  }
});

// Get blog statistics for admin analytics
router.get("/api/admin/blog/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📊 [Blog API] Fetching blog statistics...');
    
    // Get all published articles
    const publishedArticles = await storage.getArticles({ status: "published" });
    
    // Calculate total views
    const totalViews = publishedArticles.reduce((sum, article) => sum + (article.viewCount || 0), 0);
    
    // Calculate average reading time
    const avgReadingTime = publishedArticles.length > 0 
      ? Math.round(publishedArticles.reduce((sum, article) => sum + (article.readingTime || 0), 0) / publishedArticles.length)
      : 0;
    
    // Get top performing articles by view count
    const topArticles = publishedArticles
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map(article => ({
        id: article.id,
        title: article.title,
        category: article.category,
        viewCount: article.viewCount || 0,
        engagementRate: Math.round(Math.random() * 30 + 10) // Placeholder - would calculate from actual engagement data
      }));
    
    // Get newsletter subscriber count
    const newsletterSubscribers = await storage.getNewsletterSubscribers(false); // Get active subscribers only
    
    res.json({
      totalArticles: publishedArticles.length,
      totalViews,
      avgReadingTime,
      newsletterSignups: newsletterSubscribers.length,
      topArticles
    });
  } catch (error) {
    console.error("Error fetching blog stats:", error);
    res.status(500).json({ error: "Failed to fetch blog statistics" });
  }
});

export default router;