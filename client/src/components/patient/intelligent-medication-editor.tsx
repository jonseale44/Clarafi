/**
 * Intelligent Medication Editor
 * 
 * Provides instant medication editing with preloaded data for clinical speed
 * - Standard strength dropdowns for each medication
 * - Valid dosage forms only
 * - Automatic sig generation
 * - Real-time validation
 */

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

// Preloaded medication database for instant lookups
const MEDICATION_DATABASE: Record<string, {
  standardStrengths: string[];
  availableForms: string[];
  formRoutes: Record<string, string[]>;
  sigTemplates: Record<string, string>;
  therapeuticClass: string;
  commonDoses: string[];
  brandNames: string[];
}> = {
  'hydrochlorothiazide': {
    standardStrengths: ['12.5 mg', '25 mg', '50 mg'],
    availableForms: ['tablet', 'capsule'],
    formRoutes: { 'tablet': ['oral'], 'capsule': ['oral'] },
    sigTemplates: {
      '12.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '25 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '25 mg-tablet-oral-twice': 'Take 1 tablet by mouth twice daily'
    },
    therapeuticClass: 'Thiazide Diuretic',
    commonDoses: ['25 mg once daily', '50 mg once daily'],
    brandNames: ['Microzide']
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
    brandNames: ['Prinivil', 'Zestril']
  },
  'aspirin': {
    standardStrengths: ['81 mg', '325 mg', '500 mg', '650 mg'],
    availableForms: ['tablet', 'chewable tablet', 'enteric-coated tablet'],
    formRoutes: { 
      'tablet': ['oral'], 
      'chewable tablet': ['oral'], 
      'enteric-coated tablet': ['oral'] 
    },
    sigTemplates: {
      '81 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
      '81 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily',
      '325 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain',
      '325 mg-enteric-coated tablet-oral': 'Take 1 enteric-coated tablet by mouth twice daily'
    },
    therapeuticClass: 'Antiplatelet/NSAID',
    commonDoses: ['81 mg once daily', '325 mg twice daily'],
    brandNames: ['Bayer', 'Ecotrin', 'Bufferin']
  },
  'montelukast': {
    standardStrengths: ['4 mg', '5 mg', '10 mg'],
    availableForms: ['tablet', 'chewable tablet', 'granules'],
    formRoutes: { 
      'tablet': ['oral'], 
      'chewable tablet': ['oral'], 
      'granules': ['oral'] 
    },
    sigTemplates: {
      '4 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily in the evening',
      '5 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily in the evening',
      '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening'
    },
    therapeuticClass: 'Leukotriene Receptor Antagonist',
    commonDoses: ['10 mg once daily (adults)', '5 mg once daily (children 6-14)'],
    brandNames: ['Singulair']
  },
  'metformin': {
    standardStrengths: ['500 mg', '850 mg', '1000 mg'],
    availableForms: ['tablet', 'extended-release tablet'],
    formRoutes: { 
      'tablet': ['oral'], 
      'extended-release tablet': ['oral'] 
    },
    sigTemplates: {
      '500 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '850 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '1000 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
      '500 mg-extended-release tablet-oral': 'Take 1 extended-release tablet by mouth once daily with dinner'
    },
    therapeuticClass: 'Biguanide Antidiabetic',
    commonDoses: ['500 mg twice daily', '1000 mg twice daily'],
    brandNames: ['Glucophage', 'Fortamet']
  }
};

interface IntelligentMedicationEditorProps {
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

export function IntelligentMedicationEditor({
  medicationName,
  initialStrength = '',
  initialForm = '',
  initialRoute = '',
  initialSig = '',
  initialQuantity = 30,
  initialRefills = 2,
  initialDaysSupply = 90,
  onChange
}: IntelligentMedicationEditorProps) {
  const [strength, setStrength] = useState(initialStrength);
  const [form, setForm] = useState(initialForm);
  const [route, setRoute] = useState(initialRoute);
  const [sig, setSig] = useState(initialSig);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [refills, setRefills] = useState(initialRefills);
  const [daysSupply, setDaysSupply] = useState(initialDaysSupply);
  const [manualSigEdit, setManualSigEdit] = useState(false);

  // Get medication intelligence data
  const medicationData = useMemo(() => {
    const normalizedName = medicationName.toLowerCase().trim();
    return MEDICATION_DATABASE[normalizedName as keyof typeof MEDICATION_DATABASE] || null;
  }, [medicationName]);

  // Auto-generate sig when components change (unless manually edited)
  useEffect(() => {
    if (!manualSigEdit && medicationData && strength && form && route) {
      const sigKey = `${strength}-${form}-${route}`;
      const autoSig = medicationData.sigTemplates[sigKey];
      
      if (autoSig) {
        setSig(autoSig);
        onChange({ sig: autoSig });
      }
    }
  }, [strength, form, route, medicationData, manualSigEdit, onChange]);

  // Get available forms for current medication
  const availableForms = useMemo(() => {
    return medicationData?.availableForms || ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment'];
  }, [medicationData]);

  // Get available routes for current form
  const availableRoutes = useMemo(() => {
    if (medicationData && form && medicationData.formRoutes[form]) {
      return medicationData.formRoutes[form];
    }
    return ['oral', 'topical', 'injection', 'inhalation', 'ophthalmic'];
  }, [medicationData, form]);

  // Get available strengths
  const availableStrengths = useMemo(() => {
    return medicationData?.standardStrengths || [];
  }, [medicationData]);

  // Validation status
  const validation = useMemo(() => {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (medicationData) {
      // Check strength validity
      if (strength && !medicationData.standardStrengths.includes(strength)) {
        warnings.push(`${strength} is not a standard strength`);
        suggestions.push(`Standard strengths: ${medicationData.standardStrengths.join(', ')}`);
      }
      
      // Check form validity
      if (form && !medicationData.availableForms.includes(form)) {
        warnings.push(`${form} is not available for ${medicationName}`);
        suggestions.push(`Available forms: ${medicationData.availableForms.join(', ')}`);
      }
      
      // Check route validity for form
      if (form && route && medicationData.formRoutes[form] && !medicationData.formRoutes[form].includes(route)) {
        warnings.push(`${route} route not appropriate for ${form}`);
        suggestions.push(`Valid routes for ${form}: ${medicationData.formRoutes[form].join(', ')}`);
      }
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }, [medicationData, medicationName, strength, form, route]);

  const handleStrengthChange = (newStrength: string) => {
    setStrength(newStrength);
    onChange({ dosage: newStrength });
  };

  const handleFormChange = (newForm: string) => {
    setForm(newForm);
    
    // Auto-update route if current route is invalid for new form
    if (medicationData && medicationData.formRoutes[newForm]) {
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
    onChange({ sig: newSig });
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    onChange({ quantity: newQuantity });
  };

  const handleRefillsChange = (newRefills: number) => {
    setRefills(newRefills);
    onChange({ refills: newRefills });
  };

  const handleDaysSupplyChange = (newDaysSupply: number) => {
    setDaysSupply(newDaysSupply);
    onChange({ daysSupply: newDaysSupply });
  };

  return (
    <div className="space-y-4">
      {/* Medication Info Header */}
      {medicationData && (
        <div className="flex items-center gap-2 p-2 bg-navy-blue-50 rounded-md">
          <Info className="h-4 w-4 text-navy-blue-600" />
          <div className="text-sm">
            <span className="font-medium">{medicationData.therapeuticClass}</span>
            {medicationData.brandNames && (
              <span className="text-gray-600 ml-2">
                ({medicationData.brandNames.join(', ')})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Strength Selection - Fast Dropdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="strength">Strength *</Label>
          {availableStrengths.length > 0 ? (
            <Select value={strength} onValueChange={handleStrengthChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent>
                {availableStrengths.map((str) => (
                  <SelectItem key={str} value={str}>
                    {str}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="strength"
              value={strength}
              onChange={(e) => handleStrengthChange(e.target.value)}
              placeholder="e.g., 10 mg"
            />
          )}
          {medicationData?.commonDoses && (
            <div className="text-xs text-gray-500 mt-1">
              Common: {medicationData.commonDoses.join(', ')}
            </div>
          )}
        </div>

        {/* Form Selection - Restricted to Valid Options */}
        <div className="col-span-1">
          <Label htmlFor="form">Dosage Form *</Label>
          <Select value={form} onValueChange={handleFormChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select form" />
            </SelectTrigger>
            <SelectContent>
              {availableForms.map((formOption) => (
                <SelectItem key={formOption} value={formOption}>
                  {formOption.charAt(0).toUpperCase() + formOption.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Route Selection - Auto-filtered by Form */}
        <div className="col-span-1">
          <Label htmlFor="route">Route *</Label>
          <Select value={route} onValueChange={handleRouteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              {availableRoutes.map((routeOption) => (
                <SelectItem key={routeOption} value={routeOption}>
                  {routeOption.charAt(0).toUpperCase() + routeOption.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validation Feedback */}
      {!validation.isValid && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-red-600">{warning}</div>
              ))}
              {validation.suggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-gray-600">{suggestion}</div>
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

      {/* Sig Instructions - Auto-generated or Manual */}
      <div>
        <Label htmlFor="sig">Patient Instructions (Sig) *</Label>
        <Textarea
          id="sig"
          value={sig}
          onChange={(e) => handleSigChange(e.target.value)}
          placeholder="Patient instructions will generate automatically..."
          className="min-h-[60px]"
        />
        {!manualSigEdit && medicationData && (
          <div className="text-xs text-navy-blue-600 mt-1">
            Instructions auto-generated based on medication components
          </div>
        )}
        {manualSigEdit && (
          <div className="text-xs text-amber-600 mt-1">
            Manual edit mode - instructions will not auto-update
          </div>
        )}
      </div>

      {/* Quantity, Refills, Days Supply */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
            min="1"
          />
        </div>
        <div>
          <Label htmlFor="refills">Refills</Label>
          <Input
            id="refills"
            type="number"
            value={refills}
            onChange={(e) => handleRefillsChange(parseInt(e.target.value) || 0)}
            min="0"
            max="5"
          />
        </div>
        <div>
          <Label htmlFor="daysSupply">Days Supply</Label>
          <Input
            id="daysSupply"
            type="number"
            value={daysSupply}
            onChange={(e) => handleDaysSupplyChange(parseInt(e.target.value) || 0)}
            min="1"
          />
        </div>
      </div>
    </div>
  );
}