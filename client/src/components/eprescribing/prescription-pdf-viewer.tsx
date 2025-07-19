import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, Send, Printer, Loader2 } from 'lucide-react';
import { EmbeddedPDFViewer } from '@/components/patient/embedded-pdf-viewer';

interface PrescriptionPdfViewerProps {
  transmissionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFaxSent?: () => void;
}

export function PrescriptionPdfViewer({
  transmissionId,
  open,
  onOpenChange,
  onFaxSent
}: PrescriptionPdfViewerProps) {
  const [showFaxDialog, setShowFaxDialog] = useState(false);
  const [faxNumber, setFaxNumber] = useState('');

  // Get PDF URL
  const pdfUrl = `/api/eprescribing/prescription-pdf/${transmissionId}`;

  // Fax transmission mutation
  const faxMutation = useMutation({
    mutationFn: async (faxNumber: string) => {
      const response = await apiRequest('POST', '/api/eprescribing/transmit-fax', {
        transmissionId,
        faxNumber
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Prescription Faxed',
        description: data.message,
      });
      setShowFaxDialog(false);
      setFaxNumber('');
      onFaxSent?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Fax Failed',
        description: error.message || 'Failed to send prescription via fax',
        variant: 'destructive',
      });
    }
  });

  const handlePrint = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleFaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faxNumber) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a fax number',
        variant: 'destructive',
      });
      return;
    }
    faxMutation.mutate(faxNumber);
  };

  const formatFaxNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription PDF
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col">
            {/* PDF Viewer */}
            <div className="flex-1 border rounded-lg overflow-hidden">
              <EmbeddedPDFViewer
                url={pdfUrl}
                title={`Prescription ${transmissionId}`}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="default" 
                onClick={() => setShowFaxDialog(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Send as Fax
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fax Dialog */}
      <Dialog open={showFaxDialog} onOpenChange={setShowFaxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Prescription via Fax</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFaxSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fax-number">Pharmacy Fax Number</Label>
              <Input
                id="fax-number"
                type="tel"
                placeholder="(XXX) XXX-XXXX"
                value={faxNumber}
                onChange={(e) => setFaxNumber(formatFaxNumber(e.target.value))}
                maxLength={14}
                disabled={faxMutation.isPending}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter the pharmacy's fax number
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowFaxDialog(false)}
                disabled={faxMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={faxMutation.isPending || !faxNumber}
              >
                {faxMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Fax
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}