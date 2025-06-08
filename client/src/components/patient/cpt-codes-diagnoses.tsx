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
import { getCPTCodeByCode, type CPTCodeData } from "@/data/cpt-codes";

interface CPTCode {
  id: string; // Unique ID to fix mapping issues
  code: string;
  description: string;
  complexity?: 'low' | 'moderate' | 'high' | 'straightforward';
  category?: string;
  baseRate?: number;
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
}

export function CPTCodesDiagnoses({ patientId, encounterId }: CPTCodesProps) {
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

  // Convert legacy data to new format with unique IDs
  const convertToUniqueIdFormat = (cptCodes: any[], diagnoses: any[]) => {
    console.log("🔧 [CPTComponent] Converting legacy data to unique ID format");
    
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

    console.log("🔧 [CPTComponent] Converted CPT codes:", convertedCPTCodes.length);
    console.log("🔧 [CPTComponent] Converted diagnoses:", convertedDiagnoses.length);
    
    return { convertedCPTCodes, convertedDiagnoses };
  };

  // Load data when encounter data is available
  useEffect(() => {
    console.log("🔍 [CPTComponent] Encounter data updated:", encounterData);
    if (encounterData && typeof encounterData === 'object' && 'encounter' in encounterData) {
      const encounter = (encounterData as any).encounter;
      console.log("🔍 [CPTComponent] Raw encounter CPT codes:", encounter.cptCodes);
      console.log("🔍 [CPTComponent] Raw encounter diagnoses:", encounter.draftDiagnoses);
      
      if (encounter.cptCodes && Array.isArray(encounter.cptCodes) && encounter.cptCodes.length > 0) {
        const { convertedCPTCodes } = convertToUniqueIdFormat(encounter.cptCodes, []);
        console.log("🔍 [CPTComponent] Setting CPT codes with unique IDs:", convertedCPTCodes.length);
        setCPTCodes(convertedCPTCodes);
      } else {
        console.log("🔍 [CPTComponent] No CPT codes found, keeping existing:", cptCodes.length);
      }
      
      if (encounter.draftDiagnoses && Array.isArray(encounter.draftDiagnoses) && encounter.draftDiagnoses.length > 0) {
        const { convertedDiagnoses } = convertToUniqueIdFormat([], encounter.draftDiagnoses);
        console.log("🔍 [CPTComponent] Setting diagnoses with unique IDs:", convertedDiagnoses.length);
        setDiagnoses(convertedDiagnoses);
      } else {
        console.log("🔍 [CPTComponent] No diagnoses found, keeping existing:", diagnoses.length);
      }
      
      // Initialize mappings with intelligent associations based on clinical relevance
      if (encounter.cptCodes && encounter.draftDiagnoses && 
          encounter.cptCodes.length > 0 && encounter.draftDiagnoses.length > 0) {
        console.log("🔗 [CPTComponent] Initializing intelligent mappings for real-time data");
        const { convertedCPTCodes, convertedDiagnoses } = convertToUniqueIdFormat(encounter.cptCodes, encounter.draftDiagnoses);
        initializeMappings(convertedCPTCodes, convertedDiagnoses);
        
        // Apply intelligent diagnosis-to-CPT associations with unique IDs
        setTimeout(() => {
          const intelligentMappings: CPTDiagnosisMapping[] = [];
          convertedDiagnoses.forEach((diagnosis) => {
            convertedCPTCodes.forEach((cpt) => {
              // Define intelligent associations based on clinical logic
              let shouldSelect = false;
              
              // Problem-focused E&M codes (99212-99215, 99202-99205) pair with clinical diagnoses
              if (['99212', '99213', '99214', '99215', '99202', '99203', '99204', '99205'].includes(cpt.code)) {
                // Associate with non-wellness diagnoses (not Z00.xx)
                shouldSelect = !diagnosis.icd10Code?.startsWith('Z00');
              }
              
              // Preventive medicine codes (99381-99397) pair with wellness diagnoses
              if (['99381', '99382', '99383', '99384', '99385', '99386', '99387',
                   '99391', '99392', '99393', '99394', '99395', '99396', '99397'].includes(cpt.code)) {
                // Associate only with Z00.xx (wellness) diagnoses
                shouldSelect = diagnosis.icd10Code?.startsWith('Z00');
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
          console.log("🔗 [CPTComponent] Applied intelligent clinical mappings with unique IDs:", 
                     intelligentMappings.filter(m => m.selected).length, "selected");
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
      setCPTCodes(data.cptCodes || []);
      setDiagnoses(data.diagnoses || []);
      
      // Use GPT's intelligent mappings to automatically select associations
      if (data.mappings && data.mappings.length > 0) {
        console.log('🔗 [CPTComponent] Using GPT automatic mappings:', data.mappings);
        initializeMappings(data.cptCodes || [], data.diagnoses || [], data.mappings);
      } else {
        console.log('🔗 [CPTComponent] No GPT mappings, initializing empty');
        initializeMappings(data.cptCodes || [], data.diagnoses || []);
      }
      
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

  // Initialize mappings between diagnoses and CPT codes
  const initializeMappings = (cptCodes: CPTCode[], diagnoses: DiagnosisCode[], gptMappings?: any[]) => {
    const newMappings: CPTDiagnosisMapping[] = [];
    diagnoses.forEach((diagnosis, diagIndex) => {
      cptCodes.forEach((cpt, cptIndex) => {
        // Check if GPT selected this combination
        let isSelected = false;
        if (gptMappings) {
          const gptMapping = gptMappings.find(m => 
            m.diagnosisId === diagnosis.icd10Code && 
            m.cptCodes.includes(cpt.code) && 
            m.isSelected
          );
          isSelected = !!gptMapping;
        }
        
        newMappings.push({
          diagnosisId: `${diagIndex}`,
          cptCodeId: `${cptIndex}`,
          selected: isSelected
        });
      });
    });
    setMappings(newMappings);
    
    if (gptMappings) {
      console.log('🔗 [CPTComponent] Applied GPT automatic selections to', newMappings.filter(m => m.selected).length, 'mappings');
    }
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
    console.log("➕ [CPTComponent] Adding CPT code from autocomplete:", cptData);
    const newCPT: CPTCode = {
      id: generateId(),
      code: cptData.code,
      description: cptData.description,
      complexity: cptData.complexity,
      category: cptData.category,
      baseRate: cptData.baseRate
    };
    setCPTCodes(prev => {
      const updated = [...prev, newCPT];
      console.log("➕ [CPTComponent] Updated CPT codes list:", updated.length);
      return updated;
    });
    
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
      console.log("🔗 [CPTComponent] Added mappings for new CPT code:", newMappings.length);
      return newMappings;
    });
  };

  // Add new diagnosis
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
      console.log("✏️ [CPTComponent] Starting CPT edit for:", cpt.code);
      setEditingCPT(cptCodes.findIndex(c => c.id === cptId));
      setEditCPTValue(cpt.code);
      setEditCPTDescription(cpt.description);
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

  // Save CPT code edit
  const saveCPTEdit = (index: number) => {
    const cptId = cptCodes[index]?.id;
    console.log("💾 [CPTComponent] Saving CPT edit for index:", index, "ID:", cptId);
    setCPTCodes(prev => prev.map((cpt, i) => 
      i === index 
        ? { ...cpt, code: editCPTValue, description: editCPTDescription }
        : cpt
    ));
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
          <CardTitle>Billing</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateCPTCodes}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate from SOAP
                </>
              )}
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
                              <Input
                                value={editCPTValue}
                                onChange={(e) => setEditCPTValue(e.target.value)}
                                placeholder="CPT Code"
                                className="h-8 text-center font-mono text-sm"
                              />
                              <Input
                                value={editCPTDescription}
                                onChange={(e) => setEditCPTDescription(e.target.value)}
                                placeholder="Description"
                                className="h-8 text-xs"
                              />
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
                                    className="font-mono text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                    onClick={() => startEditingCPT(cpt.id)}
                                  >
                                    {cpt.code}
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
                      <tr key={diagIndex} className="hover:bg-gray-50">
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
                                onClick={() => startEditingDiagnosis(diagIndex)}
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
                                  onClick={() => deleteDiagnosis(diagIndex)}
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
                            onClick={() => startEditingDiagnosis(diagIndex)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-4 py-4 border-r">
                        <Button size="sm" variant="ghost" onClick={addDiagnosis} className="w-full justify-start">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Diagnosis
                        </Button>
                      </td>
                      {cptCodes.map((_, index) => (
                        <td key={index} className="px-3 py-4 border-r"></td>
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