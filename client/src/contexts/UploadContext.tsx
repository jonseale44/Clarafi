import React, { createContext, useContext, useState, useCallback } from 'react';

interface UploadState {
  isUploading: boolean;
  progress: number;
  fileName: string;
  stage: 'uploading' | 'processing' | 'analyzing' | 'complete';
  patientId?: number;
}

interface UploadContextType {
  uploadState: UploadState;
  startUpload: (patientId: number, fileName: string) => void;
  updateProgress: (progress: number, stage?: UploadState['stage']) => void;
  completeUpload: () => void;
  cancelUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    fileName: '',
    stage: 'uploading',
  });

  const startUpload = useCallback((patientId: number, fileName: string) => {
    console.log('🔄 [UploadContext] Starting upload for patient:', patientId, 'file:', fileName);
    setUploadState({
      isUploading: true,
      progress: 0,
      fileName,
      stage: 'uploading',
      patientId,
    });
  }, []);

  const updateProgress = useCallback((progress: number, stage?: UploadState['stage']) => {
    console.log('🔄 [UploadContext] Updating progress:', progress, 'stage:', stage);
    setUploadState(prev => ({
      ...prev,
      progress,
      stage: stage || prev.stage,
    }));
  }, []);

  const completeUpload = useCallback(() => {
    console.log('✅ [UploadContext] Upload completed');
    setUploadState(prev => ({
      ...prev,
      progress: 100,
      stage: 'complete',
    }));
    
    // Reset after a brief delay
    setTimeout(() => {
      console.log('🔄 [UploadContext] Resetting upload state after completion');
      setUploadState({
        isUploading: false,
        progress: 0,
        fileName: '',
        stage: 'uploading',
      });
    }, 2000);
  }, []);

  const cancelUpload = useCallback(() => {
    console.log('❌ [UploadContext] Upload cancelled');
    setUploadState({
      isUploading: false,
      progress: 0,
      fileName: '',
      stage: 'uploading',
    });
  }, []);

  return (
    <UploadContext.Provider value={{
      uploadState,
      startUpload,
      updateProgress,
      completeUpload,
      cancelUpload,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}