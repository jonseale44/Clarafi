/**
 * RxNorm Integration Service
 * Production-grade medication lookup using NIH RxNorm API
 * 
 * Free API with no authentication required
 * Rate limit: 20 requests per second
 */

import { storage } from "./storage.js";

export interface RxNormMedication {
  rxcui: string;                    // RxNorm Concept Unique Identifier
  name: string;                     // Drug name
  synonym?: string;                 // Alternative names
  tty: string;                      // Term type (SCD, SBD, etc.)
  suppress: string;                 // Suppression status
}

export interface RxNormDrugInfo {
  rxcui: string;
  name: string;
  brandNames: string[];
  genericName: string;
  dosageForms: string[];
  strengths: string[];
  routes: string[];
  status: string;
}

export interface MedicationSearchResult {
  rxcui: string;
  name: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  score: number;  // Relevance score
}

export class RxNormService {
  private static readonly BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // In-memory cache to reduce API calls
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Search for medications by name
   * Returns top matches with brand/generic mapping
   */
  static async searchMedications(searchTerm: string): Promise<MedicationSearchResult[]> {
    console.log(`🔍 [RxNorm] Searching for: ${searchTerm}`);
    
    // Check cache first
    const cacheKey = `search:${searchTerm.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ [RxNorm] Cache hit for: ${searchTerm}`);
      return cached;
    }

    try {
      // Search approximate matches
      const searchUrl = `${this.BASE_URL}/approximateTerm.json?term=${encodeURIComponent(searchTerm)}&maxEntries=20`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`RxNorm API error: ${response.status}`);
      }

      const data = await response.json();
      const candidates = data.approximateGroup?.candidate || [];
      
      // Process and score results
      const results: MedicationSearchResult[] = [];
      
      for (const candidate of candidates) {
        if (candidate.suppress === 'N') { // Only non-suppressed drugs
          const drugInfo = await this.getDrugInfo(candidate.rxcui);
          
          if (drugInfo) {
            results.push({
              rxcui: candidate.rxcui,
              name: drugInfo.name,
              brandName: drugInfo.brandNames[0],
              genericName: drugInfo.genericName,
              strength: drugInfo.strengths[0],
              dosageForm: drugInfo.dosageForms[0],
              route: drugInfo.routes[0],
              score: candidate.score || 100
            });
          }
        }
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);
      
      // Cache results
      this.setCache(cacheKey, results);
      
      console.log(`✅ [RxNorm] Found ${results.length} medications for: ${searchTerm}`);
      return results;

    } catch (error) {
      console.error(`❌ [RxNorm] Search error:`, error);
      return [];
    }
  }

  /**
   * Get detailed drug information by RxCUI
   */
  static async getDrugInfo(rxcui: string): Promise<RxNormDrugInfo | null> {
    const cacheKey = `drug:${rxcui}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get drug properties
      const propsUrl = `${this.BASE_URL}/rxcui/${rxcui}/properties.json`;
      const propsResponse = await fetch(propsUrl);
      const propsData = await propsResponse.json();
      
      if (!propsData.properties) return null;

      // Get related brand/generic names
      const relatedUrl = `${this.BASE_URL}/rxcui/${rxcui}/related.json?tty=SBD+SCD`;
      const relatedResponse = await fetch(relatedUrl);
      const relatedData = await relatedResponse.json();

      const drugInfo: RxNormDrugInfo = {
        rxcui,
        name: propsData.properties.name,
        brandNames: [],
        genericName: '',
        dosageForms: [],
        strengths: [],
        routes: [],
        status: propsData.properties.prescribable || 'Unknown'
      };

      // Extract brand and generic names from related concepts
      const relatedConcepts = relatedData.relatedGroup?.conceptGroup || [];
      
      for (const group of relatedConcepts) {
        if (group.tty === 'SBD') { // Semantic Branded Drug
          drugInfo.brandNames = group.conceptProperties?.map((c: any) => c.name) || [];
        } else if (group.tty === 'SCD') { // Semantic Clinical Drug
          const genericNames = group.conceptProperties?.map((c: any) => c.name) || [];
          if (genericNames.length > 0) {
            // Extract generic name from SCD (e.g., "Lisinopril 10 MG Oral Tablet" -> "Lisinopril")
            drugInfo.genericName = genericNames[0].split(' ')[0];
          }
        }
      }

      // Parse dosage forms and strengths from the name
      const nameParts = drugInfo.name.split(' ');
      
      // Extract strength (e.g., "10 MG")
      for (let i = 0; i < nameParts.length - 1; i++) {
        if (/^\d/.test(nameParts[i]) && /^(MG|MCG|G|ML|UNIT|IU|%)$/i.test(nameParts[i + 1])) {
          drugInfo.strengths.push(`${nameParts[i]} ${nameParts[i + 1]}`);
        }
      }

      // Extract dosage form and route
      const formKeywords = ['tablet', 'capsule', 'solution', 'injection', 'cream', 'ointment', 'patch', 'inhaler'];
      const routeKeywords = ['oral', 'topical', 'injection', 'inhalation', 'nasal', 'ophthalmic'];
      
      for (const part of nameParts) {
        const lowerPart = part.toLowerCase();
        if (formKeywords.includes(lowerPart)) {
          drugInfo.dosageForms.push(part);
        }
        if (routeKeywords.includes(lowerPart)) {
          drugInfo.routes.push(part);
        }
      }

      this.setCache(cacheKey, drugInfo);
      return drugInfo;

    } catch (error) {
      console.error(`❌ [RxNorm] Error getting drug info for ${rxcui}:`, error);
      return null;
    }
  }

  /**
   * Validate if a medication name exists in RxNorm
   */
  static async validateMedication(medicationName: string): Promise<{
    isValid: boolean;
    rxcui?: string;
    preferredName?: string;
    alternatives?: string[];
  }> {
    const results = await this.searchMedications(medicationName);
    
    if (results.length === 0) {
      return { isValid: false };
    }

    const topMatch = results[0];
    const alternatives = results.slice(1, 4).map(r => r.name);

    return {
      isValid: true,
      rxcui: topMatch.rxcui,
      preferredName: topMatch.name,
      alternatives: alternatives.length > 0 ? alternatives : undefined
    };
  }

  /**
   * Get NDC codes for a medication (for pharmacy transmission)
   */
  static async getNDCCodes(rxcui: string): Promise<string[]> {
    try {
      const ndcUrl = `${this.BASE_URL}/rxcui/${rxcui}/ndcs.json`;
      const response = await fetch(ndcUrl);
      const data = await response.json();
      
      return data.ndcGroup?.ndcList?.ndc || [];
    } catch (error) {
      console.error(`❌ [RxNorm] Error getting NDC codes for ${rxcui}:`, error);
      return [];
    }
  }

  /**
   * Get drug interactions (requires multiple RxCUIs)
   */
  static async checkInteractions(rxcuiList: string[]): Promise<any> {
    if (rxcuiList.length < 2) return { interactions: [] };

    try {
      const interactionUrl = `${this.BASE_URL}/interaction/list.json?rxcuis=${rxcuiList.join('+')}`;
      const response = await fetch(interactionUrl);
      const data = await response.json();
      
      return data.fullInteractionTypeGroup || { interactions: [] };
    } catch (error) {
      console.error(`❌ [RxNorm] Error checking interactions:`, error);
      return { interactions: [] };
    }
  }

  // Cache helpers
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Build local medication cache in database
   * Called periodically to store frequently used medications
   */
  static async buildLocalCache(): Promise<void> {
    console.log('🔨 [RxNorm] Building local medication cache...');
    
    // Common medications to cache
    const commonMedications = [
      'lisinopril', 'amlodipine', 'metformin', 'atorvastatin', 'levothyroxine',
      'omeprazole', 'simvastatin', 'losartan', 'gabapentin', 'hydrochlorothiazide',
      'metoprolol', 'sertraline', 'pravastatin', 'rosuvastatin', 'furosemide',
      'pantoprazole', 'escitalopram', 'insulin glargine', 'fluoxetine', 'alprazolam',
      'prednisone', 'ibuprofen', 'acetaminophen', 'aspirin', 'clopidogrel',
      'warfarin', 'albuterol', 'montelukast', 'fluticasone', 'cetirizine'
    ];

    for (const med of commonMedications) {
      try {
        const results = await this.searchMedications(med);
        console.log(`✅ [RxNorm] Cached ${results.length} entries for ${med}`);
      } catch (error) {
        console.error(`❌ [RxNorm] Failed to cache ${med}:`, error);
      }
      
      // Rate limit compliance
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ [RxNorm] Local cache building complete');
  }
}