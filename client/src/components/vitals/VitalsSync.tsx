import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

interface VitalsSyncProps {
  encounterId: number;
  patientId: number;
  onSyncComplete?: () => void;
}

interface SyncStatus {
  hasDuplicates: boolean;
  duplicateFields: string[];
  totalVitalsEntries: number;
  lastSync: Date | null;
}

export function VitalsSync({ encounterId, patientId, onSyncComplete }: VitalsSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkVitalsSync = async () => {
    setIsChecking(true);
    try {
      // Get all vitals for this encounter to check for duplicates
      const response = await fetch(`/api/vitals/encounter/${encounterId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const vitalsEntries = result.success ? result.data : result;
        
        // Simple duplicate detection for display
        const duplicateFields: string[] = [];
        const seenValues: Record<string, Set<string>> = {};
        
        vitalsEntries.forEach((entry: any) => {
          ['systolicBp', 'diastolicBp', 'heartRate', 'temperature'].forEach(field => {
            if (entry[field] !== null && entry[field] !== undefined) {
              if (!seenValues[field]) seenValues[field] = new Set();
              const value = entry[field].toString();
              if (seenValues[field].has(value) && !duplicateFields.includes(field)) {
                duplicateFields.push(field);
              }
              seenValues[field].add(value);
            }
          });
        });

        setSyncStatus({
          hasDuplicates: duplicateFields.length > 0,
          duplicateFields,
          totalVitalsEntries: vitalsEntries.length,
          lastSync: new Date()
        });
      }
    } catch (error) {
      console.error("Error checking vitals sync:", error);
      toast({
        title: "Sync Check Failed",
        description: "Unable to check vitals synchronization status",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkVitalsSync();
  }, [encounterId]);

  const getSyncStatusColor = () => {
    if (!syncStatus) return "secondary";
    if (syncStatus.hasDuplicates) return "destructive";
    return "default";
  };

  const getSyncStatusIcon = () => {
    if (isChecking) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (!syncStatus) return <RefreshCw className="h-3 w-3" />;
    if (syncStatus.hasDuplicates) return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getSyncStatusText = () => {
    if (isChecking) return "Checking...";
    if (!syncStatus) return "Check Sync";
    if (syncStatus.hasDuplicates) {
      return `Duplicates: ${syncStatus.duplicateFields.join(', ')}`;
    }
    return `Synced (${syncStatus.totalVitalsEntries} entries)`;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={getSyncStatusColor() as any}
        className="flex items-center gap-1 text-xs"
      >
        {getSyncStatusIcon()}
        {getSyncStatusText()}
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={checkVitalsSync}
        disabled={isChecking}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}