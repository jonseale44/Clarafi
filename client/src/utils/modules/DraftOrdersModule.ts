/**
 * Draft Orders Module for Real-time API
 * Handles order extraction and processing from SOAP notes
 */
export class DraftOrdersModule {
  private patientChart: any = null;
  private ws: WebSocket | null = null;

  constructor(webSocket: WebSocket | null) {
    this.ws = webSocket;
  }

  /**
   * Set patient chart data for context
   */
  setPatientChart(chart: any): void {
    if (!chart?.patient_id) {
      console.error("Invalid patient chart - missing patient_id");
      return;
    }
    this.patientChart = chart;
  }

  /**
   * Process extracted orders from SOAP note
   */
  processOrders(ordersText: string): any[] {
    if (!ordersText.trim()) {
      return [];
    }

    const orders: any[] = [];
    const sections = ordersText.split('\n\n').filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) continue;

      // Check if this is a medication order
      if (lines[0].toLowerCase().startsWith('medication:')) {
        const medication = this.parseMedicationOrder(lines);
        if (medication) {
          orders.push({
            type: 'medication',
            ...medication
          });
        }
      }
      // Check if this is a lab order
      else if (lines[0].toLowerCase().startsWith('lab:')) {
        const lab = this.parseLabOrder(lines);
        if (lab) {
          orders.push({
            type: 'lab',
            ...lab
          });
        }
      }
      // Check if this is an imaging order
      else if (lines[0].toLowerCase().startsWith('imaging:')) {
        const imaging = this.parseImagingOrder(lines);
        if (imaging) {
          orders.push({
            type: 'imaging',
            ...imaging
          });
        }
      }
    }

    return orders;
  }

  /**
   * Parse medication order from text lines
   */
  private parseMedicationOrder(lines: string[]): any | null {
    try {
      const medication: any = {};
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('medication:')) {
          medication.name = line.substring(11).trim();
        } else if (line.toLowerCase().startsWith('sig:')) {
          medication.sig = line.substring(4).trim();
        } else if (line.toLowerCase().startsWith('dispense:')) {
          medication.dispense = line.substring(9).trim();
        } else if (line.toLowerCase().startsWith('refills:')) {
          medication.refills = parseInt(line.substring(8).trim()) || 0;
        }
      }

      return medication.name ? medication : null;
    } catch (error) {
      console.error("Error parsing medication order:", error);
      return null;
    }
  }

  /**
   * Parse lab order from text lines
   */
  private parseLabOrder(lines: string[]): any | null {
    try {
      const lab: any = {};
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('lab:')) {
          lab.name = line.substring(4).trim();
        } else if (line.toLowerCase().startsWith('priority:')) {
          lab.priority = line.substring(9).trim();
        } else if (line.toLowerCase().startsWith('instructions:')) {
          lab.instructions = line.substring(13).trim();
        }
      }

      return lab.name ? lab : null;
    } catch (error) {
      console.error("Error parsing lab order:", error);
      return null;
    }
  }

  /**
   * Parse imaging order from text lines
   */
  private parseImagingOrder(lines: string[]): any | null {
    try {
      const imaging: any = {};
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('imaging:')) {
          imaging.name = line.substring(8).trim();
        } else if (line.toLowerCase().startsWith('instructions:')) {
          imaging.instructions = line.substring(13).trim();
        } else if (line.toLowerCase().startsWith('priority:')) {
          imaging.priority = line.substring(9).trim();
        }
      }

      return imaging.name ? imaging : null;
    } catch (error) {
      console.error("Error parsing imaging order:", error);
      return null;
    }
  }

  /**
   * Get patient chart data
   */
  getPatientChart(): any {
    return this.patientChart;
  }
}