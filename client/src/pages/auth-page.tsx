import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
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
import { Loader2, Hospital, Shield, Activity, Users } from "lucide-react";
import { LocationSelector } from "@/components/location-selector";
import { useQuery } from "@tanstack/react-query";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  registrationType: z.enum(["individual", "join_existing"]).default("join_existing"),
  practiceName: z.string().optional(),
  practiceAddress: z.string().optional(),
  practiceCity: z.string().optional(),
  practiceState: z.string().optional(),
  practiceZipCode: z.string().optional(),
  practicePhone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.registrationType === "individual" && data.role === "provider") {
    return !!(data.practiceName && data.practiceAddress && data.practiceCity && data.practiceState && data.practiceZipCode);
  }
  return true;
}, {
  message: "Practice information is required for individual providers",
  path: ["practiceName"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [registrationType, setRegistrationType] = useState<'individual' | 'join_existing'>('join_existing');
  const [selectedHealthSystemId, setSelectedHealthSystemId] = useState<string>('');
  const [availableHealthSystems, setAvailableHealthSystems] = useState<Array<{id: number, name: string}>>([]);

  // Fetch available health systems for registration
  const { data: healthSystemsData } = useQuery({
    queryKey: ["/api/health-systems/public"],
    enabled: activeTab === "register",
  });

  // Update available health systems when data loads
  if (healthSystemsData && availableHealthSystems.length === 0) {
    setAvailableHealthSystems(healthSystemsData);
  }

  // Check if user has existing session location
  const { data: sessionLocation } = useQuery({
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
      registrationType: "join_existing",
      practiceName: "",
      practiceAddress: "",
      practiceCity: "",
      practiceState: "",
      practiceZipCode: "",
      practicePhone: "",
    },
  });

  // Handle login success and location selection flow
  const onLogin = (data: LoginData) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    }, {
      onSuccess: (userData) => {
        // Admin users don't need to select location - they have access to all locations in their health system
        if (userData.role === 'admin') {
          setLocationSelected(true);
          setShowLocationSelector(false);
        } else {
          // Clinical staff need to select their working location
          setShowLocationSelector(true);
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
    const { confirmPassword, ...registerData } = data;
    
    // Validate health system selection for join_existing
    if (registrationType === 'join_existing' && !selectedHealthSystemId) {
      toast({
        title: "Health System Required",
        description: "Please select a health system to join",
        variant: "destructive",
      });
      return;
    }
    
    // Pass all the data including registration type and practice info
    registerMutation.mutate({
      ...registerData,
      registrationType,
      existingHealthSystemId: registrationType === 'join_existing' ? parseInt(selectedHealthSystemId) : undefined,
      practiceName: data.practiceName,
      practiceAddress: data.practiceAddress,
      practiceCity: data.practiceCity,
      practiceState: data.practiceState,
      practiceZipCode: data.practiceZipCode,
      practicePhone: data.practicePhone,
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-navy-blue rounded-lg flex items-center justify-center">
                <Hospital className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h1 className="text-5xl font-bold">
                  <span className="text-navy-blue">CLAR</span><span className="text-gold ai-letters-animate">A</span><span className="text-navy-blue">F</span><span className="text-gold ai-letters-animate">I</span>
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
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    {/* Registration Type Selection */}
                    <div className="space-y-2">
                      <Label>Registration Type</Label>
                      <RadioGroup 
                        value={registrationType} 
                        onValueChange={setRegistrationType}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual" className="font-normal cursor-pointer">
                            Create my own individual practice (Tier 1)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="join_existing" id="join_existing" />
                          <Label htmlFor="join_existing" className="font-normal cursor-pointer">
                            Join an existing clinic/health system
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Health System Selection for joining existing */}
                    {registrationType === 'join_existing' && (
                      <div className="space-y-2">
                        <Label htmlFor="healthSystem">Select Health System</Label>
                        <Select 
                          value={selectedHealthSystemId} 
                          onValueChange={setSelectedHealthSystemId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a health system to join" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableHealthSystems.map((hs) => (
                              <SelectItem key={hs.id} value={hs.id.toString()}>
                                {hs.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Practice Details for individual providers */}
                    {registrationType === 'individual' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium text-sm">Practice Information</h4>
                        <div className="space-y-2">
                          <Label htmlFor="practiceName">Practice Name (Optional)</Label>
                          <Input
                            id="practiceName"
                            {...registerForm.register("practiceName")}
                            placeholder="e.g., Smith Family Medicine"
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
                      </div>
                    )}

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
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...registerForm.register("username")}
                        placeholder="Choose a username"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...registerForm.register("email")}
                        placeholder="your.email@hospital.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select onValueChange={(value) => registerForm.setValue("role", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="ma">Medical Assistant (MA)</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
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

                    {/* Only show for providers */}
                    {registerForm.watch("role") === "provider" && (
                      <div className="space-y-2">
                        <Label>Practice Type</Label>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              value="join_existing"
                              checked={registerForm.watch("registrationType") === "join_existing"}
                              onChange={(e) => registerForm.setValue("registrationType", "join_existing")}
                              className="text-primary"
                            />
                            <span>Join existing clinic or health system</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              value="individual"
                              checked={registerForm.watch("registrationType") === "individual"}
                              onChange={(e) => registerForm.setValue("registrationType", "individual")}
                              className="text-primary"
                            />
                            <span>Create my own individual practice</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Show practice details for individual providers */}
                    {registerForm.watch("role") === "provider" && registerForm.watch("registrationType") === "individual" && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-medium">Practice Information</h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="practiceName">Practice Name</Label>
                          <Input
                            id="practiceName"
                            {...registerForm.register("practiceName")}
                            placeholder="Your Practice Name"
                          />
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
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...registerForm.register("password")}
                          placeholder="Create password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...registerForm.register("confirmPassword")}
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="credentials">Credentials (Optional)</Label>
                      <Input
                        id="credentials"
                        {...registerForm.register("credentials")}
                        placeholder="MD, RN, NP, etc."
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
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
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-primary to-navy-blue-700 p-8 text-white flex items-center justify-center">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-bold mb-6">
            Next-Generation EMR System
          </h2>
          <p className="text-xl mb-8 text-navy-blue-100">
            Streamline patient care with AI-assisted voice workflows, unified encounter management, and comprehensive clinical documentation.
          </p>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">AI-Assisted Voice Recording</h3>
                <p className="text-sm text-navy-blue-100">
                  Real-time transcription and clinical suggestions
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Unified Encounter Model</h3>
                <p className="text-sm text-navy-blue-100">
                  Same chart data for both nurses and providers
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">External Lab Integration</h3>
                <p className="text-sm text-navy-blue-100">
                  HL7/API integration with LabCorp, Quest and more
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white">
              HIPAA Compliant
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              HL7 FHIR
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Real-time AI
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Multi-role Access
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
