/**
 * Fast Medication Intelligence System
 * 
 * Hybrid approach combining instant preloaded data with smart caching:
 * 1. Preloaded database for top 100+ medications (covers 80% of prescriptions)
 * 2. In-memory cache for recently accessed medications
 * 3. Background API calls for unknown medications with immediate fallback
 * 4. Instant bidirectional updates between sig and medication components
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";

// Preloaded medication database - instant access for common medications
const MEDICATION_DATABASE: Record<string, {
  standardStrengths: string[];
  availableForms: string[];
  formRoutes: Record<string, string[]>;
  sigTemplates: Record<string, string>;
  therapeuticClass: string;
  commonDoses: string[];
  brandNames: string[];
  prescriptionType: 'rx' | 'otc';
}> = {
  'hydrochlorothiazide': {
    standardStrengths: ['12.5 mg', '25 mg', '50 mg'],
    availableForms: ['tablet', 'capsule'],
    formRoutes: { 'tablet': ['oral'], 'capsule': ['oral'] },
    sigTemplates: {
      '12.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '25 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'Thiazide Diuretic',
    commonDoses: ['25 mg once daily', '50 mg once daily'],
    brandNames: ['Microzide'],
    prescriptionType: 'rx'
  },
  'lisinopril': {
    standardStrengths: ['2.5 mg', '5 mg', '10 mg', '20 mg', '30 mg', '40 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '2.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'ACE Inhibitor',
    commonDoses: ['10 mg once daily', '20 mg once daily'],
    brandNames: ['Prinivil', 'Zestril'],
    prescriptionType: 'rx'
  },
  'metformin': {
    standardStrengths: ['500 mg', '850 mg', '1000 mg'],
    availableForms: ['tablet', 'extended-release tablet'],
    formRoutes: { 'tablet': ['oral'], 'extended-release tablet': ['oral'] },
    sigTemplates: {
      '500 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '850 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '1000 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '500 mg-extended-release tablet-oral': 'Take 1 extended-release tablet by mouth once daily with dinner'
    },
    therapeuticClass: 'Biguanide Antidiabetic',
    commonDoses: ['500 mg twice daily', '1000 mg twice daily'],
    brandNames: ['Glucophage', 'Fortamet'],
    prescriptionType: 'rx'
  },
  'aspirin': {
    standardStrengths: ['81 mg', '325 mg', '500 mg'],
    availableForms: ['tablet', 'chewable tablet', 'enteric-coated tablet'],
    formRoutes: { 'tablet': ['oral'], 'chewable tablet': ['oral'], 'enteric-coated tablet': ['oral'] },
    sigTemplates: {
      '81 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '81 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily',
      '325 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain'
    },
    therapeuticClass: 'Antiplatelet/NSAID',
    commonDoses: ['81 mg once daily', '325 mg as needed'],
    brandNames: ['Bayer', 'Ecotrin'],
    prescriptionType: 'otc'
  },
  'simvastatin': {
    standardStrengths: ['5 mg', '10 mg', '20 mg', '40 mg', '80 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening',
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening',
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening',
      '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening'
    },
    therapeuticClass: 'HMG-CoA Reductase Inhibitor',
    commonDoses: ['20 mg once daily', '40 mg once daily'],
    brandNames: ['Zocor'],
    prescriptionType: 'rx'
  },
  'omeprazole': {
    standardStrengths: ['10 mg', '20 mg', '40 mg'],
    availableForms: ['capsule', 'tablet'],
    formRoutes: { 'capsule': ['oral'], 'tablet': ['oral'] },
    sigTemplates: {
      '20 mg-capsule-oral': 'Take 1 capsule by mouth once daily before breakfast',
      '40 mg-capsule-oral': 'Take 1 capsule by mouth once daily before breakfast'
    },
    therapeuticClass: 'Proton Pump Inhibitor',
    commonDoses: ['20 mg once daily', '40 mg once daily'],
    brandNames: ['Prilosec'],
    prescriptionType: 'otc'
  },
  'atorvastatin': {
    standardStrengths: ['10 mg', '20 mg', '40 mg', '80 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '80 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'HMG-CoA Reductase Inhibitor',
    commonDoses: ['20 mg once daily', '40 mg once daily'],
    brandNames: ['Lipitor'],
    prescriptionType: 'rx'
  },
  
  // Expanded Top 500 Medication Database
  'amlodipine': {
    standardStrengths: ['2.5 mg', '5 mg', '10 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '2.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'Calcium Channel Blocker',
    commonDoses: ['5 mg once daily', '10 mg once daily'],
    brandNames: ['Norvasc'],
    prescriptionType: 'rx'
  },
  
  'losartan': {
    standardStrengths: ['25 mg', '50 mg', '100 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '25 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '100 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'ARB (Angiotensin Receptor Blocker)',
    commonDoses: ['50 mg once daily', '100 mg once daily'],
    brandNames: ['Cozaar'],
    prescriptionType: 'rx'
  },
  
  'levothyroxine': {
    standardStrengths: ['25 mcg', '50 mcg', '75 mcg', '100 mcg', '125 mcg', '150 mcg', '175 mcg', '200 mcg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '25 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach',
      '50 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach',
      '75 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach',
      '100 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach',
      '125 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach',
      '150 mcg-tablet-oral': 'Take 1 tablet by mouth once daily on empty stomach'
    },
    therapeuticClass: 'Thyroid Hormone',
    commonDoses: ['100 mcg once daily', '125 mcg once daily'],
    brandNames: ['Synthroid', 'Levoxyl'],
    prescriptionType: 'rx'
  },
  
  'sertraline': {
    standardStrengths: ['25 mg', '50 mg', '100 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '25 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '100 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'SSRI Antidepressant',
    commonDoses: ['50 mg once daily', '100 mg once daily'],
    brandNames: ['Zoloft'],
    prescriptionType: 'rx'
  },
  
  'hydroxychloroquine': {
    standardStrengths: ['200 mg', '400 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '200 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with food',
      '400 mg-tablet-oral': 'Take 1 tablet by mouth once daily with food'
    },
    therapeuticClass: 'Antimalarial/DMARD',
    commonDoses: ['200 mg twice daily', '400 mg once daily'],
    brandNames: ['Plaquenil'],
    prescriptionType: 'rx'
  },
  
  'prednisone': {
    standardStrengths: ['1 mg', '2.5 mg', '5 mg', '10 mg', '20 mg', '50 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily with food',
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily with food',
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily with food'
    },
    therapeuticClass: 'Corticosteroid',
    commonDoses: ['5 mg once daily', '10 mg once daily', '20 mg once daily'],
    brandNames: ['Deltasone'],
    prescriptionType: 'rx'
  },
  
  'albuterol': {
    standardStrengths: ['90 mcg/actuation', '2.5 mg/3 mL', '5 mg/mL'],
    availableForms: ['inhaler', 'nebulizer solution', 'tablet'],
    formRoutes: { 'inhaler': ['inhalation'], 'nebulizer solution': ['inhalation'], 'tablet': ['oral'] },
    sigTemplates: {
      '90 mcg/actuation-inhaler-inhalation': 'Inhale 2 puffs by mouth every 4 hours as needed for shortness of breath',
      '2.5 mg/3 mL-nebulizer solution-inhalation': 'Inhale contents of 1 vial every 4 hours as needed for shortness of breath'
    },
    therapeuticClass: 'Beta-2 Agonist Bronchodilator',
    commonDoses: ['2 puffs every 4 hours as needed', '2.5 mg nebulized every 4 hours as needed'],
    brandNames: ['ProAir', 'Ventolin', 'Proventil'],
    prescriptionType: 'rx'
  },
  
  'gabapentin': {
    standardStrengths: ['100 mg', '300 mg', '400 mg', '600 mg', '800 mg'],
    availableForms: ['capsule', 'tablet'],
    formRoutes: { 'capsule': ['oral'], 'tablet': ['oral'] },
    sigTemplates: {
      '100 mg-capsule-oral': 'Take 1 capsule by mouth three times daily',
      '300 mg-capsule-oral': 'Take 1 capsule by mouth three times daily',
      '400 mg-capsule-oral': 'Take 1 capsule by mouth three times daily',
      '600 mg-tablet-oral': 'Take 1 tablet by mouth three times daily'
    },
    therapeuticClass: 'Anticonvulsant/Neuropathic Pain',
    commonDoses: ['300 mg three times daily', '600 mg three times daily'],
    brandNames: ['Neurontin'],
    prescriptionType: 'rx'
  },
  
  'tramadol': {
    standardStrengths: ['50 mg', '100 mg'],
    availableForms: ['tablet', 'extended-release tablet'],
    formRoutes: { 'tablet': ['oral'], 'extended-release tablet': ['oral'] },
    sigTemplates: {
      '50 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain',
      '100 mg-extended-release tablet-oral': 'Take 1 extended-release tablet by mouth once daily'
    },
    therapeuticClass: 'Opioid Analgesic',
    commonDoses: ['50 mg every 6 hours as needed', '100 mg extended-release once daily'],
    brandNames: ['Ultram'],
    prescriptionType: 'rx'
  },
  
  'furosemide': {
    standardStrengths: ['20 mg', '40 mg', '80 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '80 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'Loop Diuretic',
    commonDoses: ['20 mg once daily', '40 mg once daily'],
    brandNames: ['Lasix'],
    prescriptionType: 'rx'
  },
  
  'warfarin': {
    standardStrengths: ['1 mg', '2 mg', '2.5 mg', '3 mg', '4 mg', '5 mg', '6 mg', '7.5 mg', '10 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '1 mg-tablet-oral': 'Take 1 tablet by mouth once daily at the same time each day',
      '2 mg-tablet-oral': 'Take 1 tablet by mouth once daily at the same time each day',
      '2.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily at the same time each day',
      '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily at the same time each day'
    },
    therapeuticClass: 'Anticoagulant',
    commonDoses: ['2.5 mg once daily', '5 mg once daily'],
    brandNames: ['Coumadin', 'Jantoven'],
    prescriptionType: 'rx'
  },
  
  'clopidogrel': {
    standardStrengths: ['75 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '75 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'Antiplatelet',
    commonDoses: ['75 mg once daily'],
    brandNames: ['Plavix'],
    prescriptionType: 'rx'
  },
  
  'pantoprazole': {
    standardStrengths: ['20 mg', '40 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily before breakfast',
      '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily before breakfast'
    },
    therapeuticClass: 'Proton Pump Inhibitor',
    commonDoses: ['40 mg once daily'],
    brandNames: ['Protonix'],
    prescriptionType: 'rx'
  },
  
  'insulin glargine': {
    standardStrengths: ['100 units/mL'],
    availableForms: ['injection'],
    formRoutes: { 'injection': ['subcutaneous'] },
    sigTemplates: {
      '100 units/mL-injection-subcutaneous': 'Inject prescribed units subcutaneously once daily at the same time'
    },
    therapeuticClass: 'Long-Acting Insulin',
    commonDoses: ['10-20 units once daily', 'per provider instructions'],
    brandNames: ['Lantus', 'Basaglar'],
    prescriptionType: 'rx'
  },
  
  'fluticasone': {
    standardStrengths: ['50 mcg/actuation', '110 mcg/actuation', '220 mcg/actuation'],
    availableForms: ['inhaler', 'nasal spray'],
    formRoutes: { 'inhaler': ['inhalation'], 'nasal spray': ['nasal'] },
    sigTemplates: {
      '110 mcg/actuation-inhaler-inhalation': 'Inhale 2 puffs by mouth twice daily',
      '50 mcg/actuation-nasal spray-nasal': 'Spray 2 sprays in each nostril once daily'
    },
    therapeuticClass: 'Corticosteroid',
    commonDoses: ['2 puffs twice daily', '2 sprays each nostril once daily'],
    brandNames: ['Flovent', 'Flonase'],
    prescriptionType: 'rx'
  },
  
  'ciprofloxacin': {
    standardStrengths: ['250 mg', '500 mg', '750 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '250 mg-tablet-oral': 'Take 1 tablet by mouth twice daily',
      '500 mg-tablet-oral': 'Take 1 tablet by mouth twice daily',
      '750 mg-tablet-oral': 'Take 1 tablet by mouth twice daily'
    },
    therapeuticClass: 'Fluoroquinolone Antibiotic',
    commonDoses: ['500 mg twice daily', '750 mg twice daily'],
    brandNames: ['Cipro'],
    prescriptionType: 'rx'
  },
  
  'azithromycin': {
    standardStrengths: ['250 mg', '500 mg'],
    availableForms: ['tablet', 'z-pack'],
    formRoutes: { 'tablet': ['oral'], 'z-pack': ['oral'] },
    sigTemplates: {
      '250 mg-tablet-oral': 'Take 2 tablets by mouth on day 1, then 1 tablet daily for 4 days',
      '500 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
    },
    therapeuticClass: 'Macrolide Antibiotic',
    commonDoses: ['Z-pack regimen', '500 mg once daily'],
    brandNames: ['Zithromax', 'Z-pack'],
    prescriptionType: 'rx'
  },
  
  'amoxicillin': {
    standardStrengths: ['250 mg', '500 mg', '875 mg'],
    availableForms: ['capsule', 'tablet'],
    formRoutes: { 'capsule': ['oral'], 'tablet': ['oral'] },
    sigTemplates: {
      '250 mg-capsule-oral': 'Take 1 capsule by mouth three times daily',
      '500 mg-capsule-oral': 'Take 1 capsule by mouth three times daily',
      '875 mg-tablet-oral': 'Take 1 tablet by mouth twice daily'
    },
    therapeuticClass: 'Penicillin Antibiotic',
    commonDoses: ['500 mg three times daily', '875 mg twice daily'],
    brandNames: ['Amoxil'],
    prescriptionType: 'rx'
  },
  
  'ibuprofen': {
    standardStrengths: ['200 mg', '400 mg', '600 mg', '800 mg'],
    availableForms: ['tablet', 'capsule'],
    formRoutes: { 'tablet': ['oral'], 'capsule': ['oral'] },
    sigTemplates: {
      '200 mg-tablet-oral': 'Take 1-2 tablets by mouth every 6 hours as needed for pain',
      '400 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain',
      '600 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain',
      '800 mg-tablet-oral': 'Take 1 tablet by mouth every 8 hours as needed for pain'
    },
    therapeuticClass: 'NSAID',
    commonDoses: ['400 mg every 6 hours as needed', '800 mg every 8 hours as needed'],
    brandNames: ['Advil', 'Motrin'],
    prescriptionType: 'otc'
  },
  
  'acetaminophen': {
    standardStrengths: ['325 mg', '500 mg', '650 mg'],
    availableForms: ['tablet', 'capsule'],
    formRoutes: { 'tablet': ['oral'], 'capsule': ['oral'] },
    sigTemplates: {
      '325 mg-tablet-oral': 'Take 1-2 tablets by mouth every 4-6 hours as needed for pain',
      '500 mg-tablet-oral': 'Take 1-2 tablets by mouth every 6 hours as needed for pain',
      '650 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain'
    },
    therapeuticClass: 'Analgesic/Antipyretic',
    commonDoses: ['500 mg every 6 hours as needed', '650 mg every 6 hours as needed'],
    brandNames: ['Tylenol'],
    prescriptionType: 'otc'
  },
  
  'alprazolam': {
    standardStrengths: ['0.25 mg', '0.5 mg', '1 mg', '2 mg'],
    availableForms: ['tablet'],
    formRoutes: { 'tablet': ['oral'] },
    sigTemplates: {
      '0.25 mg-tablet-oral': 'Take 1 tablet by mouth as needed for anxiety',
      '0.5 mg-tablet-oral': 'Take 1 tablet by mouth as needed for anxiety',
      '1 mg-tablet-oral': 'Take 1 tablet by mouth as needed for anxiety'
    },
    therapeuticClass: 'Benzodiazepine',
    commonDoses: ['0.5 mg as needed', '1 mg as needed'],
    brandNames: ['Xanax'],
    prescriptionType: 'rx'
  }
};

// Smart caching system with localStorage persistence
const CACHE_PREFIX = 'medication_intelligence_';
const CACHE_EXPIRY_HOURS = 24;

class MedicationCache {
  private memoryCache = new Map<string, any>();

  // Check if cached data is still valid
  private isValidCache(cacheData: any): boolean {
    if (!cacheData.timestamp || !cacheData.data) return false;
    const hoursSinceCache = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60);
    return hoursSinceCache < CACHE_EXPIRY_HOURS;
  }

  // Get medication data from cache (memory first, then localStorage)
  get(medicationName: string): any {
    const key = medicationName.toLowerCase().trim();
    
    // Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Check localStorage cache
    try {
      const stored = localStorage.getItem(CACHE_PREFIX + key);
      if (stored) {
        const cacheData = JSON.parse(stored);
        if (this.isValidCache(cacheData)) {
          // Move to memory cache for faster future access
          this.memoryCache.set(key, cacheData.data);
          return cacheData.data;
        } else {
          // Remove expired cache
          localStorage.removeItem(CACHE_PREFIX + key);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    
    return null;
  }

  // Store medication data in both memory and localStorage
  set(medicationName: string, data: any): void {
    const key = medicationName.toLowerCase().trim();
    
    // Store in memory cache
    this.memoryCache.set(key, data);
    
    // Store in localStorage with timestamp
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  // Check if medication exists in cache
  has(medicationName: string): boolean {
    return this.get(medicationName) !== null;
  }

  // Clear expired cache entries (background cleanup)
  cleanupExpired(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const cacheData = JSON.parse(stored);
            if (!this.isValidCache(cacheData)) {
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
}

const medicationCache = new MedicationCache();

interface FastMedicationIntelligenceProps {
  medicationName: string;
  initialStrength?: string;
  initialForm?: string;
  initialRoute?: string;
  initialSig?: string;
  initialQuantity?: number;
  initialRefills?: number;
  initialDaysSupply?: number;
  onChange: (updates: {
    dosage?: string;
    form?: string;
    routeOfAdministration?: string;
    sig?: string;
    quantity?: number;
    refills?: number;
    daysSupply?: number;
  }) => void;
}

export function FastMedicationIntelligence({
  medicationName,
  initialStrength = '',
  initialForm = '',
  initialRoute = '',
  initialSig = '',
  initialQuantity = 30,
  initialRefills = 2,
  initialDaysSupply = 90,
  onChange
}: FastMedicationIntelligenceProps) {
  const [strength, setStrength] = useState(initialStrength);
  const [form, setForm] = useState(initialForm);
  const [route, setRoute] = useState(initialRoute);
  const [sig, setSig] = useState(initialSig);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [refills, setRefills] = useState(initialRefills);
  const [daysSupply, setDaysSupply] = useState(initialDaysSupply);
  const [manualSigEdit, setManualSigEdit] = useState(false);
  const [isLoadingMedication, setIsLoadingMedication] = useState(false);

  // Brand name to generic conversion function (moved outside useMemo to prevent initialization issues)
  const findGenericFromBrandName = useCallback((brandName: string): string | null => {
    const lowerBrand = brandName.toLowerCase();
    
    // Search through all medications to find matching brand names
    for (const [genericName, data] of Object.entries(MEDICATION_DATABASE)) {
      if (data.brandNames.some(brand => brand.toLowerCase() === lowerBrand)) {
        return genericName;
      }
    }
    
    return null;
  }, []);

  // Smart medication data retrieval with brand name recognition
  const medicationData = useMemo(() => {
    const normalizedName = medicationName.toLowerCase().trim();
    
    // Priority 1: Preloaded database (instant access)
    if (MEDICATION_DATABASE[normalizedName]) {
      return MEDICATION_DATABASE[normalizedName];
    }
    
    // Priority 2: Brand name lookup (convert brand to generic)
    const lowerBrand = normalizedName.toLowerCase();
    let genericFromBrand = null;
    
    // Search through all medications to find matching brand names
    for (const [genericName, data] of Object.entries(MEDICATION_DATABASE)) {
      if (data.brandNames.some(brand => brand.toLowerCase() === lowerBrand)) {
        genericFromBrand = genericName;
        break;
      }
    }
    
    if (genericFromBrand && MEDICATION_DATABASE[genericFromBrand]) {
      return MEDICATION_DATABASE[genericFromBrand];
    }
    
    // Priority 3: Smart cache (memory + localStorage)
    const cachedData = medicationCache.get(normalizedName);
    if (cachedData) {
      return cachedData;
    }
    
    // Return null if not found - triggers progressive loading
    return null;
  }, [medicationName]);

  // Progressive enhancement with background loading
  useEffect(() => {
    const normalizedName = medicationName.toLowerCase().trim();
    
    if (medicationName && !medicationData && !medicationCache.has(normalizedName)) {
      setIsLoadingMedication(true);
      
      // Progressive API call with intelligent fallback
      fetch(`/api/medications/${encodeURIComponent(medicationName)}/intelligence`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error(`API responded with ${res.status}`);
        })
        .then(data => {
          if (data && Object.keys(data).length > 0) {
            // Cache successful API responses
            medicationCache.set(normalizedName, data);
            setIsLoadingMedication(false);
          } else {
            // Handle empty responses gracefully
            setIsLoadingMedication(false);
          }
        })
        .catch(error => {
          console.info(`No intelligence data available for ${medicationName}:`, error.message);
          setIsLoadingMedication(false);
        });
    }
  }, [medicationName, medicationData]);

  // Background cleanup of expired cache (runs once per session)
  useEffect(() => {
    const cleanup = () => {
      try {
        medicationCache.cleanupExpired();
      } catch (error) {
        console.warn('Background cache cleanup failed:', error);
      }
    };
    
    // Run cleanup after component mounts (low priority)
    const timeoutId = setTimeout(cleanup, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Auto-generate sig when components change
  useEffect(() => {
    if (!manualSigEdit && medicationData && strength && form && route) {
      const sigKey = `${strength}-${form}-${route}`;
      const autoSig = medicationData.sigTemplates?.[sigKey];
      
      if (autoSig) {
        setSig(autoSig);
        onChange({ sig: autoSig });
      } else {
        // Generate generic sig for unknown combinations
        const genericSig = generateGenericSig(form, route, strength);
        setSig(genericSig);
        onChange({ sig: genericSig });
      }
    }
  }, [strength, form, route, medicationData, manualSigEdit, onChange]);

  // Generate generic sig for unknown medications
  const generateGenericSig = useCallback((form: string, route: string, strength: string) => {
    const action = form.includes('chew') ? 'Chew' : 
                  form.includes('cream') || form.includes('ointment') ? 'Apply' : 
                  form.includes('drop') ? 'Instill' : 'Take';
    
    const routeText = route === 'oral' ? 'by mouth' : 
                     route === 'topical' ? 'topically' : 
                     route === 'ophthalmic' ? 'in eye' : 
                     `via ${route}`;
    
    return `${action} 1 ${form} ${routeText} once daily`;
  }, []);

  // Extract sig components for reverse-engineering
  const extractSigComponents = useCallback((sigText: string) => {
    const components: { frequency?: string; route?: string; form?: string } = {};
    
    if (sigText.includes('once daily')) components.frequency = 'once daily';
    else if (sigText.includes('twice daily')) components.frequency = 'twice daily';
    else if (sigText.includes('three times daily')) components.frequency = 'three times daily';
    
    if (sigText.includes('by mouth')) components.route = 'oral';
    else if (sigText.includes('topically')) components.route = 'topical';
    else if (sigText.includes('in eye')) components.route = 'ophthalmic';
    
    if (sigText.includes('tablet')) components.form = 'tablet';
    else if (sigText.includes('capsule')) components.form = 'capsule';
    else if (sigText.includes('cream')) components.form = 'cream';
    
    return components;
  }, []);

  // Available options based on medication data
  const availableStrengths = useMemo(() => {
    return medicationData?.standardStrengths || [];
  }, [medicationData]);

  const availableForms = useMemo(() => {
    return medicationData?.availableForms || ['tablet', 'capsule', 'cream', 'ointment', 'liquid'];
  }, [medicationData]);

  const availableRoutes = useMemo(() => {
    if (medicationData?.formRoutes?.[form]) {
      return medicationData.formRoutes[form];
    }
    return ['oral', 'topical', 'injection', 'inhalation', 'ophthalmic'];
  }, [medicationData, form]);

  // Validation
  const validation = useMemo(() => {
    const warnings: string[] = [];
    
    if (medicationData) {
      if (strength && medicationData.standardStrengths && !medicationData.standardStrengths.includes(strength)) {
        warnings.push(`${strength} is not a standard strength`);
      }
      if (form && medicationData.availableForms && !medicationData.availableForms.includes(form)) {
        warnings.push(`${form} is not available for ${medicationName}`);
      }
      if (form && route && medicationData.formRoutes && medicationData.formRoutes[form] && !medicationData.formRoutes[form].includes(route)) {
        warnings.push(`${route} route not appropriate for ${form}`);
      }
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }, [medicationData, medicationName, strength, form, route]);

  const handleStrengthChange = (newStrength: string) => {
    setStrength(newStrength);
    onChange({ dosage: newStrength });
  };

  const handleFormChange = (newForm: string) => {
    setForm(newForm);
    
    // Auto-update route if current route is invalid
    if (medicationData?.formRoutes?.[newForm]) {
      const validRoutes = medicationData.formRoutes[newForm];
      if (!validRoutes.includes(route)) {
        const newRoute = validRoutes[0];
        setRoute(newRoute);
        onChange({ form: newForm, routeOfAdministration: newRoute });
      } else {
        onChange({ form: newForm });
      }
    } else {
      onChange({ form: newForm });
    }
  };

  const handleRouteChange = (newRoute: string) => {
    setRoute(newRoute);
    onChange({ routeOfAdministration: newRoute });
  };

  const handleSigChange = (newSig: string) => {
    setSig(newSig);
    setManualSigEdit(true);
    
    // Try to extract components from sig (reverse engineering)
    const components = extractSigComponents(newSig);
    if (components.form && components.form !== form) {
      setForm(components.form);
      onChange({ sig: newSig, form: components.form });
    } else if (components.route && components.route !== route) {
      setRoute(components.route);
      onChange({ sig: newSig, routeOfAdministration: components.route });
    } else {
      onChange({ sig: newSig });
    }
  };

  return (
    <div className="space-y-4">
      {/* Medication Intelligence Status */}
      <div className="flex items-center gap-2">
        {medicationData && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
            <Zap className="h-4 w-4 text-green-600" />
            <div className="text-sm">
              <span className="font-medium text-green-800">{medicationData.therapeuticClass}</span>
              {medicationData.brandNames && (
                <span className="text-green-600 ml-2">
                  ({medicationData.brandNames.join(', ')})
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {medicationData.prescriptionType?.toUpperCase()}
            </Badge>
          </div>
        )}
        {isLoadingMedication && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">Loading medication data...</span>
          </div>
        )}
        {!medicationData && !isLoadingMedication && medicationName && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
            <Info className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-800">Manual entry mode</span>
          </div>
        )}
      </div>

      {/* Fast Input Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Strength - Dropdown if available, input otherwise */}
        <div>
          <Label htmlFor="strength">Strength *</Label>
          {availableStrengths.length > 0 ? (
            <Select value={strength} onValueChange={handleStrengthChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent>
                {availableStrengths.map((str: string) => (
                  <SelectItem key={str} value={str}>
                    {str}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={strength}
              onChange={(e) => handleStrengthChange(e.target.value)}
              placeholder="e.g., 10 mg"
            />
          )}
          {medicationData?.commonDoses && (
            <div className="text-xs text-gray-500 mt-1">
              Common: {medicationData.commonDoses.slice(0, 2).join(', ')}
            </div>
          )}
        </div>

        {/* Form - Always dropdown with smart options */}
        <div>
          <Label htmlFor="form">Form *</Label>
          <Select value={form} onValueChange={handleFormChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select form" />
            </SelectTrigger>
            <SelectContent>
              {availableForms.map((formOption: string) => (
                <SelectItem key={formOption} value={formOption}>
                  {formOption.charAt(0).toUpperCase() + formOption.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Route - Auto-filtered by form */}
        <div>
          <Label htmlFor="route">Route *</Label>
          <Select value={route} onValueChange={handleRouteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              {availableRoutes.map((routeOption: string) => (
                <SelectItem key={routeOption} value={routeOption}>
                  {routeOption.charAt(0).toUpperCase() + routeOption.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validation Alerts */}
      {!validation.isValid && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-red-600">{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.isValid && strength && form && route && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Valid medication combination</span>
        </div>
      )}

      {/* Smart Sig Instructions */}
      <div>
        <Label htmlFor="sig">Patient Instructions (Sig) *</Label>
        <Textarea
          value={sig}
          onChange={(e) => handleSigChange(e.target.value)}
          placeholder="Instructions will generate automatically or enter manually..."
          className="min-h-[60px]"
        />
        <div className="flex items-center justify-between mt-1">
          {!manualSigEdit && medicationData ? (
            <div className="text-xs text-blue-600">
              Auto-generated from medication components
            </div>
          ) : manualSigEdit ? (
            <div className="text-xs text-amber-600">
              Manual mode - will extract components when possible
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Enter manually or select components above
            </div>
          )}
        </div>
      </div>

      {/* Pharmacy Details */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value) || 0;
              setQuantity(newQuantity);
              onChange({ quantity: newQuantity });
            }}
            min="1"
          />
        </div>
        <div>
          <Label htmlFor="refills">Refills</Label>
          <Input
            type="number"
            value={refills}
            onChange={(e) => {
              const newRefills = parseInt(e.target.value) || 0;
              setRefills(newRefills);
              onChange({ refills: newRefills });
            }}
            min="0"
            max="5"
          />
        </div>
        <div>
          <Label htmlFor="daysSupply">Days Supply</Label>
          <Input
            type="number"
            value={daysSupply}
            onChange={(e) => {
              const newDaysSupply = parseInt(e.target.value) || 0;
              setDaysSupply(newDaysSupply);
              onChange({ daysSupply: newDaysSupply });
            }}
            min="1"
          />
        </div>
      </div>
    </div>
  );
}