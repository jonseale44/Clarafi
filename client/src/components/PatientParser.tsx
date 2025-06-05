import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, User, AlertCircle, CheckCircle, Camera, ExternalLink, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

interface ExtractedPatient {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  address?: string;
  contact_number?: string;
  email?: string;
  emergency_contact?: string;
  insurance_info?: string;
}

interface ParseResult {
  success: boolean;
  data?: ExtractedPatient;
  error?: string;
  confidence?: number;
}

interface PatientCreateResult {
  success: boolean;
  patient?: any;
  parseConfidence?: number;
  extractedData?: ExtractedPatient;
  error?: string;
  missingFields?: string[];
  existingPatient?: any;
}

export function PatientParser() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPatient | null>(null);
  const [createdPatient, setCreatedPatient] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const textDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();

  // Auto-parse text content with debouncing
  useEffect(() => {
    if (activeTab === 'text' && textContent.trim()) {
      // Clear existing timeout
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current);
      }
      
      // Set new timeout for debounced parsing
      textDebounceRef.current = setTimeout(() => {
        parsePatientInfoFromText(textContent);
      }, 2000); // 2 second delay
    } else if (activeTab === 'text' && !textContent.trim()) {
      // Clear results when text is empty
      setParseResult(null);
      setExtractedData(null);
      setCreatedPatient(null);
    }
    
    return () => {
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current);
      }
    };
  }, [textContent, activeTab]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      setParseResult(null);
      setExtractedData(null);
      setCreatedPatient(null);
      // Automatically parse the file
      parsePatientInfoFromFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      processFile(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const parsePatientInfoFromFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const base64Data = await convertFileToBase64(file);
      const requestBody = {
        imageData: base64Data,
        isTextContent: false
      };

      const response = await fetch('/api/parse-patient-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: ParseResult = await response.json();
      setParseResult(result);

      if (result.success && result.data) {
        setExtractedData(result.data);
        toast({
          title: "Information extracted",
          description: `Patient data parsed with ${result.confidence}% confidence`,
        });
      } else {
        toast({
          title: "Parsing failed",
          description: result.error || "Failed to extract patient information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Processing error",
        description: "Failed to process the request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parsePatientInfoFromText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const requestBody = {
        textContent: text.trim(),
        isTextContent: true
      };

      const response = await fetch('/api/parse-patient-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: ParseResult = await response.json();
      setParseResult(result);

      if (result.success && result.data) {
        setExtractedData(result.data);
        toast({
          title: "Information extracted",
          description: `Patient data parsed with ${result.confidence}% confidence`,
        });
      } else {
        toast({
          title: "Parsing failed",
          description: result.error || "Failed to extract patient information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Processing error",
        description: "Failed to process the request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createPatient = async () => {
    if (!extractedData) return;

    setIsProcessing(true);
    try {
      let requestBody: any = {};

      if (activeTab === 'upload' && selectedFile) {
        const base64Data = await convertFileToBase64(selectedFile);
        requestBody = {
          imageData: base64Data,
          isTextContent: false
        };
      } else if (activeTab === 'text' && textContent.trim()) {
        requestBody = {
          textContent: textContent.trim(),
          isTextContent: true
        };
      }

      const response = await fetch('/api/parse-and-create-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: PatientCreateResult = await response.json();

      if (result.success && result.patient) {
        setCreatedPatient(result.patient);
        // Invalidate patient queries to refresh patient lists
        await queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        toast({
          title: "Patient created successfully",
          description: `Created patient record for ${result.patient.firstName} ${result.patient.lastName}`,
        });
      } else if (result.existingPatient) {
        toast({
          title: "Patient already exists",
          description: "A patient with this information already exists in the system",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Creation failed",
          description: result.error || "Failed to create patient record",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create patient error:', error);
      toast({
        title: "Creation error",
        description: "Failed to create patient record",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTextContent('');
    setParseResult(null);
    setExtractedData(null);
    setCreatedPatient(null);
  };

  const handleViewPatient = () => {
    if (createdPatient?.id) {
      setLocation(`/patients/${createdPatient.id}`);
    }
  };

  const handleStartEncounter = async () => {
    if (!createdPatient?.id) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: createdPatient.id,
          chiefComplaint: 'New patient visit',
          status: 'in_progress'
        }),
      });

      if (response.ok) {
        const encounter = await response.json();
        toast({
          title: "Encounter started",
          description: "New encounter created successfully",
        });
        setLocation(`/encounters/${encounter.id}`);
      } else {
        throw new Error('Failed to create encounter');
      }
    } catch (error) {
      console.error('Error creating encounter:', error);
      toast({
        title: "Error",
        description: "Failed to start encounter",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceBadgeVariant = (confidence?: number) => {
    if (!confidence) return "secondary";
    if (confidence >= 90) return "default";
    if (confidence >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information Parser
          </CardTitle>
          <CardDescription>
            Extract patient demographic information from medical documents, insurance cards, or text using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'upload' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Upload Document
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Enter Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload Medical Document</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className={`h-10 w-10 mx-auto ${
                        isDragOver ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFile ? (
                          <span className="font-medium text-green-600">{selectedFile.name}</span>
                        ) : (
                          <>
                            <span className="font-medium">Click to upload</span> or drag and drop
                            <br />
                            Insurance cards, medical forms, EHR screenshots
                          </>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Patient Information Text</Label>
                <div className="relative">
                  <Textarea
                    id="text-content"
                    placeholder="Paste or type patient demographic information here... (Auto-parses after 2 seconds)"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  {activeTab === 'text' && textContent.trim() && !isProcessing && (
                    <div className="absolute top-2 right-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Auto-parsing...
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-blue-600 py-4">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parse Results */}
      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {parseResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Extraction Results
            </CardTitle>
            {parseResult.confidence && (
              <div className="flex items-center gap-2">
                <Badge variant={getConfidenceBadgeVariant(parseResult.confidence)}>
                  {parseResult.confidence}% Confidence
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {parseResult.success && extractedData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <p className="text-sm">{extractedData.first_name} {extractedData.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                    <p className="text-sm">{extractedData.date_of_birth}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Gender</Label>
                    <p className="text-sm capitalize">{extractedData.gender}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Contact Number</Label>
                    <p className="text-sm">{extractedData.contact_number || 'Not provided'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm">{extractedData.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Address</Label>
                    <p className="text-sm">{extractedData.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Emergency Contact</Label>
                    <p className="text-sm">{extractedData.emergency_contact || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Insurance Info</Label>
                    <p className="text-sm">{extractedData.insurance_info || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {parseResult.error}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Action buttons below extraction results */}
            {parseResult && (
              <div className="flex gap-3 pt-4 border-t">
                {extractedData && (
                  <Button 
                    onClick={createPatient}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Create Patient
                  </Button>
                )}
                
                <Button 
                  onClick={resetForm}
                  variant="ghost"
                  disabled={isProcessing}
                >
                  Reset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Created Patient Success */}
      {createdPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Patient Created Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <p><strong>MRN:</strong> {createdPatient.mrn}</p>
                <p><strong>Name:</strong> {createdPatient.firstName} {createdPatient.lastName}</p>
                <p><strong>Date of Birth:</strong> {createdPatient.dateOfBirth}</p>
                <p><strong>Gender:</strong> {createdPatient.gender}</p>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleViewPatient}
                  className="flex items-center gap-2"
                  disabled={isProcessing}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Patient Chart
                </Button>
                
                <Button
                  onClick={handleStartEncounter}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isProcessing}
                >
                  <Calendar className="h-4 w-4" />
                  Start New Encounter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}