import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
  Rocket,
  Check,
  AlertCircle,
  Building2,
  Users,
  Key,
  Shield,
} from 'lucide-react';

const tierFeatures = {
  1: {
    name: 'Professional',
    price: '$99/month',
    features: [
      'Basic EMR features',
      'Voice transcription',
      'AI SOAP notes',
      'Limited patient records',
    ],
  },
  2: {
    name: 'Practice',
    price: '$299/user/month',
    features: [
      'Full EMR features',
      'Multi-location support',
      'Advanced AI features',
      'Lab integrations',
      'Unlimited patients',
    ],
  },
  3: {
    name: 'Enterprise',
    price: 'Custom pricing',
    features: [
      'Everything in Practice tier',
      'Subscription key distribution',
      'Advanced analytics',
      'Custom integrations',
      'Priority support',
      'HIPAA compliance reports',
    ],
  },
};

export function HealthSystemUpgrade() {
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Get current user and health system data
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
  });

  const { data: healthSystemData } = useQuery({
    queryKey: [`/api/health-systems/${userData?.healthSystemId}`],
    enabled: !!userData?.healthSystemId,
  });

  const currentTier = healthSystemData?.subscriptionTier || 1;
  const isSystemAdmin = userData?.username === 'admin';
  const canUpgrade = userData?.role === 'admin' && currentTier < 3;

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/stripe/upgrade-to-tier3', {
        healthSystemId: userData?.healthSystemId,
      });
    },
    onSuccess: (data) => {
      console.log('Upgrade success response:', data);
      if (data.checkoutUrl || data.sessionUrl) {
        const redirectUrl = data.checkoutUrl || data.sessionUrl;
        console.log('Redirecting to:', redirectUrl);
        // Redirect to Stripe checkout
        window.location.href = redirectUrl;
      } else {
        console.error('No checkout URL received:', data);
        toast({
          title: 'Error',
          description: 'No checkout URL received from server',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade Failed',
        description: error.error || 'Failed to initiate upgrade',
        variant: 'destructive',
      });
    },
  });

  if (!userData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading user data...</div>
      </div>
    );
  }

  if (!healthSystemData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading health system data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Health System Subscription
          </CardTitle>
          <CardDescription>
            Manage your health system's subscription tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current Tier */}
            <div>
              <h3 className="text-sm font-medium mb-2">Current Tier</h3>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="text-lg px-4 py-2">
                  Tier {currentTier} - {tierFeatures[currentTier as 1 | 2 | 3].name}
                </Badge>
                <span className="text-muted-foreground">
                  {tierFeatures[currentTier as 1 | 2 | 3].price}
                </span>
              </div>
            </div>

            {/* Tier Comparison */}
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(tierFeatures).map(([tier, details]) => {
                const tierNum = parseInt(tier);
                const isCurrent = tierNum === currentTier;
                const isTarget = tierNum === 3;

                return (
                  <Card
                    key={tier}
                    className={`${
                      isCurrent ? 'border-primary' : ''
                    } ${isTarget && !isCurrent ? 'border-gold-500' : ''}`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Tier {tier}</span>
                        {isCurrent && <Badge>Current</Badge>}
                        {isTarget && !isCurrent && (
                          <Badge className="bg-gold-500">Recommended</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        <div className="text-2xl font-bold">{details.name}</div>
                        <div className="text-lg">{details.price}</div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {details.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Upgrade Benefits */}
            {canUpgrade && (
              <Alert>
                <Rocket className="h-4 w-4" />
                <AlertDescription>
                  <strong>Upgrade to Enterprise (Tier 3)</strong>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <Key className="h-3 w-3" />
                      Generate unlimited subscription keys for your staff
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Onboard providers and staff without individual payments
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Advanced compliance and security features
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Test Mode Alert */}
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Test Mode Active:</strong> Use Stripe test card{' '}
                <code className="font-mono">4242 4242 4242 4242</code> with any
                future expiry date and any CVC.
              </AlertDescription>
            </Alert>

            {/* Upgrade Button */}
            {canUpgrade && (
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={() => upgradeMutation.mutate()}
                  disabled={isUpgrading || upgradeMutation.isPending}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {upgradeMutation.isPending
                    ? 'Processing...'
                    : 'Upgrade to Enterprise'}
                </Button>
              </div>
            )}

            {/* Already Tier 3 */}
            {currentTier === 3 && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your health system has Enterprise tier access. You can now
                  generate subscription keys for your staff.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}