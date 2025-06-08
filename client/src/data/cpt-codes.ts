// Comprehensive CPT code database for autocomplete
export interface CPTCodeData {
  code: string;
  description: string;
  category: string;
  complexity?: 'low' | 'moderate' | 'high' | 'straightforward';
  baseRate?: number;
}

export const CPT_CODE_DATABASE: CPTCodeData[] = [
  // Evaluation and Management - New Patient
  { code: "99202", description: "Office visit, new patient, straightforward", category: "E&M New", complexity: "straightforward", baseRate: 109.81 },
  { code: "99203", description: "Office visit, new patient, low complexity", category: "E&M New", complexity: "low", baseRate: 154.81 },
  { code: "99204", description: "Office visit, new patient, moderate complexity", category: "E&M New", complexity: "moderate", baseRate: 242.85 },
  { code: "99205", description: "Office visit, new patient, high complexity", category: "E&M New", complexity: "high", baseRate: 315.92 },

  // Evaluation and Management - Established Patient
  { code: "99212", description: "Office visit, established patient, straightforward", category: "E&M Established", complexity: "straightforward", baseRate: 73.97 },
  { code: "99213", description: "Office visit, established patient, low complexity", category: "E&M Established", complexity: "low", baseRate: 109.81 },
  { code: "99214", description: "Office visit, established patient, moderate complexity", category: "E&M Established", complexity: "moderate", baseRate: 167.09 },
  { code: "99215", description: "Office visit, established patient, high complexity", category: "E&M Established", complexity: "high", baseRate: 218.14 },

  // Preventive Medicine - New Patient
  { code: "99381", description: "Preventive visit, new patient, infant (under 1)", category: "Preventive New", complexity: "straightforward", baseRate: 180.45 },
  { code: "99382", description: "Preventive visit, new patient, early childhood (1-4)", category: "Preventive New", complexity: "straightforward", baseRate: 195.32 },
  { code: "99383", description: "Preventive visit, new patient, late childhood (5-11)", category: "Preventive New", complexity: "straightforward", baseRate: 205.18 },
  { code: "99384", description: "Preventive visit, new patient, adolescent (12-17)", category: "Preventive New", complexity: "straightforward", baseRate: 215.04 },
  { code: "99385", description: "Preventive visit, new patient, young adult (18-39)", category: "Preventive New", complexity: "straightforward", baseRate: 224.90 },
  { code: "99386", description: "Preventive visit, new patient, adult (40-64)", category: "Preventive New", complexity: "straightforward", baseRate: 245.63 },
  { code: "99387", description: "Preventive visit, new patient, senior (65+)", category: "Preventive New", complexity: "straightforward", baseRate: 265.35 },

  // Preventive Medicine - Established Patient
  { code: "99391", description: "Preventive visit, established patient, infant (under 1)", category: "Preventive Established", complexity: "straightforward", baseRate: 155.72 },
  { code: "99392", description: "Preventive visit, established patient, early childhood (1-4)", category: "Preventive Established", complexity: "straightforward", baseRate: 170.59 },
  { code: "99393", description: "Preventive visit, established patient, late childhood (5-11)", category: "Preventive Established", complexity: "straightforward", baseRate: 180.45 },
  { code: "99394", description: "Preventive visit, established patient, adolescent (12-17)", category: "Preventive Established", complexity: "straightforward", baseRate: 190.31 },
  { code: "99395", description: "Preventive visit, established patient, young adult (18-39)", category: "Preventive Established", complexity: "straightforward", baseRate: 200.17 },
  { code: "99396", description: "Preventive visit, established patient, adult (40-64)", category: "Preventive Established", complexity: "straightforward", baseRate: 220.90 },
  { code: "99397", description: "Preventive visit, established patient, senior (65+)", category: "Preventive Established", complexity: "straightforward", baseRate: 240.63 },

  // Common Procedures
  { code: "12001", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 2.5 cm or less", category: "Minor Surgery", complexity: "low", baseRate: 142.26 },
  { code: "12002", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 2.6 cm to 7.5 cm", category: "Minor Surgery", complexity: "low", baseRate: 167.15 },
  { code: "12004", description: "Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (including hands and feet); 7.6 cm to 12.5 cm", category: "Minor Surgery", complexity: "moderate", baseRate: 201.42 },

  // Injections and Aspirations
  { code: "20610", description: "Arthrocentesis, aspiration and/or injection, major joint or bursa", category: "Injections", complexity: "moderate", baseRate: 89.23 },
  { code: "96372", description: "Therapeutic, prophylactic, or diagnostic injection (specify substance or drug); subcutaneous or intramuscular", category: "Injections", complexity: "low", baseRate: 25.18 },

  // Immunizations
  { code: "90471", description: "Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); 1 vaccine", category: "Immunizations", complexity: "straightforward", baseRate: 25.93 },
  { code: "90472", description: "Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); each additional vaccine", category: "Immunizations", complexity: "straightforward", baseRate: 15.58 },

  // Diagnostic Tests
  { code: "93000", description: "Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report", category: "Diagnostics", complexity: "straightforward", baseRate: 31.84 },
  { code: "93005", description: "Electrocardiogram, routine ECG with at least 12 leads; tracing only, without interpretation and report", category: "Diagnostics", complexity: "straightforward", baseRate: 18.72 },

  // Dermatology Procedures
  { code: "17110", description: "Destruction (eg, laser surgery, electrosurgery, cryosurgery, chemosurgery, surgical curettement), of benign lesions other than skin tags or cutaneous vascular proliferative lesions; up to 14 lesions", category: "Dermatology", complexity: "low", baseRate: 124.83 },
  { code: "17111", description: "Destruction (eg, laser surgery, electrosurgery, cryosurgery, chemosurgery, surgical curettement), of benign lesions other than skin tags or cutaneous vascular proliferative lesions; 15 or more lesions", category: "Dermatology", complexity: "moderate", baseRate: 186.45 },

  // Incision and Drainage
  { code: "10060", description: "Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia); simple or single", category: "Minor Surgery", complexity: "low", baseRate: 178.42 },
  { code: "10061", description: "Incision and drainage of abscess (eg, carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia); complicated or multiple", category: "Minor Surgery", complexity: "moderate", baseRate: 265.83 },

  // Physical Therapy
  { code: "97110", description: "Therapeutic procedure, 1 or more areas, each 15 minutes; therapeutic exercises to develop strength and endurance, range of motion and flexibility", category: "Physical Therapy", complexity: "low", baseRate: 45.72 },
  { code: "97112", description: "Therapeutic procedure, 1 or more areas, each 15 minutes; neuromuscular reeducation of movement, balance, coordination, kinesthetic sense, posture, and/or proprioception for sitting and/or standing activities", category: "Physical Therapy", complexity: "moderate", baseRate: 48.15 },

  // Laboratory
  { code: "80053", description: "Comprehensive metabolic panel", category: "Laboratory", complexity: "straightforward", baseRate: 15.43 },
  { code: "85025", description: "Blood count; complete (CBC), automated (Hgb, Hct, RBC, WBC and platelet count) and automated differential WBC count", category: "Laboratory", complexity: "straightforward", baseRate: 10.86 },
  { code: "80061", description: "Lipid panel", category: "Laboratory", complexity: "straightforward", baseRate: 12.74 },

  // Radiology
  { code: "71020", description: "Radiologic examination, chest, 2 views, frontal and lateral", category: "Radiology", complexity: "straightforward", baseRate: 45.82 },
  { code: "73030", description: "Radiologic examination, shoulder; complete, minimum of 2 views", category: "Radiology", complexity: "straightforward", baseRate: 52.18 },
  
  // Emergency Department
  { code: "99281", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A problem focused history; A problem focused examination; and Straightforward medical decision making", category: "Emergency", complexity: "straightforward", baseRate: 115.32 },
  { code: "99282", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: An expanded problem focused history; An expanded problem focused examination; and Medical decision making of low complexity", category: "Emergency", complexity: "low", baseRate: 185.74 },
  { code: "99283", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: An expanded problem focused history; An expanded problem focused examination; and Medical decision making of moderate complexity", category: "Emergency", complexity: "moderate", baseRate: 275.63 },
  { code: "99284", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A detailed history; A detailed examination; and Medical decision making of moderate complexity", category: "Emergency", complexity: "moderate", baseRate: 415.82 },
  { code: "99285", description: "Emergency department visit for the evaluation and management of a patient, which requires these 3 key components: A comprehensive history; A comprehensive examination; and Medical decision making of high complexity", category: "Emergency", complexity: "high", baseRate: 615.43 }
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