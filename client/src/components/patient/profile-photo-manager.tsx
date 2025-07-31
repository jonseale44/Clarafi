import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  QrCode, 
  Upload, 
  Trash2, 
  X,
  Maximize2,
  Check
} from "lucide-react";
import QRCode from 'qrcode';

interface ProfilePhotoManagerProps {
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    profilePhotoFilename?: string | null;
  };
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}

export function ProfilePhotoManager({ patient, size = "md", editable = true }: ProfilePhotoManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Debug logging
  console.log('[ProfilePhotoManager] Initial props:', { 
    patient, 
    size, 
    editable,
    patientId: patient.id,
    profilePhotoFilename: patient.profilePhotoFilename 
  });
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: "w-20 h-20", text: "text-lg", qr: 150 },
    md: { avatar: "w-24 h-24", text: "text-xl", qr: 200 },
    lg: { avatar: "w-40 h-40", text: "text-3xl", qr: 250 }
  };

  const config = sizeConfig[size];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`/api/patients/${patient.id}/profile-photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/patients/${patient.id}/profile-photo`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
      toast({
        title: "Success",
        description: "Profile photo removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  // Create QR code session
  const createQRSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${patient.id}/profile-photo/session`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      setQrSessionId(data.sessionId);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.captureUrl, {
        width: config.qr,
        margin: 2,
      });
      setQrCodeDataUrl(qrDataUrl);
      setShowQRCode(true);
      
      // Start polling for photo
      pollForPhoto(data.sessionId);
    } catch (error) {
      console.error('Failed to create QR session:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  }, [patient.id, config.qr]);

  // Poll for photo upload
  const pollForPhoto = useCallback((sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/profile-photo/sessions/${sessionId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.hasPhoto && data.status === 'active') {
          clearInterval(pollInterval);
          
          // Complete the session
          const completeResponse = await fetch(`/api/profile-photo/sessions/${sessionId}/complete`, {
            method: 'POST'
          });
          
          if (completeResponse.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
            toast({
              title: "Success",
              description: "Profile photo updated from mobile device",
            });
            setShowQRCode(false);
            setQrCodeDataUrl('');
            setQrSessionId(null);
          }
        }
        
        if (data.status === 'expired') {
          clearInterval(pollInterval);
          setShowQRCode(false);
          toast({
            title: "Session expired",
            description: "Please try again",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
    
    // Clean up after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
  }, [patient.id, queryClient]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Upload the file directly
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);



  return (
    <>
      <div className={`relative inline-block transition-all duration-300 ${isExpanded ? 'z-50 mb-20' : ''}`}>
        <div
          ref={dropZoneRef}
          className={`relative transition-all duration-300 ${editable && isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          onDragOver={editable ? handleDragOver : undefined}
          onDragLeave={editable ? handleDragLeave : undefined}
          onDrop={editable ? handleDrop : undefined}
        >
          <Avatar 
            className={`${config.avatar} border-2 border-gray-200 cursor-pointer transition-all duration-300 ${
              isExpanded ? 'w-48 h-48 transform scale-125' : 'hover:scale-105'
            }`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <AvatarImage 
              src={patient.profilePhotoFilename ? `/uploads/profile-photos/${patient.profilePhotoFilename}` : undefined}
              alt={`${patient.firstName} ${patient.lastName}`}
            />
            <AvatarFallback className={`${config.text} bg-gray-100 ${isExpanded ? 'text-5xl' : ''} transition-all duration-300`}>
              {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || 'P'}
            </AvatarFallback>
          </Avatar>
          
          {editable && !isExpanded && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
          
          {editable && isExpanded && (
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 bg-white p-2 rounded-lg shadow-lg">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  createQRSession();
                }}
              >
                <QrCode className="h-4 w-4 mr-1" />
                QR
              </Button>
              
              {patient.profilePhotoFilename && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Remove profile photo?')) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        {editable && showQRCode && (
          <div className="absolute top-0 left-full ml-2 bg-white rounded-lg shadow-lg p-4 z-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scan to upload photo</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setShowQRCode(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded" />
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
    </>
  );
}