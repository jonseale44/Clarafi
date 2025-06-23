import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Edit3,
  FileText,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useQuery as useUserQuery } from "@tanstack/react-query";

// Utility functions to format dates without timezone conversion
const formatVitalsDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'MM/dd HH:mm');
};

const formatVitalsDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'MM/dd/yyyy HH:mm');
};

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
  // Production EMR fields for global vitals access
  isEditable?: boolean;
  encounterContext?: 'current' | 'historical';
  notes?: string;
  alerts?: string[];
  parsedFromText?: boolean;
  originalText?: string;
  // Source tracking fields
  sourceType?: string;
  sourceConfidence?: string;
  sourceNotes?: string;
  extractedFromAttachmentId?: number;
  enteredBy?: number;
}

interface Patient {
  id: number;
  dateOfBirth: string;
  age?: number;
}

interface VitalsFlowsheetProps {
  encounterId?: number;
  patientId: number;
  patient?: Patient;
  readOnly?: boolean;
  showAllPatientVitals?: boolean;
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

export function VitalsFlowsheet({ 
  encounterId, 
  patientId, 
  patient, 
  readOnly = false,
  showAllPatientVitals = false 
}: VitalsFlowsheetProps) {
  const [editingEntry, setEditingEntry] = useState<VitalsEntry | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [quickParseText, setQuickParseText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get current user to check if they're a provider
  const { data: currentUser } = useUserQuery({
    queryKey: ["/api/user"],
  });

  const isProvider = currentUser?.role === 'provider' || currentUser?.role === 'admin';

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

  // Fetch patient data if not provided
  const { data: patientData } = useQuery<Patient>({
    queryKey: ['/api/patients', patientId],
    enabled: !!patientId && !patient
  });

  // Use provided patient or fetched patient data
  const currentPatient = patient || patientData;
  const patientAge = currentPatient?.age || (currentPatient?.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : 0);

  // Fetch vitals data
  const vitalsQueryKey = showAllPatientVitals 
    ? [`/api/vitals/patient/${patientId}`]
    : [`/api/vitals/encounter/${encounterId}`];

  const { data: vitalsData, isLoading: vitalsLoading, error: vitalsError } = useQuery({
    queryKey: vitalsQueryKey,
    enabled: !!patientId && (!!encounterId || showAllPatientVitals),
  });

  // Process vitals data
  let vitalsEntries: VitalsEntry[] = [];
  if (vitalsData) {
    const rawEntries = vitalsData.data || vitalsData || [];
    vitalsEntries = Array.isArray(rawEntries) ? rawEntries.map((entry: any) => ({
      ...entry,
      isEditable: !readOnly && entry.encounterContext !== 'historical',
      encounterContext: entry.encounterContext || (entry.encounterId === encounterId ? 'current' : 'historical')
    })) : [];
  }

  // Query for unreviewed alerts for each vitals entry
  const { data: unreviewedAlertsMap = {} } = useQuery({
    queryKey: [`/api/vitals/unreviewed-alerts`, patientId],
    queryFn: async () => {
      const alertsMap: Record<number, string[]> = {};
      
      // Get unreviewed alerts for each vitals entry that has alerts
      const entriesWithAlerts = vitalsEntries.filter(entry => entry.alerts && entry.alerts.length > 0);
      
      for (const entry of entriesWithAlerts) {
        try {
          const response = await fetch(`/api/vitals/${entry.id}/unreviewed-alerts`, {
            credentials: 'include'
          });
          if (response.ok) {
            const unreviewedAlerts = await response.json();
            if (unreviewedAlerts.length > 0) {
              alertsMap[entry.id] = unreviewedAlerts;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch unreviewed alerts for vitals ${entry.id}:`, error);
        }
      }
      
      return alertsMap;
    },
    enabled: vitalsEntries.some(entry => entry.alerts && entry.alerts.length > 0),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to review alerts
  const reviewAlertsMutation = useMutation({
    mutationFn: async ({ vitalsId, alertTexts, reviewNotes }: {
      vitalsId: number;
      alertTexts: string[];
      reviewNotes?: string;
    }) => {
      const response = await fetch(`/api/vitals/${vitalsId}/review-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vitalsId, alertTexts, reviewNotes })
      });

      if (!response.ok) {
        throw new Error(`Failed to review alerts: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Alerts Reviewed",
        description: `Successfully reviewed ${variables.alertTexts.length} critical alert(s)`,
      });
      
      // Refresh unreviewed alerts
      queryClient.invalidateQueries({ 
        queryKey: [`/api/vitals/unreviewed-alerts`, patientId] 
      });
    },
    onError: (error) => {
      toast({
        title: "Review Failed",
        description: error instanceof Error ? error.message : "Failed to review alerts",
        variant: "destructive"
      });
    }
  });

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

  // Add vitals loading state check
  if (vitalsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading vitals...</p>
        </div>
      </div>
    );
  }

  if (vitalsError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium text-red-800">Error loading vitals</div>
          <div className="text-red-700">{vitalsError.message}</div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <CardTitle>Vitals Flowsheet</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {vitalsEntries.length} entries
              </Badge>
            </div>
            
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingEntry({
                    id: 0,
                    encounterId: encounterId || 0,
                    patientId,
                    recordedAt: new Date().toISOString(),
                    recordedBy: "Current User",
                    entryType: "routine",
                    isEditable: true,
                    encounterContext: "current"
                  } as VitalsEntry);
                  setShowAddDialog(true);
                }}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Vitals
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Critical Alerts */}
      {Object.keys(unreviewedAlertsMap).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-red-800">Critical Values Detected:</div>
              {isProvider && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                  onClick={() => {
                    // Review all unreviewed alerts at once
                    Object.entries(unreviewedAlertsMap).forEach(([vitalsId, alerts]) => {
                      reviewAlertsMutation.mutate({
                        vitalsId: parseInt(vitalsId),
                        alertTexts: alerts,
                        reviewNotes: "Bulk review - provider acknowledged"
                      });
                    });
                  }}
                  disabled={reviewAlertsMutation.isPending}
                >
                  {reviewAlertsMutation.isPending ? "Reviewing..." : "Review All"}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {Object.entries(unreviewedAlertsMap).map(([vitalsId, alerts]) => {
                const entry = vitalsEntries.find(e => e.id === parseInt(vitalsId));
                if (!entry) return null;
                
                return (
                  <div key={vitalsId} className="bg-white p-3 rounded border border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800 mb-1">
                          {format(new Date(entry.recordedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                        <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                          {alerts.map((alert, index) => (
                            <li key={index}>{alert}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {isProvider && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-3 text-red-700 border-red-300 hover:bg-red-100"
                          onClick={() => {
                            reviewAlertsMutation.mutate({
                              vitalsId: parseInt(vitalsId),
                              alertTexts: alerts,
                              reviewNotes: "Provider reviewed and acknowledged"
                            });
                          }}
                          disabled={reviewAlertsMutation.isPending}
                        >
                          {reviewAlertsMutation.isPending ? "Reviewing..." : "Review"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!isProvider && (
              <div className="mt-2 text-xs text-red-600">
                Only providers can review and dismiss critical alerts.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Simple vitals table for now */}
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>BP</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>RR</TableHead>
                <TableHead>O2 Sat</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitalsEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatVitalsDateTime(entry.recordedAt)}
                  </TableCell>
                  <TableCell>
                    {entry.systolicBp && entry.diastolicBp 
                      ? `${entry.systolicBp}/${entry.diastolicBp}` 
                      : '-'}
                  </TableCell>
                  <TableCell>{entry.heartRate || '-'}</TableCell>
                  <TableCell>{entry.temperature || '-'}</TableCell>
                  <TableCell>{entry.respiratoryRate || '-'}</TableCell>
                  <TableCell>{entry.oxygenSaturation || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {entry.sourceType || 'manual'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}