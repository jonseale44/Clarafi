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
  ChevronDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startUpload, updateProgress, completeUpload, cancelUpload } = useUpload();

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

  // Single file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📎 [Frontend] Starting single upload for patient:', patientId);
      console.log('📎 [Frontend] FormData contents:', Array.from(formData.entries()));
      
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
      startUpload(patientId, fileName);
      
      const response = await fetch(`/api/patients/${patientId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📎 [Frontend] Response status:', response.status);
      console.log('📎 [Frontend] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📎 [Frontend] Raw response text:', responseText);
      
      if (!response.ok) {
        cancelUpload();
        throw new Error(`Upload failed: ${response.status} - ${responseText}`);
      }
      
      // Update progress to processing stage
      updateProgress(80, 'processing');
      
      try {
        const result = JSON.parse(responseText);
        updateProgress(90, 'analyzing');
        return result;
      } catch (parseError) {
        console.error('📎 [Frontend] JSON parse error:', parseError);
        cancelUpload();
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
      }
    },
    onSuccess: () => {
      completeUpload();
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ title: "Upload successful", description: "File has been uploaded successfully." });
      resetUploadForm();
    },
    onError: (error: Error) => {
      cancelUpload();
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
      startUpload(patientId, fileName);
      
      const response = await fetch(`/api/patients/${patientId}/attachments/bulk`, {
        method: 'POST',
        body: formData,
      });
      
      const responseText = await response.text();
      console.log('📎 [Frontend] Bulk upload response:', responseText);
      
      if (!response.ok) {
        cancelUpload();
        throw new Error(`Bulk upload failed: ${response.status} - ${responseText}`);
      }
      
      // Update progress to processing stage
      updateProgress(80, 'processing');
      
      try {
        const result = JSON.parse(responseText);
        updateProgress(90, 'analyzing');
        return result;
      } catch (parseError) {
        console.error('📎 [Frontend] JSON parse error:', parseError);
        cancelUpload();
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
      }
    },
    onSuccess: (data) => {
      completeUpload();
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ 
        title: "Bulk upload successful", 
        description: `Successfully uploaded ${data.count} files.` 
      });
      resetUploadForm();
    },
    onError: (error: Error) => {
      cancelUpload();
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
  };

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
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      if (fileArray.length === 1) {
        // Single file mode
        setUploadFile(fileArray[0]);
        setUploadFiles([]);
        setTitle(fileArray[0].name);
        setUploadMode('single');
      } else {
        // Multiple files mode
        setUploadFiles(fileArray);
        setUploadFile(null);
        setTitle('');
        setUploadMode('multiple');
      }
      
      setShowUploadForm(true);
    }
    // Reset the input so the same files can be selected again
    e.target.value = '';
  };

  const handleUpload = () => {
    if (uploadMode === 'single' && !uploadFile) return;
    if (uploadMode === 'multiple' && uploadFiles.length === 0) return;
    
    const formData = new FormData();
    
    if (uploadMode === 'single' && uploadFile) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Attachments</h2>
      </div>

      {/* Upload Interface - Always Visible */}
      {!isReadOnly && (
        <Card>
          <CardContent className="pt-6">
            {!showUploadForm ? (
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
              </div>
            ) : (
              <div className="space-y-4">
                {uploadMode === 'single' && uploadFile ? (
                  <>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {getFileIcon(uploadFile.type)}
                      <span className="text-sm font-medium">{uploadFile.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(uploadFile.size)})</span>
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
    </div>
  );
}