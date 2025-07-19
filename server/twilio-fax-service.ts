import twilio from 'twilio';

export interface FaxSendOptions {
  to: string;
  from?: string;
  pdfBuffer: Buffer;
  statusCallback?: string;
}

export interface FaxResult {
  success: boolean;
  faxSid?: string;
  error?: string;
}

class TwilioFaxService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;
  
  constructor() {
    this.initialize();
  }
  
  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FAX_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    
    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      console.log('✅ [TwilioFax] Service initialized successfully');
    } else {
      console.log('⚠️  [TwilioFax] Missing Twilio credentials - fax service will run in simulation mode');
    }
  }
  
  async sendFax(options: FaxSendOptions): Promise<FaxResult> {
    const { to, from, pdfBuffer, statusCallback } = options;
    
    // Format phone number - ensure it has country code
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = from ? this.formatPhoneNumber(from) : this.fromNumber;
    
    if (!formattedFrom) {
      return {
        success: false,
        error: 'No fax number configured. Please set TWILIO_FAX_NUMBER or TWILIO_PHONE_NUMBER environment variable'
      };
    }
    
    // If no Twilio client, run in simulation mode
    if (!this.client) {
      console.log(`📠 [TwilioFax] SIMULATION: Would send fax to ${formattedTo}`);
      console.log(`📠 [TwilioFax] PDF size: ${pdfBuffer.length} bytes`);
      return {
        success: true,
        faxSid: `FAX_SIMULATION_${Date.now()}`,
      };
    }
    
    try {
      console.log(`📠 [TwilioFax] Sending fax to ${formattedTo} from ${formattedFrom}`);
      
      // Convert PDF buffer to base64
      const mediaUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      
      // Send fax via Twilio
      const fax = await this.client.fax.v1.faxes.create({
        to: formattedTo,
        from: formattedFrom,
        mediaUrl,
        ...(statusCallback && { statusCallback })
      });
      
      console.log(`✅ [TwilioFax] Fax queued successfully. SID: ${fax.sid}`);
      
      return {
        success: true,
        faxSid: fax.sid
      };
      
    } catch (error: any) {
      console.error('❌ [TwilioFax] Error sending fax:', error);
      return {
        success: false,
        error: error.message || 'Failed to send fax'
      };
    }
  }
  
  async getFaxStatus(faxSid: string): Promise<string | null> {
    if (!this.client) {
      return 'simulation';
    }
    
    try {
      const fax = await this.client.fax.v1.faxes(faxSid).fetch();
      return fax.status;
    } catch (error) {
      console.error('❌ [TwilioFax] Error fetching fax status:', error);
      return null;
    }
  }
  
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's 10 digits, assume US and add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // If it's 11 digits starting with 1, add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // Otherwise, assume it's already formatted correctly
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}

// Export singleton instance
export const twilioFaxService = new TwilioFaxService();