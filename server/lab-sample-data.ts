/**
 * Laboratory Sample Data Generator
 * Creates realistic lab orders and results for demonstration
 */

import { db } from "./db.js";
import { labOrders, labResults, patients } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedLabData() {
  try {
    // Check if lab data already exists
    const existingResults = await db.select().from(labResults).limit(1);
    if (existingResults.length > 0) {
      console.log("Lab sample data already exists");
      return;
    }

    console.log("Creating laboratory sample data...");

    // Get existing patients
    const existingPatients = await db.select().from(patients);
    if (existingPatients.length === 0) {
      console.log("No patients found - please seed patient data first");
      return;
    }

    const patient = existingPatients[0]; // Use first patient

    // Create sample lab orders
    const labOrderSamples = [
      {
        patientId: patient.id,
        encounterId: 303, // Assuming encounter exists
        loincCode: "33747-0",
        testCode: "CBC",
        testName: "Complete Blood Count",
        testCategory: "hematology",
        priority: "routine",
        clinicalIndication: "Annual physical examination",
        orderedBy: 6, // Assuming provider exists
        specimenType: "whole_blood",
        fastingRequired: false,
        orderStatus: "completed",
        orderedAt: new Date("2024-12-15T10:00:00Z"),
        transmittedAt: new Date("2024-12-15T10:05:00Z"),
        acknowledgedAt: new Date("2024-12-15T10:10:00Z"),
        collectedAt: new Date("2024-12-15T11:00:00Z")
      },
      {
        patientId: patient.id,
        encounterId: 303,
        loincCode: "24323-8",
        testCode: "CMP",
        testName: "Comprehensive Metabolic Panel",
        testCategory: "chemistry",
        priority: "routine",
        clinicalIndication: "Annual physical examination",
        orderedBy: 6,
        specimenType: "serum",
        fastingRequired: true,
        fastingHours: 12,
        orderStatus: "completed",
        orderedAt: new Date("2024-12-15T10:00:00Z"),
        transmittedAt: new Date("2024-12-15T10:05:00Z"),
        acknowledgedAt: new Date("2024-12-15T10:10:00Z"),
        collectedAt: new Date("2024-12-15T11:00:00Z")
      },
      {
        patientId: patient.id,
        encounterId: 303,
        loincCode: "33747-0",
        testCode: "TSH",
        testName: "Thyroid Stimulating Hormone",
        testCategory: "endocrinology",
        priority: "routine",
        clinicalIndication: "Fatigue workup",
        orderedBy: 6,
        specimenType: "serum",
        fastingRequired: false,
        orderStatus: "completed",
        orderedAt: new Date("2024-12-10T14:00:00Z"),
        transmittedAt: new Date("2024-12-10T14:05:00Z"),
        acknowledgedAt: new Date("2024-12-10T14:10:00Z"),
        collectedAt: new Date("2024-12-10T15:00:00Z")
      }
    ];

    // Insert lab orders
    const insertedOrders = await db.insert(labOrders).values(labOrderSamples).returning();
    console.log(`Created ${insertedOrders.length} lab orders`);

    // Create sample lab results
    const labResultSamples = [
      // CBC Results
      {
        labOrderId: insertedOrders[0].id,
        patientId: patient.id,
        loincCode: "26515-7",
        testCode: "PLT",
        testName: "Platelet Count",
        testCategory: "hematology",
        resultValue: "275",
        resultNumeric: "275",
        resultUnits: "K/uL",
        referenceRange: "150-450",
        abnormalFlag: null,
        criticalFlag: false,
        resultStatus: "final",
        verificationStatus: "verified",
        specimenCollectedAt: new Date("2024-12-15T11:00:00Z"),
        resultAvailableAt: new Date("2024-12-15T16:30:00Z"),
        resultFinalizedAt: new Date("2024-12-15T16:45:00Z"),
        receivedAt: new Date("2024-12-15T16:30:00Z"),
      },
      {
        labOrderId: insertedOrders[0].id,
        patientId: patient.id,
        loincCode: "26515-7",
        testCode: "WBC",
        testName: "White Blood Cell Count",
        testCategory: "hematology",
        resultValue: "7.2",
        resultNumeric: "7.2",
        resultUnits: "K/uL",
        referenceRange: "4.0-11.0",
        abnormalFlag: null,
        criticalFlag: false,
        resultStatus: "final",
        verificationStatus: "verified",
        specimenCollectedAt: new Date("2024-12-15T11:00:00Z"),
        resultAvailableAt: new Date("2024-12-15T16:30:00Z"),
        resultFinalizedAt: new Date("2024-12-15T16:45:00Z"),
        receivedAt: new Date("2024-12-15T16:30:00Z"),
      },
      // CMP Results
      {
        labOrderId: insertedOrders[1].id,
        patientId: patient.id,
        loincCode: "2951-2",
        testCode: "GLU",
        testName: "Glucose",
        testCategory: "chemistry",
        resultValue: "95",
        resultNumeric: "95",
        resultUnits: "mg/dL",
        referenceRange: "70-99",
        abnormalFlag: null,
        criticalFlag: false,
        resultStatus: "final",
        verificationStatus: "verified",
        specimenCollectedAt: new Date("2024-12-15T11:00:00Z"),
        resultAvailableAt: new Date("2024-12-15T15:30:00Z"),
        resultFinalizedAt: new Date("2024-12-15T15:45:00Z"),
        receivedAt: new Date("2024-12-15T15:30:00Z"),
      },
      {
        labOrderId: insertedOrders[1].id,
        patientId: patient.id,
        loincCode: "2160-0",
        testCode: "CREAT",
        testName: "Creatinine",
        testCategory: "chemistry",
        resultValue: "1.1",
        resultNumeric: "1.1",
        resultUnits: "mg/dL",
        referenceRange: "0.7-1.2",
        abnormalFlag: null,
        criticalFlag: false,
        resultStatus: "final",
        verificationStatus: "verified",
        specimenCollectedAt: new Date("2024-12-15T11:00:00Z"),
        resultAvailableAt: new Date("2024-12-15T15:30:00Z"),
        resultFinalizedAt: new Date("2024-12-15T15:45:00Z"),
        receivedAt: new Date("2024-12-15T15:30:00Z"),
      },
      // TSH Result - slightly elevated
      {
        labOrderId: insertedOrders[2].id,
        patientId: patient.id,
        loincCode: "3016-3",
        testCode: "TSH",
        testName: "Thyroid Stimulating Hormone",
        testCategory: "endocrinology",
        resultValue: "6.2",
        resultNumeric: "6.2",
        resultUnits: "mIU/L",
        referenceRange: "0.4-4.0",
        abnormalFlag: "H",
        criticalFlag: false,
        resultStatus: "final",
        verificationStatus: "verified",
        specimenCollectedAt: new Date("2024-12-10T15:00:00Z"),
        resultAvailableAt: new Date("2024-12-11T09:30:00Z"),
        resultFinalizedAt: new Date("2024-12-11T09:45:00Z"),
        receivedAt: new Date("2024-12-11T09:30:00Z"),
      }
    ];

    // Insert lab results
    const insertedResults = await db.insert(labResults).values(labResultSamples).returning();
    console.log(`Created ${insertedResults.length} lab results`);

    console.log("Laboratory sample data created successfully!");
    return { orders: insertedOrders.length, results: insertedResults.length };

  } catch (error) {
    console.error("Error creating lab sample data:", error);
    throw error;
  }
}