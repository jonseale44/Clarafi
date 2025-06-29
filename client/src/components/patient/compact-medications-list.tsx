import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Plus, ExternalLink } from "lucide-react";

interface CompactMedicationsListProps {
  patientId: number;
  encounterId?: number;
  maxDisplay?: number;
  onExpandClick?: () => void;
}

export function CompactMedicationsList({ 
  patientId, 
  encounterId, 
  maxDisplay = 3,
  onExpandClick 
}: CompactMedicationsListProps) {
  const { data: medicationsData, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/medications-enhanced`],
    enabled: !!patientId
  }) as { data?: any; isLoading: boolean };

  if (isLoading) {
    return (
      <div className="p-2 text-xs text-gray-500">Loading medications...</div>
    );
  }

  const medications = (medicationsData as any)?.medications || [];
  const displayMedications = medications.slice(0, maxDisplay);
  const hasMore = medications.length > maxDisplay;

  if (medications.length === 0) {
    return (
      <div className="p-2 text-center text-xs text-gray-500">
        <Pill className="h-4 w-4 mx-auto mb-1 text-gray-400" />
        <p>No medications</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayMedications.map((med: any) => (
        <div key={med.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{med.medicationName}</div>
            <div className="text-gray-600 truncate">{med.dosage}</div>
          </div>
          <Badge 
            variant={med.status === 'active' ? 'default' : 'secondary'}
            className="text-xs py-0 px-1"
          >
            {med.status}
          </Badge>
        </div>
      ))}
      
      {hasMore && (
        <div className="text-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandClick}
            className="h-6 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View all {medications.length} medications
          </Button>
        </div>
      )}
    </div>
  );
}