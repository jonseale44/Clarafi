import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  Save,
  RefreshCw,
  Check,
  X,
  Search,
  Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CPTAutocomplete } from "@/components/ui/cpt-autocomplete";
import { DiagnosisAutocomplete } from "@/components/ui/diagnosis-autocomplete";
import { getCPTCodeByCode, type CPTCodeData } from "@/data/cpt-codes";

interface CPTCode {
  id: string; // Unique ID to fix mapping issues
  code: string;
  description: string;
  complexity?: 'low' | 'moderate' | 'high' | 'straightforward';
  category?: string;
  baseRate?: number;
  modifiers?: string[]; // CPT modifiers (e.g., ['25', '59', 'LT'])
  modifierReasoning?: string; // GPT's reasoning for modifier selection
}

interface DiagnosisCode {
  id: string; // Unique ID to fix mapping issues
  diagnosis: string;
  icd10Code: string;
  isPrimary?: boolean;
}

interface CPTDiagnosisMapping {
  diagnosisId: string;
  cptCodeId: string;
  selected: boolean;
}

// Helper function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface CPTCodesProps {
  patientId: number;
  encounterId: number;
  isAutoGenerating?: boolean;
  billingProgress?: number;
}

export function CPTCodesDiagnoses({ patientId, encounterId, isAutoGenerating = false, billingProgress = 0 }: CPTCodesProps) {
  const [cptCodes, setCPTCodes] = useState<CPTCode[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisCode[]>([]);
  const [mappings, setMappings] = useState<CPTDiagnosisMapping[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCPT, setEditingCPT] = useState<number | null>(null);
  const [editingDiagnosis, setEditingDiagnosis] = useState<number | null>(null);
  const [editCPTValue, setEditCPTValue] = useState("");
  const [editCPTDescription, setEditCPTDescription] = useState("");
  const [editDiagnosisValue, setEditDiagnosisValue] = useState("");
  const [editDiagnosisICD, setEditDiagnosisICD] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing CPT codes and diagnoses for the encounter
  const { data: encounterData, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/encounters/${encounterId}`],
    enabled: !!patientId && !!encounterId
  });

  // Debug logging for encounter data
  useEffect(() => {
    console.log("🔍 [CPTComponent] encounterData updated:", encounterData);
    if (encounterData && typeof encounterData === 'object' && 'encounter' in encounterData) {
      const encounter = (encounterData as any).encounter;
      console.log("🔍 [CPTComponent] encounter.cptCodes:", encounter.cptCodes);
      console.log("🔍 [CPTComponent] encounter.draftDiagnoses:", encounter.draftDiagnoses);
    }
  }, [encounterData]);

  // Convert legacy data to new format with unique IDs
  const convertToUniqueIdFormat = (cptCodes: any[], diagnoses: any[]) => {
    const convertedCPTCodes: CPTCode[] = cptCodes.map((cpt, index) => ({
      id: cpt.id || `cpt-${index}-${Date.now()}`,
      code: cpt.code,
      description: cpt.description,
      complexity: cpt.complexity,
      category: cpt.category,
      baseRate: cpt.baseRate
    }));

    const convertedDiagnoses: DiagnosisCode[] = diagnoses.map((diag, index) => ({
      id: diag.id || `diag-${index}-${Date.now()}`,
      diagnosis: diag.diagnosis,
      icd10Code: diag.icd10Code,
      isPrimary: diag.isPrimary
    }));

    return { convertedCPTCodes, convertedDiagnoses };
  };

  // Load data when encounter data is available
  useEffect(() => {
    if (encounterData && typeof encounterData === 'object' && 'encounter' in encounterData) {
      const encounter = (encounterData as any).encounter;
      
      if (encounter.cptCodes && Array.isArray(encounter.cptCodes) && encounter.cptCodes.length > 0) {
        const { convertedCPTCodes } = convertToUniqueIdFormat(encounter.cptCodes, []);
        setCPTCodes(convertedCPTCodes);
      }
      
      if (encounter.draftDiagnoses && Array.isArray(encounter.draftDiagnoses) && encounter.draftDiagnoses.length > 0) {
        const { convertedDiagnoses } = convertToUniqueIdFormat([], encounter.draftDiagnoses);
        setDiagnoses(convertedDiagnoses);
      }
      
      // Initialize mappings with intelligent associations based on clinical relevance
      if (encounter.cptCodes && encounter.draftDiagnoses && 
          encounter.cptCodes.length > 0 && encounter.draftDiagnoses.length > 0) {
        const { convertedCPTCodes, convertedDiagnoses } = convertToUniqueIdFormat(encounter.cptCodes, encounter.draftDiagnoses);
        initializeMappings(convertedCPTCodes, convertedDiagnoses);
        
        // Apply intelligent diagnosis-to-CPT associations with unique IDs
        setTimeout(() => {
          const intelligentMappings: CPTDiagnosisMapping[] = [];
          convertedDiagnoses.forEach((diagnosis) => {
            convertedCPTCodes.forEach((cpt) => {
              // Define intelligent associations based on clinical logic
              let shouldSelect = false;
              
              // Problem-focused E&M codes (99212-99215, 99202-99205) pair ONLY with clinical diagnoses
              if (['99212', '99213', '99214', '99215', '99202', '99203', '99204', '99205'].includes(cpt.code)) {
                // Associate ONLY with non-wellness diagnoses (not Z codes)
                shouldSelect = !diagnosis.icd10Code?.startsWith('Z') && 
                              !diagnosis.diagnosis?.toLowerCase().includes('routine') &&
                              !diagnosis.diagnosis?.toLowerCase().includes('examination');
              }
              
              // Preventive medicine codes (99381-99397) pair ONLY with wellness diagnoses
              if (['99381', '99382', '99383', '99384', '99385', '99386', '99387',
                   '99391', '99392', '99393', '99394', '99395', '99396', '99397'].includes(cpt.code)) {
                // Associate ONLY with Z00.xx (wellness) diagnoses or routine examinations
                shouldSelect = diagnosis.icd10Code?.startsWith('Z00') ||
                              diagnosis.diagnosis?.toLowerCase().includes('routine') ||
                              diagnosis.diagnosis?.toLowerCase().includes('examination');
              }
              
              // Procedure codes (17110, 17111) pair with specific diagnoses
              if (['17110', '17111'].includes(cpt.code)) {
                // Associate with wart/lesion diagnoses (B07.xx, D23.xx, etc.)
                shouldSelect = diagnosis.icd10Code?.startsWith('B07') || 
                              diagnosis.icd10Code?.startsWith('D23') ||
                              diagnosis.diagnosis?.toLowerCase().includes('wart') ||
                              diagnosis.diagnosis?.toLowerCase().includes('lesion');
              }
              
              intelligentMappings.push({
                diagnosisId: diagnosis.id,
                cptCodeId: cpt.id,
                selected: shouldSelect
              });
            });
          });
          setMappings(intelligentMappings);
        }, 100);
      }
    }
  }, [encounterData]);

  // Generate CPT codes automatically from SOAP note
  const generateCPTCodes = async () => {
    setIsGenerating(true);
    try {
      // First get the current SOAP note
      const soapResponse = await fetch(`/api/patients/${patientId}/encounters/${encounterId}/soap-note`);
      if (!soapResponse.ok) {
        throw new Error("No SOAP note found. Please generate a SOAP note first.");
      }
      
      const { soapNote } = await soapResponse.json();
      
      // Extract CPT codes from SOAP note
      const response = await fetch(`/api/patients/${patientId}/encounters/${encounterId}/extract-cpt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ soapNote }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract CPT codes: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert GPT data to unique ID format before setting state
      const { convertedCPTCodes, convertedDiagnoses } = convertToUniqueIdFormat(data.cptCodes || [], data.diagnoses || []);
      
      setCPTCodes(convertedCPTCodes);
      setDiagnoses(convertedDiagnoses);
      
      // Use GPT's intelligent mappings with clinical rationale - GPT is smarter than hardcoded rules
      initializeMappings(convertedCPTCodes, convertedDiagnoses, data.intelligentMappings);
      
      toast({
        title: "CPT Codes Generated",
        description: `Extracted ${data.cptCodes?.length || 0} CPT codes and ${data.diagnoses?.length || 0} diagnoses`,
      });

    } catch (error) {
      console.error("Error generating CPT codes:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Initialize mappings between diagnoses and CPT codes using GPT's intelligent clinical decisions
  const initializeMappings = (cptCodes: CPTCode[], diagnoses: DiagnosisCode[], gptMappings?: any[]) => {
    const newMappings: CPTDiagnosisMapping[] = [];
    
    // If GPT provided intelligent mappings with clinical rationale, use them
    if (gptMappings && gptMappings.length > 0) {
      console.log('🧠 Using GPT intelligent mappings with clinical rationale:', gptMappings);
      
      // Initialize all mappings as unselected first
      diagnoses.forEach((diagnosis, diagnosisIdx) => {
        cptCodes.forEach((cpt, cptIdx) => {
          newMappings.push({
            diagnosisId: diagnosis.id,
            cptCodeId: cpt.id,
            selected: false
          });
        });
      });
      
      // Apply GPT's intelligent selections
      gptMappings.forEach((mapping) => {
        const diagnosisIdx = mapping.diagnosisIndex;
        const cptIdx = mapping.cptIndex;
        
        if (diagnosisIdx < diagnoses.length && cptIdx < cptCodes.length) {
          const diagnosis = diagnoses[diagnosisIdx];
          const cpt = cptCodes[cptIdx];
          
          console.log(`🧠 GPT mapping: ${diagnosis.diagnosis} (${diagnosis.icd10Code}) → ${cpt.code} (${cpt.description})`);
          console.log(`🧠 Clinical rationale: ${mapping.clinicalRationale}`);
          
          const mappingIndex = newMappings.findIndex(m => 
            m.diagnosisId === diagnosis.id && m.cptCodeId === cpt.id
          );
          
          if (mappingIndex !== -1) {
            newMappings[mappingIndex].selected = mapping.shouldSelect;
          }
        }
      });
    } else {
      // Fallback: minimal default mappings if GPT didn't provide intelligent mappings
      console.log('⚠️ No GPT mappings provided, using minimal defaults');
      diagnoses.forEach((diagnosis) => {
        cptCodes.forEach((cpt) => {
          // Only select primary diagnosis with first CPT code as minimal fallback
          const shouldSelect = diagnosis.isPrimary === true && cpt === cptCodes[0];
          
          newMappings.push({
            diagnosisId: diagnosis.id,
            cptCodeId: cpt.id,
            selected: shouldSelect
          });
        });
      });
    }
    
    setMappings(newMappings);
  };

  // Toggle mapping between diagnosis and CPT code
  const toggleMapping = (diagnosisId: string, cptCodeId: string) => {
    setMappings(prev => 
      prev.map(mapping => 
        mapping.diagnosisId === diagnosisId && mapping.cptCodeId === cptCodeId
          ? { ...mapping, selected: !mapping.selected }
          : mapping
      )
    );
  };

  // Check if a diagnosis-CPT combination is selected
  const isMappingSelected = (diagnosisId: string, cptCodeId: string): boolean => {
    return mappings.some(m => 
      m.diagnosisId === diagnosisId && 
      m.cptCodeId === cptCodeId && 
      m.selected
    );
  };

  // Add new CPT code with autocomplete
  const addCPTCodeFromAutocomplete = (cptData: CPTCodeData) => {
    const newCPT: CPTCode = {
      id: generateId(),
      code: cptData.code,
      description: cptData.description,
      complexity: cptData.complexity,
      category: cptData.category,
      baseRate: cptData.baseRate
    };
    setCPTCodes(prev => [...prev, newCPT]);
    
    // Initialize mappings for the new CPT code
    setMappings(prev => {
      const newMappings = [...prev];
      diagnoses.forEach((diagnosis) => {
        newMappings.push({
          diagnosisId: diagnosis.id,
          cptCodeId: newCPT.id,
          selected: false
        });
      });
      return newMappings;
    });
  };

  // Add new diagnosis from autocomplete
  const addDiagnosisFromAutocomplete = (diagnosisData: { code: string; description: string; category?: string }) => {
    const newDiagnosis: DiagnosisCode = {
      id: generateId(),
      diagnosis: diagnosisData.description,
      icd10Code: diagnosisData.code,
      isPrimary: false
    };
    setDiagnoses(prev => [...prev, newDiagnosis]);
    
    // Initialize mappings for the new diagnosis
    setMappings(prev => {
      const newMappings = [...prev];
      cptCodes.forEach((cpt) => {
        newMappings.push({
          diagnosisId: newDiagnosis.id,
          cptCodeId: cpt.id,
          selected: false
        });
      });
      return newMappings;
    });
  };

  // Add new diagnosis manually
  const addDiagnosis = () => {
    const newDiagnosis: DiagnosisCode = {
      id: generateId(),
      diagnosis: "",
      icd10Code: "",
      isPrimary: false
    };
    setDiagnoses(prev => [...prev, newDiagnosis]);
    setEditingDiagnosis(diagnoses.findIndex(d => d.id === newDiagnosis.id));
    setEditDiagnosisValue("");
    setEditDiagnosisICD("");
  };

  // Start editing CPT code
  const startEditingCPT = (cptId: string) => {
    const cpt = cptCodes.find(c => c.id === cptId);
    if (cpt) {
      setEditingCPT(cptCodes.findIndex(c => c.id === cptId));
      setEditCPTValue(cpt.code);
      setEditCPTDescription(cpt.description);
    }
  };

  // Real-time CPT code validation and auto-description update
  const handleCPTValueChange = (value: string) => {
    setEditCPTValue(value);
    
    // Auto-update description if valid CPT code is found
    const foundCPT = getCPTCodeByCode(value);
    if (foundCPT) {
      console.log("🔍 [CPTComponent] Real-time CPT match found:", foundCPT.code);
      setEditCPTDescription(foundCPT.description);
    }
  };

  // Start editing diagnosis
  const startEditingDiagnosis = (diagId: string) => {
    const diag = diagnoses.find(d => d.id === diagId);
    if (diag) {
      console.log("✏️ [CPTComponent] Starting diagnosis edit for:", diag.diagnosis);
      setEditingDiagnosis(diagnoses.findIndex(d => d.id === diagId));
      setEditDiagnosisValue(diag.diagnosis);
      setEditDiagnosisICD(diag.icd10Code);
    }
  };

  // Update CPT code from autocomplete during edit
  const updateCPTFromAutocomplete = (index: number, cptData: CPTCodeData) => {
    console.log("🔄 [CPTComponent] Updating CPT from autocomplete at index:", index, "with:", cptData);
    setCPTCodes(prev => prev.map((cpt, i) => 
      i === index 
        ? { 
            ...cpt, 
            code: cptData.code, 
            description: cptData.description,
            complexity: cptData.complexity,
            category: cptData.category,
            baseRate: cptData.baseRate
          }
        : cpt
    ));
    setEditingCPT(null);
  };

  // Save CPT code edit (for manual entry)
  const saveCPTEdit = (index: number) => {
    const cptId = cptCodes[index]?.id;
    console.log("💾 [CPTComponent] Saving manual CPT edit for index:", index, "ID:", cptId);
    
    // Try to find the CPT code in our database to auto-populate description
    const foundCPT = getCPTCodeByCode(editCPTValue);
    if (foundCPT) {
      console.log("🔍 [CPTComponent] Found CPT in database, auto-updating description");
      setCPTCodes(prev => prev.map((cpt, i) => 
        i === index 
          ? { 
              ...cpt, 
              code: foundCPT.code, 
              description: foundCPT.description,
              complexity: foundCPT.complexity,
              category: foundCPT.category,
              baseRate: foundCPT.baseRate
            }
          : cpt
      ));
    } else {
      // Fallback to manual entry
      setCPTCodes(prev => prev.map((cpt, i) => 
        i === index 
          ? { ...cpt, code: editCPTValue, description: editCPTDescription }
          : cpt
      ));
    }
    setEditingCPT(null);
  };

  // Save diagnosis edit
  const saveDiagnosisEdit = (index: number) => {
    const diagId = diagnoses[index]?.id;
    console.log("💾 [CPTComponent] Saving diagnosis edit for index:", index, "ID:", diagId);
    setDiagnoses(prev => prev.map((diag, i) => 
      i === index 
        ? { ...diag, diagnosis: editDiagnosisValue, icd10Code: editDiagnosisICD }
        : diag
    ));
    setEditingDiagnosis(null);
  };

  // Cancel edit
  const cancelEdit = () => {
    console.log("❌ [CPTComponent] Canceling edit");
    setEditingCPT(null);
    setEditingDiagnosis(null);
  };

  // Delete CPT code using unique ID
  const deleteCPTCode = (cptId: string) => {
    console.log("🗑️ [CPTComponent] Deleting CPT code with ID:", cptId);
    console.log("🗑️ [CPTComponent] Current CPT codes before deletion:", cptCodes.length);
    console.log("🗑️ [CPTComponent] Current mappings before deletion:", mappings.length);
    
    setCPTCodes(prev => {
      const filtered = prev.filter(cpt => cpt.id !== cptId);
      console.log("🗑️ [CPTComponent] CPT codes after deletion:", filtered.length);
      return filtered;
    });
    
    // Remove mappings for this CPT code using unique ID
    setMappings(prev => {
      const filtered = prev.filter(m => m.cptCodeId !== cptId);
      console.log("🗑️ [CPTComponent] Mappings after deletion:", filtered.length);
      return filtered;
    });
  };

  // Delete diagnosis using unique ID
  const deleteDiagnosis = (diagId: string) => {
    console.log("🗑️ [CPTComponent] Deleting diagnosis with ID:", diagId);
    console.log("🗑️ [CPTComponent] Current diagnoses before deletion:", diagnoses.length);
    console.log("🗑️ [CPTComponent] Current mappings before deletion:", mappings.length);
    
    setDiagnoses(prev => {
      const filtered = prev.filter(diag => diag.id !== diagId);
      console.log("🗑️ [CPTComponent] Diagnoses after deletion:", filtered.length);
      return filtered;
    });
    
    // Remove mappings for this diagnosis using unique ID
    setMappings(prev => {
      const filtered = prev.filter(m => m.diagnosisId !== diagId);
      console.log("🗑️ [CPTComponent] Mappings after deletion:", filtered.length);
      return filtered;
    });
  };

  // Save changes
  const saveCPTData = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/encounters/${encounterId}/cpt-codes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cptCodes,
          diagnoses,
          mappings
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save CPT codes");
      }

      toast({
        title: "Saved Successfully",
        description: "CPT codes and diagnoses have been saved",
      });

      // Refresh the encounter data
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters/${encounterId}`] });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading CPT codes...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Billing</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateCPTCodes}
              disabled={isGenerating || isAutoGenerating}
              className={`relative overflow-hidden transition-all duration-300 ${
                isAutoGenerating 
                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
                  : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300'
              }`}
              title={isAutoGenerating ? `Processing billing... ${Math.round(billingProgress)}% complete` : "Generate CPT codes and diagnoses from SOAP note content"}
            >
              {/* Progress bar background */}
              {isAutoGenerating && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-green-200 to-green-300 transition-all duration-100 ease-linear"
                  style={{ 
                    width: `${billingProgress}%`,
                    opacity: 0.3
                  }}
                />
              )}
              
              <RefreshCw className={`h-4 w-4 mr-2 relative z-10 ${
                (isGenerating || isAutoGenerating) ? 'animate-spin' : ''
              }`} />
              
              <span className="relative z-10">
                {isAutoGenerating 
                  ? `Processing... ${Math.round(billingProgress)}%`
                  : isGenerating 
                  ? "Generating..." 
                  : "Generate from SOAP"
                }
              </span>
            </Button>
            <Button
              size="sm"
              onClick={saveCPTData}
              disabled={cptCodes.length === 0 && diagnoses.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {cptCodes.length === 0 && diagnoses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">No billing codes or diagnoses yet</div>
            <div className="text-xs mt-1">
              Generate a SOAP note first, then extract CPT codes
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CPT Codes and Diagnoses Mapping Table */}
            <TooltipProvider>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                        Diagnoses (ICD-10)
                      </th>
                      {cptCodes.map((cpt, index) => (
                        <th key={index} className="px-3 py-3 text-center text-sm font-medium text-gray-900 border-r min-w-[120px]">
                          {editingCPT === index ? (
                            <div className="space-y-2">
                              <CPTAutocomplete
                                value={editCPTValue}
                                onSelect={(cptData) => updateCPTFromAutocomplete(index, cptData)}
                                placeholder="Search CPT codes..."
                                className="h-8 text-center font-mono text-sm"
                              />
                              <div className="text-xs text-gray-400 text-center">or</div>
                              <Input
                                value={editCPTValue}
                                onChange={(e) => handleCPTValueChange(e.target.value)}
                                placeholder="Enter CPT code"
                                className="h-7 text-center font-mono text-sm"
                              />
                              <div className="text-xs text-gray-600 max-w-[200px] mx-auto text-center leading-tight">
                                {editCPTDescription}
                              </div>
                              <div className="flex justify-center space-x-1">
                                <Button size="sm" variant="ghost" onClick={() => saveCPTEdit(index)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="cursor-pointer hover:bg-gray-100 p-1 rounded space-y-1"
                                    onClick={() => startEditingCPT(cpt.id)}
                                  >
                                    <div className="font-mono text-sm font-medium">
                                      {cpt.code}
                                    </div>
                                    {cpt.modifiers && cpt.modifiers.length > 0 && (
                                      <div className="flex flex-wrap gap-1 justify-center">
                                        {cpt.modifiers.map((modifier, idx) => (
                                          <Badge 
                                            key={idx} 
                                            variant="secondary" 
                                            className="text-xs px-1 py-0 h-4 bg-blue-100 text-blue-800 hover:bg-blue-200"
                                          >
                                            {modifier}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="max-w-xs">
                                    <p className="font-medium">{cpt.code}</p>
                                    <p className="text-sm">{cpt.description}</p>
                                    {cpt.complexity && (
                                      <Badge variant="outline" className="mt-1">
                                        {cpt.complexity}
                                      </Badge>
                                    )}
                                    {cpt.modifiers && cpt.modifiers.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium mb-1">Modifiers:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {cpt.modifiers.map((modifier, idx) => (
                                            <Badge 
                                              key={idx} 
                                              variant="secondary" 
                                              className="text-xs bg-blue-100 text-blue-800"
                                            >
                                              {modifier}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {cpt.modifierReasoning && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-medium mb-1">Modifier Rationale:</p>
                                        <p className="text-xs text-gray-600">{cpt.modifierReasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCPTCode(cpt.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">
                        <CPTAutocomplete
                          placeholder="Add CPT code..."
                          onSelect={addCPTCodeFromAutocomplete}
                          className="min-w-[200px]"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {diagnoses.map((diagnosis, diagIndex) => (
                      <tr key={diagnosis.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 border-r">
                          {editingDiagnosis === diagIndex ? (
                            <div className="space-y-2">
                              <Input
                                value={editDiagnosisValue}
                                onChange={(e) => setEditDiagnosisValue(e.target.value)}
                                placeholder="Diagnosis"
                                className="h-8"
                              />
                              <Input
                                value={editDiagnosisICD}
                                onChange={(e) => setEditDiagnosisICD(e.target.value)}
                                placeholder="ICD-10 Code"
                                className="h-8 font-mono"
                              />
                              <div className="flex justify-start space-x-1">
                                <Button size="sm" variant="ghost" onClick={() => saveDiagnosisEdit(diagIndex)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group space-y-1">
                              <div
                                className="font-medium text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => startEditingDiagnosis(diagnosis.id)}
                              >
                                {diagnosis.diagnosis}
                              </div>
                              <div className="text-xs text-gray-600 font-mono">({diagnosis.icd10Code})</div>
                              <div className="flex items-center space-x-2">
                                {diagnosis.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteDiagnosis(diagnosis.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                        {cptCodes.map((cpt) => (
                          <td key={cpt.id} className="px-3 py-4 text-center border-r">
                            <Checkbox
                              checked={isMappingSelected(diagnosis.id, cpt.id)}
                              onCheckedChange={() => {
                                console.log("☑️ [CPTComponent] Checkbox toggled for diagnosis:", diagnosis.id, "CPT:", cpt.id);
                                toggleMapping(diagnosis.id, cpt.id);
                              }}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-4 text-center">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEditingDiagnosis(diagnosis.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-4 py-4 border-r">
                        <DiagnosisAutocomplete
                          placeholder="Add diagnosis..."
                          onSelect={addDiagnosisFromAutocomplete}
                          className="w-full"
                        />
                      </td>
                      {cptCodes.map((cpt) => (
                        <td key={`empty-${cpt.id}`} className="px-3 py-4 border-r"></td>
                      ))}
                      <td className="px-3 py-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TooltipProvider>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="space-x-4">
                <span>{diagnoses.length} diagnoses</span>
                <span>{cptCodes.length} CPT codes</span>
                <span>{mappings.filter(m => m.selected).length} selected combinations</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}