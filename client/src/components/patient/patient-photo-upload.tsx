import { useState, useRef } from "react";
import { Upload, Camera, QrCode, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PatientPhotoUploadProps {
  patientId: number;
  patientName: string;
  currentPhotoFilename?: string | null;
  onPhotoUpdate?: () => void;
}

export function PatientPhotoUpload({
  patientId,
  patientName,
  currentPhotoFilename,
  onPhotoUpdate,
}: PatientPhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, WebP)",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 10MB",
      });
      return;
    }

    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch(`/api/patient-photos/upload/${patientId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      const result = await response.json();
      
      toast({
        title: "Photo uploaded successfully",
        description: "The patient's profile photo has been updated.",
      });

      // Invalidate patient queries to refresh the photo
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      onPhotoUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const response = await fetch("/api/patient-photos/photo-capture/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create capture session");
      }

      const { qrCode, captureUrl, expiresAt } = await response.json();
      setQrCodeData(qrCode);
      
      toast({
        title: "QR Code generated",
        description: "Scan with your phone to capture a photo. Valid for 15 minutes.",
      });
    } catch (error) {
      console.error("QR code generation error:", error);
      toast({
        variant: "destructive",
        title: "Failed to generate QR code",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const deletePhoto = async () => {
    if (!confirm("Are you sure you want to delete this patient's profile photo?")) {
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`/api/patient-photos/${patientId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete photo");
      }

      toast({
        title: "Photo deleted",
        description: "The patient's profile photo has been removed.",
      });

      // Invalidate patient queries
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      onPhotoUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Photo deletion error:", error);
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete photo",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        {currentPhotoFilename ? "Update Photo" : "Add Photo"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Patient Photo</DialogTitle>
            <DialogDescription>
              Upload a profile photo for {patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Photo Preview */}
            {currentPhotoFilename && (
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage
                      src={`/api/patient-photos/${currentPhotoFilename}`}
                      alt={patientName}
                    />
                    <AvatarFallback>
                      {patientName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-8 h-8"
                    onClick={deletePhoto}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Upload Options */}
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                Upload from Computer
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={generateQRCode}
                disabled={isGeneratingQR || isUploading}
              >
                {isGeneratingQR ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                Capture with Mobile Camera
              </Button>
            </div>

            {/* QR Code Display */}
            {qrCodeData && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2 text-center">
                  Scan with your phone's camera
                </p>
                <img
                  src={qrCodeData}
                  alt="QR Code for photo capture"
                  className="mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Valid for 15 minutes
                </p>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}