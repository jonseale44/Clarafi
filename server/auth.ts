import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import { User as SelectUser, users } from "@shared/schema";
import { StripeService } from "./stripe-service.js";

declare global {
  namespace Express {
    interface User extends SelectUser {
      healthSystemName?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      // Handle legacy passwords or invalid format
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "fallback-secret-for-development-only";
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } 
      
      // Check if email is verified
      if (!user.emailVerified) {
        console.log(`❌ [Auth] User ${username} attempted login without email verification`);
        return done(null, false, { message: 'Please verify your email before logging in.' });
      }
      
      return done(null, user);
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Real-time validation endpoints
  app.post("/api/check-username", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || username.length < 3) {
        return res.json({ 
          available: false, 
          message: "Username must be at least 3 characters long" 
        });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.json({ 
          available: false, 
          message: "This username is already taken. Try adding numbers or use a different name." 
        });
      }
      
      return res.json({ 
        available: true, 
        message: "Username is available!" 
      });
    } catch (error) {
      console.error("❌ [CheckUsername] Error:", error);
      return res.status(500).json({ 
        available: false, 
        message: "Unable to check username availability. Please try again." 
      });
    }
  });

  app.post("/api/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.json({ 
          available: false, 
          message: "Please enter a valid email address" 
        });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.json({ 
          available: false, 
          message: "This email is already registered. Try logging in or use a different email." 
        });
      }
      
      return res.json({ 
        available: true, 
        message: "Email is available!" 
      });
    } catch (error) {
      console.error("❌ [CheckEmail] Error:", error);
      return res.status(500).json({ 
        available: false, 
        message: "Unable to check email availability. Please try again." 
      });
    }
  });

  app.post("/api/check-npi", async (req, res) => {
    try {
      const { npi } = req.body;
      
      if (!npi) {
        return res.json({ 
          available: true, 
          message: "NPI is optional" 
        });
      }
      
      // Validate NPI format (10 digits)
      const npiRegex = /^\d{10}$/;
      if (!npiRegex.test(npi)) {
        return res.json({ 
          available: false, 
          message: "NPI must be exactly 10 digits" 
        });
      }
      
      // Check if NPI exists
      const existingUser = await storage.getUserByNPI(npi);
      
      if (existingUser) {
        return res.json({ 
          available: false, 
          message: "This NPI is already registered in our system" 
        });
      }
      
      return res.json({ 
        available: true, 
        message: "NPI is valid and available!" 
      });
    } catch (error) {
      console.error("❌ [CheckNPI] Error:", error);
      return res.status(500).json({ 
        available: false, 
        message: "Unable to validate NPI. Please try again." 
      });
    }
  });

  app.post("/api/validate-password", async (req, res) => {
    try {
      const { password } = req.body;
      
      // Use evidence-based password strength calculation
      const { calculatePasswordStrength } = await import("./password-validation");
      const strength = calculatePasswordStrength(password);
      
      return res.json({
        valid: strength.isAcceptable,
        strength: strength.strength,
        score: strength.score,
        entropy: strength.entropy,
        message: strength.feedback,
        suggestions: strength.suggestions
      });
    } catch (error) {
      console.error("❌ [ValidatePassword] Error:", error);
      return res.status(500).json({ 
        valid: false, 
        message: "Unable to validate password" 
      });
    }
  });

  // Real-time validation endpoints
  app.post("/api/check-username", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || username.length < 3) {
        return res.json({ available: false, message: "Username too short" });
      }

      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        res.json({ available: false, message: "This username is already taken. Try adding numbers or use a different name." });
      } else {
        res.json({ available: true, message: "Username available" });
      }
    } catch (error) {
      res.json({ available: false, message: "Error checking username" });
    }
  });

  app.post("/api/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes("@")) {
        return res.json({ available: false, message: "Invalid email format" });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      
      if (existingUser) {
        res.json({ available: false, message: "This email is already registered. Please use a different email or sign in instead." });
      } else {
        res.json({ available: true, message: "Email available for registration" });
      }
    } catch (error) {
      res.json({ available: false, message: "Error checking email" });
    }
  });

  app.post("/api/check-npi", async (req, res) => {
    try {
      const { npi } = req.body;
      
      if (!npi || !/^\d{10}$/.test(npi)) {
        return res.json({ available: false, message: "NPI must be 10 digits" });
      }

      const existingUser = await storage.getUserByNPI(npi);
      
      if (existingUser) {
        res.json({ available: false, message: "This NPI is already registered to another account. Please verify your NPI or contact support." });
      } else {
        res.json({ available: true, message: "NPI is valid and available" });
      }
    } catch (error) {
      res.json({ available: false, message: "Error checking NPI" });
    }
  });

  app.post("/api/validate-password", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.json({ valid: false, strength: "weak", message: "Password required" });
      }

      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[@$!%*?&]/.test(password);
      const isLongEnough = password.length >= 8;

      const requirements = [hasUppercase, hasLowercase, hasNumber, hasSpecial, isLongEnough];
      const metRequirements = requirements.filter(Boolean).length;

      if (metRequirements === 5) {
        res.json({ valid: true, strength: "strong", message: "Strong password" });
      } else if (metRequirements >= 3 && isLongEnough) {
        res.json({ valid: true, strength: "fair", message: "Fair password" });
      } else {
        res.json({ valid: false, strength: "weak", message: "Weak password - add more complexity" });
      }
    } catch (error) {
      res.json({ valid: false, strength: "weak", message: "Error checking password" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("🔐 [Registration] Starting registration process for:", req.body.username);
      
      // Check for existing username
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("❌ [Registration] Username already exists:", req.body.username);
        return res.status(400).json({ 
          message: "Username already exists",
          field: "username"
        });
      }

      // Check for existing email if provided
      if (req.body.email) {
        const existingEmailUser = await storage.getUserByEmail(req.body.email);
        if (existingEmailUser) {
          console.log("❌ [Registration] Email already exists:", req.body.email);
          return res.status(400).json({ 
            message: "Email address is already registered",
            field: "email"
          });
        }
      }

      // Import RegistrationService and StripeService
      const { RegistrationService } = await import("./registration-service.js");
      const { StripeService } = await import("./stripe-service.js");

      // Prepare registration data with hashed password
      const registrationData = {
        ...req.body,
        password: await hashPassword(req.body.password),
        npi: req.body.npi && req.body.npi.trim() ? req.body.npi.trim() : null,
        selectedLocationId: req.body.selectedLocationId,
        // Include acquisition tracking data
        utmSource: req.body.utmSource,
        utmMedium: req.body.utmMedium,
        utmCampaign: req.body.utmCampaign,
        utmTerm: req.body.utmTerm,
        utmContent: req.body.utmContent,
        referrerUrl: req.body.referrerUrl,
        landingPage: req.body.landingPage,
        // Include BAA acceptance for Tier 1 providers
        baaAccepted: req.body.baaAccepted || false,
        baaAcceptedAt: req.body.baaAccepted ? new Date().toISOString() : null,
        baaVersion: req.body.baaAccepted ? "v1.0-2025" : null,
      };

      console.log("✅ [Registration] Creating new user:", registrationData.username);
      const registrationResult = await RegistrationService.registerUser(registrationData);
      const { user, requiresPayment, healthSystemId } = registrationResult;

      // Handle payment requirement for systems without patients
      if (requiresPayment) {
        console.log("💳 [Registration] Creating Stripe checkout for individual provider");
        
        // Always tier 1 for individual providers - they pay $99/month
        const tier = 1;
        const registrationType = req.body.registrationType === 'create_new' ? 'individual' : 'join_existing';
        
        const checkoutResult = await StripeService.createCheckoutSession({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          tier: tier,
          billingPeriod: 'monthly',
          healthSystemId: healthSystemId, // Use the healthSystemId from registration result
          metadata: {
            userId: user.id.toString(),
            registrationType: registrationType
          }
        });

        if (checkoutResult.success && checkoutResult.sessionUrl) {
          // Store pending registration info
          console.log("✅ [Registration] Stripe checkout created, redirecting to payment");
          console.log("⚠️  [Registration] Skipping verification email - will be sent after payment");
          
          return res.status(201).json({
            success: true,
            registrationType: 'create_new',
            requiresPayment: true,
            paymentUrl: checkoutResult.sessionUrl,
            message: "Registration successful! Please complete payment to activate your account."
          });
        } else {
          console.error("❌ [Registration] Failed to create Stripe checkout:", checkoutResult.error);
          
          // Cleanup: Delete the user that was just created since payment setup failed
          try {
            console.log("🧹 [Registration] Cleaning up user after Stripe failure:", user.id);
            await storage.deleteUser(user.id);
            console.log("✅ [Registration] User cleaned up successfully");
          } catch (cleanupError) {
            console.error("❌ [Registration] Failed to cleanup user:", cleanupError);
          }
          
          return res.status(500).json({ 
            message: "Payment setup failed. Please try registering again.",
            error: checkoutResult.error
          });
        }
      } else {
        // Only send verification email for users who don't require payment
        console.log("📧 [Registration] User doesn't require payment, sending verification email");
      }

      // For users joining existing systems, send verification email
      try {
        // Send verification email
        const { EmailVerificationService } = await import("./email-verification-service.js");
        const token = await EmailVerificationService.createVerificationToken(user.id);
        await EmailVerificationService.sendVerificationEmail(user.email, token);
        
        console.log("✅ [Registration] User created successfully, verification email sent:", user.username);
        
        // Don't log them in - they need to verify email first
        res.status(201).json({
          success: true,
          message: "Registration successful! Please check your email to verify your account before logging in.",
          registrationType: req.body.registrationType || 'join_existing',
          requiresPayment: false,
          emailVerificationRequired: true
        });
      } catch (emailError) {
        console.error("❌ [Registration] Failed to send verification email:", emailError);
        // Still return success but warn about email
        res.status(201).json({
          success: true,
          message: "Registration successful but we couldn't send the verification email. Please contact support.",
          registrationType: req.body.registrationType || 'join_existing',
          requiresPayment: false,
          emailVerificationRequired: true
        });
      }

    } catch (error: any) {
      console.error("❌ [Registration] Registration failed:", error);
      
      // Handle database constraint violations
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        if (error.constraint === 'users_email_unique') {
          return res.status(400).json({ 
            message: "Email address is already registered",
            field: "email"
          });
        } else if (error.constraint === 'users_npi_unique') {
          return res.status(400).json({ 
            message: "NPI number is already registered",
            field: "npi"
          });
        } else if (error.constraint === 'users_username_unique') {
          return res.status(400).json({ 
            message: "Username already exists",
            field: "username"
          });
        } else if (error.constraint === 'health_systems_pkey') {
          return res.status(500).json({ 
            message: "There was an issue creating your practice. Please try again or contact support if the problem persists.",
            field: null
          });
        }
      }
      
      // Handle registration service errors
      if (error.message?.includes('required')) {
        return res.status(400).json({ 
          message: error.message,
          field: null
        });
      }
      
      // Generic error for other issues
      return res.status(500).json({ 
        message: "Registration failed. Please try again or contact support if the problem persists.",
        field: null
      });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    const { logAuthenticationEvent } = await import("./audit-logging.js");
    const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    
    // Log login attempt
    await logAuthenticationEvent({
      username: req.body.username,
      eventType: 'login_attempt',
      success: false, // Will update if successful
      ipAddress,
      userAgent,
      sessionId: req.sessionID
    });
    
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // Log failed login
        await logAuthenticationEvent({
          username: req.body.username,
          eventType: 'login_failure',
          success: false,
          failureReason: info?.message || 'Invalid username or password',
          ipAddress,
          userAgent,
          sessionId: req.sessionID
        });
        
        // Check if there's a specific error message (like email not verified)
        if (info?.message) {
          return res.status(401).json({ message: info.message });
        }
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }
        
        try {
          // Update the user's lastLogin timestamp
          await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          // Log successful login
          await logAuthenticationEvent({
            userId: user.id,
            username: user.username,
            email: user.email,
            healthSystemId: user.healthSystemId,
            eventType: 'login_success',
            success: true,
            ipAddress,
            userAgent,
            sessionId: req.sessionID
          });

          // After successful login, check if user has a remembered location
          if (user.role !== 'admin') {
            const rememberedLocation = await storage.getRememberedLocation(user.id);
            if (rememberedLocation && rememberedLocation.rememberSelection) {
              // Automatically restore the remembered location as active
              await storage.setUserSessionLocation(
                user.id, 
                rememberedLocation.locationId, 
                true // Keep it remembered
              );
            }
          }
          res.status(200).json(user);
        } catch (error) {
          console.error("Error during login process:", error);
          // Still return user even if location restore fails
          res.status(200).json(user);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.user) {
      const { logAuthenticationEvent } = await import("./audit-logging.js");
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      // Log logout event
      await logAuthenticationEvent({
        userId: req.user.id,
        username: req.user.username,
        email: req.user.email,
        healthSystemId: req.user.healthSystemId,
        eventType: 'logout',
        success: true,
        ipAddress,
        userAgent,
        sessionId: req.sessionID
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validate new password with evidence-based requirements
      if (!newPassword || newPassword.length < 12) {
        return res.status(400).json({ message: "New password must be at least 12 characters" });
      }

      // Check for common weak patterns
      const uniqueChars = new Set(newPassword).size;
      if (uniqueChars < 4) {
        return res.status(400).json({ message: "Password has too few unique characters. Please use more variety." });
      }

      // Check for common passwords (in production, use a larger list)
      const commonPasswords = ['password123', 'admin123', 'letmein123', 'welcome123', 'password12345'];
      if (commonPasswords.includes(newPassword.toLowerCase())) {
        return res.status(400).json({ message: "This password is too common. Please choose something unique." });
      }

      // Get user to verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Special case: If user has requirePasswordChange flag and they forgot their temporary password
      // Allow them to reset without knowing current password
      const bypassCurrentPassword = user.requirePasswordChange && currentPassword === 'BYPASS_REQUIRED_CHANGE_FORGOT_PASSWORD';
      
      if (!bypassCurrentPassword) {
        // Verify current password
        const isValidPassword = await comparePasswords(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear requirePasswordChange flag
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          requirePasswordChange: false
        })
        .where(eq(users.id, userId));

      // Log password change event
      const { logAuthenticationEvent } = await import("./audit-logging.js");
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      await logAuthenticationEvent({
        userId: user.id,
        username: user.username,
        email: user.email,
        healthSystemId: user.healthSystemId,
        eventType: 'password_change',
        success: true,
        ipAddress,
        userAgent,
        sessionId: req.sessionID
      });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // User preferences endpoints
  app.get("/api/user/preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const preferences = await storage.getUserNotePreferences(userId);
      res.json(preferences || {});
    } catch (error: any) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user/preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const updates = req.body;
      
      // Update or create user preferences
      const preferences = await storage.updateUserNotePreferences(userId, updates);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  // User profile update endpoint
  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const { firstName, lastName, email, credentials, npi } = req.body;
      
      // Validate email if it's being changed
      if (email && email !== req.user.email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser && existingEmailUser.id !== userId) {
          return res.status(400).json({ 
            message: "Email address is already in use",
            field: "email"
          });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        credentials,
        npi: npi && npi.trim() ? npi.trim() : null
      });
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Password change endpoint
  app.put("/api/user/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate request
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Both current and new passwords are required" 
        });
      }
      
      // Get user to verify current password
      const user = await storage.getUserByUsername(req.user.username);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ 
          message: "Current password is incorrect",
          field: "currentPassword"
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password in database
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
}
