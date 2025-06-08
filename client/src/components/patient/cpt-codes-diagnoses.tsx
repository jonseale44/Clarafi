import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  Save,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CPTCode {
  code: string;
  description: string;
  complexity?: 'low' | 'medium' | 'high';
}

interface DiagnosisCode {
  diagnosis: string;
  icd10Code: string;
  isPrimary?: boolean;
}

interface CPTDiagnosisMapping {
  diagnosisId: string;
  cptCodeId: string;
  selected: boolean;
}

interface DiagnosisMapping {
  diagnosisIndex: number;
  cptCodeIndex: number;
  selected: boolean;
}

interface CPTCodesProps {
  patientId: number;
  encounterId: number;
}

export function CPTCodesDiagnoses({ patientId, encounterId }: CPTCodesProps) {
  const [cptCodes, setCPTCodes] = useState<CPTCode[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisCode[]>([]);
  const [mappings, setMappings] = useState<CPTDiagnosisMapping[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCPT, setEditingCPT] = useState<string | null>(null);
  const [editingDiagnosis, setEditingDiagnosis] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing CPT codes and diagnoses for the encounter
  const { data: encounterData, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/encounters/${encounterId}`],
    enabled: !!patientId && !!encounterId
  });

  // Load data when encounter data is available
  useEffect(() => {
    console.log("🔍 [CPTComponent] Encounter data updated:", encounterData);
    if (encounterData && typeof encounterData === 'object' && 'encounter' in encounterData) {
      const encounter = (encounterData as any).encounter;
      console.log("🔍 [CPTComponent] Encounter CPT codes:", encounter.cptCodes);
      console.log("🔍 [CPTComponent] Encounter diagnoses:", encounter.draftDiagnoses);
      
      if (encounter.cptCodes && Array.isArray(encounter.cptCodes) && encounter.cptCodes.length > 0) {
        console.log("🔍 [CPTComponent] Setting CPT codes:", encounter.cptCodes.length);
        setCPTCodes(encounter.cptCodes);
      } else {
        console.log("🔍 [CPTComponent] No CPT codes found, keeping existing:", cptCodes.length);
      }
      
      if (encounter.draftDiagnoses && Array.isArray(encounter.draftDiagnoses) && encounter.draftDiagnoses.length > 0) {
        console.log("🔍 [CPTComponent] Setting diagnoses:", encounter.draftDiagnoses.length);
        setDiagnoses(encounter.draftDiagnoses);
      } else {
        console.log("🔍 [CPTComponent] No diagnoses found, keeping existing:", diagnoses.length);
      }
      
      // Initialize mappings with intelligent associations based on clinical relevance
      if (encounter.cptCodes && encounter.draftDiagnoses && 
          encounter.cptCodes.length > 0 && encounter.draftDiagnoses.length > 0) {
        console.log("🔗 [CPTComponent] Initializing intelligent mappings for real-time data");
        initializeMappings(encounter.cptCodes, encounter.draftDiagnoses);
        
        // Apply intelligent diagnosis-to-CPT associations
        setTimeout(() => {
          const intelligentMappings: CPTDiagnosisMapping[] = [];
          encounter.draftDiagnoses.forEach((diagnosis: any, diagIndex: number) => {
            encounter.cptCodes.forEach((cpt: any, cptIndex: number) => {
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
                diagnosisId: `${diagIndex}`,
                cptCodeId: `${cptIndex}`,
                selected: shouldSelect
              });
            });
          });
          setMappings(intelligentMappings);
          console.log("🔗 [CPTComponent] Applied intelligent clinical mappings:", 
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

  // Add new CPT code
  const addCPTCode = () => {
    const newCPT: CPTCode = {
      code: "",
      description: "",
      complexity: "medium"
    };
    setCPTCodes(prev => [...prev, newCPT]);
    setEditingCPT(`${cptCodes.length}`);
  };

  // Add new diagnosis
  const addDiagnosis = () => {
    const newDiagnosis: DiagnosisCode = {
      diagnosis: "",
      icd10Code: "",
      isPrimary: false
    };
    setDiagnoses(prev => [...prev, newDiagnosis]);
    setEditingDiagnosis(`${diagnoses.length}`);
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
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                      Diagnoses (ICD-10)
                    </th>
                    {cptCodes.map((cpt, index) => (
                      <th key={index} className="px-3 py-3 text-center text-sm font-medium text-gray-900 border-r min-w-[80px]">
                        <div className="font-mono text-sm">{cpt.code}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">
                      <Button size="sm" variant="ghost" onClick={addCPTCode}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {diagnoses.map((diagnosis, diagIndex) => (
                    <tr key={diagIndex} className="hover:bg-gray-50">
                      <td className="px-4 py-4 border-r">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{diagnosis.diagnosis}</div>
                          <div className="text-xs text-gray-600 font-mono">({diagnosis.icd10Code})</div>
                          {diagnosis.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </td>
                      {cptCodes.map((cpt, cptIndex) => (
                        <td key={cptIndex} className="px-3 py-4 text-center border-r">
                          <Checkbox
                            checked={isMappingSelected(`${diagIndex}`, `${cptIndex}`)}
                            onCheckedChange={() => toggleMapping(`${diagIndex}`, `${cptIndex}`)}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-4 text-center">
                        <Button size="sm" variant="ghost">
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