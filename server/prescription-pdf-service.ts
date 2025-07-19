import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface PrescriptionData {
  prescriptionNumber: string;
  date: string;
  patient: {
    name: string;
    dateOfBirth: string;
    address: string;
  };
  prescriber: {
    name: string;
    npi?: string;
    licenseNumber?: string;
    address: string;
    deaNumber?: string;
    phone?: string;
  };
  pharmacy: {
    name: string;
    address: string;
    phone?: string;
    fax?: string;
  };
  medication: {
    name: string;
    strength?: string;
    form?: string;
    quantity: string;
    sig: string;
    refills: number;
    daysSupply: number;
    deaSchedule?: string;
    genericSubstitution: string;
  };
}

export class PrescriptionPdfService {
  /**
   * Generates a PDF prescription document
   */
  static generatePrescriptionPdf(data: PrescriptionData): Buffer {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Set font
    pdf.setFont('helvetica');

    // Add header - PRESCRIPTION
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRESCRIPTION', 105, 20, { align: 'center' });

    // Add a line under the header
    pdf.setLineWidth(0.5);
    pdf.line(20, 25, 190, 25);

    // Reset font for body
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Prescriber Information (Top Left)
    let yPos = 35;
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRESCRIBER INFORMATION', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(data.prescriber.name, 20, yPos);
    yPos += 5;
    pdf.text(data.prescriber.address, 20, yPos);
    yPos += 5;
    if (data.prescriber.phone) {
      pdf.text(`Phone: ${data.prescriber.phone}`, 20, yPos);
      yPos += 5;
    }
    if (data.prescriber.npi) {
      pdf.text(`NPI: ${data.prescriber.npi}`, 20, yPos);
      yPos += 5;
    }
    if (data.prescriber.licenseNumber) {
      pdf.text(`License: ${data.prescriber.licenseNumber}`, 20, yPos);
      yPos += 5;
    }
    if (data.prescriber.deaNumber && data.medication.deaSchedule) {
      pdf.text(`DEA: ${data.prescriber.deaNumber}`, 20, yPos);
    }

    // Date and Prescription Number (Top Right)
    yPos = 35;
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE', 140, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(format(new Date(data.date), 'MM/dd/yyyy'), 140, yPos);
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RX NUMBER', 140, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(data.prescriptionNumber, 140, yPos);

    // Patient Information
    yPos = 75;
    pdf.setFont('helvetica', 'bold');
    pdf.text('PATIENT INFORMATION', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(`Name: ${data.patient.name}`, 20, yPos);
    yPos += 5;
    pdf.text(`DOB: ${format(new Date(data.patient.dateOfBirth), 'MM/dd/yyyy')}`, 20, yPos);
    yPos += 5;
    pdf.text(`Address: ${data.patient.address}`, 20, yPos);

    // Pharmacy Information
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('PHARMACY', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
    pdf.text(data.pharmacy.name, 20, yPos);
    yPos += 5;
    pdf.text(data.pharmacy.address, 20, yPos);
    if (data.pharmacy.phone) {
      yPos += 5;
      pdf.text(`Phone: ${data.pharmacy.phone}`, 20, yPos);
    }

    // Prescription Details Box
    yPos += 15;
    pdf.setLineWidth(1);
    pdf.rect(20, yPos, 170, 60);
    
    // Prescription content
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    
    // Medication name and strength
    const medicationLine = data.medication.strength 
      ? `${data.medication.name} ${data.medication.strength}`
      : data.medication.name;
    
    pdf.text(medicationLine, 25, yPos);
    
    // Form if available
    if (data.medication.form) {
      yPos += 7;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Form: ${data.medication.form}`, 25, yPos);
    }

    // Quantity and days supply
    yPos += 10;
    pdf.setFontSize(11);
    pdf.text(`Quantity: ${data.medication.quantity}`, 25, yPos);
    pdf.text(`Days Supply: ${data.medication.daysSupply}`, 110, yPos);

    // Sig (directions)
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sig:', 25, yPos);
    pdf.setFont('helvetica', 'normal');
    const sigLines = pdf.splitTextToSize(data.medication.sig, 150);
    yPos += 5;
    sigLines.forEach((line: string) => {
      pdf.text(line, 30, yPos);
      yPos += 5;
    });

    // Refills
    yPos = 185;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Refills: ${data.medication.refills}`, 25, yPos);

    // Generic substitution
    pdf.text(data.medication.genericSubstitution, 110, yPos);

    // DEA Schedule warning if applicable
    if (data.medication.deaSchedule) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 0, 0); // Red color
      pdf.text(`CONTROLLED SUBSTANCE - ${data.medication.deaSchedule}`, 105, yPos, { align: 'center' });
      pdf.setTextColor(0, 0, 0); // Reset to black
    }

    // Signature line
    yPos = 220;
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, 90, yPos);
    yPos += 5;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Prescriber Signature', 55, yPos, { align: 'center' });

    // Electronic signature notice
    yPos += 10;
    pdf.setFontSize(8);
    pdf.text('This prescription was electronically signed and transmitted.', 105, yPos, { align: 'center' });

    // Footer - legal notice
    yPos = 260;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const notice = 'This is a legal prescription. Any alteration, forgery, or fraudulent use is punishable by law.';
    const noticeLines = pdf.splitTextToSize(notice, 170);
    noticeLines.forEach((line: string) => {
      pdf.text(line, 105, yPos, { align: 'center' });
      yPos += 4;
    });

    // Return as Buffer for faxing
    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Generates a simplified prescription for controlled substances
   */
  static generateControlledPrescriptionPdf(data: PrescriptionData): Buffer {
    // For controlled substances, some states require special formatting
    // This is a simplified version - actual requirements vary by state
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Add security pattern (watermark-like)
    pdf.setFontSize(60);
    pdf.setTextColor(240, 240, 240);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONTROLLED', 105, 150, { align: 'center', angle: 45 });
    pdf.setTextColor(0, 0, 0);

    // Continue with regular prescription format
    // (Same as above but with additional security features)
    // ... (rest of the PDF generation code)

    return Buffer.from(pdf.output('arraybuffer'));
  }
}