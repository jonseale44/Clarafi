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
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { 
  downloadPDF, 
  printPDF, 
  viewPDFInNewTab, 
  formatFileSize, 
  getOrderTypeColor, 
  getOrderTypeFromFilename,
  getOrderTypeLabel,
  type PDFFile 
} from "@/lib/pdf-utils";

// PDFFile interface now imported from pdf-utils

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

  // Fetch patient-specific PDFs only
  const { data: pdfData, isLoading, refetch } = useQuery({
    queryKey: [`/api/patients/${patientId}/pdfs`],
  });

  const files = pdfData?.files || [];

  const handleViewPDF = (filename: string) => {
    setSelectedPDF(filename);
  };

  const handleDownloadPDF = (filename: string) => downloadPDF(filename, toast);
  const handlePrintPDF = (filename: string) => printPDF(filename, toast);

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
                      <Badge className={getOrderTypeColor(getOrderTypeFromFilename(file.filename))}>
                        {getOrderTypeLabel(getOrderTypeFromFilename(file.filename))}
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
            <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Medical Document Viewer</p>
                <p className="text-sm text-gray-600 mb-4">
                  Access your PDF documents securely. Click "View in New Tab" for full document view.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => viewPDFInNewTab(selectedPDF, toast)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in New Tab
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPDF(selectedPDF)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}