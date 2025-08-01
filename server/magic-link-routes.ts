import { Router } from "express";
import { MagicLinkService } from "./magic-link-service.js";
import { z } from "zod";
import { db } from "./db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Request magic link schema
const requestMagicLinkSchema = z.object({
  email: z.string().email().toLowerCase(),
  purpose: z.enum(['login', 'registration']).default('login')
});

// Request magic link endpoint
router.post("/api/auth/magic-link", async (req, res) => {
  try {
    const parsed = requestMagicLinkSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, parsed.email))
      .limit(1);

    // For login, user must exist
    if (parsed.purpose === 'login' && existingUser.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No account found with this email address" 
      });
    }

    // For registration, user must not exist
    if (parsed.purpose === 'registration' && existingUser.length > 0) {
      return res.status(409).json({ 
        success: false,
        message: "An account already exists with this email address" 
      });
    }

    // Create magic link
    const { token, expiresAt } = await MagicLinkService.createMagicLink(
      parsed.email,
      {
        purpose: parsed.purpose,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Send email
    await MagicLinkService.sendMagicLinkEmail(
      parsed.email,
      token,
      parsed.purpose
    );

    res.json({
      success: true,
      message: `Check your email for a ${parsed.purpose === 'login' ? 'login' : 'registration'} link`,
      expiresAt
    });
  } catch (error) {
    console.error('❌ [MagicLink] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        message: error.errors[0].message 
      });
    }
    res.status(500).json({ 
      success: false,
      message: "Failed to send magic link" 
    });
  }
});

// Validate magic link token
router.get("/api/auth/magic-link/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token
    const result = await MagicLinkService.validateToken(token);

    if (!result.valid) {
      return res.status(400).json({ 
        success: false,
        message: result.error || "Invalid or expired link" 
      });
    }

    // For login, create session
    if (result.userId) {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Create session
      req.session.userId = user[0].id;
      req.session.save();

      return res.json({
        success: true,
        purpose: result.purpose,
        user: {
          id: user[0].id,
          username: user[0].username,
          email: user[0].email,
          role: user[0].role,
          requirePasswordChange: user[0].requirePasswordChange
        }
      });
    }

    // For registration, return email to complete registration
    return res.json({
      success: true,
      purpose: result.purpose,
      email: result.email
    });
  } catch (error) {
    console.error('❌ [MagicLink] Validation error:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to validate magic link" 
    });
  }
});

// Cleanup expired links (can be called by a cron job)
router.post("/api/auth/magic-link/cleanup", async (req, res) => {
  try {
    const deleted = await MagicLinkService.cleanupExpiredLinks();
    res.json({ 
      success: true, 
      message: `Cleaned up ${deleted} expired links` 
    });
  } catch (error) {
    console.error('❌ [MagicLink] Cleanup error:', error);
    res.status(500).json({ error: "Failed to cleanup expired links" });
  }
});

export default router;