import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Stethoscope, 
  ClipboardList, 
  Users,
  TestTube,
  PenTool 
} from "lucide-react";

interface ValidationResult {
  canSign: boolean;
  errors: string[];
  warnings: string[];
  requirements: {
    hasSOAPNote: boolean;
    hasCPTCodes: boolean;
    hasDiagnoses: boolean;
    hasSignedOrders: boolean;
    hasCriticalResultsReviewed: boolean;
  };
}

interface EncounterSignaturePanelProps {
  encounterId: number;
  encounterStatus: string;
  onSignatureComplete: () => void;
}

export function EncounterSignaturePanel({ 
  encounterId, 
  encounterStatus,
  onSignatureComplete 
}: EncounterSignaturePanelProps) {
  const [signatureNote, setSignatureNote] = useState("");
  const [showForceSignOption, setShowForceSignOption] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query validation status with auto-refresh
  const { data: validation, isLoading: validationLoading, refetch: refetchValidation } = useQuery<ValidationResult>({
    queryKey: [`/api/encounters/${encounterId}/validation`],
    enabled: encounterStatus !== 'signed',
    refetchInterval: 2000, // Refresh every 2 seconds to catch order status changes
    refetchIntervalInBackground: true,
    staleTime: 500, // Consider data stale after 500ms for more responsive updates
    refetchOnWindowFocus: true, // Refresh when window gains focus
    refetchOnMount: true // Always refresh on component mount
  });

  // Listen for order signing events to trigger immediate validation refresh
  useEffect(() => {
    const handleOrderSigned = () => {
      refetchValidation();
    };
    
    // Listen for custom events from order signing
    window.addEventListener('orderSigned', handleOrderSigned);
    return () => window.removeEventListener('orderSigned', handleOrderSigned);
  }, [refetchValidation]);

  // Sign encounter mutation
  const signEncounterMutation = useMutation({
    mutationFn: async (forceSign: boolean = false) => {
      const response = await fetch(`/api/encounters/${encounterId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          signatureNote: signatureNote.trim() || undefined,
          forceSign 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign encounter');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Encounter Signed",
        description: "The encounter has been successfully signed and finalized.",
      });
      onSignatureComplete();
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-encounters'] });
    },
    onError: (error: any) => {
      if (error.message.includes('validation failed')) {
        setShowForceSignOption(true);
        toast({
          variant: "destructive",
          title: "Validation Required",
          description: "Some requirements are not met. Review the checklist below.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Signature Failed",
          description: error.message,
        });
      }
    }
  });

  if (encounterStatus === 'signed') {
    return (
      <Card className="border-green-200 bg-green-50" data-median="encounter-signed-status">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800 text-xl font-semibold">
            <CheckCircle className="h-5 w-5 mr-2" />
            Encounter Signed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            This encounter has been electronically signed and finalized.
          </p>
        </CardContent>
      </Card>
    );
  }

  const requirements = [
    {
      key: 'hasSOAPNote',
      label: 'SOAP Note Documentation',
      icon: FileText,
      description: 'Complete clinical documentation'
    },
    {
      key: 'hasCPTCodes',
      label: 'CPT Codes',
      icon: Stethoscope,
      description: 'Billing and procedure codes'
    },
    {
      key: 'hasDiagnoses',
      label: 'Diagnoses (ICD-10)',
      icon: ClipboardList,
      description: 'Primary and secondary diagnoses'
    },
    {
      key: 'hasSignedOrders',
      label: 'Signed Orders',
      icon: Users,
      description: 'All pending orders approved'
    },
    {
      key: 'hasCriticalResultsReviewed',
      label: 'Critical Results',
      icon: TestTube,
      description: 'Critical lab values reviewed'
    }
  ];

  return (
    <Card className="border-navy-blue-200" data-median="encounter-signature-panel">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <PenTool className="h-5 w-5 mr-2" />
          Electronic Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Validation Status */}
        {validationLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Validating requirements...</p>
          </div>
        ) : validation && (
          <div className="space-y-4">
            
            {/* Overall Status */}
            <div className={`p-4 rounded-lg border ${
              validation.canSign 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center">
                {validation.canSign ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                )}
                <span className={`font-medium ${
                  validation.canSign ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {validation.canSign 
                    ? 'Ready for Signature' 
                    : 'Requirements Not Met'
                  }
                </span>
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Signature Requirements</h4>
              <div className="grid gap-3">
                {requirements.map((req) => {
                  const isComplete = validation.requirements[req.key as keyof typeof validation.requirements];
                  const Icon = req.icon;
                  
                  return (
                    <div key={req.key} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{req.label}</span>
                          <Badge variant={isComplete ? "default" : "secondary"}>
                            {isComplete ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {isComplete ? 'Complete' : 'Required'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{req.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Validation Errors</h4>
                <div className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm text-red-700">
                      <XCircle className="h-4 w-4 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Warnings</h4>
                <div className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm text-yellow-700">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Signature Note (Optional)
          </label>
          <Textarea
            value={signatureNote}
            onChange={(e) => setSignatureNote(e.target.value)}
            placeholder="Add any additional notes with your signature..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {validation?.canSign ? (
            <Button 
              onClick={() => signEncounterMutation.mutate(false)}
              disabled={signEncounterMutation.isPending}
              className="flex-1"
            >
              {signEncounterMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Sign Encounter
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => refetchValidation()}
              variant="outline"
              disabled={validationLoading}
              className="flex-1"
            >
              Refresh Validation
            </Button>
          )}

          {showForceSignOption && !validation?.canSign && (
            <Button 
              onClick={() => signEncounterMutation.mutate(true)}
              disabled={signEncounterMutation.isPending}
              variant="destructive"
            >
              Force Sign
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <p>
            Electronic signatures are legally binding. Ensure all clinical documentation 
            is accurate and complete before signing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}