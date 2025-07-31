import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MobileProfilePhotoCaptureView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = params;
  
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [sessionValid, setSessionValid] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Verify session token
    verifySession();
  }, [token]);

  const verifySession = async () => {
    try {
      const response = await fetch(`/api/user/profile-photo/session/${token}`);
      if (!response.ok) {
        setSessionValid(false);
      }
    } catch (error) {
      setSessionValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || uploading) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/user/profile-photo/mobile-upload/${token}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadCount(prev => prev + 1);
      toast({
        title: "Photo uploaded successfully",
        description: "The profile photo has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-md w-full p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying session...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-md w-full p-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This upload session has expired or is invalid. Please generate a new QR code from your profile menu.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Upload Profile Photo</h1>
            <p className="text-gray-600">
              Choose a photo from your device or take a new one
            </p>
          </div>

          {uploadCount > 0 && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {uploadCount} photo{uploadCount > 1 ? 's' : ''} uploaded successfully
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button
              className="w-full h-24 text-lg"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-8 h-8 mr-3" />
              Take Photo
            </Button>

            <Button
              className="w-full h-24 text-lg"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-8 h-8 mr-3" />
              Choose from Gallery
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Maximum file size: 10MB</p>
            <p>Supported formats: JPG, PNG, GIF</p>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="text-gray-600"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}