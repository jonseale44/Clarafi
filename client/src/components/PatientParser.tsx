import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, User, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setParseResult(null);
        setExtractedData(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
      }
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

  const parsePatientInfo = async () => {
    if (!selectedFile && !textContent.trim()) {
      toast({
        title: "Missing input",
        description: "Please select an image or enter text content",
        variant: "destructive",
      });
      return;
    }

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
          title: "Parsing successful",
          description: `Patient information extracted with ${result.confidence}% confidence`,
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-gray-400" />
                      <div className="text-sm text-gray-600">
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
                <Textarea
                  id="text-content"
                  placeholder="Paste or type patient demographic information here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button 
              onClick={parsePatientInfo}
              disabled={isProcessing || (!selectedFile && !textContent.trim())}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Parse Information
                </>
              )}
            </Button>
            
            {extractedData && (
              <Button 
                onClick={createPatient}
                disabled={isProcessing}
                variant="outline"
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
            <div className="space-y-2">
              <p><strong>MRN:</strong> {createdPatient.mrn}</p>
              <p><strong>Name:</strong> {createdPatient.firstName} {createdPatient.lastName}</p>
              <p><strong>Date of Birth:</strong> {createdPatient.dateOfBirth}</p>
              <p><strong>Gender:</strong> {createdPatient.gender}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}