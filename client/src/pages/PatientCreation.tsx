import { PatientParser } from '@/components/PatientParser';

export function PatientCreation() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8">
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