import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PenTool, KeyRound, Shield, AlertTriangle } from 'lucide-react';

interface ElectronicSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignatureComplete: (signatureId: number) => void;
  medicationIds?: number[];
  requiresDea?: boolean;
  encounterId?: number;
}

export function ElectronicSignatureDialog({
  open,
  onOpenChange,
  onSignatureComplete,
  medicationIds = [],
  requiresDea = false,
  encounterId,
}: ElectronicSignatureDialogProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [typedSignature, setTypedSignature] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useTwoFactor, setUseTwoFactor] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const createSignatureMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest('/api/eprescribing/signature', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      toast({
        title: 'Signature Created',
        description: requiresDea 
          ? 'DEA signature successfully captured for controlled substances'
          : 'Electronic signature successfully captured',
      });
      onSignatureComplete(data.signatureId);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Signature Error',
        description: error.message || 'Failed to create electronic signature',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTypedSignature('');
    setPassword('');
    setTwoFactorCode('');
    setUseTwoFactor(false);
    setHasDrawn(false);
    clearCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw signature line
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, canvas.height - 30);
        ctx.lineTo(canvas.width - 20, canvas.height - 30);
        ctx.stroke();
      }
    }
    setHasDrawn(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#003366'; // Navy blue for signature
        ctx.lineWidth = 2;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = async () => {
    let signatureData = '';
    
    if (signatureType === 'typed') {
      if (!typedSignature.trim()) {
        toast({
          title: 'Signature Required',
          description: 'Please type your full name',
          variant: 'destructive',
        });
        return;
      }
      signatureData = typedSignature;
    } else {
      if (!hasDrawn) {
        toast({
          title: 'Signature Required',
          description: 'Please draw your signature',
          variant: 'destructive',
        });
        return;
      }
      // Convert canvas to base64
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL('image/png');
      }
    }

    if (!password) {
      toast({
        title: 'Authentication Required',
        description: 'Please enter your password to sign',
        variant: 'destructive',
      });
      return;
    }

    createSignatureMutation.mutate({
      encounterId,
      signatureType,
      signatureData,
      authenticationMethod: useTwoFactor ? 'two_factor' : 'password',
      twoFactorUsed: useTwoFactor,
      twoFactorCode: useTwoFactor ? twoFactorCode : undefined,
      medicationIds,
      deaSignature: requiresDea,
    });
  };

  React.useEffect(() => {
    if (open && signatureType === 'drawn') {
      clearCanvas();
    }
  }, [open, signatureType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-median="electronic-signature-dialog">
        <DialogHeader data-median="signature-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {requiresDea ? 'DEA Electronic Signature Required' : 'Electronic Signature Required'}
          </DialogTitle>
          <DialogDescription>
            {requiresDea 
              ? 'A DEA-registered electronic signature is required to prescribe controlled substances'
              : 'An electronic signature is required to transmit this prescription'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requiresDea && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This prescription contains controlled substances. By signing, you certify that this
                prescription is for a legitimate medical purpose by a practitioner acting in the
                usual course of professional practice.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Signature Method</Label>
            <RadioGroup value={signatureType} onValueChange={(value: any) => setSignatureType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="typed" id="typed" />
                <Label htmlFor="typed" className="flex items-center gap-2 cursor-pointer">
                  <KeyRound className="h-4 w-4" />
                  Type Full Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="drawn" id="drawn" />
                <Label htmlFor="drawn" className="flex items-center gap-2 cursor-pointer">
                  <PenTool className="h-4 w-4" />
                  Draw Signature
                </Label>
              </div>
            </RadioGroup>
          </div>

          {signatureType === 'typed' ? (
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Type Your Full Name</Label>
              <Input
                id="typed-signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="text-lg font-signature"
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Draw Your Signature</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                  >
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="border rounded-md cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </CardContent>
            </Card>
          )}

          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="two-factor"
                checked={useTwoFactor}
                onCheckedChange={(checked) => setUseTwoFactor(checked as boolean)}
              />
              <Label htmlFor="two-factor" className="cursor-pointer">
                Use two-factor authentication
              </Label>
            </div>

            {useTwoFactor && (
              <div className="space-y-2">
                <Label htmlFor="two-factor-code">Two-Factor Code</Label>
                <Input
                  id="two-factor-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              By providing your electronic signature, you certify that you have reviewed this
              prescription and that it is accurate, appropriate, and medically necessary for the
              patient's treatment.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createSignatureMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createSignatureMutation.isPending}
          >
            {createSignatureMutation.isPending ? 'Signing...' : 'Sign Prescription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}