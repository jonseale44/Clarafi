import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Weight, 
  Wind, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Edit3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";

interface VitalsEntry {
  id: number;
  encounterId: number;
  patientId: number;
  recordedAt: string;
  recordedBy: string;
  entryType: 'admission' | 'routine' | 'recheck' | 'discharge' | 'pre-procedure' | 'post-procedure';
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  painScale?: number;
  notes?: string;
  alerts?: string[];
  parsedFromText?: boolean;
  originalText?: string;
}

interface Patient {
  id: number;
  dateOfBirth: string;
  age?: number;
}

interface VitalsFlowsheetProps {
  encounterId: number;
  patientId: number;
  patient?: Patient;
  readOnly?: boolean;
}

interface VitalRange {
  min: number;
  max: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
}

interface AgeBasedRanges {
  [key: string]: VitalRange;
}

export function VitalsFlowsheet({ encounterId, patientId, patient, readOnly = false }: VitalsFlowsheetProps) {
  const [editingEntry, setEditingEntry] = useState<VitalsEntry | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [quickParseText, setQuickParseText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Calculate patient age from dateOfBirth if not provided
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Use provided patient or fetched patient data
  const currentPatient = patient || patientData;
  const patientAge = currentPatient?.age || (currentPatient?.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : 0);
  
  // Debug logging for age and ranges
  console.log("🩺 [VitalsFlowsheet] Debug - Patient DOB:", currentPatient?.dateOfBirth);
  console.log("🩺 [VitalsFlowsheet] Debug - Calculated patient age:", patientAge);
  console.log("🩺 [VitalsFlowsheet] Debug - Patient object:", currentPatient);

  // Get age-appropriate vital sign ranges
  const getVitalRanges = (patientAge?: number): AgeBasedRanges => {
    const age = patientAge || 0;
    
    if (age < 1) { // Infant
      return {
        systolic: { min: 70, max: 100, criticalLow: 60, criticalHigh: 120, unit: "mmHg" },
        diastolic: { min: 35, max: 65, criticalLow: 30, criticalHigh: 80, unit: "mmHg" },
        heartRate: { min: 100, max: 160, criticalLow: 80, criticalHigh: 200, unit: "bpm" },
        temperature: { min: 97.0, max: 100.4, criticalLow: 95.0, criticalHigh: 101.5, unit: "°F" },
        respiratoryRate: { min: 30, max: 60, criticalLow: 20, criticalHigh: 80, unit: "/min" },
        oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: "%" }
      };
    } else if (age < 12) { // Pediatric
      return {
        systolic: { min: 90, max: 110, criticalLow: 70, criticalHigh: 130, unit: "mmHg" },
        diastolic: { min: 55, max: 75, criticalLow: 40, criticalHigh: 90, unit: "mmHg" },
        heartRate: { min: 70, max: 110, criticalLow: 50, criticalHigh: 150, unit: "bpm" },
        temperature: { min: 97.0, max: 100.4, criticalLow: 95.0, criticalHigh: 101.5, unit: "°F" },
        respiratoryRate: { min: 18, max: 30, criticalLow: 12, criticalHigh: 40, unit: "/min" },
        oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: "%" }
      };
    } else if (age < 18) { // Adolescent
      return {
        systolic: { min: 100, max: 120, criticalLow: 80, criticalHigh: 140, unit: "mmHg" },
        diastolic: { min: 60, max: 80, criticalLow: 50, criticalHigh: 90, unit: "mmHg" },
        heartRate: { min: 60, max: 100, criticalLow: 45, criticalHigh: 120, unit: "bpm" },
        temperature: { min: 97.0, max: 100.4, criticalLow: 95.0, criticalHigh: 101.5, unit: "°F" },
        respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, unit: "/min" },
        oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: "%" }
      };
    } else { // Adult
      return {
        systolic: { min: 90, max: 120, criticalLow: 70, criticalHigh: 180, unit: "mmHg" },
        diastolic: { min: 60, max: 80, criticalLow: 40, criticalHigh: 110, unit: "mmHg" },
        heartRate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 120, unit: "bpm" },
        temperature: { min: 97.0, max: 100.4, criticalLow: 95.0, criticalHigh: 101.5, unit: "°F" },
        respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, unit: "/min" },
        oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: "%" }
      };
    }
  };

  const ranges = getVitalRanges(patientAge);
  
  // Debug logging for ranges
  console.log("🩺 [VitalsFlowsheet] Debug - Using patient age for ranges:", patientAge);
  console.log("🩺 [VitalsFlowsheet] Debug - Heart rate range:", ranges.heartRate);

  const getVitalStatus = (value: number | undefined, vitalType: keyof AgeBasedRanges) => {
    if (!value || !ranges[vitalType]) return { status: "normal", color: "text-gray-600", bgColor: "bg-gray-50" };
    
    const range = ranges[vitalType];
    if (range.criticalLow && value < range.criticalLow) 
      return { status: "critical-low", color: "text-red-700", bgColor: "bg-red-100" };
    if (range.criticalHigh && value > range.criticalHigh) 
      return { status: "critical-high", color: "text-red-700", bgColor: "bg-red-100" };
    if (value < range.min) 
      return { status: "low", color: "text-blue-600", bgColor: "bg-blue-50" };
    if (value > range.max) 
      return { status: "high", color: "text-orange-600", bgColor: "bg-orange-50" };
    return { status: "normal", color: "text-green-600", bgColor: "bg-green-50" };
  };

  // Fetch patient data if not provided
  const { data: patientData } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: !!patientId && !patient
  });

  // Fetch vitals entries for the encounter
  const { data: vitalsEntries = [], isLoading } = useQuery<VitalsEntry[]>({
    queryKey: ['/api/vitals/encounter', encounterId],
    queryFn: async () => {
      console.log("🩺 [VitalsFlowsheet] Fetching vitals for encounter:", encounterId);
      const response = await fetch(`/api/vitals/encounter/${encounterId}`, { 
        credentials: 'include' 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vitals: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("🩺 [VitalsFlowsheet] Fetched vitals result:", result);
      
      // Handle wrapped API response format
      if (result.success && result.data) {
        return result.data;
      } else if (Array.isArray(result)) {
        return result;
      } else {
        console.warn("🩺 [VitalsFlowsheet] Unexpected response format:", result);
        return [];
      }
    },
    enabled: !!encounterId
  });

  // Quick parse mutation using server-side GPT parsing
  const quickParseMutation = useMutation({
    mutationFn: async (text: string) => {
      console.log("🩺 [VitalsFlowsheet] Starting GPT parsing for text:", text);
      
      // Use server-side GPT parsing via vitals-parser-service.ts
      const response = await fetch('/api/vitals/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vitalsText: text,
          patientId: patientId
        })
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json();
      if (!apiResponse.success) {
        throw new Error(apiResponse.error?.message || 'Parse failed');
      }

      const result = apiResponse.data;
      console.log("🩺 [VitalsFlowsheet] GPT parser result:", result);
      return result;
    },
    onSuccess: (result) => {
      console.log("🩺 [VitalsFlowsheet] Processing successful GPT parse result:", result);
      if (result.success && result.data) {
        // Transform GPT parsed data to vitals entry format - using correct camelCase field names
        const newEntry: Partial<VitalsEntry> = {
          encounterId,
          patientId,
          entryType: 'routine',
          recordedAt: new Date().toISOString(),
          systolicBp: result.data.systolicBp,
          diastolicBp: result.data.diastolicBp,
          heartRate: result.data.heartRate,
          temperature: result.data.temperature ? parseFloat(result.data.temperature?.toString() || '0') : undefined,
          weight: result.data.weight ? parseFloat(result.data.weight?.toString() || '0') : undefined,
          height: result.data.height ? parseFloat(result.data.height?.toString() || '0') : undefined,
          bmi: result.data.bmi ? parseFloat(result.data.bmi?.toString() || '0') : undefined,
          oxygenSaturation: result.data.oxygenSaturation ? parseFloat(result.data.oxygenSaturation?.toString() || '0') : undefined,
          respiratoryRate: result.data.respiratoryRate,
          painScale: result.data.painScale,
          parsedFromText: true,
          originalText: quickParseText,
          notes: `Parsed: ${quickParseText}`,
          alerts: []
        };
        
        console.log("🩺 [VitalsFlowsheet] DEBUG - encounterId value:", encounterId);
        console.log("🩺 [VitalsFlowsheet] DEBUG - patientId value:", patientId);
        console.log("🩺 [VitalsFlowsheet] DEBUG - newEntry object:", JSON.stringify(newEntry, null, 2));
        
        console.log("🩺 [VitalsFlowsheet] Encounter ID:", encounterId);
        console.log("🩺 [VitalsFlowsheet] Patient ID:", patientId);
        
        console.log("🩺 [VitalsFlowsheet] Created new entry:", newEntry);
        setEditingEntry(newEntry as VitalsEntry);
        setShowAddDialog(true);
        setQuickParseText("");
        
        const extractedCount = Object.keys(result.data).filter(k => result.data?.[k as keyof typeof result.data] !== null && result.data?.[k as keyof typeof result.data] !== undefined).length;
        toast({
          title: "Vitals Parsed Successfully",
          description: `Extracted ${extractedCount} vital signs`,
        });
      } else {
        console.error("❌ [VitalsFlowsheet] Parse result missing success or data:", result);
        toast({
          title: "Parse Error", 
          description: result.errors?.[0] || "Failed to parse vitals",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse vitals",
        variant: "destructive"
      });
    }
  });

  // Save vitals entry mutation
  const saveVitalsMutation = useMutation({
    mutationFn: async (entry: Partial<VitalsEntry>) => {
      // Ensure encounterId and patientId are always included
      const entryWithIds = {
        ...entry,
        encounterId: entry.encounterId || encounterId,
        patientId: entry.patientId || patientId
      };
      
      const url = entryWithIds.id ? `/api/vitals/entries/${entryWithIds.id}` : '/api/vitals/entries';
      const method = entryWithIds.id ? 'PUT' : 'POST';
      
      console.log("🩺 [VitalsFlowsheet] Starting save request:");
      console.log("🩺 [VitalsFlowsheet] URL:", url);
      console.log("🩺 [VitalsFlowsheet] Method:", method);
      console.log("🩺 [VitalsFlowsheet] Entry data:", JSON.stringify(entryWithIds, null, 2));
      console.log("🩺 [VitalsFlowsheet] Entry encounterId:", entryWithIds.encounterId);
      console.log("🩺 [VitalsFlowsheet] Entry patientId:", entryWithIds.patientId);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(entryWithIds)
      });
      
      console.log("🩺 [VitalsFlowsheet] Response status:", response.status);
      console.log("🩺 [VitalsFlowsheet] Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [VitalsFlowsheet] Save failed - Status:", response.status);
        console.error("❌ [VitalsFlowsheet] Error response:", errorText);
        throw new Error(`Save failed: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const responseText = await response.text();
      console.log("🩺 [VitalsFlowsheet] Raw response text:", responseText);
      
      try {
        const result = JSON.parse(responseText);
        console.log("✅ [VitalsFlowsheet] Successfully parsed JSON result:", result);
        return result;
      } catch (parseError) {
        console.error("❌ [VitalsFlowsheet] Failed to parse JSON from save response");
        console.error("❌ [VitalsFlowsheet] Parse error:", parseError);
        console.error("❌ [VitalsFlowsheet] Response was:", responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
    },
    onSuccess: () => {
      console.log("✅ [VitalsFlowsheet] Vitals saved successfully, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ['/api/vitals/encounter', encounterId] });
      queryClient.invalidateQueries({ queryKey: ['/api/vitals/patient', patientId] });
      setEditingEntry(null);
      setShowAddDialog(false);
      setQuickParseText('');
      toast({
        title: "Vitals Saved",
        description: "Vitals entry has been saved successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : "Failed to save vitals",
        variant: "destructive"
      });
    }
  });

  const getTrendIcon = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return <Minus className="h-3 w-3 text-gray-400" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-blue-500" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-blue-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const VitalCell = ({ value, vitalType, previousValue }: { 
    value: number | undefined, 
    vitalType: keyof AgeBasedRanges,
    previousValue?: number | undefined
  }) => {
    const status = getVitalStatus(value, vitalType);
    const range = ranges[vitalType];
    
    return (
      <div className={`group relative flex items-center justify-center py-1 px-2 rounded text-sm ${status.bgColor}`}>
        <span className={`font-medium ${status.color}`}>
          {value ? `${value}${range?.unit || ''}` : '-'}
        </span>
        {getTrendIcon(value, previousValue)}
        
        {/* Tooltip with ranges - only visible on hover */}
        {value && range && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            Normal: {range.min}-{range.max}{range.unit || ''}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    );
  };

  const BloodPressureCell = ({ 
    systolic, 
    diastolic, 
    prevSystolic, 
    prevDiastolic 
  }: { 
    systolic?: number, 
    diastolic?: number,
    prevSystolic?: number,
    prevDiastolic?: number
  }) => {
    const systolicStatus = getVitalStatus(systolic, 'systolic');
    const diastolicStatus = getVitalStatus(diastolic, 'diastolic');
    const isAbnormal = systolicStatus.status !== 'normal' || diastolicStatus.status !== 'normal';
    
    return (
      <div className={`group relative flex items-center justify-center py-1 px-2 rounded text-sm ${isAbnormal ? 'bg-red-50' : 'bg-green-50'}`}>
        <span className={`font-medium ${isAbnormal ? 'text-red-700' : 'text-green-600'}`}>
          {systolic && diastolic ? `${systolic}/${diastolic}` : '-'}
        </span>
        <div className="flex flex-col items-center ml-1">
          {getTrendIcon(systolic, prevSystolic)}
          {getTrendIcon(diastolic, prevDiastolic)}
        </div>
        
        {/* Tooltip with ranges - only visible on hover */}
        {systolic && diastolic && ranges.systolic && ranges.diastolic && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            Normal: {ranges.systolic.min}-{ranges.systolic.max}/{ranges.diastolic.min}-{ranges.diastolic.max}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading vitals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Stethoscope className="h-4 w-4" />
              <span>Vitals</span>
              {patientAge > 0 && (
                <Badge variant="outline" className="text-xs">
                  Age {patientAge}
                </Badge>
              )}
            </CardTitle>
            {!readOnly && (
              <div className="flex space-x-2">
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setEditingEntry({} as VitalsEntry)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Transposed Vitals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 h-8">
                  <TableHead className="font-semibold text-xs py-2 w-24">Parameter</TableHead>
                  {vitalsEntries.map((entry) => (
                    <TableHead key={entry.id} className="font-semibold text-xs py-2 text-center min-w-20">
                      <div className="text-xs text-gray-500">{format(new Date(entry.recordedAt), 'MM/dd')}</div>
                      <div className="text-xs">{format(new Date(entry.recordedAt), 'HH:mm')}</div>
                    </TableHead>
                  ))}
                  {!readOnly && (
                    <TableHead className="font-semibold text-xs py-2 text-center w-16">
                      <Plus className="h-4 w-4 mx-auto" />
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitalsEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-gray-500 text-sm">
                      No vitals recorded for this encounter
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Blood Pressure Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        BP <span className="text-xs text-gray-500">(mmHg)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`bp-${entry.id}`} className="py-2 text-center">
                            <BloodPressureCell 
                              systolic={entry.systolicBp}
                              diastolic={entry.diastolicBp}
                              prevSystolic={prevEntry?.systolicBp}
                              prevDiastolic={prevEntry?.diastolicBp}
                            />
                          </TableCell>
                        );
                      })}
                      {!readOnly && (
                        <TableCell className="py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEntry({} as VitalsEntry);
                              setShowAddDialog(true);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Heart Rate Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        HR <span className="text-xs text-gray-500">(bpm)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`hr-${entry.id}`} className="py-2 text-center">
                            <VitalCell 
                              value={entry.heartRate} 
                              vitalType="heartRate"
                              previousValue={prevEntry?.heartRate}
                            />
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Temperature Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        Temp <span className="text-xs text-gray-500">(°F)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`temp-${entry.id}`} className="py-2 text-center">
                            <VitalCell 
                              value={entry.temperature} 
                              vitalType="temperature"
                              previousValue={prevEntry?.temperature}
                            />
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Respiratory Rate Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        RR <span className="text-xs text-gray-500">(/min)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`rr-${entry.id}`} className="py-2 text-center">
                            <VitalCell 
                              value={entry.respiratoryRate} 
                              vitalType="respiratoryRate"
                              previousValue={prevEntry?.respiratoryRate}
                            />
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Oxygen Saturation Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        O2 Sat <span className="text-xs text-gray-500">(%)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`o2-${entry.id}`} className="py-2 text-center">
                            <VitalCell 
                              value={entry.oxygenSaturation} 
                              vitalType="oxygenSaturation"
                              previousValue={prevEntry?.oxygenSaturation}
                            />
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Pain Scale Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        Pain <span className="text-xs text-gray-500">(/10)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`pain-${entry.id}`} className="py-2 text-center">
                            <div className="flex items-center justify-center py-1 px-2 rounded bg-gray-50 text-sm">
                              <span className="font-medium">
                                {entry.painScale !== null && entry.painScale !== undefined ? `${entry.painScale}` : '-'}
                              </span>
                              {getTrendIcon(entry.painScale, prevEntry?.painScale)}
                            </div>
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Weight Row */}
                    <TableRow className="hover:bg-gray-25 h-10">
                      <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                        Weight <span className="text-xs text-gray-500">(lbs)</span>
                      </TableCell>
                      {vitalsEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                        return (
                          <TableCell key={`wt-${entry.id}`} className="py-2 text-center">
                            <div className="group relative flex items-center justify-center py-1 px-2 rounded bg-gray-50 text-sm">
                              <span className="font-medium">
                                {entry.weight || '-'}
                              </span>
                              {getTrendIcon(entry.weight, prevEntry?.weight)}
                              
                              {/* Tooltip with full weight info */}
                              {entry.weight && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                  Weight: {entry.weight} lbs
                                  {entry.height && <div>Height: {entry.height}"</div>}
                                  {entry.bmi && <div>BMI: {entry.bmi}</div>}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      {!readOnly && <TableCell className="py-2"></TableCell>}
                    </TableRow>

                    {/* Actions Row (Edit buttons) */}
                    {!readOnly && (
                      <TableRow className="hover:bg-gray-25 h-10">
                        <TableCell className="py-2 font-medium text-gray-900 bg-gray-50">
                          Actions
                        </TableCell>
                        {vitalsEntries.map((entry) => (
                          <TableCell key={`action-${entry.id}`} className="py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowAddDialog(true);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        ))}
                        <TableCell className="py-2"></TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {vitalsEntries.some((entry) => entry.alerts && entry.alerts.length > 0) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium text-red-800">Critical Values Detected:</div>
            <ul className="mt-1 list-disc list-inside text-red-700">
              {vitalsEntries.flatMap((entry) => 
                entry.alerts?.map((alert, index) => (
                  <li key={`${entry.id}-${index}`}>
                    {format(new Date(entry.recordedAt), 'HH:mm')} - {alert}
                  </li>
                )) || []
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.id ? 'Edit Vitals Entry' : 'Add Vitals Entry'}
            </DialogTitle>
          </DialogHeader>
          
          {editingEntry && (
            <VitalsEntryForm 
              entry={editingEntry}
              onSave={(entry) => saveVitalsMutation.mutate(entry)}
              onCancel={() => {
                setEditingEntry(null);
                setShowAddDialog(false);
              }}
              isSaving={saveVitalsMutation.isPending}
              ranges={ranges}
              quickParseText={quickParseText}
              setQuickParseText={setQuickParseText}
              quickParseMutation={quickParseMutation}
              encounterId={encounterId}
              patientId={patientId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Vitals Entry Form Component
interface VitalsEntryFormProps {
  entry: VitalsEntry;
  onSave: (entry: Partial<VitalsEntry>) => void;
  onCancel: () => void;
  isSaving: boolean;
  ranges: AgeBasedRanges;
  quickParseText: string;
  setQuickParseText: (text: string) => void;
  quickParseMutation: any;
  encounterId: number;
  patientId: number;
}

function VitalsEntryForm({ entry, onSave, onCancel, isSaving, ranges, quickParseText, setQuickParseText, quickParseMutation, encounterId, patientId }: VitalsEntryFormProps) {
  const [formData, setFormData] = useState<Partial<VitalsEntry>>(entry);

  // Update form data when entry changes (from quick parse)
  useEffect(() => {
    console.log("🩺 [VitalsEntryForm] Entry changed, updating form data:", entry);
    setFormData({
      ...entry,
      encounterId,
      patientId
    });
  }, [entry, encounterId, patientId]);

  const updateField = (field: keyof VitalsEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🩺 [VitalsEntryForm] DEBUG - About to save");
    console.log("🩺 [VitalsEntryForm] DEBUG - encounterId prop:", encounterId);
    console.log("🩺 [VitalsEntryForm] DEBUG - patientId prop:", patientId);
    console.log("🩺 [VitalsEntryForm] DEBUG - formData before save:", JSON.stringify(formData, null, 2));
    
    // Validate required IDs
    if (!encounterId || encounterId === null) {
      console.error("❌ [VitalsEntryForm] Missing encounterId prop - value:", encounterId);
      return;
    }
    
    if (!patientId) {
      console.error("❌ [VitalsEntryForm] Missing patientId prop");
      return;
    }
    
    // Ensure encounterId and patientId are included - force them from props
    const dataToSave = {
      ...formData,
      encounterId: encounterId,  // Force from props, not formData
      patientId: patientId,      // Force from props, not formData
      recordedBy: String(formData.recordedBy || 1)
    };
    
    console.log("🩺 [VitalsEntryForm] DEBUG - dataToSave with forced IDs:", JSON.stringify(dataToSave, null, 2));
    console.log("🩺 [VitalsEntryForm] DEBUG - Final encounterId:", dataToSave.encounterId);
    console.log("🩺 [VitalsEntryForm] DEBUG - Final patientId:", dataToSave.patientId);
    
    onSave(dataToSave);
  };

  const handleQuickParse = () => {
    if (quickParseText.trim()) {
      quickParseMutation.mutate(quickParseText);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quick Parse Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <Label className="text-sm font-medium text-blue-900 mb-2 block">
          Quick Parse Vitals
        </Label>
        <div className="flex space-x-2">
          <Textarea
            placeholder="Enter vitals: '120/80, P 80, RR 23, 98% on room air'"
            value={quickParseText}
            onChange={(e) => setQuickParseText(e.target.value)}
            className="flex-1 min-h-[40px] resize-none"
            rows={1}
          />
          <Button 
            type="button"
            onClick={handleQuickParse}
            disabled={!quickParseText.trim() || quickParseMutation.isPending}
            size="sm"
          >
            {quickParseMutation.isPending ? "Parsing..." : "Parse"}
          </Button>
        </div>
        <p className="text-xs text-blue-700 mt-1">
          Automatically fills form fields below. Examples: "BP 120/80", "HR 75", "Temp 98.6F"
        </p>
      </div>

      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entryType">Entry Type</Label>
          <Select value={formData.entryType} onValueChange={(value) => updateField('entryType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admission">Admission</SelectItem>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="recheck">Recheck</SelectItem>
              <SelectItem value="discharge">Discharge</SelectItem>
              <SelectItem value="pre-procedure">Pre-Procedure</SelectItem>
              <SelectItem value="post-procedure">Post-Procedure</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="recordedAt">Recorded At</Label>
          <Input
            type="datetime-local"
            value={formData.recordedAt ? (() => {
              const date = new Date(formData.recordedAt);
              // Convert to local timezone for display
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day}T${hours}:${minutes}`;
            })() : ''}
            onChange={(e) => updateField('recordedAt', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="systolicBp">Systolic BP</Label>
          <Input
            type="number"
            placeholder={`${ranges.systolic?.min}-${ranges.systolic?.max}`}
            value={formData.systolicBp || ''}
            onChange={(e) => updateField('systolicBp', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="diastolicBp">Diastolic BP</Label>
          <Input
            type="number"
            placeholder={`${ranges.diastolic?.min}-${ranges.diastolic?.max}`}
            value={formData.diastolicBp || ''}
            onChange={(e) => updateField('diastolicBp', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="heartRate">Heart Rate</Label>
          <Input
            type="number"
            placeholder={`${ranges.heartRate?.min}-${ranges.heartRate?.max}`}
            value={formData.heartRate || ''}
            onChange={(e) => updateField('heartRate', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="temperature">Temperature (°F)</Label>
          <Input
            type="number"
            step="0.1"
            placeholder={`${ranges.temperature?.min}-${ranges.temperature?.max}`}
            value={formData.temperature || ''}
            onChange={(e) => updateField('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
          <Input
            type="number"
            placeholder={`${ranges.respiratoryRate?.min}-${ranges.respiratoryRate?.max}`}
            value={formData.respiratoryRate || ''}
            onChange={(e) => updateField('respiratoryRate', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
          <Input
            type="number"
            placeholder={`${ranges.oxygenSaturation?.min}-${ranges.oxygenSaturation?.max}`}
            value={formData.oxygenSaturation || ''}
            onChange={(e) => updateField('oxygenSaturation', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="weight">Weight (lbs)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.weight || ''}
            onChange={(e) => updateField('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="height">Height (inches)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.height || ''}
            onChange={(e) => updateField('height', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        
        <div>
          <Label htmlFor="painScale">Pain Scale (0-10)</Label>
          <Input
            type="number"
            min="0"
            max="10"
            value={formData.painScale !== null && formData.painScale !== undefined ? formData.painScale : ''}
            onChange={(e) => updateField('painScale', e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          placeholder="Additional notes about this vitals entry..."
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Vitals"}
        </Button>
      </div>
    </form>
  );
}