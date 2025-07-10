import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      // Payment succeeded, redirect to success page
      const pendingReg = sessionStorage.getItem('pendingRegistration');
      if (pendingReg) {
        const { email } = JSON.parse(pendingReg);
        sessionStorage.removeItem('pendingRegistration');
        
        toast({
          title: "Payment successful!",
          description: "Your subscription is active. You can now log in.",
        });
        
        // Redirect to login with email prefilled
        setLocation(`/auth?email=${encodeURIComponent(email)}`);
      } else {
        setLocation('/auth');
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{message}</span>
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Start Free Trial'}
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const [location, setLocation] = useLocation();
  
  // Extract clientSecret from URL query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const clientSecret = params.get('clientSecret');
  
  useEffect(() => {
    if (!clientSecret) {
      toast({
        title: "Invalid payment session",
        description: "Please register again to set up your subscription.",
        variant: "destructive",
      });
      setLocation('/auth');
    }
  }, [clientSecret, setLocation]);

  if (!clientSecret) {
    return null;
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#003366',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '4px',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-navy-blue">CLAR</span><span className="text-gold">AFI</span>
          </h1>
          <p className="text-gray-600">Complete Your Subscription Setup</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Provider Plan</CardTitle>
              <CardDescription>Perfect for solo practitioners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">$99</span>
                <Badge variant="secondary">per month</Badge>
              </div>
              
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">30-Day Free Trial</span>
                </div>
                <p className="text-sm mt-1">No charges today. Cancel anytime.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">What's included:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Full EMR access for one provider
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    AI-powered clinical documentation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Unlimited patient records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Lab & imaging integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    E-prescribing capabilities
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Upgrade anytime:</strong> If you join a group practice later, 
                  we'll credit your remaining subscription towards the group plan.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
              <CardDescription>
                Enter your payment details to start your free trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance,
                }}
              >
                <CheckoutForm />
              </Elements>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Your payment information is secured by Stripe. 
            We never store credit card details on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}