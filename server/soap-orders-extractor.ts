/**
 * SOAP Orders Extractor
 * Automatically extracts and parses medical orders from SOAP note content
 * Supports medications, lab tests, imaging studies, and referrals
 */

import { InsertOrder } from "@shared/schema";

export class SOAPOrdersExtractor {
  /**
   * Extract all types of orders from SOAP note content
   * @param soapContent The complete SOAP note content
   * @param patientId Patient ID for the orders
   * @param encounterId Encounter ID for the orders
   * @returns Array of draft orders ready for database insertion
   */
  public extractOrders(soapContent: string, patientId: number, encounterId?: number): InsertOrder[] {
    const orders: InsertOrder[] = [];
    
    // Find the ORDERS section in the SOAP note
    const ordersSection = this.extractOrdersSection(soapContent);
    if (!ordersSection) {
      console.log('[SOAPExtractor] No ORDERS section found in SOAP note');
      return orders;
    }

    console.log('[SOAPExtractor] Found ORDERS section:', ordersSection.substring(0, 200));

    // Extract different types of orders
    const medications = this.extractMedications(ordersSection, patientId, encounterId);
    const labs = this.extractLabs(ordersSection, patientId, encounterId);
    const imaging = this.extractImaging(ordersSection, patientId, encounterId);
    const referrals = this.extractReferrals(ordersSection, patientId, encounterId);

    orders.push(...medications, ...labs, ...imaging, ...referrals);

    console.log(`[SOAPExtractor] Extracted ${orders.length} total orders: ${medications.length} medications, ${labs.length} labs, ${imaging.length} imaging, ${referrals.length} referrals`);
    
    return orders;
  }

  /**
   * Extract the ORDERS section from SOAP note content
   */
  private extractOrdersSection(soapContent: string): string | null {
    // Look for ORDERS section (case insensitive)
    const ordersMatch = soapContent.match(/\*\*ORDERS?:\*\*\s*([\s\S]*?)(?=\*\*[A-Z]+:|$)/i);
    if (ordersMatch) {
      return ordersMatch[1].trim();
    }

    // Alternative patterns
    const altMatch = soapContent.match(/(?:^|\n)\s*ORDERS?:\s*([\s\S]*?)(?=\n\s*[A-Z]+:|$)/im);
    if (altMatch) {
      return altMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract medication orders from the orders section
   */
  private extractMedications(ordersContent: string, patientId: number, encounterId?: number): InsertOrder[] {
    const medications: InsertOrder[] = [];
    
    // Look for medication subsection
    const medicationSection = this.extractSubsection(ordersContent, 'Medications');
    if (!medicationSection) return medications;

    // Split by medication entries - look for "Medication:" pattern
    const medicationBlocks = medicationSection.split(/(?=Medication:)/i).filter(block => block.trim());

    for (const block of medicationBlocks) {
      const medication = this.parseMedicationBlock(block, patientId, encounterId);
      if (medication) {
        medications.push(medication);
      }
    }

    return medications;
  }

  /**
   * Parse individual medication block
   */
  private parseMedicationBlock(block: string, patientId: number, encounterId?: number): InsertOrder | null {
    try {
      const medication: Partial<InsertOrder> = {
        patientId,
        encounterId,
        orderType: 'medication',
        orderStatus: 'draft'
      };

      // Extract medication name
      const nameMatch = block.match(/Medication:\s*([^\n]+)/i);
      if (nameMatch) {
        medication.medicationName = nameMatch[1].trim();
      }

      // Extract dosage/strength from medication name
      const dosageMatch = medication.medicationName?.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mEq|units?))/i);
      if (dosageMatch) {
        medication.dosage = dosageMatch[1];
      }

      // Extract sig (instructions)
      const sigMatch = block.match(/Sig:\s*([^\n]+)/i);
      if (sigMatch) {
        medication.sig = sigMatch[1].trim();
      }

      // Extract dispense quantity
      const dispenseMatch = block.match(/Dispense:\s*([^\n]+)/i);
      if (dispenseMatch) {
        const dispenseText = dispenseMatch[1].trim();
        const quantityMatch = dispenseText.match(/(\d+)/);
        if (quantityMatch) {
          medication.quantity = parseInt(quantityMatch[1]);
        }
        
        // Extract form from dispense text
        const formMatch = dispenseText.match(/(tablet|capsule|inhaler|bottle|tube|patch|injection)s?/i);
        if (formMatch) {
          medication.form = formMatch[1].toLowerCase();
        }
      }

      // Extract refills
      const refillsMatch = block.match(/Refills:\s*(\d+)/i);
      if (refillsMatch) {
        medication.refills = parseInt(refillsMatch[1]);
      }

      // Set defaults
      medication.form = medication.form || 'tablet';
      medication.quantity = medication.quantity || 30;
      medication.refills = medication.refills || 0;

      // Create provider notes
      medication.providerNotes = this.formatMedicationNotes(medication);

      return medication as InsertOrder;
    } catch (error) {
      console.error('[SOAPExtractor] Error parsing medication block:', error);
      return null;
    }
  }

  /**
   * Extract lab orders from the orders section
   */
  private extractLabs(ordersContent: string, patientId: number, encounterId?: number): InsertOrder[] {
    const labs: InsertOrder[] = [];
    
    const labSection = this.extractSubsection(ordersContent, 'Labs');
    if (!labSection) return labs;

    // Split by common lab separators
    const labTests = labSection.split(/[,;]|\band\b/).map(test => test.trim()).filter(test => test);

    for (const testName of labTests) {
      if (testName.length > 2) { // Avoid single characters
        const lab: InsertOrder = {
          patientId,
          encounterId,
          orderType: 'lab',
          orderStatus: 'draft',
          testName: testName.trim(),
          labName: testName.trim(),
          priority: 'routine',
          providerNotes: `Lab order: ${testName.trim()}`
        };
        labs.push(lab);
      }
    }

    return labs;
  }

  /**
   * Extract imaging orders from the orders section
   */
  private extractImaging(ordersContent: string, patientId: number, encounterId?: number): InsertOrder[] {
    const imaging: InsertOrder[] = [];
    
    const imagingSection = this.extractSubsection(ordersContent, 'Imaging');
    if (!imagingSection) return imaging;

    // Look for imaging studies
    const imagingStudies = imagingSection.split(/[,;]|\band\b/).map(study => study.trim()).filter(study => study);

    for (const studyText of imagingStudies) {
      if (studyText.length > 3) {
        const study = this.parseImagingStudy(studyText, patientId, encounterId);
        if (study) {
          imaging.push(study);
        }
      }
    }

    return imaging;
  }

  /**
   * Parse individual imaging study
   */
  private parseImagingStudy(studyText: string, patientId: number, encounterId?: number): InsertOrder | null {
    const study: Partial<InsertOrder> = {
      patientId,
      encounterId,
      orderType: 'imaging',
      orderStatus: 'draft'
    };

    // Determine study type
    const lowerText = studyText.toLowerCase();
    if (lowerText.includes('x-ray') || lowerText.includes('xray')) {
      study.studyType = 'X-ray';
    } else if (lowerText.includes('ct') || lowerText.includes('cat scan')) {
      study.studyType = 'CT';
    } else if (lowerText.includes('mri')) {
      study.studyType = 'MRI';
    } else if (lowerText.includes('ultrasound') || lowerText.includes('us ')) {
      study.studyType = 'Ultrasound';
    } else {
      study.studyType = 'Imaging';
    }

    // Extract region/body part
    const bodyParts = ['chest', 'abdomen', 'head', 'brain', 'spine', 'knee', 'shoulder', 'ankle', 'wrist', 'pelvis', 'hip'];
    for (const part of bodyParts) {
      if (lowerText.includes(part)) {
        study.region = part;
        break;
      }
    }

    study.providerNotes = `${study.studyType} ${study.region || 'study'}: ${studyText}`;
    
    return study as InsertOrder;
  }

  /**
   * Extract referral orders from the orders section
   */
  private extractReferrals(ordersContent: string, patientId: number, encounterId?: number): InsertOrder[] {
    const referrals: InsertOrder[] = [];
    
    const referralSection = this.extractSubsection(ordersContent, 'Referrals');
    if (!referralSection) return referrals;

    const referralLines = referralSection.split('\n').map(line => line.trim()).filter(line => line);

    for (const referralText of referralLines) {
      if (referralText.length > 5) {
        const referral: InsertOrder = {
          patientId,
          encounterId,
          orderType: 'referral',
          orderStatus: 'draft',
          specialtyType: this.extractSpecialty(referralText),
          providerNotes: referralText,
          urgency: 'routine'
        };
        referrals.push(referral);
      }
    }

    return referrals;
  }

  /**
   * Extract a specific subsection from orders content
   */
  private extractSubsection(content: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}:\\s*(.*?)(?=\\n\\s*[A-Z][a-z]+:|$)`, 'is');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract specialty from referral text
   */
  private extractSpecialty(referralText: string): string {
    const specialties = {
      'cardiolog': 'Cardiology',
      'dermatolog': 'Dermatology',
      'endocrinolog': 'Endocrinology',
      'gastroenterolog': 'Gastroenterology',
      'neurolog': 'Neurology',
      'orthoped': 'Orthopedics',
      'pulmonolog': 'Pulmonology',
      'psychiatr': 'Psychiatry',
      'urology': 'Urology',
      'oncolog': 'Oncology'
    };

    const lowerText = referralText.toLowerCase();
    for (const [key, specialty] of Object.entries(specialties)) {
      if (lowerText.includes(key)) {
        return specialty;
      }
    }

    return 'Specialist';
  }

  /**
   * Format medication provider notes
   */
  private formatMedicationNotes(medication: Partial<InsertOrder>): string {
    const parts = [];
    
    if (medication.medicationName) parts.push(`Medication: ${medication.medicationName}`);
    if (medication.dosage) parts.push(`Dosage: ${medication.dosage}`);
    if (medication.sig) parts.push(`Sig: ${medication.sig}`);
    if (medication.quantity) parts.push(`Quantity: ${medication.quantity}`);
    if (medication.refills !== undefined) parts.push(`Refills: ${medication.refills}`);
    
    return parts.join('\n');
  }
}