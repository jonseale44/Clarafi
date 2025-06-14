import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";

interface MedicationInputHelperProps {
  medicationName: string;
  dosage: string;
  form: string;
  onMedicationChange: (name: string) => void;
  onDosageChange: (dosage: string) => void;
  onFormChange: (form: string) => void;
  onStandardize?: (standardized: any) => void;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

export function MedicationInputHelper({
  medicationName,
  dosage,
  form,
  onMedicationChange,
  onDosageChange,
  onFormChange,
  onStandardize
}: MedicationInputHelperProps) {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, warnings: [], suggestions: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Common medication name patterns that might need standardization
  const commonMedications = [
    { pattern: /^hctz$/i, suggestion: "Hydrochlorothiazide" },
    { pattern: /^lisinopril$/i, suggestion: "Lisinopril" },
    { pattern: /^montelukast$/i, suggestion: "Montelukast" },
    { pattern: /^singulair$/i, suggestion: "Montelukast (generic for Singulair)" },
    { pattern: /^metformin$/i, suggestion: "Metformin" },
    { pattern: /^glucophage$/i, suggestion: "Metformin (generic for Glucophage)" },
    { pattern: /^amlodipine$/i, suggestion: "Amlodipine" },
    { pattern: /^norvasc$/i, suggestion: "Amlodipine (generic for Norvasc)" },
    { pattern: /^atorvastatin$/i, suggestion: "Atorvastatin" },
    { pattern: /^lipitor$/i, suggestion: "Atorvastatin (generic for Lipitor)" }
  ];

  useEffect(() => {
    validateMedicationInput();
  }, [medicationName, dosage, form]);

  const validateMedicationInput = () => {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    // Check medication name format
    if (medicationName) {
      // Check for compound names that include dosage/form
      const compoundPattern = /^([A-Za-z\s]+?)\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|units?|IU|%)?)\s*(tablet|capsule|liquid|injection|cream|ointment|patch|inhaler|drops)?$/i;
      const match = medicationName.match(compoundPattern);
      
      if (match) {
        warnings.push("Medication name appears to include strength or form");
        suggestions.push(`Consider separating: Name="${match[1].trim()}", Strength="${match[2].trim()}"${match[3] ? `, Form="${match[3]}"` : ''}`);
      }

      // Check for common abbreviations
      const commonMed = commonMedications.find(med => med.pattern.test(medicationName));
      if (commonMed) {
        suggestions.push(`Standard name: ${commonMed.suggestion}`);
      }

      // Check capitalization
      if (medicationName === medicationName.toLowerCase()) {
        suggestions.push("Consider proper case formatting (e.g., 'Montelukast' instead of 'montelukast')");
      }
    }

    // Check dosage format
    if (dosage) {
      const dosagePattern = /^\d+(?:\.\d+)?\s*(mg|mcg|g|mL|units?|IU|%)?$/i;
      if (!dosagePattern.test(dosage)) {
        warnings.push("Dosage format may not be standard");
        suggestions.push("Use format like '10 mg', '5.5 mg', '100 mcg'");
      }
    }

    // Check form consistency
    if (form) {
      const standardForms = ['tablet', 'capsule', 'solution', 'injection', 'cream', 'ointment', 'patch', 'inhaler', 'drops'];
      if (!standardForms.includes(form.toLowerCase())) {
        suggestions.push(`Consider using standard form: ${standardForms.join(', ')}`);
      }
    }

    setValidation({ isValid: warnings.length === 0, warnings, suggestions });
  };

  const handleStandardize = async () => {
    setIsAnalyzing(true);
    
    try {
      // Call backend standardization service
      const response = await fetch('/api/medications/standardize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationName,
          dosage,
          form
        })
      });

      if (response.ok) {
        const standardized = await response.json();
        
        // Apply standardized values
        onMedicationChange(standardized.medicationName || medicationName);
        onDosageChange(standardized.strength || dosage);
        onFormChange(standardized.dosageForm || form);
        
        if (onStandardize) {
          onStandardize(standardized);
        }
      }
    } catch (error) {
      console.error('Failed to standardize medication:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Validation Status */}
      {(validation.warnings.length > 0 || validation.suggestions.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">Input Suggestions</div>
              
              {validation.warnings.length > 0 && (
                <div className="mt-1">
                  <div className="text-xs text-yellow-700 font-medium">Warnings:</div>
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-yellow-700">• {warning}</div>
                  ))}
                </div>
              )}
              
              {validation.suggestions.length > 0 && (
                <div className="mt-1">
                  <div className="text-xs text-yellow-700 font-medium">Suggestions:</div>
                  {validation.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs text-yellow-700">• {suggestion}</div>
                  ))}
                </div>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleStandardize}
                disabled={isAnalyzing}
                className="mt-2 h-6 text-xs"
              >
                {isAnalyzing ? "Standardizing..." : "Auto-Standardize"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success indicator */}
      {validation.isValid && medicationName && dosage && form && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Medication format looks good</span>
        </div>
      )}
    </div>
  );
}