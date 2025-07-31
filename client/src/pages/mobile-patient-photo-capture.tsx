import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Camera, RotateCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export function MobilePatientPhotoCaptureView() {
  const { sessionId } = useParams();
  const [, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Verify session on mount
  useEffect(() => {
    verifySession();
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  const verifySession = async () => {
    try {
      const response = await fetch(`/api/patient-photos/photo-capture/session/${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid session");
      }
      const data = await response.json();
      setSessionData(data);
      setIsLoading(false);
      // Start camera automatically
      startCamera();
    } catch (error) {
      console.error("Session verification error:", error);
      setError(error instanceof Error ? error.message : "Failed to verify session");
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        variant: "destructive",
        title: "Camera access denied",
        description: "Please allow camera access to capture a photo",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to data URL
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const switchCamera = () => {
    setCameraFacing(prev => prev === "user" ? "environment" : "user");
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage || !sessionData) return;

    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("photo", blob, "patient-photo.jpg");
      formData.append("sessionId", sessionId!);

      const uploadResponse = await fetch("/api/patient-photos/photo-capture/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      toast({
        title: "Photo uploaded successfully",
        description: "The patient's profile photo has been updated.",
      });

      // Show success message and redirect after delay
      setTimeout(() => {
        window.close(); // Try to close the window
        // If window doesn't close, show a message
        setError("Photo uploaded successfully! You can close this window.");
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-center">Verifying session...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-6 max-w-md w-full">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-2xl mx-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Capture Patient Photo</h1>
          {sessionData && (
            <p className="text-gray-600 mb-4">
              Taking photo for {sessionData.patientName}
            </p>
          )}

          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={capturePhoto}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    <Camera className="w-6 h-6 mr-2" />
                    Capture
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={switchCamera}
                    className="bg-white/80"
                  >
                    <RotateCw className="w-5 h-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <img
                  src={capturedImage}
                  alt="Captured patient photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={retakePhoto}
                    disabled={isUploading}
                  >
                    <X className="w-5 h-5 mr-2" />
                    Retake
                  </Button>
                  <Button
                    size="lg"
                    onClick={uploadPhoto}
                    disabled={isUploading}
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <Alert>
            <AlertDescription>
              Position the patient in good lighting and ensure their face is clearly visible.
              The photo will be used for their medical record.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}