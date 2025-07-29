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
  const [uploadMessage, setUploadMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; onConfirm: () => void } | null>(null);
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

  const confirmUpload = (file: File, onConfirm: () => void) => {
    setPendingUpload({ file, onConfirm });
    setShowConfirmDialog(true);
  };

  const handleConfirmUpload = () => {
    if (pendingUpload) {
      pendingUpload.onConfirm();
      setPendingUpload(null);
    }
    setShowConfirmDialog(false);
  };

  const uploadFile = async (file: File, patientId?: number): Promise<any> => {
    if (!file) {
      throw new Error('No file provided');
    }

    return new Promise((resolve, reject) => {
      const performUpload = async () => {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadMessage('Preparing upload...');

        try {
          const formData = new FormData();
          formData.append('file', file);

          if (patientId) {
            formData.append('patientId', patientId.toString());
          }

          setUploadMessage('Uploading file...');

          const response = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();

          setUploadProgress(100);
          setUploadMessage('Upload complete!');

          toast({
            title: "Success",
            description: "File uploaded successfully",
          });

          resolve(result);
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: "Upload Error",
            description: error instanceof Error ? error.message : "Failed to upload file",
            variant: "destructive",
          });
          reject(error);
        } finally {
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadMessage('');
          }, 1000);
        }
      };

      confirmUpload(file, performUpload);
    });
  };

  const canConfirm = manualConfirmed && authorizationConfirmed && complianceConfirmed;

  const value = {
    isUploading,
    uploadProgress,
    uploadMessage,
    uploadFile,
    showConfirmDialog,
    setShowConfirmDialog,
    handleConfirmUpload,
    showUploadAttestation
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Confirm Manual Upload
            </h3>
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                By uploading this file or screenshot, I confirm that:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Its selection was manually performed by me</li>
                <li>• I am fully authorized to capture and submit this information</li>
                <li>• I am complying with all applicable policies and laws</li>
                <li>• I am not violating any third-party software agreements</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                I Confirm - Upload
              </button>
            </div>
          </div>
        </div>
      )}

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