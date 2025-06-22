import { useToast } from "@/hooks/use-toast";

/**
 * Shared PDF utility functions for client-side PDF operations
 * Eliminates code duplication between PDF components
 */

export interface PDFFile {
  filename: string;
  size: number;
  created: string;
  downloadUrl: string;
  viewUrl?: string;
  patientId?: number;
  orderType?: string;
}

/**
 * Downloads a PDF file
 */
export async function downloadPDF(filename: string, toast: ReturnType<typeof useToast>['toast']): Promise<void> {
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
}

/**
 * Opens a PDF for printing
 */
export async function printPDF(filename: string, toast: ReturnType<typeof useToast>['toast'], useViewEndpoint = false): Promise<void> {
  try {
    const endpoint = useViewEndpoint ? `/api/pdfs/${filename}/view` : `/api/pdfs/${filename}`;
    const response = await fetch(endpoint);
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
}

/**
 * Opens PDF in new tab for viewing
 */
export async function viewPDFInNewTab(filename: string, toast: ReturnType<typeof useToast>['toast']): Promise<void> {
  try {
    const response = await fetch(`/api/pdfs/${filename}/view`, {
      credentials: 'include'
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up after 5 minutes
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } else {
      throw new Error('View failed');
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to open PDF in new tab",
      variant: "destructive"
    });
  }
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets order type color for badges
 */
export function getOrderTypeColor(orderType: string): string {
  switch (orderType) {
    case 'medication': return 'bg-blue-100 text-blue-800';
    case 'lab': return 'bg-green-100 text-green-800';
    case 'imaging': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Gets order type label for display
 */
export function getOrderTypeLabel(orderType: string): string {
  switch (orderType) {
    case 'medication': return 'Medication Order';
    case 'lab': return 'Lab Order';
    case 'imaging': return 'Imaging Order';
    default: return 'Medical Document';
  }
}

/**
 * Extracts order type from filename
 */
export function getOrderTypeFromFilename(filename: string): string {
  if (filename.includes('medication')) return 'medication';
  if (filename.includes('lab')) return 'lab';
  if (filename.includes('imaging')) return 'imaging';
  return 'document';
}