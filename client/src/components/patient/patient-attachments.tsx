import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
}

interface PatientAttachmentsProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
}

export function PatientAttachments({ 
  patientId, 
  encounterId, 
  mode = "patient-chart",
  isReadOnly = false 
}: PatientAttachmentsProps) {
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

  // Get attachments - always show all patient attachments, regardless of mode
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["/api/patients", patientId, "attachments"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/attachments`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return response.json() as Promise<PatientAttachment[]>;
    },
  });

  // Single file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📎 [Frontend] Starting single upload for patient:', patientId);
      console.log('📎 [Frontend] FormData contents:', Array.from(formData.entries()));
      
      const response = await fetch(`/api/patients/${patientId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📎 [Frontend] Response status:', response.status);
      console.log('📎 [Frontend] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📎 [Frontend] Raw response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${responseText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('📎 [Frontend] JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ title: "Upload successful", description: "File has been uploaded successfully." });
      resetUploadForm();
    },
    onError: (error: Error) => {
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
      
      const response = await fetch(`/api/patients/${patientId}/attachments/bulk`, {
        method: 'POST',
        body: formData,
      });
      
      const responseText = await response.text();
      console.log('📎 [Frontend] Bulk upload response:', responseText);
      
      if (!response.ok) {
        throw new Error(`Bulk upload failed: ${response.status} - ${responseText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('📎 [Frontend] JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "attachments"] });
      toast({ 
        title: "Bulk upload successful", 
        description: `Successfully uploaded ${data.count} files.` 
      });
      resetUploadForm();
    },
    onError: (error: Error) => {
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
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
                    isDragOver ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Click to upload</span> or drag and drop
                    <br />
                    PDF, Images, Documents (up to 100MB each)
                    <br />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Select multiple files for bulk upload
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  {getFileIcon(uploadFile!.type)}
                  <span className="text-sm font-medium">{uploadFile!.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(uploadFile!.size)})</span>
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
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
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
                    Mark as confidential
                  </Label>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadMutation.isPending}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetUploadForm}
                    disabled={uploadMutation.isPending}
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
          {attachments.map((attachment) => (
            <Card key={attachment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium truncate">
                          {attachment.title || attachment.originalFileName}
                        </h3>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
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
          ))}
        </div>
      )}
    </div>
  );
}