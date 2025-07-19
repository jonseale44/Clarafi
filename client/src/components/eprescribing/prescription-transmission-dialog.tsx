import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ElectronicSignatureDialog } from './electronic-signature-dialog';
import { PharmacySelectionDialog } from './pharmacy-selection-dialog';
import {
  Send,
  Printer,
  Mail,
  Shield,
  Store,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  RefreshCw
} from 'lucide-react';

interface PrescriptionTransmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  medications: Array<{
    id: number;
    orderId: number;
    name: string;
    strength?: string;
    dosageForm?: string;
    quantity: number;
    quantityUnit?: string;
    sig?: string;
    refills?: number;
    deaSchedule?: string;
  }>;
  onTransmissionComplete?: () => void;
}

type TransmissionStep = 'select' | 'signature' | 'pharmacy' | 'transmitting' | 'complete';
type TransmissionMethod = 'electronic' | 'print' | 'fax';

export function PrescriptionTransmissionDialog({
  open,
  onOpenChange,
  patientId,
  medications,
  onTransmissionComplete,
}: PrescriptionTransmissionDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<TransmissionStep>('select');
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<number[]>([]);
  const [transmissionMethod, setTransmissionMethod] = useState<TransmissionMethod>('electronic');
  const [signatureId, setSignatureId] = useState<number | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null);
  const [transmissionResults, setTransmissionResults] = useState<any[]>([]);
  
  // Show signature dialog
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showPharmacyDialog, setShowPharmacyDialog] = useState(false);

  // Check if any selected medications are controlled
  const hasControlledSubstances = medications
    .filter(med => selectedMedicationIds.includes(med.id))
    .some(med => med.deaSchedule && ['II', 'III', 'IV', 'V', '2', '3', '4', '5'].includes(med.deaSchedule));

  // Transmit prescriptions mutation
  const transmitMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      
      for (const medicationId of selectedMedicationIds) {
        const medication = medications.find(m => m.id === medicationId);
        if (!medication) continue;
        
        try {
          const result = await apiRequest('/api/eprescribing/transmit', {
            method: 'POST',
            body: JSON.stringify({
              medicationId: medication.id,
              orderId: medication.orderId,
              pharmacyId: selectedPharmacyId,
              transmissionMethod,
              electronicSignatureId: signatureId,
              urgency: 'routine',
            }),
          });
          
          results.push({
            medicationId,
            medicationName: medication.name,
            success: true,
            transmissionId: result.transmissionId,
            status: result.status,
          });
        } catch (error: any) {
          results.push({
            medicationId,
            medicationName: medication.name,
            success: false,
            error: error.message || 'Transmission failed',
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      setTransmissionResults(results);
      setCurrentStep('complete');
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast({
          title: 'Prescriptions Transmitted',
          description: `Successfully transmitted ${successCount} prescription${successCount !== 1 ? 's' : ''}`,
        });
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Transmitted ${successCount} of ${totalCount} prescriptions`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Transmission Failed',
          description: 'Failed to transmit prescriptions',
          variant: 'destructive',
        });
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      if (onTransmissionComplete) {
        onTransmissionComplete();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Transmission Error',
        description: error.message || 'Failed to transmit prescriptions',
        variant: 'destructive',
      });
    },
  });

  const handleMedicationToggle = (medicationId: number) => {
    setSelectedMedicationIds(prev =>
      prev.includes(medicationId)
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMedicationIds.length === medications.length) {
      setSelectedMedicationIds([]);
    } else {
      setSelectedMedicationIds(medications.map(m => m.id));
    }
  };

  const handleProceedToSignature = () => {
    if (selectedMedicationIds.length === 0) {
      toast({
        title: 'No Medications Selected',
        description: 'Please select at least one medication to transmit',
        variant: 'destructive',
      });
      return;
    }
    setShowSignatureDialog(true);
  };

  const handleSignatureComplete = (newSignatureId: number) => {
    setSignatureId(newSignatureId);
    setShowSignatureDialog(false);
    setCurrentStep('signature');
    setShowPharmacyDialog(true);
  };

  const handlePharmacySelect = (pharmacyId: number) => {
    setSelectedPharmacyId(pharmacyId);
    setShowPharmacyDialog(false);
    setCurrentStep('pharmacy');
    
    // Start transmission
    setCurrentStep('transmitting');
    transmitMutation.mutate();
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep('select');
    setSelectedMedicationIds([]);
    setSignatureId(null);
    setSelectedPharmacyId(null);
    setTransmissionResults([]);
    onOpenChange(false);
  };

  const renderMedicationCard = (medication: any) => (
    <Card key={medication.id} className="cursor-pointer">
      <CardHeader 
        className="pb-3"
        onClick={() => handleMedicationToggle(medication.id)}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selectedMedicationIds.includes(medication.id)}
            className="mt-1"
          />
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {medication.name}
              {medication.deaSchedule && (
                <Badge variant="destructive" className="text-xs">
                  DEA Schedule {medication.deaSchedule}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {medication.strength && `${medication.strength} `}
              {medication.dosageForm && `${medication.dosageForm} • `}
              Qty: {medication.quantity} {medication.quantityUnit || ''}
              {medication.refills !== undefined && ` • Refills: ${medication.refills}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {medication.sig && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Sig: {medication.sig}
          </p>
        </CardContent>
      )}
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Transmit Prescriptions
            </DialogTitle>
            <DialogDescription>
              {currentStep === 'select' && 'Select medications to transmit'}
              {currentStep === 'signature' && 'Electronic signature captured'}
              {currentStep === 'pharmacy' && 'Pharmacy selected'}
              {currentStep === 'transmitting' && 'Transmitting prescriptions...'}
              {currentStep === 'complete' && 'Transmission complete'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step: Select Medications */}
            {currentStep === 'select' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Select Prescriptions to Transmit</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedMedicationIds.length === medications.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {medications.map(medication => renderMedicationCard(medication))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Transmission Method</Label>
                  <RadioGroup value={transmissionMethod} onValueChange={(value: any) => setTransmissionMethod(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="electronic" id="electronic" />
                      <Label htmlFor="electronic" className="flex items-center gap-2 cursor-pointer">
                        <Send className="h-4 w-4" />
                        Electronic (E-Prescribe)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="print" id="print" />
                      <Label htmlFor="print" className="flex items-center gap-2 cursor-pointer">
                        <Printer className="h-4 w-4" />
                        Print
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fax" id="fax" />
                      <Label htmlFor="fax" className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-4 w-4" />
                        Fax
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {hasControlledSubstances && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Selected prescriptions contain controlled substances. A DEA electronic
                      signature will be required.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleProceedToSignature}>
                    <Shield className="h-4 w-4 mr-2" />
                    Proceed to Sign
                  </Button>
                </div>
              </>
            )}

            {/* Step: Transmitting */}
            {currentStep === 'transmitting' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Transmitting Prescriptions...</p>
                <p className="text-sm text-muted-foreground">
                  Sending {selectedMedicationIds.length} prescription{selectedMedicationIds.length !== 1 ? 's' : ''} 
                  {transmissionMethod === 'electronic' ? ' electronically' : transmissionMethod === 'print' ? ' to printer' : ' via fax'}
                </p>
              </div>
            )}

            {/* Step: Complete */}
            {currentStep === 'complete' && (
              <>
                <div className="space-y-3">
                  {transmissionResults.map((result, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            )}
                            {result.medicationName}
                          </CardTitle>
                          {result.success ? (
                            <Badge variant="outline" className="text-green-600">
                              Transmitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">
                              Failed
                            </Badge>
                          )}
                        </div>
                        {result.error && (
                          <CardDescription className="text-red-600 mt-1">
                            {result.error}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  {transmissionResults.some(r => !r.success) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Retry failed transmissions
                        const failedIds = transmissionResults
                          .filter(r => !r.success)
                          .map(r => r.medicationId);
                        setSelectedMedicationIds(failedIds);
                        setCurrentStep('select');
                        setTransmissionResults([]);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Failed
                    </Button>
                  )}
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <ElectronicSignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onSignatureComplete={handleSignatureComplete}
        medicationIds={selectedMedicationIds}
        requiresDea={hasControlledSubstances}
        encounterId={undefined} // Would be passed if available
      />

      <PharmacySelectionDialog
        open={showPharmacyDialog}
        onOpenChange={setShowPharmacyDialog}
        onPharmacySelect={handlePharmacySelect}
        patientId={patientId}
        medicationIds={selectedMedicationIds}
        isControlled={hasControlledSubstances}
        urgency="routine"
      />
    </>
  );
}