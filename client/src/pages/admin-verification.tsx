import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Sparkles, Building2, AlertCircle, Navigation, MapPin, Mail, Check, X, Clock } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const adminVerificationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  title: z.string().min(1, 'Title is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.enum(['private_practice', 'clinic', 'hospital', 'health_system']),
  taxId: z.string().regex(/^\d{2}-\d{7}$/, 'Tax ID must be in format XX-XXXXXXX'),
  npiNumber: z.string().regex(/^\d{10}$/, 'NPI must be 10 digits').optional().or(z.literal('')),
  // Organization Address
  address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 letters'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  businessLicense: z.string().optional(),
  medicalLicense: z.string().optional(),
  baaAccepted: z.boolean().refine(val => val === true, 'You must accept the BAA'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the Terms of Service'),
  currentEmr: z.string().optional(),
  expectedProviderCount: z.coerce.number().min(1, 'Must have at least 1 provider'),
  expectedMonthlyPatientVolume: z.coerce.number().min(0, 'Cannot be negative')
});

type AdminVerificationFormData = z.infer<typeof adminVerificationSchema>;

interface NearbyClinic {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  distance?: number;
}

// Custom hook for debounced validation
function useDebouncedValidation(value: string, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsValidating(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsValidating(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, isValidating };
}

export default function AdminVerification() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [nearbyClinics, setNearbyClinics] = useState<NearbyClinic[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const form = useForm<AdminVerificationFormData>({
    resolver: zodResolver(adminVerificationSchema),
    defaultValues: {
      organizationType: 'private_practice',
      expectedProviderCount: 1,
      expectedMonthlyPatientVolume: 100,
      baaAccepted: false,
      termsAccepted: false
    }
  });

  // Validation states for unique fields
  const [emailValidation, setEmailValidation] = useState<{available?: boolean; message?: string}>({});
  const [phoneValidation, setPhoneValidation] = useState<{available?: boolean; message?: string}>({});
  const [taxIdValidation, setTaxIdValidation] = useState<{available?: boolean; message?: string}>({});
  const [orgNameValidation, setOrgNameValidation] = useState<{available?: boolean; message?: string}>({});

  // Watch form fields for real-time validation
  const watchedEmail = form.watch("email");
  const watchedPhone = form.watch("phone");
  const watchedTaxId = form.watch("taxId");
  const watchedOrgName = form.watch("organizationName");

  // Debounced values for API calls
  const { debouncedValue: debouncedEmail, isValidating: isValidatingEmail } = useDebouncedValidation(watchedEmail || "");
  const { debouncedValue: debouncedPhone, isValidating: isValidatingPhone } = useDebouncedValidation(watchedPhone || "");
  const { debouncedValue: debouncedTaxId, isValidating: isValidatingTaxId } = useDebouncedValidation(watchedTaxId || "");
  const { debouncedValue: debouncedOrgName, isValidating: isValidatingOrgName } = useDebouncedValidation(watchedOrgName || "");

  // Real-time email validation
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes("@")) {
      apiRequest("POST", "/api/admin-verification/check-email", { email: debouncedEmail })
        .then((response) => response.json())
        .then((data) => {
          setEmailValidation(data);
        }).catch(() => {
          setEmailValidation({ available: false, message: "Error checking email" });
        });
    } else {
      setEmailValidation({});
    }
  }, [debouncedEmail]);

  // Real-time phone validation
  useEffect(() => {
    if (debouncedPhone && debouncedPhone.length >= 10) {
      apiRequest("POST", "/api/admin-verification/check-phone", { phone: debouncedPhone })
        .then((response) => response.json())
        .then((data) => {
          setPhoneValidation(data);
        }).catch(() => {
          setPhoneValidation({ available: false, message: "Error checking phone" });
        });
    } else {
      setPhoneValidation({});
    }
  }, [debouncedPhone]);

  // Real-time tax ID validation
  useEffect(() => {
    if (debouncedTaxId && /^\d{2}-\d{7}$/.test(debouncedTaxId)) {
      apiRequest("POST", "/api/admin-verification/check-tax-id", { taxId: debouncedTaxId })
        .then((response) => response.json())
        .then((data) => {
          setTaxIdValidation(data);
        }).catch(() => {
          setTaxIdValidation({ available: false, message: "Error checking tax ID" });
        });
    } else {
      setTaxIdValidation({});
    }
  }, [debouncedTaxId]);

  // Real-time organization name validation
  useEffect(() => {
    if (debouncedOrgName && debouncedOrgName.length >= 3) {
      apiRequest("POST", "/api/admin-verification/check-organization", { name: debouncedOrgName })
        .then((response) => response.json())
        .then((data) => {
          setOrgNameValidation(data);
        }).catch(() => {
          setOrgNameValidation({ available: false, message: "Error checking organization name" });
        });
    } else {
      setOrgNameValidation({});
    }
  }, [debouncedOrgName]);

  // Mock nearby clinics data - in production this would come from an API
  const mockNearbyClinics: NearbyClinic[] = [
    {
      name: "Waco Family Medicine - Hillsboro",
      address: "1323 East Franklin St #105",
      city: "Hillsboro",
      state: "TX",
      zip: "76645",
      phone: "(254) 582-7481",
      website: "https://wacofamilymedicine.org",
      distance: 0.8
    },
    {
      name: "Mission Hillsboro Medical Clinic",
      address: "120 East Franklin St, Unit B",
      city: "Hillsboro",
      state: "TX",
      zip: "76645",
      phone: "(254) 479-1489",
      distance: 1.2
    },
    {
      name: "Specialty Care Clinics",
      address: "117 Jane Lane",
      city: "Hillsboro",
      state: "TX",
      zip: "76645",
      phone: "(254) 582-8007",
      distance: 1.5
    },
    {
      name: "Hill County Medical Center",
      address: "1313 E Franklin St",
      city: "Hillsboro",
      state: "TX",
      zip: "76645",
      phone: "(254) 582-8475",
      distance: 2.1
    }
  ];

  const getUserLocation = useCallback(() => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In production, you would send lat/lng to an API to get nearby clinics
        // For now, we'll just use mock data
        setNearbyClinics(mockNearbyClinics);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please search manually.");
        setGettingLocation(false);
      }
    );
  }, []);

  const selectClinic = (clinic: NearbyClinic) => {
    form.setValue('organizationName', clinic.name);
    form.setValue('address', clinic.address);
    form.setValue('city', clinic.city);
    form.setValue('state', clinic.state);
    form.setValue('zip', clinic.zip);
    if (clinic.website) {
      form.setValue('website', clinic.website);
    }
    setSearchOpen(false);
  };

  const onSubmit = async (data: AdminVerificationFormData) => {
    console.log('🚀 [AdminVerification] Starting submission with data:', data);
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('📡 [AdminVerification] Calling API endpoint: /api/admin-verification/start');
      const response = await apiRequest('POST', '/api/admin-verification/start', data);
      const responseData = await response.json();
      
      console.log('✅ [AdminVerification] Received response:', responseData);
      setVerificationResult(responseData);
      
      // If auto-approved, redirect to login after a delay
      if (responseData.autoApproved) {
        console.log('🎉 [AdminVerification] Auto-approved! Redirecting in 5 seconds...');
        setTimeout(() => {
          window.location.href = '/auth?adminCreated=true';
        }, 5000);
      }
    } catch (err: any) {
      console.error('❌ [AdminVerification] Error submitting verification:', err);
      console.error('❌ [AdminVerification] Error details:', {
        message: err.message,
        response: err.response,
        status: err.status,
        stack: err.stack
      });
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to submit verification request';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show result screen if verification is complete
  if (verificationResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            {verificationResult.autoApproved ? (
              <>
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">Automatically Approved!</CardTitle>
                <CardDescription className="mt-2">
                  Your organization has been verified and approved instantly.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Verification Started</CardTitle>
                <CardDescription className="mt-2">
                  {verificationResult.message}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {verificationResult.autoApproved ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>What happens next?</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Check your email for login credentials</li>
                    <li>You'll be redirected to login in 5 seconds</li>
                    <li>Start adding providers and locations to your health system</li>
                    <li>Generate subscription keys for your staff</li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {verificationResult.riskScore && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Risk Assessment Score</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            verificationResult.riskScore < 30 ? 'bg-green-500' :
                            verificationResult.riskScore < 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${100 - verificationResult.riskScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{verificationResult.riskScore}/100</span>
                    </div>
                  </div>
                )}
                
                {verificationResult.recommendations && verificationResult.recommendations.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {verificationResult.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                <Alert className="border-amber-200 bg-amber-50">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Manual Review Required</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Your application requires manual review by our team due to the risk assessment score.</p>
                    <p className="text-sm">We'll notify you via email once your verification is approved (typically within 24-48 hours).</p>
                  </AlertDescription>
                </Alert>
              </>
            )}
            
            <div className="pt-4">
              <Link href="/auth">
                <Button className="w-full" variant={verificationResult.autoApproved ? 'default' : 'outline'}>
                  {verificationResult.autoApproved ? 'Go to Login Now' : 'Return to Login'}
                </Button>
              </Link>
              
              {!verificationResult.autoApproved && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  You'll receive an email with a verification code after manual approval.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Enterprise Admin Account</h1>
          <p className="mt-2 text-lg text-gray-600">
            Get instant approval for small practices with our AI-powered verification
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself as the administrator</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="email" {...field} className="pr-10" />
                          {isValidatingEmail && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                          )}
                          {!isValidatingEmail && emailValidation.available === true && (
                            <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingEmail && emailValidation.available === false && (
                            <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </FormControl>
                      {emailValidation.message && (
                        <p className={`text-sm mt-1 ${emailValidation.available ? 'text-green-600' : 'text-red-600'}`}>
                          {emailValidation.message}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="tel" {...field} className="pr-10" />
                          {isValidatingPhone && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                          )}
                          {!isValidatingPhone && phoneValidation.available === true && (
                            <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingPhone && phoneValidation.available === false && (
                            <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </FormControl>
                      {phoneValidation.message && (
                        <p className={`text-sm mt-1 ${phoneValidation.available ? 'text-green-600' : 'text-red-600'}`}>
                          {phoneValidation.message}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Your Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Practice Administrator, Medical Director" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Details about your healthcare organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location-based search */}
                <div className="mb-4">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setSearchOpen(true)}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Search for clinics near you
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <input
                            placeholder="Search clinics..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={getUserLocation}
                            disabled={gettingLocation}
                            className="ml-2"
                            title="Use my location"
                          >
                            {gettingLocation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Navigation className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          {nearbyClinics.length === 0 ? (
                            <CommandEmpty>
                              Click the location button to find nearby clinics
                            </CommandEmpty>
                          ) : (
                            <CommandGroup heading="Nearby Clinics">
                              {nearbyClinics.map((clinic, index) => (
                                <CommandItem
                                  key={index}
                                  onSelect={() => selectClinic(clinic)}
                                  className="flex items-start gap-2 py-3 cursor-pointer"
                                >
                                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                  <div className="flex-1 space-y-1">
                                    <div className="font-medium">{clinic.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {clinic.address}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {clinic.city}, {clinic.state} {clinic.zip}
                                    </div>
                                    {clinic.distance && (
                                      <div className="text-xs text-muted-foreground">
                                        {clinic.distance} miles away
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a real clinic to auto-fill the form (use YOUR email/phone for verification)
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} placeholder="e.g., Smith Family Medicine" className="pr-10" />
                          {isValidatingOrgName && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                          )}
                          {!isValidatingOrgName && orgNameValidation.available === true && (
                            <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingOrgName && orgNameValidation.available === false && (
                            <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </FormControl>
                      {orgNameValidation.message && (
                        <p className={`text-sm mt-1 ${orgNameValidation.available ? 'text-green-600' : 'text-red-600'}`}>
                          {orgNameValidation.message}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="organizationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="private_practice">Private Practice (1-5 providers)</SelectItem>
                          <SelectItem value="clinic">Medical Clinic (5-50 providers)</SelectItem>
                          <SelectItem value="hospital">Hospital (50+ providers)</SelectItem>
                          <SelectItem value="health_system">Health System (Multiple facilities)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Private practices typically get instant approval
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID (EIN)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} placeholder="XX-XXXXXXX" className="pr-10" />
                            {isValidatingTaxId && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                            )}
                            {!isValidatingTaxId && taxIdValidation.available === true && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                            )}
                            {!isValidatingTaxId && taxIdValidation.available === false && (
                              <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Format: XX-XXXXXXX</FormDescription>
                        {taxIdValidation.message && (
                          <p className={`text-sm mt-1 ${taxIdValidation.available ? 'text-green-600' : 'text-red-600'}`}>
                            {taxIdValidation.message}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="npiNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization NPI (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1234567890" />
                        </FormControl>
                        <FormDescription>10-digit number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Organization Address */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Organization Address</h4>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main Street, Suite 100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Austin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="TX" maxLength={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="78701" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://www.example.com" />
                        </FormControl>
                        <FormDescription>
                          Having a website improves verification score
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business License # (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="medicalLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical License # (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Details</CardTitle>
                <CardDescription>Help us understand your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentEmr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current EMR System (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Epic, Athena, Paper charts" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expectedProviderCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Providers</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expectedMonthlyPatientVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Patient Volume</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal Agreements</CardTitle>
                <CardDescription>Required for HIPAA compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="baaAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I accept the Business Associate Agreement (BAA)
                        </FormLabel>
                        <FormDescription>
                          Required for handling protected health information
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I accept the Terms of Service
                        </FormLabel>
                        <FormDescription>
                          Including data processing and privacy policies
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Link href="/auth">
                <Button type="button" variant="outline">Back to Login</Button>
              </Link>
              
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Verification
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}