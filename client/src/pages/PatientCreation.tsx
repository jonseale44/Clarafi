import { PatientParser } from '@/components/PatientParser';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export function PatientCreation() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={handleBack}
              variant="ghost" 
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Create New Patient
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Extract patient information from documents or text using AI vision technology
          </p>
        </div>
        <PatientParser />
      </div>
    </div>
  );
}