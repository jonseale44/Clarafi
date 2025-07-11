import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Upload, Building2, CheckCircle, AlertCircle, Download, Search } from 'lucide-react';

export default function AdminClinicImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch import statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/clinic-import/stats'],
  });

  // Fetch recent imports
  const { data: recentImports } = useQuery({
    queryKey: ['/api/admin/clinic-import/recent'],
  });

  // Search health systems
  const { data: searchResults } = useQuery({
    queryKey: ['/api/admin/clinic-import/search', searchQuery],
    enabled: searchQuery.length > 2,
  });

  // Upload NPPES file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/clinic-import/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Upload started',
        description: 'The NPPES file is being processed in the background.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clinic-import'] });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Download sample NPPES data
  const downloadSample = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/clinic-import/sample');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nppes_sample.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Sample downloaded',
        description: 'Check your downloads folder for nppes_sample.csv',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download sample file',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Clinic Data Import</h1>
        <p className="text-gray-600">
          Import healthcare facility data from official sources to populate the EMR system.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Health Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.healthSystems || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.locations || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Primary Care Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.primaryCareClinics || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">FQHCs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.fqhcs || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="search">Search Facilities</TabsTrigger>
          <TabsTrigger value="recent">Recent Imports</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import NPPES Data</CardTitle>
              <CardDescription>
                Upload NPPES (National Provider Identifier) data files to import healthcare facilities.
                The system will automatically filter for primary care providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Data Source</AlertTitle>
                <AlertDescription>
                  Download the latest NPPES data from{' '}
                  <a 
                    href="https://download.cms.gov/nppes/NPI_Files.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    CMS.gov
                  </a>
                  {' '}or use our sample data for testing.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="nppes-file">Select NPPES CSV File</Label>
                <div className="flex gap-2">
                  <Input
                    id="nppes-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={downloadSample}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sample Data
                  </Button>
                </div>
              </div>

              {selectedFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-gray-600 text-center">
                    Processing... This may take several minutes for large files.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Import Options</CardTitle>
              <CardDescription>
                Import pre-configured datasets for common scenarios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    await apiRequest('POST', '/api/admin/clinic-import/quick-import/texas-primary-care');
                    toast({
                      title: 'Import started',
                      description: 'Importing Texas primary care clinics...',
                    });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/clinic-import'] });
                  } catch (error) {
                    toast({
                      title: 'Import failed',
                      description: 'Could not start Texas clinic import',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Import Texas Primary Care Clinics
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    await apiRequest('POST', '/api/admin/clinic-import/quick-import/fqhcs');
                    toast({
                      title: 'Import started',
                      description: 'Importing all FQHCs nationwide...',
                    });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/clinic-import'] });
                  } catch (error) {
                    toast({
                      title: 'Import failed',
                      description: 'Could not start FQHC import',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Import All FQHCs (Federally Qualified Health Centers)
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    await apiRequest('POST', '/api/admin/clinic-import/quick-import/major-health-systems');
                    toast({
                      title: 'Import started',
                      description: 'Importing major health systems...',
                    });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/clinic-import'] });
                  } catch (error) {
                    toast({
                      title: 'Import failed',
                      description: 'Could not start health systems import',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Import Major Health Systems
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Imported Facilities</CardTitle>
              <CardDescription>
                Find healthcare facilities that have been imported into the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, city, or NPI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result: any) => (
                      <div
                        key={result.id}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-gray-600">
                          {result.address}, {result.city}, {result.state} {result.zipCode}
                        </div>
                        <div className="text-sm text-gray-500">
                          NPI: {result.npi} • Type: {result.locationType}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Import History</CardTitle>
              <CardDescription>
                View the history of data imports and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentImports && recentImports.length > 0 ? (
                <div className="space-y-2">
                  {recentImports.map((import_: any) => (
                    <div
                      key={import_.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{import_.fileName}</div>
                          <div className="text-sm text-gray-600">
                            {import_.recordsProcessed} records • {import_.clinicsImported} clinics imported
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(import_.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No import history available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}