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

  const ranges = getVitalRanges(patient?.age);

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

  // Fetch vitals entries for the encounter
  const { data: vitalsEntries = [], isLoading } = useQuery<VitalsEntry[]>({
    queryKey: ['/api/vitals/encounter', encounterId],
    enabled: !!encounterId
  });

  // Quick parse mutation
  const quickParseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch("/api/vitals/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vitalsText: text, patientId, encounterId })
      });
      if (!response.ok) throw new Error("Parse failed");
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        const newEntry: Partial<VitalsEntry> = {
          encounterId,
          patientId,
          entryType: 'routine',
          systolicBp: result.parsedData.systolicBp,
          diastolicBp: result.parsedData.diastolicBp,
          heartRate: result.parsedData.heartRate,
          temperature: result.parsedData.temperature ? parseFloat(result.parsedData.temperature) : undefined,
          weight: result.parsedData.weight ? parseFloat(result.parsedData.weight) : undefined,
          height: result.parsedData.height ? parseFloat(result.parsedData.height) : undefined,
          oxygenSaturation: result.parsedData.oxygenSaturation ? parseFloat(result.parsedData.oxygenSaturation) : undefined,
          respiratoryRate: result.parsedData.respiratoryRate,
          painScale: result.parsedData.painScale,
          parsedFromText: true,
          originalText: text,
          notes: `Parsed: ${result.parsedData.parsedText || quickParseText}`,
          alerts: result.warnings
        };
        setEditingEntry(newEntry as VitalsEntry);
        setShowAddDialog(true);
        setQuickParseText("");
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
      const url = entry.id ? `/api/vitals/entries/${entry.id}` : '/api/vitals/entries';
      const method = entry.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(entry)
      });
      if (!response.ok) throw new Error("Save failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vitals/encounter', encounterId] });
      setEditingEntry(null);
      setShowAddDialog(false);
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
      <div className={`flex items-center justify-between p-2 rounded ${status.bgColor}`}>
        <div className="flex flex-col">
          <span className={`font-medium ${status.color}`}>
            {value ? `${value}${range?.unit || ''}` : '-'}
          </span>
          {value && (
            <span className="text-xs text-gray-500">
              {range?.min}-{range?.max}
            </span>
          )}
        </div>
        {getTrendIcon(value, previousValue)}
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
      <div className={`flex items-center justify-between p-2 rounded ${isAbnormal ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="flex flex-col">
          <span className={`font-medium ${isAbnormal ? 'text-red-700' : 'text-green-600'}`}>
            {systolic && diastolic ? `${systolic}/${diastolic}` : '-'}
          </span>
          <span className="text-xs text-gray-500">
            {ranges.systolic?.min}-{ranges.systolic?.max}/{ranges.diastolic?.min}-{ranges.diastolic?.max}
          </span>
        </div>
        <div className="flex flex-col items-center">
          {getTrendIcon(systolic, prevSystolic)}
          {getTrendIcon(diastolic, prevDiastolic)}
        </div>
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
      {/* Header with Quick Parse */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Vitals Flowsheet</span>
              {patient?.age && (
                <Badge variant="outline">
                  Age {patient.age} - {patient.age < 1 ? 'Infant' : patient.age < 12 ? 'Pediatric' : patient.age < 18 ? 'Adolescent' : 'Adult'} Ranges
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
        
        {!readOnly && (
          <CardContent className="pt-0">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Quick parse: '120/80, P 80, RR 23, 98% on room air'"
                value={quickParseText}
                onChange={(e) => setQuickParseText(e.target.value)}
                className="flex-1 min-h-[40px] resize-none"
                rows={1}
              />
              <Button 
                onClick={() => quickParseMutation.mutate(quickParseText)}
                disabled={!quickParseText.trim() || quickParseMutation.isPending}
                size="sm"
              >
                {quickParseMutation.isPending ? "Parsing..." : "Parse & Add"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Vitals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Time</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">BP</TableHead>
                  <TableHead className="font-semibold">HR</TableHead>
                  <TableHead className="font-semibold">Temp</TableHead>
                  <TableHead className="font-semibold">RR</TableHead>
                  <TableHead className="font-semibold">O2 Sat</TableHead>
                  <TableHead className="font-semibold">Pain</TableHead>
                  <TableHead className="font-semibold">Weight</TableHead>
                  <TableHead className="font-semibold">By</TableHead>
                  {!readOnly && <TableHead className="font-semibold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitalsEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 10 : 11} className="text-center py-8 text-gray-500">
                      No vitals recorded for this encounter
                    </TableCell>
                  </TableRow>
                ) : (
                  vitalsEntries.map((entry, index) => {
                    const prevEntry = index > 0 ? vitalsEntries[index - 1] : null;
                    
                    return (
                      <TableRow key={entry.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{format(new Date(entry.recordedAt), 'HH:mm')}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(entry.recordedAt), 'MM/dd')}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.entryType}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <BloodPressureCell 
                            systolic={entry.systolicBp}
                            diastolic={entry.diastolicBp}
                            prevSystolic={prevEntry?.systolicBp}
                            prevDiastolic={prevEntry?.diastolicBp}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <VitalCell 
                            value={entry.heartRate} 
                            vitalType="heartRate"
                            previousValue={prevEntry?.heartRate}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <VitalCell 
                            value={entry.temperature} 
                            vitalType="temperature"
                            previousValue={prevEntry?.temperature}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <VitalCell 
                            value={entry.respiratoryRate} 
                            vitalType="respiratoryRate"
                            previousValue={prevEntry?.respiratoryRate}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <VitalCell 
                            value={entry.oxygenSaturation} 
                            vitalType="oxygenSaturation"
                            previousValue={prevEntry?.oxygenSaturation}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                            <span className="font-medium">
                              {entry.painScale !== null && entry.painScale !== undefined ? `${entry.painScale}/10` : '-'}
                            </span>
                            {getTrendIcon(entry.painScale, prevEntry?.painScale)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {entry.weight ? `${entry.weight} lbs` : '-'}
                              </span>
                              {entry.height && entry.bmi && (
                                <span className="text-xs text-gray-500">
                                  BMI {entry.bmi}
                                </span>
                              )}
                            </div>
                            {getTrendIcon(entry.weight, prevEntry?.weight)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span className="text-xs">{entry.recordedBy}</span>
                          </div>
                        </TableCell>
                        
                        {!readOnly && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowAddDialog(true);
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
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
}

function VitalsEntryForm({ entry, onSave, onCancel, isSaving, ranges }: VitalsEntryFormProps) {
  const [formData, setFormData] = useState<Partial<VitalsEntry>>(entry);

  const updateField = (field: keyof VitalsEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            value={formData.recordedAt ? new Date(formData.recordedAt).toISOString().slice(0, 16) : ''}
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