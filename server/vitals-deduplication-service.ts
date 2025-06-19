import { storage } from "./storage.js";

interface VitalsEntry {
  id?: number;
  patientId: number;
  encounterId: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: string | number;
  weight?: string | number;
  height?: string | number;
  respiratoryRate?: number;
  oxygenSaturation?: string | number;
  painScale?: number;
  recordedAt: string;
  recordedBy: string;
  parsedFromText?: boolean;
  originalText?: string | null;
}

interface VitalValue {
  value: number | string;
  tolerance: number;
}

interface DeduplicationResult {
  shouldSave: boolean;
  duplicateFields: string[];
  mergedEntry?: VitalsEntry;
  reason: string;
}

export class VitalsDeduplicationService {
  
  /**
   * Check if new vitals entry has duplicates within the same encounter
   * Returns whether to save and what fields are duplicated
   */
  async checkForDuplicates(newEntry: VitalsEntry): Promise<DeduplicationResult> {
    console.log("🔍 [VitalsDedup] Checking for duplicates in encounter", newEntry.encounterId);
    
    try {
      // Get all existing vitals for this encounter
      const existingVitals = await storage.getVitalsByEncounter(newEntry.encounterId);
      
      if (!existingVitals || existingVitals.length === 0) {
        return {
          shouldSave: true,
          duplicateFields: [],
          reason: "No existing vitals in encounter"
        };
      }

      console.log(`🔍 [VitalsDedup] Found ${existingVitals.length} existing vitals entries`);

      // Define tolerance levels for each vital sign
      const tolerances = {
        systolicBp: 2,      // ±2 mmHg
        diastolicBp: 2,     // ±2 mmHg  
        heartRate: 2,       // ±2 bpm
        temperature: 0.2,   // ±0.2°F
        weight: 0.5,        // ±0.5 lbs
        height: 0.1,        // ±0.1 inches
        respiratoryRate: 1, // ±1 /min
        oxygenSaturation: 1, // ±1%
        painScale: 0        // Exact match for pain scale
      };

      let duplicateFields: string[] = [];
      let hasAnyDuplicates = false;
      let mostRecentMatch: any = null;
      let maxMatchingFields = 0;

      // Check each existing entry for field-level duplicates
      for (const existing of existingVitals) {
        const fieldMatches = this.compareVitalEntries(newEntry, existing, tolerances);
        
        if (fieldMatches.length > 0) {
          hasAnyDuplicates = true;
          duplicateFields = Array.from(new Set([...duplicateFields, ...fieldMatches]));
          
          // Track the entry with most matching fields for potential merging
          if (fieldMatches.length > maxMatchingFields) {
            maxMatchingFields = fieldMatches.length;
            mostRecentMatch = existing;
          }
        }
      }

      // Decision logic
      if (!hasAnyDuplicates) {
        return {
          shouldSave: true,
          duplicateFields: [],
          reason: "No duplicate values found"
        };
      }

      // If all vital signs are duplicates, skip saving
      const allVitalFields = this.getVitalFieldsFromEntry(newEntry);
      const allFieldsDuplicated = allVitalFields.every(field => duplicateFields.includes(field));
      
      if (allFieldsDuplicated && allVitalFields.length > 0) {
        return {
          shouldSave: false,
          duplicateFields,
          reason: "All vital signs are duplicates of existing entries"
        };
      }

      // If partial duplicates, create merged entry with unique values only
      const mergedEntry = this.createMergedEntry(newEntry, duplicateFields);
      
      return {
        shouldSave: true,
        duplicateFields,
        mergedEntry,
        reason: `Partial duplicates found in fields: ${duplicateFields.join(', ')}. Saving unique values only.`
      };

    } catch (error) {
      console.error("❌ [VitalsDedup] Error checking duplicates:", error);
      // On error, allow saving to prevent data loss
      return {
        shouldSave: true,
        duplicateFields: [],
        reason: "Error during duplicate check - allowing save"
      };
    }
  }

  /**
   * Compare two vitals entries and return list of matching fields
   */
  private compareVitalEntries(
    newEntry: VitalsEntry, 
    existingEntry: any, 
    tolerances: Record<string, number>
  ): string[] {
    const matchingFields: string[] = [];

    // Compare each vital sign with tolerance
    const comparisons = [
      { field: 'systolicBp', newVal: newEntry.systolicBp, existingVal: existingEntry.systolicBp },
      { field: 'diastolicBp', newVal: newEntry.diastolicBp, existingVal: existingEntry.diastolicBp },
      { field: 'heartRate', newVal: newEntry.heartRate, existingVal: existingEntry.heartRate },
      { field: 'temperature', newVal: this.parseNumeric(newEntry.temperature), existingVal: this.parseNumeric(existingEntry.temperature) },
      { field: 'weight', newVal: this.parseNumeric(newEntry.weight), existingVal: this.parseNumeric(existingEntry.weight) },
      { field: 'height', newVal: this.parseNumeric(newEntry.height), existingVal: this.parseNumeric(existingEntry.height) },
      { field: 'respiratoryRate', newVal: newEntry.respiratoryRate, existingVal: existingEntry.respiratoryRate },
      { field: 'oxygenSaturation', newVal: this.parseNumeric(newEntry.oxygenSaturation), existingVal: this.parseNumeric(existingEntry.oxygenSaturation) },
      { field: 'painScale', newVal: newEntry.painScale, existingVal: existingEntry.painScale }
    ];

    for (const comp of comparisons) {
      if (this.isWithinTolerance(comp.newVal, comp.existingVal, tolerances[comp.field])) {
        matchingFields.push(comp.field);
        console.log(`🔍 [VitalsDedup] Match found: ${comp.field} (${comp.newVal} ≈ ${comp.existingVal})`);
      }
    }

    return matchingFields;
  }

  /**
   * Check if two values are within tolerance range
   */
  private isWithinTolerance(val1: number | undefined, val2: number | undefined, tolerance: number): boolean {
    if (val1 === undefined || val2 === undefined || val1 === null || val2 === null) {
      return false;
    }
    
    return Math.abs(val1 - val2) <= tolerance;
  }

  /**
   * Parse string/number values to numbers for comparison
   */
  private parseNumeric(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Get list of vital sign fields that have values in the entry
   */
  private getVitalFieldsFromEntry(entry: VitalsEntry): string[] {
    const fields: string[] = [];
    
    if (entry.systolicBp !== undefined && entry.systolicBp !== null) fields.push('systolicBp');
    if (entry.diastolicBp !== undefined && entry.diastolicBp !== null) fields.push('diastolicBp');
    if (entry.heartRate !== undefined && entry.heartRate !== null) fields.push('heartRate');
    if (entry.temperature !== undefined && entry.temperature !== null) fields.push('temperature');
    if (entry.weight !== undefined && entry.weight !== null) fields.push('weight');
    if (entry.height !== undefined && entry.height !== null) fields.push('height');
    if (entry.respiratoryRate !== undefined && entry.respiratoryRate !== null) fields.push('respiratoryRate');
    if (entry.oxygenSaturation !== undefined && entry.oxygenSaturation !== null) fields.push('oxygenSaturation');
    if (entry.painScale !== undefined && entry.painScale !== null) fields.push('painScale');
    
    return fields;
  }

  /**
   * Create merged entry removing duplicate fields
   */
  private createMergedEntry(originalEntry: VitalsEntry, duplicateFields: string[]): VitalsEntry {
    const merged = { ...originalEntry };
    
    // Remove duplicate fields from merged entry
    for (const field of duplicateFields) {
      if (field in merged) {
        delete (merged as any)[field];
      }
    }
    
    console.log(`🔧 [VitalsDedup] Created merged entry removing fields: ${duplicateFields.join(', ')}`);
    return merged;
  }

  /**
   * Smart merge two vitals entries, keeping non-duplicate values
   */
  async smartMergeVitals(encounterId: number, newVitals: VitalsEntry): Promise<{
    success: boolean;
    savedEntry?: any;
    skippedFields?: string[];
    message: string;
  }> {
    console.log("🔧 [VitalsDedup] Starting smart merge for encounter", encounterId);
    
    const deduplicationResult = await this.checkForDuplicates(newVitals);
    
    if (!deduplicationResult.shouldSave) {
      return {
        success: false,
        skippedFields: deduplicationResult.duplicateFields,
        message: deduplicationResult.reason
      };
    }

    // Use merged entry if available, otherwise use original
    const entryToSave = deduplicationResult.mergedEntry || newVitals;
    
    // Check if merged entry has any values to save
    const fieldsToSave = this.getVitalFieldsFromEntry(entryToSave);
    if (fieldsToSave.length === 0) {
      return {
        success: false,
        skippedFields: deduplicationResult.duplicateFields,
        message: "No unique vital signs to save after deduplication"
      };
    }

    // Save the entry
    try {
      const savedEntry = await storage.createVitalsEntry(entryToSave);
      
      return {
        success: true,
        savedEntry,
        skippedFields: deduplicationResult.duplicateFields,
        message: deduplicationResult.duplicateFields.length > 0 
          ? `Saved ${fieldsToSave.length} unique vital signs. Skipped duplicates: ${deduplicationResult.duplicateFields.join(', ')}`
          : `Saved ${fieldsToSave.length} vital signs`
      };
      
    } catch (error) {
      console.error("❌ [VitalsDedup] Error saving merged vitals:", error);
      return {
        success: false,
        message: "Failed to save vitals entry"
      };
    }
  }
}

export const vitalsDeduplicationService = new VitalsDeduplicationService();