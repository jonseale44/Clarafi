import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface PDFFile {
  filename: string;
  size: number;
  created: string;
  orderType: string;
  orderIds: number[];
}

interface PDFSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSigning: () => void;
  orderIds: number[];
  patientId: number;
  encounterId: number;
  title?: string;
}

export function PDFSigningModal({ 
  isOpen, 
  onClose, 
  onConfirmSigning,
  orderIds,
  patientId,
  encounterId,
  title = "Sign Orders & Generate Documents"
}: PDFSigningModalProps) {
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [generatedPDFs, setGeneratedPDFs] = useState<PDFFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

  const handleViewPDF = (filename: string) => {
    setSelectedPDF(filename);
  };

  const handlePrintPDF = async (filename: string) => {
    try {
      const response = await fetch(`/api/pdfs/${filename}/view`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
            }, 1000);
          };
        }
        
        toast({
          title: "Print Ready",
          description: `${filename} opened for printing`,
        });
      } else {
        throw new Error('Print preparation failed');
      }
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Unable to prepare PDF for printing",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = async (filename: string) => {
    try {
      const response = await fetch(`/api/pdfs/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Downloaded",
          description: `${filename} has been downloaded`,
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the PDF file",
        variant: "destructive"
      });
    }
  };

  const handleConfirmAndSign = async () => {
    setIsConfirming(true);
    try {
      await onConfirmSigning();
      onClose();
    } catch (error) {
      console.error('Signing failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const getOrderTypeColor = (orderType: string) => {
    if (orderType === 'medication') return 'bg-blue-100 text-blue-800';
    if (orderType === 'lab') return 'bg-green-100 text-green-800';
    if (orderType === 'imaging') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getOrderTypeLabel = (orderType: string) => {
    if (orderType === 'medication') return 'Medication Order';
    if (orderType === 'lab') return 'Lab Order';
    if (orderType === 'imaging') return 'Imaging Order';
    return 'Medical Order';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Ready to sign {orderIds.length} order{orderIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Documents will be generated for orders that require printed forms.
                  You can preview, print, or download them before confirming.
                </p>
              </div>

              {/* Generated PDFs Preview */}
              {generatedPDFs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Generated Documents:</h3>
                  {generatedPDFs.map((pdf) => (
                    <div
                      key={pdf.filename}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getOrderTypeColor(pdf.orderType)}>
                            {getOrderTypeLabel(pdf.orderType)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(pdf.created), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <div className="font-medium text-sm truncate">
                          {pdf.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(pdf.size)} • {pdf.orderIds.length} order{pdf.orderIds.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPDF(pdf.filename)}
                          className="h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintPDF(pdf.filename)}
                          className="h-8"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(pdf.filename)}
                          className="h-8"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No PDFs Message */}
              {!isGenerating && generatedPDFs.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    No printable documents will be generated for these orders.
                    Click "Confirm & Sign" to proceed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isConfirming}>
              Cancel
            </Button>
            
            <div className="flex items-center gap-3">
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating documents...
                </div>
              )}
              
              <Button 
                onClick={handleConfirmAndSign}
                disabled={isConfirming}
                className="min-w-[140px]"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm & Sign
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      {selectedPDF && (
        <Dialog open={!!selectedPDF} onOpenChange={() => setSelectedPDF(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Preview
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintPDF(selectedPDF)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(selectedPDF)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/api/pdfs/${selectedPDF}/view#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border-0"
                title={`PDF Preview - ${selectedPDF}`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}