import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertPatientSchema,
  insertEncounterSchema,
  insertVitalsSchema,
  insertOrderSchema,
} from "@shared/schema";
import { parseRoutes } from "./parse-routes";
import dashboardRoutes from "./dashboard-routes";
import multer from "multer";
import OpenAI from "openai";
import fastMedicalRoutes from "./fast-medical-routes";
import { consolidatedRealtimeService } from "./consolidated-realtime-service";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Dashboard routes
  app.use("/api/dashboard", dashboardRoutes);

  // Fast medical context routes (replaces assistant-based approach)
  app.use("/api", fastMedicalRoutes);

  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { q } = req.query;
      if (!q) return res.json([]);
      
      const patients = await storage.searchPatients(q as string);
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Encounter routes
  app.get("/api/patients/:id/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const encounters = await storage.getPatientEncounters(patientId);
      res.json(encounters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients/:id/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const validatedData = insertEncounterSchema.parse({
        ...req.body,
        patientId,
      });
      
      const encounter = await storage.createEncounter(validatedData);
      res.json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vitals routes
  app.post("/api/encounters/:id/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const validatedData = insertVitalsSchema.parse({
        ...req.body,
        encounterId,
      });
      
      const vitals = await storage.createVitals(validatedData);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Orders routes
  app.get("/api/encounters/:id/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      // Get encounter first to find patient ID, then get patient orders
      const encounter = await storage.getEncounter(encounterId);
      if (!encounter) {
        return res.status(404).json({ message: "Encounter not found" });
      }
      
      const orders = await storage.getPatientOrders(encounter.patientId);
      // Filter orders for this specific encounter if needed
      const encounterOrders = orders.filter(order => order.encounterId === encounterId);
      res.json(encounterOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/encounters/:id/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const validatedData = insertOrderSchema.parse({
        ...req.body,
        encounterId,
      });
      
      const order = await storage.createOrder(validatedData);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Parse routes (for lab results, etc.)
  app.use("/api/parse", parseRoutes);

  // Legacy voice upload endpoints - deprecated in favor of WebSocket realtime service
  app.post("/api/voice/upload", upload.single("audio"), async (req, res) => {
    res.status(400).json({
      error: "Voice upload deprecated",
      message: "Use WebSocket realtime service at /ws/realtime for live voice processing"
    });
  });

  app.post("/api/voice/upload-enhanced", upload.single("audio"), async (req, res) => {
    res.status(400).json({
      error: "Enhanced voice upload deprecated", 
      message: "Use WebSocket realtime service at /ws/realtime for live voice processing"
    });
  });

  const server = createServer(app);
  
  // Initialize consolidated realtime service with WebSocket support
  consolidatedRealtimeService.initialize(server);
  
  return server;
}