import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Mail, Shield } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

const verificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  verificationCode: z.string().min(6, 'Verification code must be at least 6 characters'),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

export default function AdminVerificationComplete() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: '',
      verificationCode: '',
    }
  });

  const onSubmit = async (data: VerificationFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // First, get the verification status to get the verificationId
      const statusResponse = await apiRequest('GET', `/api/admin-verification/status/${data.email}`);
      const statusData = await statusResponse.json();
      
      if (!statusData.success || !statusData.verification) {
        throw new Error('No pending verification found for this email');
      }
      
      const verificationId = statusData.verification.id;
      
      // Now complete the verification
      const completeResponse = await apiRequest('POST', '/api/admin-verification/complete', {
        verificationId,
        code: data.verificationCode,
      });
      
      const completeData = await completeResponse.json();
      setCompletionResult(completeData);
      
      // If successful, redirect to login after a delay
      if (completeData.success) {
        setTimeout(() => {
          window.location.href = '/auth?adminCreated=true';
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error completing verification:', err);
      setError(err.message || 'Failed to complete verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completionResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete!</h2>
                <p className="text-gray-600 mb-4">
                  Your admin account has been successfully created.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complete Admin Verification</h1>
          <p className="mt-2 text-gray-600">
            Enter the verification code sent to your email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verification Code</CardTitle>
            <CardDescription>
              Please check your email for the 6-digit verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder="Enter your email address"
                        />
                      </FormControl>
                      <FormDescription>
                        The email you used for admin verification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="verificationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                        />
                      </FormControl>
                      <FormDescription>
                        Check your email for the verification code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Complete Verification'
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  <p>
                    Didn't receive the code?{' '}
                    <Link href="/admin-verification" className="text-indigo-600 hover:underline">
                      Start over
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}