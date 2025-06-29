/**
 * Billing Database Seeder
 * Seeds CPT codes, modifiers, and reference data for production billing system
 */

import { db } from "./db";
import { cptDatabase, cptModifiers } from "../shared/schema";
import { eq } from "drizzle-orm";

// Common CPT codes for outpatient EMR
const sampleCPTCodes = [
  // Evaluation & Management
  {
    code: "99201",
    description: "Office visit, new patient, straightforward, 10 minutes",
    category: "evaluation_management",
    baseRate: 75.00,
    workRvu: 0.48,
    practiceExpenseRvu: 0.78,
    malpracticeRvu: 0.04,
    totalRvu: 1.30,
    requiresModifier: false,
    allowedModifiers: ["-25", "-57"],
    isActive: true
  },
  {
    code: "99202",
    description: "Office visit, new patient, low complexity, 20 minutes",
    category: "evaluation_management",
    baseRate: 109.00,
    workRvu: 0.93,
    practiceExpenseRvu: 1.16,
    malpracticeRvu: 0.07,
    totalRvu: 2.16,
    requiresModifier: false,
    allowedModifiers: ["-25", "-57"],
    isActive: true
  },
  {
    code: "99203",
    description: "Office visit, new patient, moderate complexity, 30 minutes",
    category: "evaluation_management",
    baseRate: 148.00,
    workRvu: 1.60,
    practiceExpenseRvu: 1.51,
    malpracticeRvu: 0.10,
    totalRvu: 3.21,
    requiresModifier: false,
    allowedModifiers: ["-25", "-57"],
    isActive: true
  },
  {
    code: "99204",
    description: "Office visit, new patient, moderate complexity, 45 minutes",
    category: "evaluation_management",
    baseRate: 211.00,
    workRvu: 2.60,
    practiceExpenseRvu: 2.00,
    malpracticeRvu: 0.14,
    totalRvu: 4.74,
    requiresModifier: false,
    allowedModifiers: ["-25", "-57"],
    isActive: true
  },
  {
    code: "99205",
    description: "Office visit, new patient, high complexity, 60 minutes",
    category: "evaluation_management",
    baseRate: 281.00,
    workRvu: 3.50,
    practiceExpenseRvu: 2.56,
    malpracticeRvu: 0.19,
    totalRvu: 6.25,
    requiresModifier: false,
    allowedModifiers: ["-25", "-57"],
    isActive: true
  },
  {
    code: "99211",
    description: "Office visit, established patient, minimal, 5 minutes",
    category: "evaluation_management",
    baseRate: 45.00,
    workRvu: 0.18,
    practiceExpenseRvu: 0.53,
    malpracticeRvu: 0.02,
    totalRvu: 0.73,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  {
    code: "99212",
    description: "Office visit, established patient, straightforward, 10 minutes",
    category: "evaluation_management",
    baseRate: 76.00,
    workRvu: 0.48,
    practiceExpenseRvu: 0.78,
    malpracticeRvu: 0.04,
    totalRvu: 1.30,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  {
    code: "99213",
    description: "Office visit, established patient, low complexity, 15 minutes",
    category: "evaluation_management",
    baseRate: 110.00,
    workRvu: 0.97,
    practiceExpenseRvu: 1.16,
    malpracticeRvu: 0.07,
    totalRvu: 2.20,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  {
    code: "99214",
    description: "Office visit, established patient, moderate complexity, 25 minutes",
    category: "evaluation_management",
    baseRate: 148.00,
    workRvu: 1.50,
    practiceExpenseRvu: 1.51,
    malpracticeRvu: 0.10,
    totalRvu: 3.11,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  {
    code: "99215",
    description: "Office visit, established patient, high complexity, 40 minutes",
    category: "evaluation_management",
    baseRate: 197.00,
    workRvu: 2.11,
    practiceExpenseRvu: 1.95,
    malpracticeRvu: 0.14,
    totalRvu: 4.20,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  // Procedures
  {
    code: "11055",
    description: "Paring or cutting of benign hyperkeratotic lesion",
    category: "dermatology",
    baseRate: 65.00,
    workRvu: 0.61,
    practiceExpenseRvu: 0.43,
    malpracticeRvu: 0.03,
    totalRvu: 1.07,
    requiresModifier: false,
    allowedModifiers: ["-25", "-59", "-RT", "-LT"],
    isActive: true
  },
  {
    code: "12001",
    description: "Simple repair of superficial wounds 2.5 cm or less",
    category: "surgery",
    baseRate: 118.00,
    workRvu: 1.09,
    practiceExpenseRvu: 1.25,
    malpracticeRvu: 0.09,
    totalRvu: 2.43,
    requiresModifier: false,
    allowedModifiers: ["-25", "-59", "-RT", "-LT"],
    isActive: true
  },
  {
    code: "17000",
    description: "Destruction (eg, laser surgery, electrosurgery, cryosurgery) premalignant lesions",
    category: "dermatology",
    baseRate: 89.00,
    workRvu: 0.75,
    practiceExpenseRvu: 0.98,
    malpracticeRvu: 0.06,
    totalRvu: 1.79,
    requiresModifier: false,
    allowedModifiers: ["-25", "-59", "-RT", "-LT"],
    isActive: true
  },
  // Preventive Medicine
  {
    code: "99396",
    description: "Preventive visit, established patient, 40-64 years",
    category: "preventive",
    baseRate: 230.00,
    workRvu: 2.18,
    practiceExpenseRvu: 1.84,
    malpracticeRvu: 0.13,
    totalRvu: 4.15,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  },
  {
    code: "99397",
    description: "Preventive visit, established patient, 65 years and older",
    category: "preventive",
    baseRate: 230.00,
    workRvu: 2.18,
    practiceExpenseRvu: 1.84,
    malpracticeRvu: 0.13,
    totalRvu: 4.15,
    requiresModifier: false,
    allowedModifiers: ["-25"],
    isActive: true
  }
];

// Common CPT modifiers
const sampleModifiers = [
  {
    modifier: "-25",
    description: "Significant, separately identifiable evaluation and management service",
    category: "evaluation_management",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: true,
    isActive: true
  },
  {
    modifier: "-59",
    description: "Distinct procedural service",
    category: "procedure",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: true,
    isActive: true
  },
  {
    modifier: "-RT",
    description: "Right side",
    category: "anatomical",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: false,
    isActive: true
  },
  {
    modifier: "-LT",
    description: "Left side",
    category: "anatomical",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: false,
    isActive: true
  },
  {
    modifier: "-50",
    description: "Bilateral procedure",
    category: "anatomical",
    reimbursementAdjustment: 1.5,
    requiresDocumentation: false,
    isActive: true
  },
  {
    modifier: "-22",
    description: "Increased procedural services",
    category: "procedure",
    reimbursementAdjustment: 1.2,
    requiresDocumentation: true,
    isActive: true
  },
  {
    modifier: "-57",
    description: "Decision for surgery",
    category: "evaluation_management",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: true,
    isActive: true
  },
  {
    modifier: "-TC",
    description: "Technical component",
    category: "radiology",
    reimbursementAdjustment: 0.6,
    requiresDocumentation: false,
    isActive: true
  },
  {
    modifier: "-26",
    description: "Professional component",
    category: "radiology",
    reimbursementAdjustment: 0.4,
    requiresDocumentation: false,
    isActive: true
  },
  {
    modifier: "-XE",
    description: "Separate encounter, a service that is distinct because it occurred during a separate encounter",
    category: "procedure",
    reimbursementAdjustment: 1.0,
    requiresDocumentation: true,
    isActive: true
  }
];

export async function seedBillingData() {
  console.log('🏥 [Billing Seeder] Starting to seed billing data...');

  try {
    // Check if data already exists
    const existingCPT = await db.select().from(cptDatabase).limit(1);
    const existingModifiers = await db.select().from(cptModifiers).limit(1);

    if (existingCPT.length > 0) {
      console.log('🏥 [Billing Seeder] CPT codes already exist, skipping seeding');
      return;
    }

    // Seed CPT codes
    console.log('🏥 [Billing Seeder] Seeding CPT codes...');
    await db.insert(cptDatabase).values(sampleCPTCodes);
    console.log(`🏥 [Billing Seeder] Successfully seeded ${sampleCPTCodes.length} CPT codes`);

    // Seed modifiers if they don't exist
    if (existingModifiers.length === 0) {
      console.log('🏥 [Billing Seeder] Seeding modifiers...');
      await db.insert(cptModifiers).values(sampleModifiers);
      console.log(`🏥 [Billing Seeder] Successfully seeded ${sampleModifiers.length} modifiers`);
    }

    console.log('✅ [Billing Seeder] Billing data seeding completed successfully');

  } catch (error) {
    console.error('❌ [Billing Seeder] Error seeding billing data:', error);
    throw error;
  }
}

export async function clearBillingData() {
  console.log('🗑️ [Billing Seeder] Clearing existing billing data...');

  try {
    await db.delete(cptDatabase);
    await db.delete(cptModifiers);
    console.log('✅ [Billing Seeder] Billing data cleared successfully');
  } catch (error) {
    console.error('❌ [Billing Seeder] Error clearing billing data:', error);
    throw error;
  }
}