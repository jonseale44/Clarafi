import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  RefreshCw, 
  Calendar,
  User,
  FileCheck,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface PDFFile {
  filename: string;
  size: number;
  created: string;
  downloadUrl: string;
  patientId?: number;
  orderType?: string;
  generatedBy?: string;
}

interface EmbeddedPDFViewerProps {
  patientId: number;
  title?: string;
  showAllPDFs?: boolean;
}

export function EmbeddedPDFViewer({ 
  patientId, 
  title = "Patient Documents", 
  showAllPDFs = false 
}: EmbeddedPDFViewerProps) {
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch PDFs - use patient-specific endpoint if not showing all
  const { data: pdfData, isLoading, refetch } = useQuery({
    queryKey: showAllPDFs ? ["/api/pdfs"] : [`/api/patients/${patientId}/pdfs`],
  });

  const files = pdfData || [];

  const handleViewPDF = (filename: string) => {
    setSelectedPDF(filename);
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

  const handlePrintPDF = async (filename: string) => {
    try {
      // Open PDF in new window for printing
      const response = await fetch(`/api/pdfs/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up URL after printing
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOrderTypeColor = (filename: string) => {
    if (filename.includes('medication')) return 'bg-blue-100 text-blue-800';
    if (filename.includes('lab')) return 'bg-green-100 text-green-800';
    if (filename.includes('imaging')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getOrderTypeFromFilename = (filename: string) => {
    if (filename.includes('medication')) return 'Medication Order';
    if (filename.includes('lab')) return 'Lab Order';
    if (filename.includes('imaging')) return 'Imaging Order';
    return 'Medical Document';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
            {files.length > 0 && (
              <Badge variant="secondary">{files.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No documents found</p>
              <p className="text-sm">Documents will appear here after signing orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getOrderTypeColor(file.filename)}>
                        {getOrderTypeFromFilename(file.filename)}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(file.created), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div className="font-medium text-sm truncate mb-1">
                      {file.filename}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewPDF(file.filename)}
                      className="h-8"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintPDF(file.filename)}
                      className="h-8"
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(file.filename)}
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
        </CardContent>
      </Card>

      {/* Embedded PDF Viewer Modal */}
      {selectedPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-screen flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                <span className="font-medium">{selectedPDF}</span>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPDF(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/api/pdfs/${selectedPDF}/view#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border-0"
                title={`PDF Viewer - ${selectedPDF}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}