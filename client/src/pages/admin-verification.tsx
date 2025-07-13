import { useState } from 'react';
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
import { CheckCircle2, Loader2, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

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
  businessLicense: z.string().optional(),
  medicalLicense: z.string().optional(),
  baaAccepted: z.boolean().refine(val => val === true, 'You must accept the BAA'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the Terms of Service'),
  currentEmr: z.string().optional(),
  expectedProviderCount: z.coerce.number().min(1, 'Must have at least 1 provider'),
  expectedMonthlyPatientVolume: z.coerce.number().min(0, 'Cannot be negative')
});

type AdminVerificationFormData = z.infer<typeof adminVerificationSchema>;

export default function AdminVerification() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
              </>
            )}
            
            <div className="pt-4">
              <Link href="/auth">
                <Button className="w-full">
                  {verificationResult.autoApproved ? 'Go to Login Now' : 'Return to Login'}
                </Button>
              </Link>
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
                        <Input type="email" {...field} />
                      </FormControl>
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
                        <Input type="tel" {...field} />
                      </FormControl>
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
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Smith Family Medicine" />
                      </FormControl>
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
                          <Input {...field} placeholder="XX-XXXXXXX" />
                        </FormControl>
                        <FormDescription>Format: XX-XXXXXXX</FormDescription>
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