import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertEncounterSchema, insertVitalsSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

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
      
      const patient = await storage.getPatient(parseInt(req.params.id));
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      
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
      res.status(201).json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Encounter routes
  app.get("/api/patients/:patientId/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const encounters = await storage.getPatientEncounters(patientId);
      res.json(encounters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounter = await storage.getEncounter(parseInt(req.params.id));
      if (!encounter) return res.status(404).json({ message: "Encounter not found" });
      
      res.json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertEncounterSchema.parse(req.body);
      const encounter = await storage.createEncounter(validatedData);
      res.status(201).json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedEncounter = await storage.updateEncounter(encounterId, updates);
      res.json(updatedEncounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vitals routes
  app.get("/api/patients/:patientId/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getPatientVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/vitals/latest", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getLatestVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertVitalsSchema.parse(req.body);
      const vitals = await storage.createVitals(validatedData);
      res.status(201).json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient chart data routes
  app.get("/api/patients/:patientId/allergies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const allergies = await storage.getPatientAllergies(patientId);
      res.json(allergies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/medications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const medications = await storage.getPatientMedications(patientId);
      res.json(medications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/diagnoses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const diagnoses = await storage.getPatientDiagnoses(patientId);
      res.json(diagnoses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/family-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const familyHistory = await storage.getPatientFamilyHistory(patientId);
      res.json(familyHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/medical-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const medicalHistory = await storage.getPatientMedicalHistory(patientId);
      res.json(medicalHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/social-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const socialHistory = await storage.getPatientSocialHistory(patientId);
      res.json(socialHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/lab-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const labOrders = await storage.getPatientLabOrders(patientId);
      res.json(labOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/lab-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const labResults = await storage.getPatientLabResults(patientId);
      res.json(labResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/imaging-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const imagingOrders = await storage.getPatientImagingOrders(patientId);
      res.json(imagingOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/imaging-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const imagingResults = await storage.getPatientImagingResults(patientId);
      res.json(imagingResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}