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
  Check,
  RotateCw
} from "lucide-react";
import QRCode from 'qrcode';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
  console.log('[ProfilePhotoManager] Props:', { 
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
  
  // Cropping state
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: "w-12 h-12", text: "text-sm", qr: 150 },
    md: { avatar: "w-20 h-20", text: "text-lg", qr: 200 },
    lg: { avatar: "w-32 h-32", text: "text-2xl", qr: 250 }
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
      setShowCropDialog(false);
      setImageToCrop(null);
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
    
    // Read file and show crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  }, []);

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

  // Crop and upload image
  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageToCrop) return;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate dimensions for a square crop
    const size = Math.min(completedCrop.width, completedCrop.height);
    canvas.width = size;
    canvas.height = size;
    
    // Apply rotation
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);
    
    // Draw the cropped image
    ctx.drawImage(
      image,
      completedCrop.x,
      completedCrop.y,
      completedCrop.width,
      completedCrop.height,
      0,
      0,
      size,
      size
    );
    
    ctx.restore();
    
    // Convert to blob and upload
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
          uploadMutation.mutate(file);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [completedCrop, imageToCrop, rotation, uploadMutation]);

  return (
    <>
      <div className="relative inline-block">
        <div
          ref={dropZoneRef}
          className={`relative ${editable && isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          onDragOver={editable ? handleDragOver : undefined}
          onDragLeave={editable ? handleDragLeave : undefined}
          onDrop={editable ? handleDrop : undefined}
        >
          <Avatar 
            className={`${config.avatar} border-2 border-gray-200 cursor-pointer transition-transform hover:scale-105`}
            onClick={() => setIsExpanded(true)}
          >
            <AvatarImage 
              src={patient.profilePhotoFilename ? `/uploads/profile-photos/${patient.profilePhotoFilename}` : undefined}
              alt={`${patient.firstName} ${patient.lastName}`}
            />
            <AvatarFallback className={`${config.text} bg-gray-100`}>
              {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || 'P'}
            </AvatarFallback>
          </Avatar>
          
          {editable && (
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

      {/* Expanded Photo Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Photo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="w-64 h-64 border-4 border-gray-200">
                <AvatarImage 
                  src={patient.profilePhotoFilename ? `/uploads/profile-photos/${patient.profilePhotoFilename}` : undefined}
                  alt={`${patient.firstName} ${patient.lastName}`}
                />
                <AvatarFallback className="text-6xl bg-gray-100">
                  {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {console.log('[ProfilePhotoManager] Dialog render - editable:', editable)}
            {editable ? (
              <div className="flex justify-center gap-2">
                {console.log('[ProfilePhotoManager] Rendering buttons')}
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                
                <Button
                  variant="outline"
                  onClick={createQRSession}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Use Mobile Camera
                </Button>
                
                {patient.profilePhotoFilename && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Remove profile photo?')) {
                        deleteMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              console.log('[ProfilePhotoManager] Not editable, buttons hidden')
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
          </DialogHeader>
          
          {imageToCrop && (
            <div className="space-y-4">
              <div className="relative max-h-[500px] overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imageToCrop}
                    alt="Crop preview"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropComplete} disabled={!completedCrop}>
              <Check className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}