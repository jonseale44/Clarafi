// CPT code autocomplete data (rates fetched from production API)
export interface CPTCodeData {
  code: string;
  description: string;
  category: string;
  complexity?: 'low' | 'moderate' | 'high' | 'straightforward';
  // baseRate removed - use BillingValidationService API for rates
}

export const CPT_CODE_DATABASE: CPTCodeData[] = [
  // Evaluation and Management - New Patient
  { code: "99202", description: "Office visit, new patient, straightforward", category: "E&M New", complexity: "straightforward" },
  { code: "99203", description: "Office visit, new patient, low complexity", category: "E&M New", complexity: "low" },
  { code: "99204", description: "Office visit, new patient, moderate complexity", category: "E&M New", complexity: "moderate" },
  { code: "99205", description: "Office visit, new patient, high complexity", category: "E&M New", complexity: "high" },

  // Evaluation and Management - Established Patient
  { code: "99212", description: "Office visit, established patient, straightforward", category: "E&M Established", complexity: "straightforward" },
  { code: "99213", description: "Office visit, established patient, low complexity", category: "E&M Established", complexity: "low" },
  { code: "99214", description: "Office visit, established patient, moderate complexity", category: "E&M Established", complexity: "moderate" },
  { code: "99215", description: "Office visit, established patient, high complexity", category: "E&M Established", complexity: "high" },

  // Preventive Medicine - New Patient
  { code: "99381", description: "Preventive visit, new patient, infant (under 1)", category: "Preventive New", complexity: "straightforward" },
  { code: "99382", description: "Preventive visit, new patient, early childhood (1-4)", category: "Preventive New", complexity: "straightforward" },
  { code: "99383", description: "Preventive visit, new patient, late childhood (5-11)", category: "Preventive New", complexity: "straightforward" },
  { code: "99384", description: "Preventive visit, new patient, adolescent (12-17)", category: "Preventive New", complexity: "straightforward" },
  { code: "99385", description: "Preventive visit, new patient, young adult (18-39)", category: "Preventive New", complexity: "straightforward" },
  { code: "99386", description: "Preventive visit, new patient, adult (40-64)", category: "Preventive New", complexity: "straightforward" },
  { code: "99387", description: "Preventive visit, new patient, senior (65+)", category: "Preventive New", complexity: "straightforward" },

  // Preventive Medicine - Established Patient
  { code: "99391", description: "Preventive visit, established patient, infant (under 1)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99392", description: "Preventive visit, established patient, early childhood (1-4)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99393", description: "Preventive visit, established patient, late childhood (5-11)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99394", description: "Preventive visit, established patient, adolescent (12-17)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99395", description: "Preventive visit, established patient, young adult (18-39)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99396", description: "Preventive visit, established patient, adult (40-64)", category: "Preventive Established", complexity: "straightforward" },
  { code: "99397", description: "Preventive visit, established patient, senior (65+)", category: "Preventive Established", complexity: "straightforward" },

  // Common Procedures
  { code: "12001", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 2.5 cm or less", category: "Minor Surgery", complexity: "low" },
  { code: "12002", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 2.6 cm to 7.5 cm", category: "Minor Surgery", complexity: "low" },
  { code: "12004", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 7.6 cm to 12.5 cm", category: "Minor Surgery", complexity: "moderate" },

  // Injections and Aspirations
  { code: "20610", description: "Arthrocentesis, aspiration and/or injection, major joint or bursa", category: "Injections", complexity: "moderate" },
  { code: "96372", description: "Therapeutic, prophylactic, or diagnostic injection (specify substance or drug); subcutaneous or intramuscular", category: "Injections", complexity: "low" },

  // Immunizations
  { code: "90471", description: "Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); 1 vaccine", category: "Immunizations", complexity: "straightforward" },
  { code: "90472", description: "Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); each additional vaccine", category: "Immunizations", complexity: "straightforward" },

  // Diagnostic Tests
  { code: "93000", description: "Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report", category: "Diagnostics", complexity: "straightforward" },
  { code: "93005", description: "Electrocardiogram, routine ECG with at least 12 leads; tracing only, without interpretation and report", category: "Diagnostics", complexity: "straightforward" },

  // Dermatology Procedures
  { code: "17110", description: "Destruction (eg, laser surgery, electrosurgery, cryosurgery, chemosurgery, surgical curettement), of benign lesions other than skin tags or cutaneous vascular proliferative lesions; up to 14 lesions", category: "Dermatology", complexity: "low" },
  { code: "17111", description: "Destruction (eg, laser surgery, electrosurgery, cryosurgery, chemosurgery, surgical curettement), of benign lesions other than skin tags or cutaneous vascular proliferative lesions; 15 or more lesions", category: "Dermatology", complexity: "moderate" },

  // Incision and Drainage
  { code: "10060", description: "Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia); simple or single", category: "Minor Surgery", complexity: "low" },
  { code: "10061", description: "Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia); complicated or multiple", category: "Minor Surgery", complexity: "moderate" },

  // Physical Therapy
  { code: "97110", description: "Therapeutic procedure, 1 or more areas, each 15 minutes; therapeutic exercises to develop strength and endurance, range of motion and flexibility", category: "Physical Therapy", complexity: "low" },
  { code: "97112", description: "Therapeutic procedure, 1 or more areas, each 15 minutes; neuromuscular reeducation of movement, balance, coordination, kinesthetic sense, posture, and/or proprioception for sitting and/or standing activities", category: "Physical Therapy", complexity: "moderate" },

  // Laboratory
  { code: "80053", description: "Comprehensive metabolic panel", category: "Laboratory", complexity: "straightforward" },
  { code: "85025", description: "Blood count; complete (CBC), automated (Hgb, Hct, RBC, WBC and platelet count) and automated differential WBC count", category: "Laboratory", complexity: "straightforward" },
  { code: "80061", description: "Lipid panel", category: "Laboratory", complexity: "straightforward" },

  // Radiology
  { code: "71020", description: "Radiologic examination, chest, 2 views, frontal and lateral", category: "Radiology", complexity: "straightforward" },
  { code: "73030", description: "Radiologic examination, shoulder; complete, minimum of 2 views", category: "Radiology", complexity: "straightforward" },
  
  // Emergency Department
  { code: "99281", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A problem focused history; A problem focused examination; and Straightforward medical decision making", category: "Emergency", complexity: "straightforward" },
  { code: "99282", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: An expanded problem focused history; An expanded problem focused examination; and Medical decision making of low complexity", category: "Emergency", complexity: "low" },
  { code: "99283", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: An expanded problem focused history; An expanded problem focused examination; and Medical decision making of moderate complexity", category: "Emergency", complexity: "moderate" },
  { code: "99284", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A detailed history; A detailed examination; and Medical decision making of moderate complexity", category: "Emergency", complexity: "moderate" },
  { code: "99285", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A comprehensive history; A comprehensive examination; and Medical decision making of high complexity", category: "Emergency", complexity: "high" }
];

// Helper functions for autocomplete
export const searchCPTCodes = (query: string): CPTCodeData[] => {
  if (!query) return CPT_CODE_DATABASE.slice(0, 10); // Return first 10 if no query
  
  const lowercaseQuery = query.toLowerCase();
  
  return CPT_CODE_DATABASE.filter(cpt => 
    cpt.code.includes(query) || 
    cpt.description.toLowerCase().includes(lowercaseQuery) ||
    cpt.category.toLowerCase().includes(lowercaseQuery)
  ).slice(0, 20); // Limit to 20 results
};

export const getCPTCodeByCode = (code: string): CPTCodeData | undefined => {
  return CPT_CODE_DATABASE.find(cpt => cpt.code === code);
};

export const getCPTCodesByCategory = (category: string): CPTCodeData[] => {
  return CPT_CODE_DATABASE.filter(cpt => cpt.category === category);
};

export const getAllCategories = (): string[] => {
  const categories: string[] = [];
  const seen = new Set<string>();
  
  for (const cpt of CPT_CODE_DATABASE) {
    if (!seen.has(cpt.category)) {
      seen.add(cpt.category);
      categories.push(cpt.category);
    }
  }
  
  return categories;
};