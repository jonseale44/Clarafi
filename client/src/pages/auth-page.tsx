import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2, Building2, Shield, Activity, Users, Check, X, AlertCircle, Info, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LocationSelector } from "@/components/location-selector";
import SearchableHealthSystemSelector from "@/components/searchable-health-system-selector";
import { DynamicClinicSearch } from "@/components/dynamic-clinic-search";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { PasskeyLoginForm } from "@/components/passkey-login-form";
import { SimplifiedBAA } from "@/components/simplified-baa";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const phoneRegex = /^\d{3}-?\d{3}-?\d{4}$/;
const zipRegex = /^\d{5}(-\d{4})?$/;

const registerSchema = insertUserSchema.omit({ healthSystemId: true }).extend({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase(),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .refine((password) => {
      // Simple check - detailed validation happens server-side
      const uniqueChars = new Set(password).size;
      return uniqueChars >= 4;
    }, "Password needs more character variety"),
  confirmPassword: z.string(),
  npi: z.string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), "NPI must be exactly 10 digits"),
  licenseNumber: z.string()
    .optional()
    .refine((val) => !val || val.length >= 5, "License number must be at least 5 characters"),
  registrationType: z.enum(["create_new", "join_existing"]).default("join_existing"),
  practiceName: z.string().optional(),
  practiceAddress: z.string().optional(),
  practiceCity: z.string().optional(),
  practiceState: z.string()
    .optional()
    .refine((val) => !val || val.length === 2, "State must be 2-letter code"),
  practiceZipCode: z.string()
    .optional()
    .refine((val) => !val || zipRegex.test(val), "Invalid ZIP code format"),
  practicePhone: z.string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), "Phone must be format: 123-456-7890 or 1234567890"),
  subscriptionKey: z.string().optional(),
  selectedFacility: z.any().optional(), // Google Places facility data
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms of service"),
  baaAccepted: z.boolean().optional(), // Only required for providers
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // BAA is required for providers in create_new registration (Tier 1)
  if (data.role === 'provider' && data.registrationType === 'create_new' && !data.baaAccepted) {
    return false;
  }
  return true;
}, {
  message: "Providers must accept the HIPAA compliance agreement",
  path: ["baaAccepted"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

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

// Magic Link Form Component
function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'login' })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSent(true);
        toast({
          title: "Check your email",
          description: "We've sent you a login link. It will expire in 15 minutes.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send login link",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send login link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Check your email for a login link. It will expire in 15 minutes.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setIsSent(false);
            setEmail('');
          }}
          className="text-xs"
        >
          Send another link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email Address</Label>
        <Input
          id="magic-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>
      
      <Button 
        type="submit" 
        variant="outline" 
        className="w-full" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Login with Email
          </>
        )}
      </Button>
    </form>
  );
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Check URL params to restore tab state
  const searchParams = new URLSearchParams(window.location.search);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'register' ? 'register' : 'login');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [registrationType, setRegistrationType] = useState<'create_new' | 'join_existing'>('create_new'); // Default to individual practice creation
  const [selectedHealthSystemId, setSelectedHealthSystemId] = useState<string>('');
  const [availableHealthSystems, setAvailableHealthSystems] = useState<Array<{id: number, name: string}>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [baaAccepted, setBaaAccepted] = useState(false);
  const [showBaaDialog, setShowBaaDialog] = useState(false);
  
  // Validation states
  const [usernameValidation, setUsernameValidation] = useState<{available?: boolean; message?: string}>({});
  const [emailValidation, setEmailValidation] = useState<{available?: boolean; message?: string}>({});
  const [npiValidation, setNpiValidation] = useState<{available?: boolean; message?: string}>({});
  const [passwordStrength, setPasswordStrength] = useState<{valid?: boolean; strength?: string; message?: string}>({});
  const { toast } = useToast();

  // UTM and referrer tracking state
  const [acquisitionData, setAcquisitionData] = useState<{
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrerUrl?: string;
    landingPage?: string;
  }>({});

  // Check for email verification success and payment status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const email = urlParams.get('email');
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (verified === 'true' && email) {
      toast({
        title: "Email Verified!",
        description: `Your email ${decodeURIComponent(email)} has been successfully verified. You can now log in.`,
        duration: 5000,
      });
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle Stripe payment success
    if (paymentStatus === 'success' && sessionId) {
      const pendingRegistration = sessionStorage.getItem('pendingRegistration');
      if (pendingRegistration) {
        const { email } = JSON.parse(pendingRegistration);
        
        // Trigger verification email sending
        fetch('/api/send-verification-after-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, sessionId })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            toast({
              title: "Payment Successful!",
              description: "Thank you for subscribing! Please check your email to verify your account.",
              duration: 7000,
            });
          }
        }).catch(err => {
          console.error('Failed to send verification email:', err);
        });
        
        // Clear the pending registration
        sessionStorage.removeItem('pendingRegistration');
      }
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle payment cancellation
    if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your registration was saved. You can complete payment anytime to activate your account.",
        variant: "default",
        duration: 5000,
      });
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  // Capture UTM parameters and referrer on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const acquisitionData = {
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined,
      utmTerm: urlParams.get('utm_term') || undefined,
      utmContent: urlParams.get('utm_content') || undefined,
      referrerUrl: document.referrer || undefined,
      landingPage: window.location.href,
    };
    
    // Only set if we have at least one tracking parameter
    if (acquisitionData.utmSource || acquisitionData.utmMedium || acquisitionData.referrerUrl) {
      setAcquisitionData(acquisitionData);
      console.log('📊 Captured acquisition data:', acquisitionData);
    }
  }, []);

  // Fetch available health systems for registration
  const { data: healthSystemsData } = useQuery({
    queryKey: ["/api/health-systems/public"],
    enabled: activeTab === "register",
  });

  // Update available health systems when data loads
  useEffect(() => {
    if (healthSystemsData && availableHealthSystems.length === 0) {
      setAvailableHealthSystems(healthSystemsData);
    }
  }, [healthSystemsData]);

  // Check if user has existing session location
  const { data: sessionLocation, refetch: refetchSessionLocation } = useQuery({
    queryKey: ["/api/user/session-location"],
    enabled: !!user && !showLocationSelector,
  });

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      role: "provider",
      npi: "",
      credentials: "",
      specialties: [],
      licenseNumber: "",
      registrationType: "create_new", // Default to individual practice creation
      practiceName: "",
      practiceAddress: "",
      practiceCity: "",
      practiceState: "",
      practiceZipCode: "",
      practicePhone: "",
      subscriptionKey: "",
      termsAccepted: false,
    },
  });

  // Watch form fields for real-time validation
  const watchedUsername = registerForm.watch("username");
  const watchedEmail = registerForm.watch("email");
  const watchedPassword = registerForm.watch("password");
  const watchedConfirmPassword = registerForm.watch("confirmPassword");
  const watchedNpi = registerForm.watch("npi");

  // Debounced values for API calls
  const { debouncedValue: debouncedUsername, isValidating: isValidatingUsername } = useDebouncedValidation(watchedUsername);
  const { debouncedValue: debouncedEmail, isValidating: isValidatingEmail } = useDebouncedValidation(watchedEmail);
  const { debouncedValue: debouncedNpi, isValidating: isValidatingNpi } = useDebouncedValidation(watchedNpi || "");

  // Real-time username validation
  useEffect(() => {
    if (debouncedUsername && debouncedUsername.length >= 3) {
      apiRequest("POST", "/api/check-username", { username: debouncedUsername })
        .then((response) => response.json())
        .then((data) => {
          setUsernameValidation(data);
        }).catch(() => {
          setUsernameValidation({ available: false, message: "Error checking username" });
        });
    } else {
      setUsernameValidation({});
    }
  }, [debouncedUsername]);

  // Real-time email validation
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes("@")) {
      apiRequest("POST", "/api/check-email", { email: debouncedEmail })
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

  // Real-time NPI validation
  useEffect(() => {
    if (debouncedNpi) {
      apiRequest("POST", "/api/check-npi", { npi: debouncedNpi })
        .then((response) => response.json())
        .then((data) => {
          setNpiValidation(data);
        }).catch(() => {
          setNpiValidation({ available: false, message: "Error checking NPI" });
        });
    } else {
      setNpiValidation({});
    }
  }, [debouncedNpi]);

  // Real-time password strength check
  useEffect(() => {
    if (watchedPassword) {
      apiRequest("POST", "/api/validate-password", { password: watchedPassword })
        .then((response) => response.json())
        .then((data) => {
          setPasswordStrength(data);
        }).catch(() => {
          setPasswordStrength({ valid: false, message: "Error checking password" });
        });
    } else {
      setPasswordStrength({});
    }
  }, [watchedPassword]);

  // Handle login success and location selection flow
  const onLogin = (data: LoginData) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    }, {
      onSuccess: async (userData) => {
        // Admin users don't need to select location - they have access to all locations in their health system
        if (userData.role === 'admin') {
          setLocationSelected(true);
          setShowLocationSelector(false);
        } else {
          // Wait a moment for the remembered location to be restored
          setTimeout(async () => {
            // Refetch session location to check if it was restored
            const { data: restoredLocation } = await refetchSessionLocation();
            
            if (restoredLocation) {
              // User has a remembered location that was restored
              setLocationSelected(true);
              setShowLocationSelector(false);
            } else {
              // Check if user has a primary location assigned during registration
              const response = await fetch('/api/user/locations');
              const userLocations = await response.json();
              
              // Look for a primary location
              const primaryLocation = userLocations.find((loc: any) => loc.isPrimary);
              
              if (primaryLocation) {
                // User has a primary location from registration - auto-select it
                console.log('🎯 Auto-selecting primary location:', primaryLocation.locationName);
                await apiRequest("POST", "/api/user/session-location", {
                  locationId: primaryLocation.locationId,
                  rememberSelection: true
                });
                setLocationSelected(true);
                setShowLocationSelector(false);
              } else if (userLocations.length === 1) {
                // User has only one location available - auto-select it
                console.log('🎯 Auto-selecting single location:', userLocations[0].locationName);
                await apiRequest("POST", "/api/user/session-location", {
                  locationId: userLocations[0].locationId,
                  rememberSelection: true
                });
                setLocationSelected(true);
                setShowLocationSelector(false);
              } else {
                // Multiple locations available and no primary - show selector
                setShowLocationSelector(true);
              }
            }
          }, 100);
        }
      }
    });
  };

  const handleLocationSelected = (location: any) => {
    setLocationSelected(true);
    setShowLocationSelector(false);
  };

  // Show location selector after login but before main app (only for non-admin users)
  if (user && showLocationSelector && user.role !== 'admin') {
    return <LocationSelector onLocationSelected={handleLocationSelected} />;
  }

  // Redirect to main app if user is logged in and has selected location or is admin
  if (user && (locationSelected || sessionLocation || user.role === 'admin')) {
    return <Redirect to="/" />;
  }

  const onRegister = (data: RegisterData) => {
    console.log("onRegister called with data:", data);
    const { confirmPassword, ...registerData } = data;
    
    // Validate health system selection for join_existing
    if (registrationType === 'join_existing' && !selectedHealthSystemId) {
      toast({
        title: "Health System Required",
        description: "Please select a health system or clinic to join",
        variant: "destructive",
      });
      return;
    }
    
    // Force registration type to 'create_new' for individual practice
    const finalRegistrationType = registrationType === 'create_new' ? 'create_new' : 'join_existing';
    
    // Parse the selected value - it could be a health system ID, "location-{id}", or "new-{placeId}"
    let existingHealthSystemId: number | undefined;
    let selectedLocationId: number | undefined;
    let googlePlaceData: any = undefined;
    
    if (finalRegistrationType === 'join_existing' && selectedHealthSystemId) {
      if (selectedHealthSystemId.startsWith('new-')) {
        // User selected a new facility from Google Places
        googlePlaceData = data.selectedFacility;
        if (!googlePlaceData) {
          toast({
            title: "Error",
            description: "Selected facility data is missing. Please select a clinic again.",
            variant: "destructive",
          });
          return;
        }
      } else if (selectedHealthSystemId.startsWith('location-')) {
        // User selected a specific location
        selectedLocationId = parseInt(selectedHealthSystemId.replace('location-', ''));
        // We'll need to get the health system ID from the location on the backend
      } else {
        // User selected a health system
        existingHealthSystemId = parseInt(selectedHealthSystemId);
      }
    }
    
    // Pass all the data including registration type and practice info
    console.log("Calling registerMutation.mutate with:", {
      ...registerData,
      registrationType: finalRegistrationType,
      existingHealthSystemId,
      selectedLocationId,
      practiceName: data.practiceName,
      practiceAddress: data.practiceAddress,
      practiceCity: data.practiceCity,
      practiceState: data.practiceState,
      practiceZipCode: data.practiceZipCode,
      practicePhone: data.practicePhone,
    });
    
    registerMutation.mutate({
      ...registerData,
      registrationType: finalRegistrationType,
      existingHealthSystemId,
      selectedLocationId,
      googlePlaceData,
      practiceName: data.practiceName,
      practiceAddress: data.practiceAddress,
      practiceCity: data.practiceCity,
      practiceState: data.practiceState,
      practiceZipCode: data.practiceZipCode,
      practicePhone: data.practicePhone,
      subscriptionKey: data.subscriptionKey,
      // Include acquisition tracking data
      utmSource: acquisitionData.utmSource,
      utmMedium: acquisitionData.utmMedium,
      utmCampaign: acquisitionData.utmCampaign,
      utmTerm: acquisitionData.utmTerm,
      utmContent: acquisitionData.utmContent,
      referrerUrl: acquisitionData.referrerUrl,
      landingPage: acquisitionData.landingPage,
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
      {/* Left side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center p-8" data-median="auth-forms-section"></div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-navy-blue rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h1 className="text-5xl font-bold">
                  <span className="text-navy-blue">CLAR</span><span className="text-gold ai-letters-animate" data-letter="A">A</span><span className="text-navy-blue">F</span><span className="text-gold ai-letters-animate" data-letter="I">I</span>
                </h1>
                <p className="text-sm text-gray-500">EMR System</p>
              </div>
            </div>
            <p className="text-gray-600">
              Secure access to electronic medical records
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...loginForm.register("username")}
                        placeholder="Enter your username"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-600">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        {...loginForm.register("password")}
                        placeholder="Enter your password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                  
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  
                  <MagicLinkForm />
                  
                  <PasskeyLoginForm />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    console.log("Form submit attempted");
                    console.log("Form errors:", registerForm.formState.errors);
                    console.log("Form values:", registerForm.getValues());
                    registerForm.handleSubmit(onRegister)(e);
                  }} className="space-y-4">
                    {/* LEGACY FEATURE: Health System/Clinic Selection
                        Previously supported joining existing clinics/health systems.
                        Now registration is limited to individual practice creation only.
                        Keeping code commented for future reference if multi-tier signup is re-enabled.
                    */}
                    {/* 
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Where do you primarily practice?</Label>
                      <p className="text-sm text-muted-foreground">
                        Search for your clinic or health system below. Most providers should select their existing workplace.
                      </p>
                      
                      <DynamicClinicSearch
                        onSelectFacility={(facility, healthSystemId) => {
                          // User selected an existing clinic
                          setRegistrationType('join_existing');
                          registerForm.setValue('registrationType', 'join_existing');
                          
                          // If healthSystemId is provided, the facility already exists in the system
                          if (healthSystemId) {
                            setSelectedHealthSystemId(healthSystemId.toString());
                          } else {
                            // New facility - will be created during registration
                            setSelectedHealthSystemId(`new-${facility.place_id}`);
                            // Store facility data for later use
                            registerForm.setValue("selectedFacility", facility as any);
                          }
                        }}
                        showCreateNew={false}
                      />
                      
                      <div className="relative mt-6">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => {
                          setRegistrationType('create_new');
                          registerForm.setValue('registrationType', 'create_new');
                          setSelectedHealthSystemId('');
                        }}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        I want to create my own individual practice
                      </Button>
                    </div>
                    
                    {selectedHealthSystemId && (
                      <div className="space-y-2">
                        <Label htmlFor="subscriptionKey" className="flex items-center gap-2">
                          Subscription Key
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Enter the subscription key provided by your clinic administrator</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="subscriptionKey"
                          {...registerForm.register("subscriptionKey")}
                          placeholder="XXX-YYYY-XXXX-XXXX"
                          className="font-mono"
                          style={{ textTransform: 'uppercase' }}
                        />
                        <p className="text-xs text-muted-foreground">
                          For enterprise health systems, enter the key provided by your administrator.
                        </p>
                      </div>
                    )}
                    */}
                    
                    {/* Individual Practice Setup Notice */}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Individual Practice Setup</AlertTitle>
                      <AlertDescription>
                        You'll be creating a new practice account. This is designed for solo practitioners and small clinics.
                        You'll need to provide payment information after registration.
                      </AlertDescription>
                    </Alert>



                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...registerForm.register("firstName")}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...registerForm.register("lastName")}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center gap-2">
                        Username
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>3-20 characters, letters, numbers, and underscores only</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="relative">
                        <Input
                          id="username"
                          {...registerForm.register("username")}
                          placeholder="Choose a username"
                          className={cn(
                            "pr-10",
                            usernameValidation.available === true && "border-green-500",
                            usernameValidation.available === false && "border-red-500"
                          )}
                        />
                        <div className="absolute right-2 top-2.5 flex items-center">
                          {isValidatingUsername && (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          )}
                          {!isValidatingUsername && usernameValidation.available === true && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingUsername && usernameValidation.available === false && (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {usernameValidation.message && (
                        <p className={cn(
                          "text-sm",
                          usernameValidation.available ? "text-green-600" : "text-red-600"
                        )}>
                          {usernameValidation.message}
                        </p>
                      )}
                      {registerForm.formState.errors.username && !usernameValidation.message && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        Email
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Professional email address for your account</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          {...registerForm.register("email")}
                          placeholder="your.email@hospital.com"
                          className={cn(
                            "pr-10",
                            emailValidation.available === true && "border-green-500",
                            emailValidation.available === false && "border-red-500"
                          )}
                        />
                        <div className="absolute right-2 top-2.5 flex items-center">
                          {isValidatingEmail && (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          )}
                          {!isValidatingEmail && emailValidation.available === true && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingEmail && emailValidation.available === false && (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {emailValidation.message && (
                        <p className={cn(
                          "text-sm",
                          emailValidation.available ? "text-green-600" : "text-red-600"
                        )}>
                          {emailValidation.message}
                        </p>
                      )}
                      {registerForm.formState.errors.email && !emailValidation.message && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        defaultValue={registerForm.getValues("role")}
                        onValueChange={(value) => registerForm.setValue("role", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="ma">Medical Assistant (MA)</SelectItem>
                          {/* LEGACY: Admin role removed - was only for enterprise tier */}
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="front_desk">Front Desk</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="lab_tech">Lab Tech</SelectItem>
                          <SelectItem value="referral_coordinator">Referral Coordinator</SelectItem>
                          <SelectItem value="practice_manager">Practice Manager</SelectItem>
                          <SelectItem value="read_only">Read Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>



                    {/* Practice Information - Always shown since individual practice is the only option */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-medium">Practice Information</h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="practiceName">Practice Name</Label>
                          <Input
                            id="practiceName"
                            {...registerForm.register("practiceName")}
                            placeholder="Your Practice Name"
                          />
                          {registerForm.formState.errors.practiceName && (
                            <p className="text-sm text-red-600">
                              {registerForm.formState.errors.practiceName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="practiceAddress">Practice Address</Label>
                          <Input
                            id="practiceAddress"
                            {...registerForm.register("practiceAddress")}
                            placeholder="123 Main Street"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="practiceCity">City</Label>
                            <Input
                              id="practiceCity"
                              {...registerForm.register("practiceCity")}
                              placeholder="City"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="practiceState">State</Label>
                            <Input
                              id="practiceState"
                              {...registerForm.register("practiceState")}
                              placeholder="TX"
                              maxLength={2}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="practiceZipCode">Zip Code</Label>
                            <Input
                              id="practiceZipCode"
                              {...registerForm.register("practiceZipCode")}
                              placeholder="00000"
                              maxLength={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="practicePhone">Phone</Label>
                            <Input
                              id="practicePhone"
                              {...registerForm.register("practicePhone")}
                              placeholder="555-555-5555"
                            />
                            {registerForm.formState.errors.practicePhone && (
                              <p className="text-sm text-red-600">
                                {registerForm.formState.errors.practicePhone.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        Password
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Must contain at least 8 characters including uppercase, lowercase, number, and special character</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          {...registerForm.register("password")}
                          placeholder="Create a strong password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {watchedPassword && passwordStrength.strength && (
                        <div className="space-y-1">
                          <Progress 
                            value={
                              passwordStrength.strength === "weak" ? 33 :
                              passwordStrength.strength === "fair" ? 66 :
                              passwordStrength.strength === "strong" ? 100 : 0
                            }
                            className={cn(
                              "h-2",
                              passwordStrength.strength === "weak" && "[&>div]:bg-red-500",
                              passwordStrength.strength === "fair" && "[&>div]:bg-yellow-500",
                              passwordStrength.strength === "strong" && "[&>div]:bg-green-500"
                            )}
                          />
                          <p className={cn(
                            "text-sm",
                            passwordStrength.strength === "weak" && "text-red-600",
                            passwordStrength.strength === "fair" && "text-yellow-600",
                            passwordStrength.strength === "strong" && "text-green-600"
                          )}>
                            Password strength: {passwordStrength.strength}
                          </p>
                        </div>
                      )}
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          {...registerForm.register("confirmPassword")}
                          placeholder="Confirm your password"
                          className={cn(
                            "pr-16",
                            watchedConfirmPassword && watchedPassword && watchedConfirmPassword === watchedPassword && "border-green-500",
                            watchedConfirmPassword && watchedPassword && watchedConfirmPassword !== watchedPassword && "border-red-500"
                          )}
                        />
                        <div className="absolute right-2 top-2.5 flex items-center gap-2">
                          {watchedConfirmPassword && watchedPassword && (
                            <div className="flex items-center">
                              {watchedConfirmPassword === watchedPassword ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {watchedConfirmPassword && watchedPassword && watchedConfirmPassword !== watchedPassword && (
                        <p className="text-sm text-red-600">
                          Passwords do not match
                        </p>
                      )}
                      {watchedConfirmPassword && watchedPassword && watchedConfirmPassword === watchedPassword && (
                        <p className="text-sm text-green-600">
                          Passwords match
                        </p>
                      )}
                      {registerForm.formState.errors.confirmPassword && !watchedConfirmPassword && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="credentials">Credentials (Optional)</Label>
                      <Input
                        id="credentials"
                        {...registerForm.register("credentials")}
                        placeholder="MD, RN, NP, etc."
                      />
                    </div>

                    {registerForm.watch("role") === "provider" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="npi" className="flex items-center gap-2">
                            NPI Number
                            <span className="text-sm font-normal text-gray-500">(Optional but recommended)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>10-digit National Provider Identifier for billing. While optional for registration, you'll need it for insurance claims and e-prescribing.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="relative">
                            <Input
                              id="npi"
                              {...registerForm.register("npi")}
                              placeholder="1234567890"
                              maxLength={10}
                              className={cn(
                                "pr-10",
                                npiValidation.available === true && "border-green-500",
                                npiValidation.available === false && "border-red-500"
                              )}
                            />
                            <div className="absolute right-2 top-2.5 flex items-center">
                              {isValidatingNpi && (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              )}
                              {!isValidatingNpi && npiValidation.available === true && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {!isValidatingNpi && npiValidation.available === false && (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                          {npiValidation.message && (
                            <p className={cn(
                              "text-sm",
                              npiValidation.available ? "text-green-600" : "text-red-600"
                            )}>
                              {npiValidation.message}
                            </p>
                          )}
                          {registerForm.formState.errors.npi && !npiValidation.message && (
                            <p className="text-sm text-red-600">
                              {registerForm.formState.errors.npi.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">
                            License Number
                            <span className="text-gray-400 text-sm ml-2">(Optional)</span>
                          </Label>
                          <Input
                            id="licenseNumber"
                            {...registerForm.register("licenseNumber")}
                            placeholder="State medical license number"
                          />
                          {registerForm.formState.errors.licenseNumber && (
                            <p className="text-sm text-red-600">
                              {registerForm.formState.errors.licenseNumber.message}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex items-start space-x-2 pt-4">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => {
                          setTermsAccepted(checked as boolean);
                          registerForm.setValue("termsAccepted", checked as boolean);
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Accept terms and conditions
                        </label>
                        <p className="text-sm text-muted-foreground">
                          I agree to the <Link href="/terms?returnTo=/auth?tab=register" className="underline hover:text-primary">Terms of Service</Link> and <Link href="/privacy?returnTo=/auth?tab=register" className="underline hover:text-primary">Privacy Policy</Link>
                        </p>
                      </div>
                    </div>
                    {registerForm.formState.errors.termsAccepted && (
                      <p className="text-sm text-red-600 -mt-2">
                        {registerForm.formState.errors.termsAccepted.message}
                      </p>
                    )}
                    
                    {/* BAA Acceptance for Providers */}
                    {registerForm.watch("role") === "provider" && registrationType === "create_new" && (
                      <>
                        <div className="flex items-start space-x-2 pt-2">
                          <Checkbox
                            id="baa"
                            checked={baaAccepted}
                            onCheckedChange={(checked) => {
                              if (checked && !baaAccepted) {
                                // Show dialog when checking
                                setShowBaaDialog(true);
                              } else {
                                setBaaAccepted(checked as boolean);
                                registerForm.setValue("baaAccepted", checked as boolean);
                              }
                            }}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="baa"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                            >
                              <Shield className="h-4 w-4 text-blue-600" />
                              Accept HIPAA Compliance Requirements
                              <span className="text-xs text-muted-foreground font-normal">(Required for providers)</span>
                            </label>
                            <p className="text-sm text-muted-foreground">
                              I understand and accept my HIPAA obligations when using Clarafi for patient care.{' '}
                              <button
                                type="button"
                                className="underline hover:text-primary"
                                onClick={() => setShowBaaDialog(true)}
                              >
                                View requirements
                              </button>
                            </p>
                          </div>
                        </div>
                        {registerForm.formState.errors.baaAccepted && (
                          <p className="text-sm text-red-600 -mt-2">
                            {registerForm.formState.errors.baaAccepted.message}
                          </p>
                        )}
                      </>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={
                        registerMutation.isPending || 
                        !termsAccepted ||
                        (registerForm.watch("role") === "provider" && registrationType === "create_new" && !baaAccepted)
                      }
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    <div className="mt-4 text-center space-y-2">
                      <p className="text-sm text-gray-600">
                        Need an enterprise admin account?{' '}
                        <Link href="/admin-verification" className="text-primary hover:text-primary/80 underline">
                          Create Enterprise Admin
                        </Link>
                      </p>
                      <p className="text-sm text-gray-600">
                        Have a verification code?{' '}
                        <Link href="/admin-verification-complete" className="text-primary hover:text-primary/80 underline">
                          Complete Verification
                        </Link>
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-primary to-navy-blue-700 p-8 text-white flex items-center justify-center overflow-y-auto" data-median="auth-hero-section">
        <div className="max-w-2xl text-center py-4">
          <h2 className="text-4xl font-bold mb-4">
            Built by Doctors, for Doctors
          </h2>
          <p className="text-xl mb-8 text-navy-blue-100">
            The AI ambient scribe + EMR designed to eliminate documentation burden completely. Let the EMR do the heavy lifting while you practice medicine.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Live AI During Encounter */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 cursor-help transition-all hover:bg-white/15">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold to-yellow-400 rounded-lg flex items-center justify-center">
                        <Activity className="h-5 w-5 text-navy-blue-900" />
                      </div>
                      <h3 className="font-semibold text-left">Live AI During Encounter</h3>
                    </div>
                    <ul className="text-sm text-navy-blue-100 text-left space-y-1">
                      <li>• AI suggestions as you talk</li>
                      <li>• Real-time SOAP notes</li>
                      <li>• Re-record anytime</li>
                      <li>• Unlimited custom templates</li>
                    </ul>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 bg-white/95 backdrop-blur text-navy-blue-900">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-navy-blue-900">Real-Time AI Assistance</h4>
                    <p className="text-sm">As you speak with patients, our AI actively listens and generates:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Complete SOAP notes that appear instantly</li>
                      <li>• Intelligent diagnosis suggestions based on symptoms</li>
                      <li>• Lab and medication recommendations</li>
                      <li>• ICD-10 codes matched to your assessment</li>
                    </ul>
                    <p className="text-sm mt-2">Simply talk naturally - the AI handles all documentation in real-time. Re-record sections anytime without losing context.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Automatic Everything */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 cursor-help transition-all hover:bg-white/15">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold to-yellow-400 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-navy-blue-900" />
                      </div>
                      <h3 className="font-semibold text-left">Automatic Everything</h3>
                    </div>
                    <ul className="text-sm text-navy-blue-100 text-left space-y-1">
                      <li>• Auto-updates entire chart</li>
                      <li>• Instant lab orders from voice</li>
                      <li>• CPT codes auto-generated</li>
                      <li>• Medical problems updated</li>
                    </ul>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 bg-white/95 backdrop-blur text-navy-blue-900">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-navy-blue-900">Complete Chart Automation</h4>
                    <p className="text-sm">Every word you speak automatically updates the entire patient chart:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Medical problems list stays current with new diagnoses</li>
                      <li>• Social history updates from conversation context</li>
                      <li>• Lab orders created instantly when you mention tests</li>
                      <li>• CPT codes generated based on encounter complexity</li>
                      <li>• Medications reconciled and allergies documented</li>
                    </ul>
                    <p className="text-sm mt-2">No manual data entry - the AI parses your conversation and populates every section automatically.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Complete EMR Built-In */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 cursor-help transition-all hover:bg-white/15">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold to-yellow-400 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-navy-blue-900" />
                      </div>
                      <h3 className="font-semibold text-left">Complete EMR Built-In</h3>
                    </div>
                    <ul className="text-sm text-navy-blue-100 text-left space-y-1">
                      <li>• Full EMR, not just notes</li>
                      <li>• E-prescribing included</li>
                      <li>• Lab ordering & results</li>
                      <li>• Billing & scheduling</li>
                    </ul>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 bg-white/95 backdrop-blur text-navy-blue-900">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-navy-blue-900">Full-Featured EMR System</h4>
                    <p className="text-sm">Unlike standalone AI scribes, we provide a complete medical records system:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• E-prescribing with drug interaction checking</li>
                      <li>• Lab ordering integrated with major laboratories</li>
                      <li>• AI-powered scheduling with duration predictions</li>
                      <li>• Document management with OCR extraction</li>
                      <li>• Patient portal and secure messaging</li>
                      <li>• Comprehensive reporting and analytics</li>
                    </ul>
                    <p className="text-sm mt-2">Everything you need to run your practice - no additional software required.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* One Price, Everything */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 cursor-pointer transition-all hover:bg-white/15">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold to-yellow-400 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-navy-blue-900" />
                      </div>
                      <h3 className="font-semibold text-left">One Price, Everything</h3>
                    </div>
                    <ul className="text-sm text-navy-blue-100 text-left space-y-1">
                      <li>• AI scribe + EMR together</li>
                      <li>• No separate subscriptions</li>
                      <li>• Starting at $149/month</li>
                      <li>• Enterprise per-user pricing</li>
                    </ul>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 bg-white/95 backdrop-blur text-navy-blue-900">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-navy-blue-900">Simple, Transparent Pricing</h4>
                    <p className="text-sm">No hidden fees, no separate subscriptions for AI and EMR:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• <strong>Solo Provider ($149/mo):</strong> Individual practice with full EMR + AI scribe</li>
                      <li>• <strong>Enterprise (per-user pricing):</strong></li>
                      <li className="ml-4">- Providers ($399/mo): Full access</li>
                      <li className="ml-4">- Nurses/MAs ($99/mo): Clinical tools</li>
                      <li className="ml-4">- Front Staff ($49/mo): Admin features</li>
                    </ul>
                    <p className="text-sm mt-2">Compare to: AI scribes alone ($149-299) + EMR systems ($300-800) = Save 50-70% monthly while getting better integration.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Key differentiators */}
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-gold">Created by physicians who understand documentation burden:</p>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <span className="bg-white/20 px-3 py-1 rounded-full">✓ AI thinks ahead while you talk</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">✓ Zero documentation time</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">✓ EMR does the heavy lifting</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              HIPAA Compliant
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              SOC2 Type II
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              HL7 FHIR Ready
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Zero Downtime
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              24/7 Support
            </Badge>
          </div>
          
          <div className="mt-6 text-xs text-navy-blue-200">
            <p className="font-semibold">Created by doctors who practice medicine every day</p>
            <p className="mt-1">We built this because we needed it. Zero documentation time was the goal.</p>
            <p className="mt-1 text-gold">Complete medical command center from $149/month</p>
          </div>
          
          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-navy-blue-200">
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
              <span className="text-white/20">•</span>
              <a href="/blog" className="hover:text-white transition-colors">Blog</a>
              <span className="text-white/20">•</span>
              <a href="/pricing" className="hover:text-white transition-colors">Pricing Details</a>
              <span className="text-white/20">•</span>
              <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
              <span className="text-white/20">•</span>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              <span className="text-white/20">•</span>
              <Link href={`/privacy?returnTo=/auth?tab=${activeTab}`} className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/20">•</span>
              <Link href={`/terms?returnTo=/auth?tab=${activeTab}`} className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <p className="text-xs text-navy-blue-300 text-center mt-3">
              © 2025 Clarafi Medical. HIPAA Compliant • SOC2 Type II Certified
            </p>
          </div>
        </div>
      </div>
      
      {/* Simplified BAA Dialog */}
      <SimplifiedBAA
        open={showBaaDialog}
        onClose={() => setShowBaaDialog(false)}
        onAccept={() => {
          setBaaAccepted(true);
          registerForm.setValue("baaAccepted", true);
          setShowBaaDialog(false);
        }}
      />
    </div>
    </TooltipProvider>
  );
}
