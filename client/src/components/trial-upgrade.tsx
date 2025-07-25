import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Check,
  AlertCircle,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';

/**
 * ARCHITECTURE NOTE: Enterprise Upgrade Flow
 * 
 * This component handles the upgrade process from trial to paid tiers.
 * It leverages the existing AI-powered verification infrastructure from
 * the admin-verification system, but adapted for existing trial users.
 * 
 * Key differences from new organization signup (/admin-verification):
 * - This upgrades an EXISTING health system rather than creating new
 * - Pulls organization data from the existing health system record
 * - Reuses the same AI verification logic (ClinicAdminVerificationService)
 * - Can result in instant approval for low-risk organizations
 * 
 * Tier 1: Direct upgrade via Stripe (no approval needed)
 * Tier 2: Requires application and AI/manual review
 */

interface TrialStatusResponse {
  trialStatus: {
    status: 'trial' | 'warning' | 'expired' | 'grace';
    daysRemaining: number;
    trialEndDate: string;
    gracePeriodEndDate?: string;
  };
}

export function TrialUpgrade() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Get current user and trial status
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: trialData } = useQuery<TrialStatusResponse>({
    queryKey: ["/api/trial-status"],
  });

  // Tier 1 upgrade mutation (direct trial upgrade)
  const tier1UpgradeMutation = useMutation({
    mutationFn: async () => {
      console.log('[TrialUpgrade] Starting trial to tier 1 upgrade');
      
      const response = await apiRequest('POST', '/api/trial-upgrade-tier1', {});
      const data = await response.json();
      
      return data;
    },
    onSuccess: (data) => {
      console.log('[TrialUpgrade] Tier 1 checkout session created:', data);
      
      if (data.checkoutUrl) {
        console.log('[TrialUpgrade] Redirecting to Stripe checkout');
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Error',
          description: 'No checkout URL received',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('[TrialUpgrade] Tier 1 upgrade error:', error);
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Failed to start upgrade process',
        variant: 'destructive',
      });
      setIsUpgrading(false);
    },
  });

  // Tier 2 - Redirect to admin verification page
  const handleEnterpriseApplication = () => {
    console.log('[TrialUpgrade] Redirecting to enterprise verification page');
    // Navigate to the admin verification page
    // Users will go through the standard enterprise verification flow
    // If approved, we can merge their existing trial data with the new enterprise account
    window.location.href = '/admin-verification';
  };

  const handleTier1Upgrade = () => {
    setIsUpgrading(true);
    tier1UpgradeMutation.mutate();
  };



  const trialStatus = trialData?.trialStatus;
  const daysRemaining = trialStatus?.daysRemaining || 0;

  if (!currentUser || !trialData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial Status Alert */}
      {trialStatus?.status === 'warning' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{daysRemaining} day{daysRemaining === 1 ? '' : 's'} left in your free trial</strong>
            <br />
            Upgrade now to keep all your data and continue using CLARAFI without interruption.
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tier 1 - Individual Provider */}
        <Card className="border-2 border-blue-500 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white">Recommended</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Tier 1 - Professional EMR
            </CardTitle>
            <CardDescription>Perfect for individual providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">$149</span>
              <Badge variant="secondary">per month</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">What you get:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Full EMR features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  AI SOAP notes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Voice transcription
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Unlimited patient records
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Individual provider use
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                <strong>Perfect for solo practice.</strong> All core EMR features 
                with no user limits.
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleTier1Upgrade}
              disabled={isUpgrading || tier1UpgradeMutation.isPending}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {tier1UpgradeMutation.isPending ? 'Processing...' : 'Upgrade to Professional'}
            </Button>
          </CardContent>
        </Card>

        {/* Tier 2 - Enterprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Tier 2 - Enterprise EMR
            </CardTitle>
            <CardDescription>For multi-provider practices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600">$399</span>
              <Badge variant="secondary">per month</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Everything in Professional, plus:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Multi-location support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Subscription key distribution
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Lab integrations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Admin dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Team collaboration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Priority support
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                <strong>Perfect for group practices.</strong> Scale across multiple 
                providers and locations.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                <strong>Requires approval:</strong> Enterprise plans require system administrator 
                review and approval before activation.
              </p>
            </div>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full border-purple-200 hover:bg-purple-50"
              onClick={handleEnterpriseApplication}
              disabled={isUpgrading}
            >
              <Shield className="h-4 w-4 mr-2" />
              Apply for Enterprise
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Mode Alert */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Test Mode Active:</strong> Use Stripe test card{' '}
          <code className="font-mono">4242 4242 4242 4242</code> with any
          future expiry date and any CVC.
        </AlertDescription>
      </Alert>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What happens to my trial data?</h4>
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
            <h4 className="font-semibold mb-2">Which tier should I choose?</h4>
            <p className="text-sm text-gray-600">
              Choose Tier 1 (Professional) if you're a solo provider. Choose Tier 2 (Enterprise) 
              if you need to support multiple providers or locations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}