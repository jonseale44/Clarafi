import { Router, Request, Response } from "express";
import { MedicationStandardizationService } from "./medication-standardization-service.js";

const router = Router();

/**
 * POST /api/medications/standardize
 * Standardize medication input from user entry
 */
router.post("/standardize", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName, dosage, form, route } = req.body;

    if (!medicationName) {
      return res.status(400).json({ error: "Medication name is required" });
    }

    console.log(`🔧 [API] Standardizing medication: "${medicationName}", dosage: "${dosage}", form: "${form}"`);

    const standardized = MedicationStandardizationService.standardizeMedicationFromAI(
      medicationName,
      dosage,
      form,
      route
    );

    const validation = MedicationStandardizationService.validateMedication({
      ...standardized,
      sig: "placeholder", // Not validated in this endpoint
      quantity: 1, // Not validated in this endpoint
      refills: 0, // Not validated in this endpoint
      daysSupply: 1 // Not validated in this endpoint
    });

    console.log(`🔧 [API] Standardization result:`, standardized);
    console.log(`🔧 [API] Validation result:`, validation);

    res.json({
      ...standardized,
      validation,
      original: {
        medicationName,
        dosage,
        form,
        route
      }
    });

  } catch (error) {
    console.error("[API] Error standardizing medication:", error);
    res.status(500).json({ error: "Failed to standardize medication" });
  }
});

/**
 * POST /api/medications/validate
 * Validate complete medication order
 */
router.post("/validate", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const medicationData = req.body;

    console.log(`🔧 [API] Validating complete medication:`, medicationData);

    const validation = MedicationStandardizationService.validateMedication(medicationData);
    const formatted = MedicationStandardizationService.formatMedicationDisplay(medicationData);

    res.json({
      validation,
      formatted,
      medicationData
    });

  } catch (error) {
    console.error("[API] Error validating medication:", error);
    res.status(500).json({ error: "Failed to validate medication" });
  }
});

/**
 * GET /api/medications/common
 * Get list of commonly prescribed medications for autocomplete
 */
router.get("/common", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const commonMedications = [
      { name: "Amlodipine", category: "Cardiovascular", commonStrengths: ["2.5 mg", "5 mg", "10 mg"] },
      { name: "Atorvastatin", category: "Cardiovascular", commonStrengths: ["10 mg", "20 mg", "40 mg", "80 mg"] },
      { name: "Hydrochlorothiazide", category: "Cardiovascular", commonStrengths: ["12.5 mg", "25 mg", "50 mg"] },
      { name: "Lisinopril", category: "Cardiovascular", commonStrengths: ["2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg"] },
      { name: "Metformin", category: "Endocrine", commonStrengths: ["500 mg", "850 mg", "1000 mg"] },
      { name: "Montelukast", category: "Respiratory", commonStrengths: ["4 mg", "5 mg", "10 mg"] },
      { name: "Omeprazole", category: "Gastrointestinal", commonStrengths: ["10 mg", "20 mg", "40 mg"] },
      { name: "Simvastatin", category: "Cardiovascular", commonStrengths: ["5 mg", "10 mg", "20 mg", "40 mg", "80 mg"] },
      { name: "Levothyroxine", category: "Endocrine", commonStrengths: ["25 mcg", "50 mcg", "75 mcg", "100 mcg", "125 mcg", "150 mcg"] },
      { name: "Albuterol", category: "Respiratory", commonStrengths: ["90 mcg/actuation", "2.5 mg/3 mL"] }
    ];

    const query = req.query.q as string;
    let filteredMedications = commonMedications;

    if (query) {
      filteredMedications = commonMedications.filter(med => 
        med.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    res.json(filteredMedications);

  } catch (error) {
    console.error("[API] Error fetching common medications:", error);
    res.status(500).json({ error: "Failed to fetch common medications" });
  }
});

export default router;