import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  uploadFile: (file: File, onProgress?: (progress: number) => void) => Promise<any>;
  showUploadAttestation: (onConfirm: () => void) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttestation, setShowAttestation] = useState(false);
  const [attestationCallback, setAttestationCallback] = useState<(() => void) | null>(null);
  const [manualConfirmed, setManualConfirmed] = useState(false);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  const showUploadAttestation = useCallback((onConfirm: () => void) => {
    setAttestationCallback(() => onConfirm);
    setManualConfirmed(false);
    setAuthorizationConfirmed(false);
    setComplianceConfirmed(false);
    setShowAttestation(true);
  }, []);

  const handleAttestationConfirm = useCallback(() => {
    if (manualConfirmed && authorizationConfirmed && complianceConfirmed && attestationCallback) {
      setShowAttestation(false);
      attestationCallback();
      setAttestationCallback(null);
    }
  }, [manualConfirmed, authorizationConfirmed, complianceConfirmed, attestationCallback]);

  const handleAttestationCancel = useCallback(() => {
    setShowAttestation(false);
    setAttestationCallback(null);
  }, []);

  const uploadFile = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);

      if (onProgress) {
        onProgress(100);
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  const canConfirm = manualConfirmed && authorizationConfirmed && complianceConfirmed;

  return (
    <UploadContext.Provider value={{
      isUploading,
      uploadProgress,
      setIsUploading,
      setUploadProgress,
      uploadFile,
      showUploadAttestation
    }}>
      {children}

      <Dialog open={showAttestation} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Upload Attestation Required
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Before uploading this file or screenshot, please confirm the following requirements for legal and compliance purposes:
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="manual-selection"
                  checked={manualConfirmed}
                  onCheckedChange={(checked) => setManualConfirmed(checked === true)}
                />
                <label htmlFor="manual-selection" className="text-sm leading-relaxed">
                  <strong>Manual Selection:</strong> I confirm that this file/screenshot selection was manually performed by me and not through any automated or scripted process.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="full-authorization" 
                  checked={authorizationConfirmed}
                  onCheckedChange={(checked) => setAuthorizationConfirmed(checked === true)}
                />
                <label htmlFor="full-authorization" className="text-sm leading-relaxed">
                  <strong>Full Authorization:</strong> I am fully authorized to capture and submit this information according to all applicable policies and laws, including HIPAA and organizational policies.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="compliance-confirmed"
                  checked={complianceConfirmed} 
                  onCheckedChange={(checked) => setComplianceConfirmed(checked === true)}
                />
                <label htmlFor="compliance-confirmed" className="text-sm leading-relaxed">
                  <strong>Third-Party Compliance:</strong> I confirm that I am not violating the terms of service, licensing agreements, or policies of any source electronic medical record (EMR) or software when capturing and uploading this content.
                </label>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                By proceeding, you acknowledge that you are responsible for any claims arising from violations of third-party software/vendor agreements resulting from content you upload to Clarafi.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleAttestationCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleAttestationConfirm}
              disabled={!canConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm and Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within a UploadProvider");
  }
  return context;
};