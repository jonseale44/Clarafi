import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Download, Building2, MapPin, AlertCircle, CheckCircle, Clock, Activity, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthcareUpdateSettings } from "./HealthcareUpdateSettings";

interface HealthcareStats {
  healthSystems: number;
  locations: number;
}

interface ImportStatus {
  status: 'idle' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  errors: string[];
  startTime?: string;
  endTime?: string;
  totalRecords?: number;
  processedRecords?: number;
  successfulRecords?: number;
  failedRecords?: number;
}

export function HealthcareDataManagement() {
  const [importStatus, setImportStatus] = useState<'idle' | 'downloading' | 'importing' | 'complete' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current healthcare data statistics
  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; stats: HealthcareStats }>({
    queryKey: ['/api/admin/healthcare-data-stats'],
    refetchInterval: 5000 // Refresh every 5 seconds during import
  });

  // Fetch current import status
  const { data: importStatusData } = useQuery<{ success: boolean; status: ImportStatus }>({
    queryKey: ['/api/admin/import-status'],
    refetchInterval: 3000, // Always poll every 3 seconds
  });

  // Start full US healthcare data import
  const importDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/import-us-healthcare-data', {
        method: 'POST',
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setImportStatus('importing');
        toast({
          title: "Import Started",
          description: "Nationwide healthcare data import has begun. This will take several hours to complete.",
        });
        // Start polling for updates and check for failures
        const pollInterval = setInterval(async () => {
          queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-data-stats'] });
          
          // Check server logs for failures by monitoring stats
          try {
            const response = await fetch('/api/admin/healthcare-data-stats');
            const result = await response.json();
            
            // If stats haven't changed after reasonable time and we see error patterns,
            // we can infer the download may have failed
            if (importStatus === 'importing' && importProgress < 10) {
              setImportProgress(prev => Math.min(prev + 0.5, 5)); // Slow progress until we confirm success
            } else {
              setImportProgress(prev => Math.min(prev + 1, 95));
            }
          } catch (error) {
            console.error('Failed to check import status:', error);
          }
        }, 10000);

        // Clear interval after 4 hours (estimated completion time)
        setTimeout(() => {
          clearInterval(pollInterval);
          setImportStatus('complete');
          setImportProgress(100);
        }, 4 * 60 * 60 * 1000);
      } else {
        // Handle case where backend returns success: false
        setImportStatus('error');
        toast({
          title: "Import Failed",
          description: data.message || "Failed to start healthcare data import",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      setImportStatus('error');
      toast({
        title: "Import Failed",
        description: error.message || "Failed to start healthcare data import",
        variant: "destructive"
      });
    }
  });

  // Download NPPES data only (for testing)
  const downloadDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/download-nppes-data', {
        method: 'POST',
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Download Complete",
          description: "NPPES dataset downloaded successfully. Ready for processing.",
        });
      }
    }
  });

  // Database restructure mutation
  const restructureMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/restructure-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'WIPE_ALL_DATA' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restructure database');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Database Restructured",
          description: "System has been completely reset. Please reload the page.",
        });
        // Force reload after a short delay to ensure cleanup is complete
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Restructure Failed",
          description: data.message || "Failed to restructure database",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Restructure Failed",
        description: error.message || "Failed to restructure database",
        variant: "destructive"
      });
    }
  });

  const restructureDatabase = () => {
    restructureMutation.mutate();
  };

  const handleStartImport = () => {
    setImportStatus('downloading');
    setImportProgress(0);
    importDataMutation.mutate();
  };

  const currentStats = stats?.stats || { healthSystems: 0, locations: 0 };
  const hasData = currentStats.healthSystems > 0;

  return (
    <div className="space-y-6" data-median="healthcare-data-management-container">
      <Tabs defaultValue="import" className="w-full" data-median="admin-tabs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2" data-median="import-tab">
            <Database className="w-4 h-4" />
            Data Import
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2" data-median="settings-tab">
            <Settings className="w-4 h-4" />
            Update Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                US Healthcare Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Statistics */}
              <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Health Systems</p>
                    <p className="text-3xl font-bold">{currentStats.healthSystems.toLocaleString()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Clinical Locations</p>
                    <p className="text-3xl font-bold">{currentStats.locations.toLocaleString()}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
              </div>

              {/* Import Status and Errors */}
              {importStatusData?.status && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Import Status</h3>
                  
                  {/* Current Status */}
                  <Alert className={
                    importStatusData.status.status === 'failed' ? 'border-red-200 bg-red-50' :
                    importStatusData.status.status === 'completed' ? 'border-green-200 bg-green-50' :
                    'border-blue-200 bg-blue-50'
                  }>
                    {importStatusData.status.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : importStatusData.status.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">{importStatusData.status.message}</p>
                        {importStatusData.status.progress > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{importStatusData.status.progress}%</span>
                            </div>
                            <Progress value={importStatusData.status.progress} className="h-2" />
                          </div>
                        )}
                        {importStatusData.status.startTime && (
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(importStatusData.status.startTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Display Errors */}
                  {importStatusData.status.errors && importStatusData.status.errors.length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium text-red-800">Import Errors Detected:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                            {importStatusData.status.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Status Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Source Status</h3>
                
                {!hasData && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>No healthcare data found.</strong> The system currently has minimal test data. 
                  Import the full NPPES dataset to enable nationwide clinic coverage.
                </AlertDescription>
                  </Alert>
                )}

                {hasData && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Healthcare data available.</strong> The system has {currentStats.healthSystems.toLocaleString()} health systems 
                  with {currentStats.locations.toLocaleString()} clinical locations nationwide.
                </AlertDescription>
              </Alert>
            )}

            {/* Import Progress - Show only if backend has active status */}
            {importStatusData?.status && 
             importStatusData.status.status !== 'idle' && 
             importStatusData.status.status !== 'completed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Import Progress</span>
                  <Badge variant={
                    importStatusData.status.status === 'completed' ? 'default' :
                    importStatusData.status.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {importStatusData.status.status === 'downloading' && <><Download className="w-3 h-3 mr-1" /> Downloading</>}
                    {importStatusData.status.status === 'processing' && <><Activity className="w-3 h-3 mr-1" /> Processing</>}
                    {importStatusData.status.status === 'completed' && <><CheckCircle className="w-3 h-3 mr-1" /> Complete</>}
                    {importStatusData.status.status === 'failed' && <><AlertCircle className="w-3 h-3 mr-1" /> Error</>}
                  </Badge>
                </div>
                <Progress value={importStatusData.status.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {importStatusData.status.status === 'downloading' && "Downloading NPPES dataset (~4GB) from CMS.gov..."}
                  {importStatusData.status.status === 'processing' && importStatusData.status.progress < 5 && "Validating downloaded data and beginning processing..."}
                  {importStatusData.status.status === 'processing' && importStatusData.status.progress >= 5 && "Processing 3M+ healthcare providers nationwide..."}
                  {importStatusData.status.status === 'completed' && "Healthcare data import completed successfully!"}
                  {importStatusData.status.status === 'failed' && "Import failed: Download error or invalid NPPES data. Check server logs for URL issues or try the 'Download NPPES Only' button first to test the connection."}
                </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
              onClick={handleStartImport}
              disabled={importDataMutation.isPending || 
                       (importStatusData?.status && 
                        importStatusData.status.status === 'processing')}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {importStatusData?.status?.status === 'processing' ? 'Import in Progress...' : 'Import Full US Dataset'}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => downloadDataMutation.mutate()}
                  disabled={downloadDataMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download NPPES Only
                </Button>
              </div>

              {/* Information Card */}
              <Card className="bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Full Dataset Import Details</h4>
                  <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• <strong>Coverage:</strong> All 50 US states + territories</li>
                    <li>• <strong>Providers:</strong> ~3 million healthcare organizations</li>
                    <li>• <strong>Data Source:</strong> Official CMS NPPES Registry</li>
                    <li>• <strong>Update Frequency:</strong> Configurable automatic scheduling</li>
                    <li>• <strong>Processing Time:</strong> 2-4 hours for complete import</li>
                    <li>• <strong>Storage Required:</strong> ~2-3GB database space</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <HealthcareUpdateSettings />
        </TabsContent>
      </Tabs>

      {/* Database Restructure Section */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 mt-6">
        <CardHeader>
          <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Database Restructure - Complete System Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Extremely Dangerous Operation</AlertTitle>
            <AlertDescription>
              This will permanently delete ALL data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All health systems and organizations</li>
                <li>All locations and providers</li>
                <li>All users (including admin accounts)</li>
                <li>All patient data</li>
                <li>All clinical documentation</li>
              </ul>
              <strong className="block mt-2">This action cannot be undone!</strong>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>Use this when:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Individual clinics are incorrectly stored as health systems</li>
              <li>You need to switch from NPPES to CMS PECOS data</li>
              <li>Starting fresh with proper organizational hierarchy</li>
            </ul>
          </div>

          <Button
            onClick={() => {
              if (window.confirm('Are you absolutely sure you want to wipe ALL data from the system? This cannot be undone!')) {
                if (window.confirm('FINAL WARNING: This will delete EVERYTHING including all users. Type "yes" to confirm.')) {
                  const userInput = window.prompt('Type "WIPE_ALL_DATA" to confirm:');
                  if (userInput === 'WIPE_ALL_DATA') {
                    restructureDatabase();
                  } else {
                    toast({
                      title: 'Cancelled',
                      description: 'Database restructure cancelled.',
                    });
                  }
                }
              }
            }}
            variant="destructive"
            disabled={restructureMutation.isPending}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Restructure Database (Delete Everything)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}