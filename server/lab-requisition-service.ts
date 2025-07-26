/**
 * Lab Requisition Service
 * Generates unique requisition numbers and tracks lab orders through the complete lifecycle
 */

import { db } from "./db.js";
import { labOrders, patients, users, locations, healthSystems, patientOrderPreferences } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import PDFKit from "pdfkit";
import QRCode from "qrcode";

export class LabRequisitionService {
  /**
   * Generate a unique requisition number for a lab order
   * Format: LAB-YYYY-MMDD-NNNN
   */
  static async generateRequisitionNumber(patientId: number): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get patient's health system
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient) {
      throw new Error(`Patient ${patientId} not found`);
    }
    
    // Get the next sequence number for today
    const todayPrefix = `LAB-${year}-${month}${day}-`;
    const [lastOrder] = await db
      .select()
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id))
      .where(
        and(
          eq(patients.healthSystemId, patient.healthSystemId),
          sql`${labOrders.requisitionNumber} LIKE ${todayPrefix + '%'}`
        )
      )
      .orderBy(sql`${labOrders.requisitionNumber} DESC`)
      .limit(1);
    
    let nextSequence = 1;
    if (lastOrder?.lab_orders?.requisitionNumber) {
      const lastSequence = parseInt(lastOrder.lab_orders.requisitionNumber.substring(14));
      nextSequence = lastSequence + 1;
    }
    
    return `${todayPrefix}${String(nextSequence).padStart(4, '0')}`;
  }

  /**
   * Generate a lab requisition PDF with barcode/QR code tracking
   */
  static async generateRequisitionPDF(labOrderId: number): Promise<Buffer> {
    // Fetch lab order with all related data
    const [labOrder] = await db
      .select({
        order: labOrders,
        patient: patients,
        provider: users,
        location: locations,
        healthSystem: healthSystems
      })
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id))
      .leftJoin(users, eq(labOrders.orderedBy, users.id))
      .leftJoin(locations, eq(patients.preferredLocationId, locations.id))
      .leftJoin(healthSystems, eq(patients.healthSystemId, healthSystems.id))
      .where(eq(labOrders.id, labOrderId));

    if (!labOrder) {
      throw new Error(`Lab order ${labOrderId} not found`);
    }

    const doc = new PDFKit({ size: 'LETTER' });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>(async (resolve, reject) => {
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      doc.on('error', reject);

      // Header with practice info
      doc.fontSize(16).font('Helvetica-Bold')
        .text(labOrder.healthSystem?.name || 'Medical Practice', 50, 50);
      
      if (labOrder.location) {
        doc.fontSize(10).font('Helvetica')
          .text(`${labOrder.location.address1}`, 50, 70)
          .text(`${labOrder.location.city}, ${labOrder.location.state} ${labOrder.location.zipCode}`, 50, 82)
          .text(`Phone: ${labOrder.location.phone || 'N/A'} | Fax: ${labOrder.location.fax || 'N/A'}`, 50, 94);
      }

      // Title
      doc.fontSize(20).font('Helvetica-Bold')
        .text('LAB REQUISITION', 50, 130, { align: 'center' });

      // Requisition number with barcode
      const requisitionNumber = labOrder.order.requisitionNumber || await this.generateRequisitionNumber(labOrder.order.patientId);
      
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Requisition #: ${requisitionNumber}`, 50, 160);

      // Generate QR code for tracking
      try {
        const qrCodeData = await QRCode.toDataURL(requisitionNumber);
        const qrBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
        doc.image(qrBuffer, 450, 140, { width: 100, height: 100 });
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }

      // Patient information
      doc.fontSize(14).font('Helvetica-Bold')
        .text('PATIENT INFORMATION', 50, 200);
      
      doc.fontSize(10).font('Helvetica')
        .text(`Name: ${labOrder.patient?.lastName}, ${labOrder.patient?.firstName}`, 50, 220)
        .text(`DOB: ${labOrder.patient?.dateOfBirth || 'N/A'}`, 300, 220)
        .text(`MRN: ${labOrder.patient?.mrn || 'N/A'}`, 50, 235)
        .text(`Sex: ${labOrder.patient?.sex || 'N/A'}`, 300, 235);

      // Provider information
      doc.fontSize(14).font('Helvetica-Bold')
        .text('ORDERING PROVIDER', 50, 260);
      
      doc.fontSize(10).font('Helvetica')
        .text(`${labOrder.provider?.firstName} ${labOrder.provider?.lastName}, ${labOrder.provider?.credentials || 'MD'}`, 50, 280)
        .text(`NPI: ${labOrder.provider?.npi || 'N/A'}`, 50, 295)
        .text(`Phone: ${labOrder.provider?.phone || 'N/A'}`, 300, 295);

      // Clinical information
      doc.fontSize(14).font('Helvetica-Bold')
        .text('CLINICAL INFORMATION', 50, 320);
      
      doc.fontSize(10).font('Helvetica')
        .text(`ICD-10 Codes: ${labOrder.order.icdCodes?.join(', ') || 'N/A'}`, 50, 340)
        .text(`Clinical Notes: ${labOrder.order.clinicalNotes || 'None'}`, 50, 355);

      // Tests ordered
      doc.fontSize(14).font('Helvetica-Bold')
        .text('TESTS ORDERED', 50, 390);
      
      // Parse tests from JSON array
      let yPosition = 410;
      const tests = labOrder.order.testsOrdered || [];
      
      tests.forEach((test: any, index: number) => {
        doc.fontSize(10).font('Helvetica')
          .text(`${index + 1}. ${test.name || test}`, 70, yPosition);
        if (test.loincCode) {
          doc.text(`   LOINC: ${test.loincCode}`, 90, yPosition + 12);
        }
        yPosition += test.loincCode ? 30 : 15;
      });

      // Specimen collection section
      doc.fontSize(14).font('Helvetica-Bold')
        .text('SPECIMEN COLLECTION', 50, yPosition + 20);
      
      yPosition += 40;
      doc.fontSize(10).font('Helvetica')
        .text('Date/Time Collected: _____________________', 50, yPosition)
        .text('Collected By: _____________________', 300, yPosition);
      
      // Footer with instructions
      doc.fontSize(8).font('Helvetica')
        .text('Please fax completed requisition with results to the ordering provider', 50, 700)
        .text(`Lab Use Only - Accession #: _____________________`, 50, 715);

      doc.end();
    });
  }

  /**
   * Update lab order with requisition number after signing
   */
  static async assignRequisitionNumber(labOrderId: number): Promise<string> {
    const [labOrder] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, labOrderId));

    if (!labOrder) {
      throw new Error(`Lab order ${labOrderId} not found`);
    }

    if (labOrder.requisitionNumber) {
      return labOrder.requisitionNumber;
    }

    const requisitionNumber = await this.generateRequisitionNumber(labOrder.patientId);
    
    await db
      .update(labOrders)
      .set({
        requisitionNumber,
        updatedAt: new Date()
      })
      .where(eq(labOrders.id, labOrderId));

    return requisitionNumber;
  }

  /**
   * Match incoming lab results to original order by requisition number
   */
  static async findOrderByRequisitionNumber(requisitionNumber: string): Promise<any> {
    const [labOrder] = await db
      .select({
        order: labOrders,
        patient: patients,
        provider: users
      })
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id))
      .leftJoin(users, eq(labOrders.orderedBy, users.id))
      .where(eq(labOrders.requisitionNumber, requisitionNumber));

    return labOrder;
  }
}