import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
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
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
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

      // Import RegistrationService
      const { RegistrationService } = await import("./registration-service.js");

      // Prepare registration data with hashed password
      const registrationData = {
        ...req.body,
        password: await hashPassword(req.body.password),
        npi: req.body.npi && req.body.npi.trim() ? req.body.npi.trim() : null,
      };

      console.log("✅ [Registration] Creating new user:", registrationData.username);
      const user = await RegistrationService.registerUser(registrationData);

      req.login(user, (err) => {
        if (err) {
          console.error("❌ [Registration] Login error after creation:", err);
          return next(err);
        }
        console.log("✅ [Registration] User created and logged in successfully:", user.username);
        res.status(201).json(user);
      });

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
        }
      }
      
      // Generic error for other issues
      return res.status(500).json({ 
        message: "Registration failed. Please try again.",
        field: null
      });
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      // After successful login, check if user has a remembered location
      if (req.user && req.user.role !== 'admin') {
        const rememberedLocation = await storage.getRememberedLocation(req.user.id);
        if (rememberedLocation && rememberedLocation.rememberSelection) {
          // Automatically restore the remembered location as active
          await storage.setUserSessionLocation(
            req.user.id, 
            rememberedLocation.locationId, 
            true // Keep it remembered
          );
        }
      }
      res.status(200).json(req.user);
    } catch (error) {
      console.error("Error restoring remembered location:", error);
      // Still return user even if location restore fails
      res.status(200).json(req.user);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
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
}
