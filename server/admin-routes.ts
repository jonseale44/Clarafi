import type { Express } from "express";
import { storage } from "./storage.js";
import { insertAdminPromptReviewSchema } from "@shared/schema";
import { z } from "zod";

export function setupAdminRoutes(app: Express): void {
  // Middleware to check admin access
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // For now, allow any authenticated user to access admin features
    // In production, you'd check for specific admin roles
    next();
  };

  // Get all pending prompt reviews
  app.get("/api/admin/prompt-reviews/pending", requireAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllPendingPromptReviews();
      res.json(reviews);
    } catch (error) {
      console.error("❌ [AdminRoutes] Error fetching pending reviews:", error);
      res.status(500).json({ message: "Failed to fetch pending reviews" });
    }
  });

  // Get specific prompt review
  app.get("/api/admin/prompt-reviews/:reviewId", requireAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const review = await storage.getAdminPromptReview(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json(review);
    } catch (error) {
      console.error("❌ [AdminRoutes] Error fetching review:", error);
      res.status(500).json({ message: "Failed to fetch review" });
    }
  });

  // Update prompt review (edit the prompt)
  app.put("/api/admin/prompt-reviews/:reviewId", requireAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const updateSchema = insertAdminPromptReviewSchema.partial();
      
      const validatedData = updateSchema.parse(req.body);
      validatedData.adminUserId = req.user.id;
      
      const updated = await storage.updateAdminPromptReview(reviewId, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("❌ [AdminRoutes] Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Activate a reviewed prompt (make it active for the template)
  app.post("/api/admin/prompt-reviews/:reviewId/activate", requireAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      await storage.activateReviewedPrompt(reviewId, req.user.id);
      res.json({ message: "Prompt activated successfully" });
    } catch (error) {
      console.error("❌ [AdminRoutes] Error activating prompt:", error);
      res.status(500).json({ message: "Failed to activate prompt" });
    }
  });

  // Create a new prompt review (for manual admin review)
  app.post("/api/admin/prompt-reviews", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAdminPromptReviewSchema.parse(req.body);
      const created = await storage.createAdminPromptReview(validatedData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("❌ [AdminRoutes] Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Get all templates with their active prompt status
  app.get("/api/admin/templates", requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllUserTemplates();
      
      // Add active prompt info for each template
      const templatesWithPrompts = await Promise.all(
        templates.map(async (template) => {
          const activePrompt = await storage.getActivePromptForTemplate(template.id);
          return {
            ...template,
            hasActivePrompt: !!activePrompt,
            activePromptLength: activePrompt?.length || 0
          };
        })
      );
      
      res.json(templatesWithPrompts);
    } catch (error) {
      console.error("❌ [AdminRoutes] Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
}