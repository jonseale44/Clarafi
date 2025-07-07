import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, User, AlertCircle, CheckCircle, Camera, ExternalLink, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Validation schema for patient form
const patientFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other', 'unknown'], {
    required_error: 'Gender is required',
  }),
  phoneNumber: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  insurancePrimary: z.string().optional(),
  insuranceSecondary: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

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
  insurance_provider?: string;
  insurance_member_id?: string;
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
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [quickParseText, setQuickParseText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsingText, setIsParsingText] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPatient | null>(null);
  const [createdPatient, setCreatedPatient] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const textDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const quickParseDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();

  // Form for discrete fields
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'unknown',
      phoneNumber: '',
      email: '',
      address: '',
      emergencyContact: '',
      insurancePrimary: '',
      insuranceSecondary: '',
      policyNumber: '',
      groupNumber: '',
    },
  });

  // Auto-parse quick parse text with debouncing (1.5 second delay like draft orders)
  useEffect(() => {
    if (quickParseText.trim() && quickParseText.length > 5) {
      // Clear existing timeout
      if (quickParseDebounceRef.current) {
        clearTimeout(quickParseDebounceRef.current);
      }
      
      // Set new timeout for debounced parsing
      quickParseDebounceRef.current = setTimeout(() => {
        parseQuickText(quickParseText);
      }, 1500); // 1.5 second delay like draft orders
    }
    
    return () => {
      if (quickParseDebounceRef.current) {
        clearTimeout(quickParseDebounceRef.current);
      }
    };
  }, [quickParseText]);
  
  // When parsed data is received, populate the form
  useEffect(() => {
    if (extractedData) {
      form.setValue('firstName', extractedData.first_name || '');
      form.setValue('lastName', extractedData.last_name || '');
      form.setValue('dateOfBirth', extractedData.date_of_birth || '');
      
      // Handle gender field - normalize to lowercase and validate
      if (extractedData.gender) {
        const normalizedGender = extractedData.gender.toLowerCase().trim();
        // Map common variations to valid select values
        const genderMap: Record<string, 'male' | 'female' | 'other' | 'unknown'> = {
          'male': 'male',
          'm': 'male',
          'female': 'female',
          'f': 'female',
          'other': 'other',
          'unknown': 'unknown',
          'u': 'unknown'
        };
        const mappedGender = genderMap[normalizedGender] || 'unknown';
        form.setValue('gender', mappedGender);
      } else {
        form.setValue('gender', 'unknown');
      }
      
      form.setValue('phoneNumber', extractedData.contact_number || '');
      form.setValue('email', extractedData.email || '');
      form.setValue('address', extractedData.address || '');
      form.setValue('emergencyContact', extractedData.emergency_contact || '');
      
      // Handle insurance info more robustly
      if (extractedData.insurance_info) {
        if (typeof extractedData.insurance_info === 'string') {
          form.setValue('insurancePrimary', extractedData.insurance_info);
        } else if (typeof extractedData.insurance_info === 'object') {
          const insurance = extractedData.insurance_info as any;
          form.setValue('insurancePrimary', insurance.primary || insurance.insurance_provider || '');
          form.setValue('insuranceSecondary', insurance.secondary || '');
          form.setValue('policyNumber', insurance.policy_number || insurance.member_id || '');
          form.setValue('groupNumber', insurance.group_number || '');
        }
      } else if (extractedData.insurance_provider) {
        form.setValue('insurancePrimary', extractedData.insurance_provider);
        form.setValue('policyNumber', extractedData.insurance_member_id || '');
      }
    }
  }, [extractedData, form]);

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

  const parseQuickText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsParsingText(true);
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
        // No toast for auto-parse to avoid interrupting user typing
      }
    } catch (error) {
      console.error('Parse error:', error);
    } finally {
      setIsParsingText(false);
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

  const createPatient = async (data: PatientFormData) => {
    setIsProcessing(true);
    try {
      // Transform form data to match API expectations
      const requestBody = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        contactNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        insurancePrimary: data.insurancePrimary,
        insuranceSecondary: data.insuranceSecondary,
        policyNumber: data.policyNumber,
        groupNumber: data.groupNumber,
      };

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const patient = await response.json();
      setCreatedPatient(patient);
      
      // Invalidate patient queries to refresh patient lists
      await queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      
      toast({
        title: "Patient created successfully",
        description: `Created patient record for ${patient.firstName} ${patient.lastName}`,
      });
      
      // Navigate to patient view after short delay
      setTimeout(() => {
        setLocation(`/patients/${patient.id}`);
      }, 1000);
      
    } catch (error: any) {
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
    console.log('🔍 [PatientParser] handleViewPatient called');
    console.log('📋 [PatientParser] createdPatient:', createdPatient);
    
    if (createdPatient?.id) {
      console.log('✅ [PatientParser] Navigating to patient view with ID:', createdPatient.id);
      setLocation(`/patients/${createdPatient.id}`);
    } else {
      console.error('❌ [PatientParser] No patient ID available for navigation');
      toast({
        title: "Error",
        description: "Patient ID not available. Please try creating the patient again.",
        variant: "destructive",
      });
    }
  };

  const handleStartEncounter = async () => {
    console.log('🚀 [PatientParser] handleStartEncounter called');
    console.log('📋 [PatientParser] createdPatient:', createdPatient);
    
    if (!createdPatient?.id) {
      console.error('❌ [PatientParser] No patient ID available for encounter creation');
      toast({
        title: "Error",
        description: "Patient ID not available. Please try creating the patient again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    const encounterData = {
      patientId: createdPatient.id,
      providerId: 1, // Default provider ID - will be set by server from authenticated user
      chiefComplaint: 'New patient visit',
      encounterStatus: 'in_progress',
      encounterType: 'office_visit'
    };
    
    console.log('📤 [PatientParser] Sending encounter request with data:', encounterData);
    
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encounterData),
      });

      console.log('📥 [PatientParser] Encounter response status:', response.status);
      
      if (response.ok) {
        const encounter = await response.json();
        console.log('✅ [PatientParser] Encounter created successfully:', encounter);
        
        // Invalidate encounter queries to refresh encounter lists
        await queryClient.invalidateQueries({ queryKey: ['/api/encounters'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        
        toast({
          title: "Encounter started",
          description: "New encounter created successfully",
        });
        
        console.log('🔄 [PatientParser] Navigating to encounter:', encounter.id);
        console.log('🔄 [PatientParser] Full navigation URL:', `/encounters/${encounter.id}`);
        console.log('🔄 [PatientParser] Current location before navigation:', window.location.pathname);
        
        setLocation(`/encounters/${encounter.id}`);
        
        console.log('🔄 [PatientParser] Navigation command sent');
        
        // Add a small delay to check if navigation worked
        setTimeout(() => {
          console.log('🔄 [PatientParser] Location after navigation:', window.location.pathname);
        }, 100);
      } else {
        const errorData = await response.text();
        console.error('❌ [PatientParser] Encounter creation failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        throw new Error(`Failed to create encounter: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('💥 [PatientParser] Error creating encounter:', error);
      toast({
        title: "Error",
        description: "Failed to start encounter. Please check the console for details.",
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
                      ? 'border-navy-blue-500 bg-navy-blue-50 dark:bg-navy-blue-950' 
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
                        isDragOver ? 'text-navy-blue-500' : 'text-gray-400'
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

            <TabsContent value="text" className="space-y-6">
              {/* Quick Parse Text Section */}
              <div className="space-y-2">
                <Label htmlFor="quick-parse">Quick Parse Text</Label>
                <div className="relative">
                  <Textarea
                    id="quick-parse"
                    placeholder="Paste or type patient information here... (Auto-parses after 1.5 seconds)"
                    value={quickParseText}
                    onChange={(e) => setQuickParseText(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  {isParsingText && (
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin text-navy-blue-600" />
                      <span className="text-xs text-navy-blue-600">Parsing...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  AI will automatically extract patient information and populate the fields below
                </p>
              </div>

              <Separator />

              {/* Discrete Input Fields */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(createPatient)} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* DOB and Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="123 Main St, City, State ZIP" 
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Emergency Contact */}
                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Name and phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Insurance Information */}
                  <Separator />
                  <h3 className="font-medium text-sm">Insurance Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insurancePrimary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Insurance</FormLabel>
                          <FormControl>
                            <Input placeholder="Blue Cross Blue Shield" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceSecondary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Insurance</FormLabel>
                          <FormControl>
                            <Input placeholder="Medicare" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input placeholder="XXX123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="groupNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Number</FormLabel>
                          <FormControl>
                            <Input placeholder="GRP789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        form.reset();
                        setQuickParseText('');
                        setExtractedData(null);
                      }}
                    >
                      Clear Form
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isProcessing}
                      className="bg-navy-blue-600 hover:bg-navy-blue-700"
                    >
                      {isProcessing ? 'Creating...' : 'Create Patient'}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-navy-blue-600 py-4">
              <div className="w-4 h-4 border-2 border-navy-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}