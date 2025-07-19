import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Download,
  Loader2
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  total: number;
}

export function AdminPharmacyImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const importMutation = useMutation({
    mutationFn: async (pharmacies: any[]) => {
      const response = await apiRequest('POST', '/api/eprescribing/pharmacies/import', {
        pharmacies
      });
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/eprescribing/pharmacies'] });
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${data.imported} pharmacies`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import pharmacies',
        variant: 'destructive',
      });
    },
  });
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedFile(file);
    setImportResult(null);
    
    // Parse CSV for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v));
      
      setPreviewData(data);
    };
    reader.readAsText(file);
  };
  
  const handleImport = () => {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Map CSV columns to our pharmacy schema
      const pharmacies = lines.slice(1).map(line => {
        const values = line.split(',');
        const pharmacy: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || '';
          
          // Map common CSV column names to our schema
          switch (header) {
            case 'pharmacy name':
            case 'name':
            case 'pharmacy':
              pharmacy.name = value;
              break;
            case 'address':
            case 'street':
            case 'address1':
              pharmacy.address = value;
              break;
            case 'city':
              pharmacy.city = value;
              break;
            case 'state':
            case 'st':
              pharmacy.state = value;
              break;
            case 'zip':
            case 'zipcode':
            case 'zip code':
            case 'postal code':
              pharmacy.zipCode = value;
              break;
            case 'phone':
            case 'phone number':
            case 'telephone':
              pharmacy.phone = value;
              break;
            case 'fax':
            case 'fax number':
            case 'fax phone':
              pharmacy.fax = value;
              break;
            case 'npi':
            case 'npi number':
            case 'npi_number':
              pharmacy.npiNumber = value;
              break;
          }
        });
        
        return pharmacy;
      }).filter(p => p.name && p.address && p.fax);
      
      importMutation.mutate(pharmacies);
    };
    reader.readAsText(selectedFile);
  };
  
  const downloadTemplate = () => {
    const csv = `Name,Address,City,State,Zip,Phone,Fax,NPI
"CVS Pharmacy #1234","123 Main St","Anytown","TX","78701","512-555-1234","512-555-1235","1234567890"
"Walgreens #5678","456 Oak Ave","Somewhere","CA","90210","310-555-5678","310-555-5679","0987654321"`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy Database Import</h1>
          <p className="text-muted-foreground mt-2">
            Import pharmacy data from CSV files to enable fax prescriptions
          </p>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Supported Sources:</strong> ScriptFax™ by CarePrecise (80,000+ pharmacies), 
            NPI Registry exports, or custom pharmacy lists. The CSV must include pharmacy name, 
            address, and fax number at minimum.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Import CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file containing pharmacy information with fax numbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              
              <div className="flex-1">
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                >
                  <span className="flex items-center space-x-2">
                    <Upload className="w-6 h-6 text-gray-600" />
                    <span className="font-medium text-gray-600">
                      {selectedFile ? selectedFile.name : 'Drop CSV file here or click to upload'}
                    </span>
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>
            
            {previewData.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Preview (first 5 rows):</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((value: any, i) => (
                            <td key={i} className="px-3 py-2 text-sm text-gray-900">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Pharmacies
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Successfully Imported
                  </span>
                  <span className="font-medium">{importResult.imported}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Skipped (Already Exists)
                  </span>
                  <span className="font-medium">{importResult.skipped}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Errors
                  </span>
                  <span className="font-medium">{importResult.errors}</span>
                </div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex items-center justify-between font-medium">
                  <span>Total Processed</span>
                  <span>{importResult.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV Format Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Column headers in first row (case-insensitive)</li>
              <li>Required columns: Name, Address, Fax</li>
              <li>Optional columns: City, State, Zip, Phone, NPI</li>
              <li>Common variations are automatically mapped (e.g., "Pharmacy Name" → "Name")</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}