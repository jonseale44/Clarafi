import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/contexts/UploadContext";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Eye,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  FileSearch,
  Loader2,
  Brain,
  FileX,
  Maximize2,
  Minimize2,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Camera,
  QrCode
} from "lucide-react";
import QRCode from 'qrcode';
import { formatDistanceToNow } from "date-fns";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AreaSelector } from "@/components/ui/area-selector";
import { analytics } from "@/lib/analytics";

// Enhanced Extracted Content Dialog Component
interface ExtractedContentDialogProps {
  attachment: PatientAttachment;
  getDocumentTypeBadge: (type: string) => JSX.Element;
}

function ExtractedContentDialog({ attachment, getDocumentTypeBadge }: ExtractedContentDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Calculate total matches
  const totalMatches = useMemo(() => {
    if (!searchTerm.trim() || !attachment.extractedContent?.extractedText) return 0;
    
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = attachment.extractedContent.extractedText.match(regex);
    return matches ? matches.length : 0;
  }, [attachment.extractedContent?.extractedText, searchTerm]);

  // Function to highlight search results with current match indication
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    let matchCount = 0;
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        const isCurrentMatch = matchCount === currentMatchIndex;
        matchCount++;
        return (
          <mark 
            key={index} 
            data-match-index={matchCount - 1}
            className={`rounded px-0.5 ${
              isCurrentMatch 
                ? 'bg-orange-400 dark:bg-orange-600' 
                : 'bg-yellow-200 dark:bg-yellow-800'
            }`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Navigate to previous match
  const goToPreviousMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prevIndex) => 
        prevIndex > 0 ? prevIndex - 1 : totalMatches - 1
      );
    }
  };

  // Navigate to next match
  const goToNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prevIndex) => 
        prevIndex < totalMatches - 1 ? prevIndex + 1 : 0
      );
    }
  };

  // Scroll to current match when it changes
  useEffect(() => {
    if (scrollAreaRef.current && totalMatches > 0) {
      const matchElement = scrollAreaRef.current.querySelector(
        `mark[data-match-index="${currentMatchIndex}"]`
      );
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, totalMatches]);

  // Reset current match index when search term changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm]);

  // Get the displayed text (always show full text, not filtered)
  const displayedText = attachment.extractedContent?.extractedText || "";

  const handleCopyText = () => {
    if (attachment.extractedContent?.extractedText) {
      navigator.clipboard.writeText(attachment.extractedContent.extractedText);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-800"
          title="View extracted text"
        >
          <FileSearch className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className={`${
          isExpanded 
            ? "max-w-full max-h-full w-full h-full m-0" 
            : "max-w-4xl max-h-[80vh]"
        } transition-all duration-200`}
        aria-describedby="extracted-content-description"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Extracted Content: {attachment.extractedContent?.aiGeneratedTitle || attachment.originalFileName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
              className="ml-4"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          <span id="extracted-content-description" className="sr-only">
            View and search the extracted text content from the uploaded document
          </span>
        </DialogHeader>
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              {attachment.extractedContent?.documentType && getDocumentTypeBadge(attachment.extractedContent.documentType)}
              <span className="text-sm text-gray-500">
                Processed: {formatDistanceToNow(new Date(attachment.extractedContent?.processedAt || new Date()), { addSuffix: true })}
              </span>
            </div>
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search in extracted text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {searchTerm && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {totalMatches > 0 
                  ? `${currentMatchIndex + 1} of ${totalMatches} matches for "${searchTerm}"`
                  : `No matches found for "${searchTerm}"`}
              </div>
              {totalMatches > 0 && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousMatch}
                    title="Previous match"
                    className="h-8 px-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextMatch}
                    title="Next match"
                    className="h-8 px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <ScrollArea className={`${isExpanded ? "flex-1" : "h-96"} w-full rounded border p-4 bg-gray-50 dark:bg-gray-900`}>
            <div ref={scrollAreaRef} className="whitespace-pre-wrap text-sm">
              {searchTerm.trim() && totalMatches > 0
                ? highlightText(displayedText, searchTerm)
                : displayedText}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {attachment.extractedContent?.extractedText && (
                <>
                  {attachment.extractedContent.extractedText.split('\n').length} lines • 
                  {attachment.extractedContent.extractedText.length} characters
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
            >
              Copy Full Text
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PatientAttachment {
  id: number;
  patientId: number;
  encounterId?: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  filePath: string;
  thumbnailPath?: string;
  category: string;
  title?: string;
  description?: string;
  tags: string[];
  uploadedBy: number;
  isConfidential: boolean;
  accessLevel: string;
  processingStatus: string;
  virusScanStatus: string;
  createdAt: string;
  updatedAt: string;
  extractedContent?: {
    id: number;
    extractedText: string;
    aiGeneratedTitle: string;
    documentType: string;
    processingStatus: string;
    errorMessage?: string;
    processedAt: string;
  };
}

interface PatientAttachmentsProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
  highlightAttachmentId?: number;
}

export function PatientAttachments({ 
  patientId, 
  encounterId, 
  mode = "patient-chart",
  isReadOnly = false,
  highlightAttachmentId
}: PatientAttachmentsProps) {
  console.log('🔗 [PatientAttachments] Component props:', { 
    patientId, 
    encounterId, 
    mode, 
    isReadOnly, 
    highlightAttachmentId 
  });
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');

  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Photo capture states (QR code functionality)
  const [photoCaptureSession, setPhotoCaptureSession] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const sessionPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // EMR screenshot capture states
  const [showScreenshotCapture, setShowScreenshotCapture] = useState(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // These functions don't exist in UploadContext - removing to fix upload
  // const { startUpload, updateProgress, completeUpload, cancelUpload } = useUpload();
  const uploadContext = useUpload();
  console.log('📎 [Frontend] UploadContext content:', uploadContext);

  // Get attachments - always show all patient attachments, regardless of mode
  const { data: attachments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/patients", patientId, "attachments"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/attachments`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return response.json() as Promise<PatientAttachment[]>;
    },
    refetchInterval: 3000, // Poll every 3 seconds to update processing status
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Effect to handle refetching when component mounts to ensure latest status
  useEffect(() => {
    console.log('🔗 [PatientAttachments] Component mounted, checking for processing attachments');
    
    // Check if any attachments are still processing
    const hasProcessingAttachments = attachments.some(att => 
      att.extractedContent?.processingStatus === 'processing' || 
      att.extractedContent?.processingStatus === 'pending'
    );
    
    if (hasProcessingAttachments) {
      console.log('🔗 [PatientAttachments] Found processing attachments, ensuring fresh data');
      refetch();
    }
  }, [patientId]); // Only depend on patientId to run on mount

  // Effect to handle messages from Clarafi browser extension
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      // Only accept messages from our extension
      if (event.data?.type === 'PREVIEW_CAPTURE' && event.data?.imageData) {
        console.log('📸 [PatientAttachments] Received screenshot from Clarafi extension');
        
        // Convert base64 to blob
        const base64Data = event.data.imageData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        // Create a File object
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `emr-capture-${timestamp}.png`);
        
        // Set the file and show upload form
        setUploadFile(file);
        setTitle('EMR Screenshot');
        
        // If GPT detected patient context, add it to description
        if (event.data.context?.patientName) {
          setDescription(`Captured from EMR for patient: ${event.data.context.patientName}`);
        } else {
          setDescription('Screenshot captured from EMR system');
        }
        
        setShowUploadForm(true);
        
        // Show a toast notification
        toast({
          title: "Screenshot Received",
          description: "EMR screenshot ready for upload. Please review and confirm.",
        });
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    
    return () => {
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [toast]);

  // Single file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📎 [Frontend] ===== MUTATION FUNCTION STARTED =====');
      console.log('📎 [Frontend] Starting single upload for patient:', patientId);
      console.log('📎 [Frontend] FormData contents:', Array.from(formData.entries()));
      console.log('📎 [Frontend] Available from UploadContext:', uploadContext);
      
      // Start upload tracking with detailed logging
      const fileEntry = formData.get('file');
      console.log('📎 [Frontend] File entry type:', typeof fileEntry);
      console.log('📎 [Frontend] File entry:', fileEntry);
      console.log('📎 [Frontend] File constructor available:', typeof File !== 'undefined');
      console.log('📎 [Frontend] Global window.File:', typeof window.File !== 'undefined');
      
      let fileName = 'Unknown file';
      try {
        // Use a safer type check that doesn't rely on instanceof
        if (fileEntry && typeof fileEntry === 'object' && fileEntry !== null && 'name' in fileEntry && 'size' in fileEntry) {
          fileName = (fileEntry as any).name || 'Unknown file';
          console.log('📎 [Frontend] Extracted fileName:', fileName);
        } else {
          console.log('📎 [Frontend] File entry is not a valid File object');
        }
      } catch (error) {
        console.error('📎 [Frontend] Error extracting file name:', error);
        console.error('📎 [Frontend] Error details:', {
          name: (error as any)?.name,
          message: (error as any)?.message,
          stack: (error as any)?.stack?.split('\n').slice(0, 3).join('\n')
        });
      }
      
      console.log('📎 [Frontend] Starting upload tracking for patient:', patientId, 'file:', fileName);
      // REMOVED: startUpload call - function doesn't exist in UploadContext
      console.log('📎 [Frontend] Skipping startUpload - function not available');
      console.log('📎 [Frontend] Preparing fetch directly');
      
      try {
        console.log('📎 [Frontend] About to call fetch with URL:', `/api/patients/${patientId}/attachments`);
        console.log('📎 [Frontend] Fetch options:', { method: 'POST', bodySize: formData.toString().length });
        console.log('📎 [Frontend] FormData entries before fetch:', Array.from(formData.entries()));
        console.log('📎 [Frontend] Window.fetch exists:', typeof window.fetch);
        
        console.log('📎 [Frontend] CALLING FETCH NOW!!!');
        const response = await fetch(`/api/patients/${patientId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('📎 [Frontend] FETCH RETURNED! Response received');
        console.log('📎 [Frontend] Response type:', typeof response);
        console.log('📎 [Frontend] Response status:', response.status);
        console.log('📎 [Frontend] Response headers:', Object.fromEntries(response.headers.entries()));
      
        const responseText = await response.text();
        console.log('📎 [Frontend] Raw response text:', responseText);
        
        if (!response.ok) {
          // REMOVED: cancelUpload() - function doesn't exist
          throw new Error(`Upload failed: ${response.status} - ${responseText}`);
        }
        
        // REMOVED: updateProgress(80, 'processing') - function doesn't exist
        
        try {
          const result = JSON.parse(responseText);
          // REMOVED: updateProgress(90, 'analyzing') - function doesn't exist
          return result;
        } catch (parseError) {
          console.error('📎 [Frontend] JSON parse error:', parseError);
          // REMOVED: cancelUpload() - function doesn't exist
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        }
      } catch (fetchError) {
        console.error('📎 [Frontend] Fetch error:', fetchError);
        console.error('📎 [Frontend] Error details:', {
          name: (fetchError as any)?.name,
          message: (fetchError as any)?.message,
          stack: (fetchError as any)?.stack?.split('\n').slice(0, 3).join('\n')
        });
        // REMOVED: cancelUpload() - function doesn't exist
        throw fetchError;
      }
    },
    onSuccess: (data) => {
      console.log('📎 [Frontend] UPLOAD SUCCESS! Data:', data);
      // REMOVED: completeUpload() - function doesn't exist
      console.log('📎 [Frontend] Invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      
      console.log('📎 [Frontend] Tracking analytics...');
      // Track single attachment upload
      analytics.trackFeatureUsage('attachment_upload', 'uploaded', {
        uploadType: 'single',
        fileCount: 1,
        patientId: patientId,
        encounterId: encounterId,
        mode: mode,
        fileType: uploadFile?.type || 'unknown'
      });
      
      // Track conversion event
      analytics.trackConversion({
        eventType: 'attachment_parsed',
        eventData: {
          uploadType: 'single',
          fileCount: 1,
          patientId: patientId,
          encounterId: encounterId
        }
      });
      
      console.log('📎 [Frontend] Showing success toast...');
      toast({ title: "Upload successful", description: "File has been uploaded successfully." });
      console.log('📎 [Frontend] Resetting form...');
      resetUploadForm();
      console.log('📎 [Frontend] Upload complete!');
    },
    onError: (error: Error) => {
      console.error('📎 [Frontend] UPLOAD ERROR!', error);
      console.error('📎 [Frontend] Error type:', error.constructor.name);
      console.error('📎 [Frontend] Error message:', error.message);
      console.error('📎 [Frontend] Error stack:', error.stack);
      // REMOVED: cancelUpload() - function doesn't exist
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Multiple files upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📎 [Frontend] Starting bulk upload for patient:', patientId);
      console.log('📎 [Frontend] FormData contents:', Array.from(formData.entries()));
      
      // Start upload tracking with file count and detailed logging
      const files = formData.getAll('files');
      console.log('📎 [Frontend] Bulk upload files:', files);
      console.log('📎 [Frontend] Files length:', files.length);
      const fileName = `${files.length} files`;
      console.log('📎 [Frontend] Starting bulk upload tracking for patient:', patientId, 'files:', fileName);
      // REMOVED: startUpload(patientId, fileName) - function doesn't exist
      console.log('📎 [Frontend] Skipping startUpload - function not available');
      
      console.log('📎 [Frontend] About to call fetch for bulk upload');
      console.log('📎 [Frontend] Bulk upload URL:', `/api/patients/${patientId}/attachments/bulk`);
      
      try {
        const response = await fetch(`/api/patients/${patientId}/attachments/bulk`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('📎 [Frontend] Bulk upload fetch completed');
        const responseText = await response.text();
        console.log('📎 [Frontend] Bulk upload response:', responseText);
        
        if (!response.ok) {
          // REMOVED: cancelUpload() - function doesn't exist
          throw new Error(`Bulk upload failed: ${response.status} - ${responseText}`);
        }
        
        // REMOVED: updateProgress(80, 'processing') - function doesn't exist
        console.log('📎 [Frontend] Parsing bulk upload response...');
        
        try {
          const result = JSON.parse(responseText);
          // REMOVED: updateProgress(90, 'analyzing') - function doesn't exist
          console.log('📎 [Frontend] Bulk upload parsed successfully:', result);
          return result;
        } catch (parseError) {
          console.error('📎 [Frontend] JSON parse error:', parseError);
          // REMOVED: cancelUpload() - function doesn't exist
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        }
      } catch (bulkError) {
        console.error('📎 [Frontend] Bulk upload fetch error:', bulkError);
        throw bulkError;
      }
    },
    onSuccess: (data) => {
      console.log('📎 [Frontend] BULK UPLOAD SUCCESS! Data:', data);
      // REMOVED: completeUpload() - function doesn't exist
      console.log('📎 [Frontend] Invalidating queries for bulk upload...');
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      
      console.log('📎 [Frontend] Tracking bulk upload analytics...');
      // Track bulk attachment upload
      analytics.trackFeatureUsage('attachment_upload', 'uploaded', {
        uploadType: 'bulk',
        fileCount: data.count,
        patientId: patientId,
        encounterId: encounterId,
        mode: mode
      });
      
      // Track conversion event
      analytics.trackConversion({
        eventType: 'attachment_parsed',
        eventData: {
          uploadType: 'bulk',
          fileCount: data.count,
          patientId: patientId,
          encounterId: encounterId
        }
      });
      
      console.log('📎 [Frontend] Showing bulk upload success toast...');
      toast({ 
        title: "Bulk upload successful", 
        description: `Successfully uploaded ${data.count} files.` 
      });
      console.log('📎 [Frontend] Resetting form after bulk upload...');
      resetUploadForm();
      console.log('📎 [Frontend] Bulk upload complete!');
    },
    onError: (error: Error) => {
      console.error('📎 [Frontend] BULK UPLOAD ERROR!', error);
      console.error('📎 [Frontend] Bulk error type:', error.constructor.name);
      console.error('📎 [Frontend] Bulk error message:', error.message);
      console.error('📎 [Frontend] Bulk error stack:', error.stack);
      // REMOVED: cancelUpload() - function doesn't exist
      toast({ 
        title: "Bulk upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/patients/${patientId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ title: "File deleted", description: "Attachment has been removed." });
    },
    onError: () => {
      toast({ 
        title: "Delete failed", 
        description: "Failed to delete attachment.",
        variant: "destructive" 
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const url = new URL(`/api/patients/${patientId}/attachments`, window.location.origin);
      if (encounterId && mode === "encounter") {
        url.searchParams.append('encounterId', encounterId.toString());
      }
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Bulk delete failed');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ 
        title: "Bulk delete successful", 
        description: `Successfully deleted ${data.deletedCount} attachments.` 
      });
    },
    onError: () => {
      toast({ 
        title: "Bulk delete failed", 
        description: "Failed to delete attachments.",
        variant: "destructive" 
      });
    },
  });

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadFiles([]);
    setTitle("");
    setDescription("");
    setIsConfidential(false);
    setUploadMode('single');
    setShowUploadForm(false);
    // Also clear photo capture session
    setPhotoCaptureSession(null);
    setQrCodeDataUrl('');
    if (sessionPollIntervalRef.current) {
      clearInterval(sessionPollIntervalRef.current);
    }
  };
  
  // Photo capture functions (QR code functionality)
  const startPhotoCapture = async () => {
    setIsQrLoading(true);
    try {
      // Create a photo capture session
      const response = await fetch('/api/photo-capture/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) throw new Error('Failed to create photo capture session');
      
      const data = await response.json();
      const sessionId = data.sessionId;
      const captureUrl = data.captureUrl;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(captureUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setPhotoCaptureSession(sessionId);
      setQrCodeDataUrl(qrDataUrl);
      
      // Start polling for photos
      pollForPhotos(sessionId);
      
      // For Median mobile app, check if we can use native camera
      if ((window as any).Median?.isMobileApp) {
        (window as any).Median.camera.takePicture({
          maxWidth: 3000,
          maxHeight: 3000,
          quality: 85,
          allowEdit: false,
          saveToPhotoAlbum: false
        });
      }
    } catch (error) {
      console.error('Error starting photo capture:', error);
      toast({
        title: "Error",
        description: "Failed to start photo capture session",
        variant: "destructive"
      });
    } finally {
      setIsQrLoading(false);
    }
  };
  
  const pollForPhotos = (sessionId: string) => {
    sessionPollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/photo-capture/sessions/${sessionId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        console.log("📸 [PatientAttachments] Session poll response:", data);
        
        // Check if photos have been uploaded but session not yet completed
        if (data.photoCount > 0 && data.status === 'active') {
          // Stop polling
          if (sessionPollIntervalRef.current) {
            clearInterval(sessionPollIntervalRef.current);
          }
          
          // Complete the session to get photo URLs
          const completeResponse = await fetch(`/api/photo-capture/sessions/${sessionId}/complete`, {
            method: 'POST'
          });
          
          if (completeResponse.ok) {
            const completeData = await completeResponse.json();
            console.log("📸 [PatientAttachments] Session completion response:", completeData);
            
            if (completeData.photos?.length > 0) {
              // Process photos with automatic OCR
              await processPhotosAsAttachments(completeData.photos);
              
              // Clear the QR code and session after successful capture
              setPhotoCaptureSession(null);
              setQrCodeDataUrl('');
              
              toast({
                title: "Photos received",
                description: `${completeData.photos.length} photo(s) captured and processing...`
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling for photos:', error);
      }
    }, 2000); // Poll every 2 seconds
  };
  
  const processPhotosAsAttachments = async (photos: Array<{ url: string; filename: string }>) => {
    try {
      // Process each photo as an attachment
      for (const photo of photos) {
        console.log("📸 [PatientAttachments] Processing photo:", photo);
        
        // Fetch the photo from the URL
        const response = await fetch(photo.url);
        const blob = await response.blob();
        
        // Create file from blob - use a safer approach for TypeScript
        const file = new File([blob], photo.filename, { 
          type: blob.type || 'image/jpeg',
          lastModified: Date.now()
        });
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', `Photo captured - ${new Date().toLocaleString()}`);
        formData.append('description', 'Photo captured via mobile device');
        formData.append('isConfidential', 'false');
        if (encounterId) {
          formData.append('encounterId', encounterId.toString());
        }
        
        // Upload the photo as an attachment (OCR will happen automatically)
        await uploadMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Error processing photos as attachments:', error);
      toast({
        title: "Error",
        description: "Failed to process captured photos",
        variant: "destructive"
      });
    }
  };

  const startScreenshotCapture = async () => {
    setIsCapturing(true);
    
    try {
      console.log('Starting screenshot capture...');
      
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error('Screen capture requires a secure context (HTTPS)');
      }
      
      // Check if Screen Capture API is supported
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API is not supported in this browser');
      }
      
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture (getDisplayMedia) is not supported in this browser');
      }
      
      console.log('Screen capture API is available, requesting permission...');
      
      // Request screen capture permission with entire screen option to avoid tab switching
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          cursor: 'always'
        },
        audio: false,
        preferCurrentTab: false
      });
      
      console.log('Screen capture stream obtained:', stream);
      
      // Get video track
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video track available in the capture stream');
      }
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true; // Important for autoplay
      
      // Wait for video to load
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded:', { width: video.videoWidth, height: video.videoHeight });
          resolve(void 0);
        };
        video.onerror = (e) => {
          console.error('Video error:', e);
          reject(new Error('Failed to load video stream'));
        };
        video.play().catch(reject);
      });
      
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas 2D context');
      }
      
      console.log('Drawing video to canvas...', { width: canvas.width, height: canvas.height });
      ctx.drawImage(video, 0, 0);
      
      // Stop the stream immediately after capture
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      
      // Convert to data URL for area selection
      const imageDataUrl = canvas.toDataURL('image/png', 0.95);
      console.log('Screenshot captured, showing area selector');
      
      // Show area selector with the captured image
      setCapturedImage(imageDataUrl);
      setShowAreaSelector(true);
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Screen capture permission was denied. Please allow screen sharing to capture screenshots.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No screen or window was selected for capture.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Screen capture is not supported in this browser or environment.';
        } else {
          errorMessage = `Browser error: ${error.name} - ${error.message}`;
        }
      }
      
      toast({
        title: "Screenshot Capture Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // Area selection handler  
  const handleAreaSelected = useCallback(async (selectedArea: { x: number; y: number; width: number; height: number }) => {
    console.log('handleAreaSelected called with:', { selectedArea });
    
    if (!capturedImage) {
      console.error('No captured image available for cropping');
      return;
    }

    console.log('Starting area selection with:', { selectedArea, imageDataLength: capturedImage.length });

    try {
      console.log('Step 1: Validating input parameters...');
      
      // Validate inputs
      if (!selectedArea.width || !selectedArea.height) {
        throw new Error('Invalid selection area dimensions');
      }
      
      console.log('Step 2: Creating canvas element...');
      // Create a canvas for the cropped image
      const canvas = document.createElement('canvas');
      console.log('Step 3: Getting canvas context...');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      console.log('Step 4: Creating image element...');
      // Create an image from the captured data URL
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous'; // Prevent CORS issues
      
      console.log('Step 5: Loading image from data URL...');
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log('Image loaded successfully:', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
          resolve();
        };
        img.onerror = (error: any) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load captured image'));
        };
        img.src = capturedImage;
      });

      console.log('Image loading complete, proceeding with validation...');

      // Validate selection area
      const maxWidth = img.naturalWidth;
      const maxHeight = img.naturalHeight;
      
      console.log('Validating selection area:', {
        selectedArea,
        imageSize: { width: maxWidth, height: maxHeight }
      });

      if (selectedArea.x < 0 || selectedArea.y < 0 || 
          selectedArea.x + selectedArea.width > maxWidth || 
          selectedArea.y + selectedArea.height > maxHeight) {
        throw new Error('Selected area is outside image bounds');
      }

      if (selectedArea.width <= 0 || selectedArea.height <= 0) {
        throw new Error('Selected area has invalid dimensions');
      }

      // Set canvas size to the selected area
      canvas.width = Math.floor(selectedArea.width);
      canvas.height = Math.floor(selectedArea.height);

      console.log('Drawing cropped area to canvas:', {
        canvasSize: { width: canvas.width, height: canvas.height },
        sourceArea: selectedArea
      });

      // Draw the selected area to the canvas
      ctx.drawImage(
        img, 
        Math.floor(selectedArea.x), Math.floor(selectedArea.y), Math.floor(selectedArea.width), Math.floor(selectedArea.height),
        0, 0, Math.floor(selectedArea.width), Math.floor(selectedArea.height)
      );

      // Convert to blob
      console.log('Converting canvas to blob...');
      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('Cropped screenshot blob created:', { size: blob.size, type: blob.type });
              resolve(blob);
            } else {
              console.error('Canvas toBlob returned null');
              reject(new Error('Failed to create blob from cropped canvas'));
            }
          }, 'image/png', 0.95);
        } catch (blobError) {
          console.error('Error during toBlob operation:', blobError);
          reject(blobError);
        }
      });

      if (!blob) {
        throw new Error('Failed to create cropped screenshot blob');
      }

      // Create file from blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `emr-screenshot-area-${timestamp}.png`;
      
      console.log('Creating File object from blob...');
      // Create a File-like object since File constructor may not be available in all environments
      const file = Object.assign(blob, {
        name: filename,
        lastModified: Date.now(),
        webkitRelativePath: ''
      }) as File;

      console.log('Cropped screenshot file created:', { name: file.name, size: file.size, type: file.type });

      // Set the file for upload
      setUploadFile(file);
      setShowUploadForm(true);
      setTitle('EMR Screenshot (Selected Area)');
      setDescription('Selected area from EMR screenshot');
      setUploadMode('single');

      // Hide area selector
      setShowAreaSelector(false);
      setCapturedImage(null);

      toast({
        title: "Screenshot Area Selected",
        description: `Created ${filename} (${Math.round(file.size / 1024)}KB) from selected area.`,
      });

    } catch (error) {
      console.error('Failed to crop screenshot:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      let errorMessage = 'Unknown error occurred during screenshot cropping';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
      
      toast({
        title: "Failed to Crop Screenshot",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [capturedImage, toast]);

  // Cancel area selection
  const handleCancelAreaSelection = useCallback(() => {
    setShowAreaSelector(false);
    setCapturedImage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (files.length === 1) {
        // Single file mode
        setUploadFile(files[0]);
        setUploadFiles([]);
        setTitle(files[0].name);
        setUploadMode('single');
      } else {
        // Multiple files mode
        setUploadFiles(files);
        setUploadFile(null);
        setTitle('');
        setUploadMode('multiple');
      }
      setShowUploadForm(true);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('📎 [Frontend] File select triggered, files:', files?.length || 0);
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('📎 [Frontend] Processing files:', fileArray.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      if (fileArray.length === 1) {
        // Single file mode
        const file = fileArray[0];
        console.log('📎 [Frontend] Single file mode, file details:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        setUploadFile(file);
        setUploadFiles([]);
        setTitle(file.name);
        setUploadMode('single');
      } else {
        // Multiple files mode
        console.log('📎 [Frontend] Multiple files mode, setting uploadFiles');
        setUploadFiles(fileArray);
        setUploadFile(null);
        setTitle('');
        setUploadMode('multiple');
      }
      
      console.log('📎 [Frontend] Setting showUploadForm to true');
      setShowUploadForm(true);
    }
    // Reset the input so the same files can be selected again
    e.target.value = '';
  };

  const handleUpload = () => {
    console.log('📎 [Frontend] handleUpload called!', {
      uploadMode,
      hasUploadFile: !!uploadFile,
      uploadFilesCount: uploadFiles.length
    });
    
    if (uploadMode === 'single' && !uploadFile) {
      console.log('📎 [Frontend] No file selected for single upload');
      return;
    }
    if (uploadMode === 'multiple' && uploadFiles.length === 0) {
      console.log('📎 [Frontend] No files selected for multiple upload');
      return;
    }
    
    const formData = new FormData();
    
    if (uploadMode === 'single' && uploadFile) {
      // Debug file object
      console.log('📎 [Frontend] Upload file details:', {
        name: uploadFile.name,
        size: uploadFile.size,
        type: uploadFile.type,
        lastModified: uploadFile.lastModified
      });
      
      // Single file upload
      formData.append('file', uploadFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isConfidential', isConfidential.toString());
      if (encounterId) {
        formData.append('encounterId', encounterId.toString());
      }
      uploadMutation.mutate(formData);
    } else if (uploadMode === 'multiple' && uploadFiles.length > 0) {
      // Multiple files upload
      uploadFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('globalDescription', description);
      formData.append('isConfidential', isConfidential.toString());
      if (encounterId) {
        formData.append('encounterId', encounterId.toString());
      }
      bulkUploadMutation.mutate(formData);
    }
  };

  const removeFile = (index: number) => {
    if (uploadMode === 'multiple') {
      const newFiles = uploadFiles.filter((_, i) => i !== index);
      setUploadFiles(newFiles);
      if (newFiles.length === 0) {
        setShowUploadForm(false);
      }
    }
  };

  const handleDownload = (attachment: PatientAttachment) => {
    window.open(`/api/patients/${patientId}/attachments/${attachment.id}/download`, '_blank');
  };

  const getProcessingStatusBadge = (attachment: PatientAttachment) => {
    const status = attachment.extractedContent?.processingStatus;
    
    if (!status || status === 'pending') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    }
    
    if (status === 'processing') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Analyzing
        </Badge>
      );
    }
    
    if (status === 'completed') {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          <Brain className="h-3 w-3 mr-1" />
          Analyzed
        </Badge>
      );
    }
    
    if (status === 'failed') {
      return (
        <Badge variant="destructive" className="text-xs">
          <FileX className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    
    return null;
  };

  const getDocumentTypeBadge = (documentType: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      'lab_results': { label: 'Lab Results', color: 'bg-navy-blue-600' },
      'H&P': { label: 'H&P', color: 'bg-purple-600' },
      'discharge_summary': { label: 'Discharge', color: 'bg-orange-600' },
      'nursing_notes': { label: 'Nursing', color: 'bg-teal-600' },
      'radiology_report': { label: 'Radiology', color: 'bg-indigo-600' },
      'prescription': { label: 'Prescription', color: 'bg-green-600' },
      'insurance_card': { label: 'Insurance', color: 'bg-yellow-600' },
      'referral': { label: 'Referral', color: 'bg-pink-600' },
      'operative_note': { label: 'Operative', color: 'bg-red-600' },
      'pathology_report': { label: 'Pathology', color: 'bg-gray-600' },
      'other': { label: 'Other', color: 'bg-gray-500' }
    };
    
    const type = typeMap[documentType] || typeMap['other'];
    
    return (
      <Badge className={`text-xs text-white ${type.color}`}>
        {type.label}
      </Badge>
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Attachments</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-blue-500 mx-auto mb-4"></div>
              <p>Loading attachments...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-median="patient-attachments-section">
      <div className="flex items-center justify-between" data-median="attachments-header">
        <h2 className="text-xl font-semibold">Attachments</h2>
      </div>

      {/* Upload Interface - Always Visible */}
      {!isReadOnly && (
        <Card data-median="attachments-upload-card">
          <CardContent className="pt-6">
            {console.log('📎 [Frontend] Upload form state:', { showUploadForm, photoCaptureSession, uploadFile, uploadFiles: uploadFiles.length })}
            {!showUploadForm && !photoCaptureSession ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragOver 
                    ? 'border-navy-blue-500 bg-navy-blue-50 dark:bg-navy-blue-950' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.gif,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  multiple
                />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Upload className={`h-10 w-10 mx-auto ${
                      isDragOver ? 'text-navy-blue-500' : 'text-gray-400'
                    }`} />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Click to upload</span> or drag and drop
                      <br />
                      PDF, Images, Documents (up to 100MB each)
                      <br />
                      <span className="text-xs text-navy-blue-600 dark:text-navy-blue-400">
                        Select multiple files for bulk upload
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="text-xs text-gray-500">or</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        startPhotoCapture();
                      }}
                      disabled={isQrLoading}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo with Mobile Device
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        startScreenshotCapture();
                      }}
                      disabled={isCapturing}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture EMR Screenshot
                    </Button>
                  </div>
                </div>
              </div>
            ) : photoCaptureSession && qrCodeDataUrl ? (
              // Photo capture QR code display
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Scan QR Code with Mobile Device</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Use your phone camera to scan this code and capture photos
                  </p>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white rounded-lg shadow-md">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code for photo capture"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for photos...</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetUploadForm}
                    className="mt-4"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {console.log('📎 [Frontend] Upload form render check:', { 
                  uploadMode, 
                  hasUploadFile: !!uploadFile,
                  uploadFileName: uploadFile?.name || title,
                  uploadFileSize: uploadFile?.size,
                  title
                })}
                {uploadMode === 'single' && (uploadFile || title) ? (
                  <>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {getFileIcon(uploadFile?.type || 'application/octet-stream')}
                      <span className="text-sm font-medium">{uploadFile?.name || title}</span>
                      {uploadFile?.size && <span className="text-xs text-gray-500">({formatFileSize(uploadFile.size)})</span>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a title for this attachment"
                      />
                    </div>
                  </>
                ) : uploadMode === 'multiple' && uploadFiles.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <div className="font-medium text-sm text-navy-blue-600 dark:text-navy-blue-400">
                        Bulk Upload ({uploadFiles.length} files)
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {uploadFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {getFileIcon(file.type)}
                              <span className="font-medium truncate">{file.name}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">({formatFileSize(file.size)})</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {uploadMode === 'multiple' ? 'Description (applies to all files)' : 'Description (Optional)'}
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={uploadMode === 'multiple' ? "Add a description for all files..." : "Add a description..."}
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="confidential"
                    checked={isConfidential}
                    onCheckedChange={setIsConfidential}
                  />
                  <Label htmlFor="confidential" className="text-sm">
                    Mark as confidential {uploadMode === 'multiple' ? '(applies to all files)' : ''}
                  </Label>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || bulkUploadMutation.isPending}
                    className="flex-1"
                  >
                    {uploadMutation.isPending || bulkUploadMutation.isPending 
                      ? "Uploading..." 
                      : uploadMode === 'multiple' 
                        ? `Upload ${uploadFiles.length} Files` 
                        : "Upload"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetUploadForm}
                    disabled={uploadMutation.isPending || bulkUploadMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        !isReadOnly ? null : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                <File className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No attachments yet</p>
                <p className="text-sm">No patient documents uploaded.</p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {/* Attachments Header with Bulk Actions */}
          {!isReadOnly && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                  {mode === "encounter" && encounterId && " for this encounter"}
                </span>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={bulkDeleteMutation.isPending}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Attachments</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete all {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}?
                      {mode === "encounter" && encounterId && " This will only delete attachments for this encounter."}
                      {mode !== "encounter" && " This will delete all attachments for this patient."}
                      <br /><br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => bulkDeleteMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          
          {attachments.map((attachment) => {
            const isHighlighted = highlightAttachmentId === attachment.id;
            if (isHighlighted) {
              console.log('🔗 [PatientAttachments] Highlighting attachment:', attachment.id);
            }
            
            return (
              <Card 
                key={attachment.id}
                className={isHighlighted ? "ring-2 ring-blue-500 bg-navy-blue-50" : ""}
              >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium truncate">
                          {attachment.extractedContent?.aiGeneratedTitle || attachment.title || attachment.originalFileName}
                        </h3>
                        {attachment.extractedContent?.documentType && getDocumentTypeBadge(attachment.extractedContent.documentType)}
                        {getProcessingStatusBadge(attachment)}
                        {attachment.isConfidential && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Confidential
                          </Badge>
                        )}
                        {attachment.virusScanStatus === 'clean' && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      {attachment.description && (
                        <p className="text-sm text-gray-600 mb-2">{attachment.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          User {attachment.uploadedBy}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                        </span>
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        {attachment.encounterId && (
                          <Badge variant="outline" className="text-xs">
                            Encounter #{attachment.encounterId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* View Extracted Text Button */}
                    {attachment.extractedContent?.processingStatus === 'completed' && attachment.extractedContent.extractedText && (
                      <ExtractedContentDialog 
                        attachment={attachment}
                        getDocumentTypeBadge={getDocumentTypeBadge}
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      title="Download original file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {!isReadOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{attachment.title || attachment.originalFileName}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(attachment.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Area Selector Overlay */}
      {showAreaSelector && capturedImage && (
        <AreaSelector
          imageUrl={capturedImage}
          onAreaSelected={handleAreaSelected}
          onCancel={handleCancelAreaSelection}
        />
      )}
    </div>
  );
}