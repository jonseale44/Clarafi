import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { db } from './db.js';
import { patients, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface Order {
  id: number;
  patientId: number;
  orderType: string;
  priority?: string;
  clinicalIndication?: string;
  
  // Medication fields
  medicationName?: string;
  dosage?: string;
  sig?: string;
  quantity?: number;
  refills?: number;
  daysSupply?: number;
  diagnosisCode?: string;
  
  // Lab fields
  testName?: string;
  labName?: string;
  specimenType?: string;
  fastingRequired?: boolean;
  
  // Imaging fields
  studyType?: string;
  region?: string;
  laterality?: string;
  contrastNeeded?: boolean;
  
  // Provider info
  orderedBy?: number;
  orderedAt?: string;
}

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  mrn: string;
  contactNumber?: string;
  address?: string;
}

interface Provider {
  id: number;
  firstName: string;
  lastName: string;
  credentials?: string;
  npi?: string;
}

export class PDFGenerationService {
  private browser: any = null;

  async initBrowser() {
    console.log(`📄 [PDFGen] ===== BROWSER INITIALIZATION START =====`);
    console.log(`📄 [PDFGen] Checking browser instance...`);
    
    if (!this.browser) {
      try {
        console.log(`📄 [PDFGen] 🚀 Launching new Puppeteer browser instance...`);
        console.log(`📄 [PDFGen] Browser args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security', '--single-process']`);
        
        // Configure environment for Replit
        process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
        process.env.DISPLAY = ':99';
        
        const replicaArgs = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-features=TranslateUI',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-client-side-phishing-detection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-component-extensions-with-background-pages',
          '--single-process',
          '--no-zygote'
        ];

        console.log(`📄 [PDFGen] Attempting Replit-optimized browser launch...`);
        
        try {
          // Try with system Chromium first (most stable in Replit)
          const systemChromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser';
          console.log(`📄 [PDFGen] Attempting system Chromium at: ${systemChromiumPath}`);
          
          this.browser = await puppeteer.launch({
            headless: true,
            executablePath: systemChromiumPath,
            args: replicaArgs,
            timeout: 30000,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
          });
          console.log(`📄 [PDFGen] ✅ Successfully launched with system Chromium`);
        } catch (systemError) {
          console.error(`📄 [PDFGen] System Chromium failed:`, systemError.message);
          
          try {
            // Fallback to bundled Chromium
            console.log(`📄 [PDFGen] Falling back to bundled Chromium...`);
            this.browser = await puppeteer.launch({
              headless: true,
              args: replicaArgs,
              timeout: 30000,
              handleSIGINT: false,
              handleSIGTERM: false,
              handleSIGHUP: false
            });
            console.log(`📄 [PDFGen] ✅ Successfully launched with bundled Chromium`);
          } catch (bundledError) {
            console.error(`📄 [PDFGen] Bundled Chromium failed:`, bundledError.message);
            
            // Final fallback with minimal configuration
            console.log(`📄 [PDFGen] Attempting minimal configuration fallback...`);
            this.browser = await puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
              timeout: 30000,
              handleSIGINT: false,
              handleSIGTERM: false,
              handleSIGHUP: false
            });
            console.log(`📄 [PDFGen] ✅ Successfully launched with minimal configuration`);
          }
        }
        
        console.log(`📄 [PDFGen] ✅ Browser launched successfully`);
        console.log(`📄 [PDFGen] Browser process PID:`, this.browser.process()?.pid || 'N/A');
        console.log(`📄 [PDFGen] Browser version:`, await this.browser.version());
        console.log(`📄 [PDFGen] ===== BROWSER INITIALIZATION COMPLETE =====`);
      } catch (error) {
        console.error(`❌ [PDFGen] ===== BROWSER INITIALIZATION FAILED =====`);
        console.error(`❌ [PDFGen] Error launching Puppeteer:`, error);
        console.error(`❌ [PDFGen] Error name:`, error.name);
        console.error(`❌ [PDFGen] Error message:`, error.message);
        console.error(`❌ [PDFGen] Error stack:`, error.stack);
        console.error(`❌ [PDFGen] Error code:`, error.code);
        throw error;
      }
    } else {
      console.log(`📄 [PDFGen] ✅ Using existing browser instance`);
      console.log(`📄 [PDFGen] Browser connected:`, this.browser.isConnected());
    }
    
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateMedicationPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFGen] ===== MEDICATION PDF GENERATION START =====`);
    console.log(`📄 [PDFGen] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    console.log(`📄 [PDFGen] Orders received:`, JSON.stringify(orders, null, 2));
    
    try {
      const patient = await this.getPatientInfo(patientId);
      console.log(`📄 [PDFGen] Patient info retrieved:`, JSON.stringify(patient, null, 2));
      
      const provider = await this.getProviderInfo(providerId);
      console.log(`📄 [PDFGen] Provider info retrieved:`, JSON.stringify(provider, null, 2));
      
      const medicationOrders = orders.filter(o => o.orderType === 'medication');
      console.log(`📄 [PDFGen] Filtered medication orders:`, JSON.stringify(medicationOrders, null, 2));
      
      const template = this.getMedicationTemplate();
      const compiledTemplate = Handlebars.compile(template);
      
      const templateData = {
        patient,
        provider,
        orders: medicationOrders,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };
      console.log(`📄 [PDFGen] Template data:`, JSON.stringify(templateData, null, 2));
      
      const html = compiledTemplate(templateData);
      console.log(`📄 [PDFGen] Generated HTML length: ${html.length} characters`);
      console.log(`📄 [PDFGen] HTML preview (first 500 chars):`, html.substring(0, 500));

      const pdfBuffer = await this.generatePDFFromHTML(html);
      console.log(`📄 [PDFGen] PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`);
      console.log(`📄 [PDFGen] ===== MEDICATION PDF GENERATION COMPLETE =====`);
      
      return pdfBuffer;
    } catch (error) {
      console.error(`❌ [PDFGen] MEDICATION PDF GENERATION FAILED:`, error);
      console.error(`❌ [PDFGen] Error stack:`, error.stack);
      throw error;
    }
  }

  async generateLabPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFGen] ===== LAB PDF GENERATION START =====`);
    console.log(`📄 [PDFGen] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    console.log(`📄 [PDFGen] Orders received:`, JSON.stringify(orders, null, 2));
    
    try {
      const patient = await this.getPatientInfo(patientId);
      console.log(`📄 [PDFGen] Patient info retrieved:`, JSON.stringify(patient, null, 2));
      
      const provider = await this.getProviderInfo(providerId);
      console.log(`📄 [PDFGen] Provider info retrieved:`, JSON.stringify(provider, null, 2));
      
      const labOrders = orders.filter(o => o.orderType === 'lab');
      console.log(`📄 [PDFGen] Filtered lab orders:`, JSON.stringify(labOrders, null, 2));
      
      const template = this.getLabTemplate();
      const compiledTemplate = Handlebars.compile(template);
      
      const templateData = {
        patient,
        provider,
        orders: labOrders,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };
      console.log(`📄 [PDFGen] Template data:`, JSON.stringify(templateData, null, 2));
      
      const html = compiledTemplate(templateData);
      console.log(`📄 [PDFGen] Generated HTML length: ${html.length} characters`);
      console.log(`📄 [PDFGen] HTML preview (first 500 chars):`, html.substring(0, 500));

      const pdfBuffer = await this.generatePDFFromHTML(html);
      console.log(`📄 [PDFGen] PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`);
      console.log(`📄 [PDFGen] ===== LAB PDF GENERATION COMPLETE =====`);
      
      return pdfBuffer;
    } catch (error) {
      console.error(`❌ [PDFGen] LAB PDF GENERATION FAILED:`, error);
      console.error(`❌ [PDFGen] Error stack:`, error.stack);
      throw error;
    }
  }

  async generateImagingPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFGen] ===== IMAGING PDF GENERATION START =====`);
    console.log(`📄 [PDFGen] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    console.log(`📄 [PDFGen] Orders received:`, JSON.stringify(orders, null, 2));
    
    try {
      const patient = await this.getPatientInfo(patientId);
      console.log(`📄 [PDFGen] Patient info retrieved:`, JSON.stringify(patient, null, 2));
      
      const provider = await this.getProviderInfo(providerId);
      console.log(`📄 [PDFGen] Provider info retrieved:`, JSON.stringify(provider, null, 2));
      
      const imagingOrders = orders.filter(o => o.orderType === 'imaging');
      console.log(`📄 [PDFGen] Filtered imaging orders:`, JSON.stringify(imagingOrders, null, 2));
      
      const template = this.getImagingTemplate();
      const compiledTemplate = Handlebars.compile(template);
      
      const templateData = {
        patient,
        provider,
        orders: imagingOrders,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };
      console.log(`📄 [PDFGen] Template data:`, JSON.stringify(templateData, null, 2));
      
      const html = compiledTemplate(templateData);
      console.log(`📄 [PDFGen] Generated HTML length: ${html.length} characters`);
      console.log(`📄 [PDFGen] HTML preview (first 500 chars):`, html.substring(0, 500));

      const pdfBuffer = await this.generatePDFFromHTML(html);
      console.log(`📄 [PDFGen] PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`);
      console.log(`📄 [PDFGen] ===== IMAGING PDF GENERATION COMPLETE =====`);
      
      return pdfBuffer;
    } catch (error) {
      console.error(`❌ [PDFGen] IMAGING PDF GENERATION FAILED:`, error);
      console.error(`❌ [PDFGen] Error stack:`, error.stack);
      throw error;
    }
  }

  private async generatePDFFromHTML(html: string): Promise<Buffer> {
    console.log(`📄 [PDFGen] ===== PDF FROM HTML GENERATION START =====`);
    
    try {
      console.log(`📄 [PDFGen] Initializing browser...`);
      const browser = await this.initBrowser();
      console.log(`📄 [PDFGen] Browser initialized successfully`);
      
      console.log(`📄 [PDFGen] Creating new page...`);
      const page = await browser.newPage();
      console.log(`📄 [PDFGen] Page created successfully`);
      
      // Set page timeouts
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
      
      console.log(`📄 [PDFGen] Setting content... HTML length: ${html.length}`);
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      console.log(`📄 [PDFGen] Content set successfully`);
      
      console.log(`📄 [PDFGen] Generating PDF...`);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        timeout: 30000,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      console.log(`📄 [PDFGen] PDF generated, size: ${pdf.length} bytes`);
      
      console.log(`📄 [PDFGen] Closing page...`);
      await page.close();
      console.log(`📄 [PDFGen] Page closed successfully`);
      console.log(`📄 [PDFGen] ===== PDF FROM HTML GENERATION COMPLETE =====`);
      
      return pdf;
    } catch (error) {
      console.error(`❌ [PDFGen] PDF FROM HTML GENERATION FAILED:`, error);
      console.error(`❌ [PDFGen] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  private async getPatientInfo(patientId: number): Promise<Patient> {
    const result = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    return result[0];
  }

  private async getProviderInfo(providerId: number): Promise<Provider> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, providerId))
      .limit(1);
    
    return result[0];
  }

  private getMedicationTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prescription</title>
    <style>
        body { 
            font-family: 'Times New Roman', serif; 
            margin: 0; 
            padding: 20px; 
            font-size: 12pt;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        .clinic-name { 
            font-size: 18pt; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .provider-info { 
            font-size: 10pt; 
            margin-bottom: 20px; 
        }
        .patient-info { 
            margin-bottom: 20px; 
            border: 1px solid #ccc; 
            padding: 10px; 
        }
        .prescription { 
            margin-bottom: 15px; 
            padding: 10px; 
            border-left: 3px solid #007bff; 
        }
        .rx-symbol { 
            font-size: 18pt; 
            font-weight: bold; 
            color: #007bff; 
        }
        .medication-name { 
            font-size: 14pt; 
            font-weight: bold; 
            margin: 5px 0; 
        }
        .sig { 
            font-style: italic; 
            margin: 5px 0; 
        }
        .footer { 
            position: fixed; 
            bottom: 20px; 
            right: 20px; 
            font-size: 8pt; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="clinic-name">Medical Practice</div>
        <div>{{provider.firstName}} {{provider.lastName}}, {{provider.credentials}}</div>
        {{#if provider.npi}}<div>NPI: {{provider.npi}}</div>{{/if}}
    </div>

    <div class="patient-info">
        <strong>Patient:</strong> {{patient.firstName}} {{patient.lastName}}<br>
        <strong>DOB:</strong> {{patient.dateOfBirth}}<br>
        <strong>MRN:</strong> {{patient.mrn}}<br>
        {{#if patient.address}}<strong>Address:</strong> {{patient.address}}<br>{{/if}}
    </div>

    {{#each orders}}
    <div class="prescription">
        <span class="rx-symbol">℞</span>
        <div class="medication-name">{{medicationName}} {{dosage}}</div>
        <div class="sig">Sig: {{sig}}</div>
        <div><strong>Quantity:</strong> {{quantity}} {{#if daysSupply}}({{daysSupply}} day supply){{/if}}</div>
        <div><strong>Refills:</strong> {{refills}}</div>
        {{#if diagnosisCode}}<div><strong>Diagnosis:</strong> {{diagnosisCode}}</div>{{/if}}
        {{#if clinicalIndication}}<div><strong>Indication:</strong> {{clinicalIndication}}</div>{{/if}}
    </div>
    {{/each}}

    <div style="margin-top: 40px;">
        <div>Provider Signature: _________________________</div>
        <div style="margin-top: 10px;">Date: {{generatedDate}}</div>
    </div>

    <div class="footer">
        Generated on {{generatedDate}} at {{generatedTime}}
    </div>
</body>
</html>
    `;
  }

  private getLabTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laboratory Requisition</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            font-size: 11pt;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        .patient-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
            border: 1px solid #000; 
            padding: 10px; 
        }
        .order-item { 
            margin-bottom: 10px; 
            padding: 8px; 
            border: 1px solid #ddd; 
        }
        .test-name { 
            font-weight: bold; 
            font-size: 12pt; 
        }
        .priority-urgent { 
            color: red; 
            font-weight: bold; 
        }
        .priority-stat { 
            color: red; 
            font-weight: bold; 
            text-decoration: underline; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>LABORATORY REQUISITION</h2>
        <div>{{provider.firstName}} {{provider.lastName}}, {{provider.credentials}}</div>
    </div>

    <div class="patient-info">
        <div>
            <strong>Patient Name:</strong> {{patient.firstName}} {{patient.lastName}}<br>
            <strong>DOB:</strong> {{patient.dateOfBirth}}<br>
            <strong>Gender:</strong> {{patient.gender}}
        </div>
        <div>
            <strong>MRN:</strong> {{patient.mrn}}<br>
            <strong>Date:</strong> {{generatedDate}}<br>
            {{#if patient.contactNumber}}<strong>Phone:</strong> {{patient.contactNumber}}{{/if}}
        </div>
    </div>

    <h3>TESTS ORDERED:</h3>
    {{#each orders}}
    <div class="order-item">
        <div class="test-name">
            {{testName}}
            {{#if priority}}
                {{#if (eq priority "urgent")}}
                    <span class="priority-urgent">[URGENT]</span>
                {{else if (eq priority "stat")}}
                    <span class="priority-stat">[STAT]</span>
                {{/if}}
            {{/if}}
        </div>
        {{#if labName}}<div><strong>Panel:</strong> {{labName}}</div>{{/if}}
        <div><strong>Specimen:</strong> {{specimenType}}</div>
        {{#if fastingRequired}}<div style="color: red;"><strong>*** FASTING REQUIRED ***</strong></div>{{/if}}
        {{#if clinicalIndication}}<div><strong>Clinical Indication:</strong> {{clinicalIndication}}</div>{{/if}}
    </div>
    {{/each}}

    <div style="margin-top: 30px;">
        <div>Ordering Provider: {{provider.firstName}} {{provider.lastName}}, {{provider.credentials}}</div>
        <div>Signature: _________________________  Date: {{generatedDate}}</div>
    </div>
</body>
</html>
    `;
  }

  private getImagingTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Imaging Requisition</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            font-size: 11pt;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        .patient-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
            border: 1px solid #000; 
            padding: 10px; 
        }
        .order-item { 
            margin-bottom: 15px; 
            padding: 10px; 
            border: 1px solid #ddd; 
        }
        .study-name { 
            font-weight: bold; 
            font-size: 12pt; 
        }
        .contrast-warning { 
            color: #ff6600; 
            font-weight: bold; 
        }
        .priority-urgent { 
            color: red; 
            font-weight: bold; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>IMAGING REQUISITION</h2>
        <div>{{provider.firstName}} {{provider.lastName}}, {{provider.credentials}}</div>
    </div>

    <div class="patient-info">
        <div>
            <strong>Patient Name:</strong> {{patient.firstName}} {{patient.lastName}}<br>
            <strong>DOB:</strong> {{patient.dateOfBirth}}<br>
            <strong>Gender:</strong> {{patient.gender}}
        </div>
        <div>
            <strong>MRN:</strong> {{patient.mrn}}<br>
            <strong>Date:</strong> {{generatedDate}}<br>
            {{#if patient.contactNumber}}<strong>Phone:</strong> {{patient.contactNumber}}{{/if}}
        </div>
    </div>

    <h3>IMAGING STUDIES ORDERED:</h3>
    {{#each orders}}
    <div class="order-item">
        <div class="study-name">
            {{studyType}} - {{region}}
            {{#if (eq priority "urgent")}}
                <span class="priority-urgent">[URGENT]</span>
            {{/if}}
        </div>
        {{#if laterality}}<div><strong>Laterality:</strong> {{laterality}}</div>{{/if}}
        {{#if contrastNeeded}}<div class="contrast-warning"><strong>*** CONTRAST REQUIRED ***</strong></div>{{/if}}
        {{#if clinicalIndication}}<div><strong>Clinical Indication:</strong> {{clinicalIndication}}</div>{{/if}}
    </div>
    {{/each}}

    <div style="margin-top: 30px;">
        <div>Ordering Provider: {{provider.firstName}} {{provider.lastName}}, {{provider.credentials}}</div>
        <div>Signature: _________________________  Date: {{generatedDate}}</div>
    </div>
</body>
</html>
    `;
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

export const pdfService = new PDFGenerationService();