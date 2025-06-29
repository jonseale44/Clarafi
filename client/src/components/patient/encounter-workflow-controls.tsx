import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Clock, 
  CheckCircle, 
  FileCheck, 
  AlertTriangle,
  Stethoscope
} from "lucide-react";

interface EncounterWorkflowControlsProps {
  encounterId: number;
  encounterStatus: string;
  onStatusChange: () => void;
}

export function EncounterWorkflowControls({ 
  encounterId, 
  encounterStatus,
  onStatusChange 
}: EncounterWorkflowControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update encounter status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/encounters/${encounterId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update encounter status');
      }

      return response.json();
    },
    onSuccess: (data, newStatus) => {
      const statusLabels: Record<string, string> = {
        'in_progress': 'In Progress',
        'pending_review': 'Pending Review', 
        'completed': 'Completed',
        'signed': 'Signed'
      };

      toast({
        title: "Status Updated",
        description: `Encounter status changed to: ${statusLabels[newStatus]}`,
      });
      
      onStatusChange();
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-encounters'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'In Progress',
          icon: Stethoscope,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Documentation in progress'
        };
      case 'pending_review':
        return {
          label: 'Pending Review',
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Ready for provider review'
        };
      case 'completed':
        return {
          label: 'Completed',
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Documentation complete'
        };
      case 'signed':
        return {
          label: 'Signed',
          icon: FileCheck,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Electronically signed'
        };
      default:
        return {
          label: status.replace('_', ' '),
          icon: AlertTriangle,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Unknown status'
        };
    }
  };

  const statusInfo = getStatusInfo(encounterStatus);
  const StatusIcon = statusInfo.icon;

  const getAvailableActions = () => {
    switch (encounterStatus) {
      case 'in_progress':
        return [
          { 
            status: 'pending_review', 
            label: 'Pend for Review', 
            variant: 'outline' as const,
            description: 'Mark as ready for provider review'
          },
          { 
            status: 'completed', 
            label: 'Mark Complete', 
            variant: 'default' as const,
            description: 'Complete documentation without review'
          }
        ];
      case 'pending_review':
        return [
          { 
            status: 'in_progress', 
            label: 'Return to Progress', 
            variant: 'outline' as const,
            description: 'Continue documentation'
          },
          { 
            status: 'completed', 
            label: 'Approve & Complete', 
            variant: 'default' as const,
            description: 'Approve and mark complete'
          }
        ];
      case 'completed':
        return [
          { 
            status: 'in_progress', 
            label: 'Reopen', 
            variant: 'outline' as const,
            description: 'Reopen for additional documentation'
          }
        ];
      case 'signed':
        return []; // No actions available for signed encounters
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions();

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Save className="h-4 w-4 mr-2" />
          Encounter Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Current Status</label>
          <div className={`p-3 rounded-lg border ${statusInfo.color}`}>
            <div className="flex items-center">
              <StatusIcon className="h-4 w-4 mr-2" />
              <span className="font-medium">{statusInfo.label}</span>
            </div>
            <p className="text-xs mt-1 opacity-80">{statusInfo.description}</p>
          </div>
        </div>

        {/* Available Actions */}
        {availableActions.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Available Actions</label>
            <div className="grid gap-2">
              {availableActions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => updateStatusMutation.mutate(action.status)}
                  disabled={updateStatusMutation.isPending}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs opacity-70">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-save Status */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center">
            <Save className="h-3 w-3 mr-1" />
            <span>Changes are automatically saved</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}