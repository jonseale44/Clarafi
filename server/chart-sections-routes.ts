import { Router } from "express";
import { db } from "./db.js";
import { 
  medicalHistory, 
  medications, 
  allergies, 
  labOrders, 
  imagingOrders, 
  familyHistory, 
  socialHistory, 
  diagnoses,
  vitals,
  insertMedicalHistorySchema,
  insertMedicationSchema,
  insertAllergySchema,
  insertLabOrderSchema,
  insertImagingOrderSchema,
  insertFamilyHistorySchema,
  insertSocialHistorySchema,
  insertDiagnosisSchema,
  insertVitalsSchema
} from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Medical Problems (Section 2)
router.get("/patients/:id/medical-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const history = await db.select()
      .from(medicalHistory)
      .where(eq(medicalHistory.patientId, patientId))
      .orderBy(desc(medicalHistory.updatedAt));
    
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/medical-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertMedicalHistorySchema.parse({
      ...req.body,
      patientId
    });
    
    const [newHistory] = await db.insert(medicalHistory)
      .values(data)
      .returning();
    
    res.json(newHistory);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/medical-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(medicalHistory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(medicalHistory.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/medical-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(medicalHistory)
      .where(eq(medicalHistory.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Medications (Section 3)
router.get("/patients/:id/medications", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const meds = await db.select()
      .from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.createdAt));
    
    res.json(meds);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/medications", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertMedicationSchema.parse({
      ...req.body,
      patientId
    });
    
    const [newMed] = await db.insert(medications)
      .values(data)
      .returning();
    
    res.json(newMed);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/medications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(medications)
      .set(data)
      .where(eq(medications.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/medications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(medications)
      .where(eq(medications.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Allergies (Section 4)
router.get("/patients/:id/allergies", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const allergyList = await db.select()
      .from(allergies)
      .where(eq(allergies.patientId, patientId))
      .orderBy(desc(allergies.updatedAt));
    
    res.json(allergyList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/allergies", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertAllergySchema.parse({
      ...req.body,
      patientId
    });
    
    const [newAllergy] = await db.insert(allergies)
      .values(data)
      .returning();
    
    res.json(newAllergy);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/allergies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(allergies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(allergies.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/allergies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(allergies)
      .where(eq(allergies.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Labs (Section 5)
router.get("/patients/:id/lab-orders", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const labs = await db.select()
      .from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));
    
    res.json(labs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/lab-orders", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertLabOrderSchema.parse({
      ...req.body,
      patientId
    });
    
    const [newLab] = await db.insert(labOrders)
      .values(data)
      .returning();
    
    res.json(newLab);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/lab-orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(labOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(labOrders.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/lab-orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(labOrders)
      .where(eq(labOrders.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Vitals (Section 6)
router.get("/patients/:id/vitals", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const vitalsList = await db.select()
      .from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.measuredAt));
    
    res.json(vitalsList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/vitals", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertVitalsSchema.parse({
      ...req.body,
      patientId
    });
    
    const [newVitals] = await db.insert(vitals)
      .values(data)
      .returning();
    
    res.json(newVitals);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/vitals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(vitals)
      .set(data)
      .where(eq(vitals.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/vitals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vitals)
      .where(eq(vitals.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Imaging (Section 7)
router.get("/patients/:id/imaging-orders", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const imaging = await db.select()
      .from(imagingOrders)
      .where(eq(imagingOrders.patientId, patientId))
      .orderBy(desc(imagingOrders.orderedAt));
    
    res.json(imaging);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/imaging-orders", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertImagingOrderSchema.parse({
      ...req.body,
      patientId
    });
    
    const [newImaging] = await db.insert(imagingOrders)
      .values(data)
      .returning();
    
    res.json(newImaging);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/imaging-orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(imagingOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imagingOrders.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/imaging-orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(imagingOrders)
      .where(eq(imagingOrders.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Family History (Section 8)
router.get("/patients/:id/family-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const family = await db.select()
      .from(familyHistory)
      .where(eq(familyHistory.patientId, patientId))
      .orderBy(desc(familyHistory.updatedAt));
    
    res.json(family);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/family-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertFamilyHistorySchema.parse({
      ...req.body,
      patientId
    });
    
    const [newFamily] = await db.insert(familyHistory)
      .values(data)
      .returning();
    
    res.json(newFamily);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/family-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(familyHistory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyHistory.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/family-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(familyHistory)
      .where(eq(familyHistory.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Social History (Section 9)
router.get("/patients/:id/social-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const social = await db.select()
      .from(socialHistory)
      .where(eq(socialHistory.patientId, patientId))
      .orderBy(desc(socialHistory.updatedAt));
    
    res.json(social);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/social-history", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertSocialHistorySchema.parse({
      ...req.body,
      patientId
    });
    
    const [newSocial] = await db.insert(socialHistory)
      .values(data)
      .returning();
    
    res.json(newSocial);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/social-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(socialHistory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialHistory.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/social-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(socialHistory)
      .where(eq(socialHistory.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Diagnoses (Medical Problems continuation)
router.get("/patients/:id/diagnoses", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const diagList = await db.select()
      .from(diagnoses)
      .where(eq(diagnoses.patientId, patientId))
      .orderBy(desc(diagnoses.createdAt));
    
    res.json(diagList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/patients/:id/diagnoses", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const data = insertDiagnosisSchema.parse({
      ...req.body,
      patientId
    });
    
    const [newDiag] = await db.insert(diagnoses)
      .values(data)
      .returning();
    
    res.json(newDiag);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/diagnoses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    
    const [updated] = await db.update(diagnoses)
      .set(data)
      .where(eq(diagnoses.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/diagnoses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(diagnoses)
      .where(eq(diagnoses.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;