import React from 'react';
import { Progress } from '@/components/ui/progress';
import { FileText, Loader2, CheckCircle } from 'lucide-react';

interface UploadLoadingOverlayProps {
  isVisible: boolean;
  progress: number;
  fileName: string;
  stage: 'uploading' | 'processing' | 'analyzing' | 'complete';
}

export function UploadLoadingOverlay({ 
  isVisible, 
  progress, 
  fileName, 
  stage 
}: UploadLoadingOverlayProps) {
  if (!isVisible) return null;

  const getStageText = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading document...';
      case 'processing':
        return 'Processing with AI...';
      case 'analyzing':
        return 'Analyzing medical content...';
      case 'complete':
        return 'Analysis complete!';
      default:
        return 'Processing...';
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case 'uploading':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'processing':
      case 'analyzing':
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg border">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          {getStageIcon()}
        </div>
        
        {/* Stage text */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {getStageText()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processing "{fileName}"
          </p>
        </div>

        {/* Progress bar with percentage */}
        <div className="space-y-3 w-full">
          <Progress 
            value={progress} 
            className="h-3 w-full"
          />
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {Math.round(progress)}% complete
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {stage === 'complete' ? 'Updating chart...' : 'Please wait'}
            </span>
          </div>
        </div>

        {/* Warning message */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Medical problems section is temporarily frozen during document analysis to prevent conflicts
          </p>
        </div>
      </div>
    </div>
  );
}