/**
 * LOINC Lookup Service
 * Provides standardized LOINC codes for common lab tests to ensure database compatibility
 */

interface LOINCMapping {
  labName: string;
  testName: string;
  loincCode: string;
  specimenType: string;
  fastingRequired: boolean;
  aliases: string[];
}

export class LOINCLookupService {
  private static readonly COMMON_LOINC_MAPPINGS: LOINCMapping[] = [
    // Complete Blood Count (CBC)
    {
      labName: "Complete Blood Count",
      testName: "Complete Blood Count",
      loincCode: "58410-2",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["CBC", "Complete Blood Count", "CBC with Diff", "CBC w/Diff", "Complete Blood Count with Differential"]
    },
    {
      labName: "CBC",
      testName: "Complete Blood Count",
      loincCode: "58410-2",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["CBC", "Complete Blood Count", "CBC with Diff", "CBC w/Diff"]
    },

    // Comprehensive Metabolic Panel (CMP)
    {
      labName: "Comprehensive Metabolic Panel",
      testName: "Comprehensive Metabolic Panel",
      loincCode: "24323-8",
      specimenType: "blood",
      fastingRequired: true,
      aliases: ["CMP", "Comprehensive Metabolic Panel", "Complete Metabolic Panel", "Chem 14", "Chemistry Panel"]
    },
    {
      labName: "CMP",
      testName: "Comprehensive Metabolic Panel",
      loincCode: "24323-8",
      specimenType: "blood",
      fastingRequired: true,
      aliases: ["CMP", "Comprehensive Metabolic Panel", "Complete Metabolic Panel"]
    },

    // Basic Metabolic Panel (BMP)
    {
      labName: "Basic Metabolic Panel",
      testName: "Basic Metabolic Panel",
      loincCode: "51990-0",
      specimenType: "blood",
      fastingRequired: true,
      aliases: ["BMP", "Basic Metabolic Panel", "Chem 8", "Chemistry Basic"]
    },
    {
      labName: "BMP",
      testName: "Basic Metabolic Panel",
      loincCode: "51990-0",
      specimenType: "blood",
      fastingRequired: true,
      aliases: ["BMP", "Basic Metabolic Panel"]
    },

    // Lipid Panel
    {
      labName: "Lipid Panel",
      testName: "Lipid Panel",
      loincCode: "57698-3",
      specimenType: "blood",
      fastingRequired: true,
      aliases: ["Lipid Panel", "Lipid Profile", "Cholesterol Panel", "Lipids"]
    },

    // Thyroid Function
    {
      labName: "TSH",
      testName: "Thyroid Stimulating Hormone",
      loincCode: "11579-0",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["TSH", "Thyroid Stimulating Hormone", "Thyrotropin"]
    },
    {
      labName: "Free T4",
      testName: "Free Thyroxine",
      loincCode: "3024-7",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["Free T4", "Free Thyroxine", "FT4"]
    },

    // Hemoglobin A1C
    {
      labName: "Hemoglobin A1C",
      testName: "Hemoglobin A1C",
      loincCode: "4548-4",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["A1C", "HbA1c", "Hemoglobin A1C", "Glycated Hemoglobin"]
    },
    {
      labName: "A1C",
      testName: "Hemoglobin A1C",
      loincCode: "4548-4",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["A1C", "HbA1c", "Hemoglobin A1C"]
    },

    // Liver Function Tests
    {
      labName: "ALT",
      testName: "Alanine Aminotransferase",
      loincCode: "1742-6",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["ALT", "Alanine Aminotransferase", "SGPT"]
    },
    {
      labName: "AST",
      testName: "Aspartate Aminotransferase",
      loincCode: "1920-8",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["AST", "Aspartate Aminotransferase", "SGOT"]
    },

    // Urinalysis
    {
      labName: "Urinalysis",
      testName: "Urinalysis",
      loincCode: "5794-3",
      specimenType: "urine",
      fastingRequired: false,
      aliases: ["Urinalysis", "UA", "Urine Analysis", "Complete Urinalysis"]
    },
    {
      labName: "UA",
      testName: "Urinalysis",
      loincCode: "5794-3",
      specimenType: "urine",
      fastingRequired: false,
      aliases: ["UA", "Urinalysis"]
    },

    // Vitamin Levels
    {
      labName: "Vitamin D",
      testName: "25-Hydroxyvitamin D",
      loincCode: "14905-4",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["Vitamin D", "25-OH Vitamin D", "25-Hydroxyvitamin D", "Vitamin D 25-OH"]
    },
    {
      labName: "Vitamin B12",
      testName: "Vitamin B12",
      loincCode: "2132-9",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["Vitamin B12", "B12", "Cobalamin"]
    },

    // Inflammatory Markers
    {
      labName: "ESR",
      testName: "Erythrocyte Sedimentation Rate",
      loincCode: "4537-7",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["ESR", "Erythrocyte Sedimentation Rate", "Sed Rate"]
    },
    {
      labName: "CRP",
      testName: "C-Reactive Protein",
      loincCode: "1988-5",
      specimenType: "blood",
      fastingRequired: false,
      aliases: ["CRP", "C-Reactive Protein"]
    }
  ];

  /**
   * Look up LOINC code for a given lab test
   */
  static lookupLOINC(labName: string, testName?: string): LOINCMapping | null {
    const searchTerm = (testName || labName).toLowerCase().trim();
    
    // Direct match by lab name or test name
    const directMatch = this.COMMON_LOINC_MAPPINGS.find(mapping => 
      mapping.labName.toLowerCase() === searchTerm ||
      mapping.testName.toLowerCase() === searchTerm
    );
    
    if (directMatch) {
      return directMatch;
    }

    // Search by aliases
    const aliasMatch = this.COMMON_LOINC_MAPPINGS.find(mapping =>
      mapping.aliases.some(alias => alias.toLowerCase() === searchTerm)
    );

    if (aliasMatch) {
      return aliasMatch;
    }

    // Fuzzy matching for partial matches
    const fuzzyMatch = this.COMMON_LOINC_MAPPINGS.find(mapping =>
      mapping.aliases.some(alias => 
        alias.toLowerCase().includes(searchTerm) || 
        searchTerm.includes(alias.toLowerCase())
      )
    );

    return fuzzyMatch || null;
  }

  /**
   * Standardize lab order with LOINC code lookup
   */
  static standardizeLabOrder(labOrder: {
    labName?: string;
    testName?: string;
    testCode?: string;
    specimenType?: string;
    fastingRequired?: boolean;
  }): {
    labName: string;
    testName: string;
    testCode: string;
    specimenType: string;
    fastingRequired: boolean;
  } {
    const searchName = labOrder.testName || labOrder.labName || "";
    const mapping = this.lookupLOINC(searchName);

    if (mapping) {
      console.log(`[LOINCLookup] Found mapping for "${searchName}": ${mapping.loincCode}`);
      return {
        labName: mapping.labName,
        testName: mapping.testName,
        testCode: mapping.loincCode,
        specimenType: mapping.specimenType,
        fastingRequired: mapping.fastingRequired
      };
    }

    // If no mapping found, use provided values or defaults
    console.log(`[LOINCLookup] No mapping found for "${searchName}", using provided values`);
    return {
      labName: labOrder.labName || searchName,
      testName: labOrder.testName || labOrder.labName || searchName,
      testCode: labOrder.testCode || "", // Will need manual review
      specimenType: labOrder.specimenType || "blood",
      fastingRequired: labOrder.fastingRequired || false
    };
  }

  /**
   * Get all available LOINC mappings for reference
   */
  static getAllMappings(): LOINCMapping[] {
    return [...this.COMMON_LOINC_MAPPINGS];
  }

  /**
   * Check if a LOINC code exists in our mappings
   */
  static isValidLOINC(loincCode: string): boolean {
    return this.COMMON_LOINC_MAPPINGS.some(mapping => mapping.loincCode === loincCode);
  }
}