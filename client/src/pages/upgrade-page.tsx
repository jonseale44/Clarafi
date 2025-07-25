import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import { 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  ChevronLeft,
  Lock,
  Clock,
  Shield
} from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function UpgradePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Get current user and trial status
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: trialData } = useQuery({
    queryKey: ["/api/trial-status"],
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/upgrade-trial', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: async (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Upgrade successful!',
          description: 'Your account has been upgraded to the Professional plan.',
        });
        // Refresh trial status and redirect to dashboard
        await queryClient.invalidateQueries({ queryKey: ["/api/trial-status"] });
        setLocation('/dashboard');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade failed',
        description: error.message || 'Failed to upgrade your account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleUpgrade = () => {
    setIsUpgrading(true);
    upgradeMutation.mutate();
  };

  const trialStatus = trialData?.trialStatus;
  const isTrialActive = trialStatus?.status === 'warning' || trialStatus?.status === 'active';
  const daysRemaining = trialStatus?.daysRemaining || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </Link>
            <div className="flex-1" />
            <Link href="/dashboard">
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="font-bold text-2xl">
                  <span className="text-navy-blue">CLAR</span>
                  <span className="text-gold">A</span>
                  <span className="text-navy-blue">F</span>
                  <span className="text-gold">I</span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Upgrade Your Account</h1>
            <p className="text-xl text-gray-600">
              Continue using all CLARAFI features with no interruption
            </p>
          </div>

          {/* Trial Status Alert */}
          {isTrialActive && (
            <div className="mb-8">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg flex items-center gap-3">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="font-semibold">
                    {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left in your free trial
                  </p>
                  <p className="text-sm">
                    Upgrade now to keep all your data and continue using CLARAFI without interruption.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-gray-500" />
                  Free Trial
                </CardTitle>
                <CardDescription>Your current plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold text-gray-500">$0/month</div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">What you have now:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Full EMR access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      AI SOAP notes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Voice transcription
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Patient management
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="line-through">Limited time only</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">Recommended</Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Professional Plan
                </CardTitle>
                <CardDescription>Perfect for individual providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-600">$149</span>
                  <Badge variant="secondary">per month</Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Everything you love, plus:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Unlimited access - no time limits
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      All trial features included
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Data backup and security
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Priority customer support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Regular feature updates
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <strong>No setup fees.</strong> Cancel anytime. 
                    All your data stays with you.
                  </p>
                </div>

                <Button 
                  size="lg" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpgrade}
                  disabled={isUpgrading || upgradeMutation.isPending}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {upgradeMutation.isPending ? 'Processing...' : 'Upgrade Now'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 text-center">
            <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold mb-2">What happens to my data?</h4>
                <p className="text-sm text-gray-600">
                  All your patient data, notes, and settings are preserved. 
                  You'll have immediate access to everything after upgrading.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-gray-600">
                  Yes! You can cancel your subscription anytime from your account settings. 
                  No long-term contracts or cancellation fees.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
                <p className="text-sm text-gray-600">
                  We accept all major credit cards through our secure Stripe payment processor. 
                  Your payment information is never stored on our servers.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Do you offer discounts?</h4>
                <p className="text-sm text-gray-600">
                  We offer annual billing discounts and special rates for group practices. 
                  Contact us for more information about bulk pricing.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Questions? Contact us at{' '}
              <a href="mailto:support@clarafi.com" className="text-blue-600 hover:underline">
                support@clarafi.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}