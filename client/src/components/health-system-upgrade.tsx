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
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
      console.log('[HealthSystemUpgrade] Starting upgrade mutation:', {
        healthSystemId: userData?.healthSystemId,
        endpoint: '/api/stripe/upgrade-to-tier3',
      });
      
      const response = await apiRequest('POST', '/api/stripe/upgrade-to-tier3', {
        healthSystemId: userData?.healthSystemId,
      });
      
      console.log('[HealthSystemUpgrade] API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        },
      });
      
      const data = await response.json();
      console.log('[HealthSystemUpgrade] API success response parsed:', {
        data,
        dataType: typeof data,
        hasCheckoutUrl: !!data.checkoutUrl,
        checkoutUrlPreview: data.checkoutUrl?.substring(0, 50),
      });
      
      return data;
    },
    onSuccess: (data) => {
      console.log('[HealthSystemUpgrade] Upgrade success response:', {
        data,
        hasCheckoutUrl: !!data.checkoutUrl,
        hasSessionUrl: !!data.sessionUrl,
        checkoutUrlLength: data.checkoutUrl?.length,
        sessionUrlLength: data.sessionUrl?.length,
        dataKeys: Object.keys(data),
      });
      
      if (data.checkoutUrl || data.sessionUrl) {
        const redirectUrl = data.checkoutUrl || data.sessionUrl;
        console.log('[HealthSystemUpgrade] Preparing redirect:', {
          redirectUrl,
          urlStart: redirectUrl.substring(0, 50),
          urlLength: redirectUrl.length,
          isValidUrl: redirectUrl.startsWith('https://'),
          currentLocation: window.location.href,
        });
        
        // Add a small delay to ensure logs are captured
        console.log('[HealthSystemUpgrade] Redirecting in 100ms...');
        setTimeout(() => {
          console.log('[HealthSystemUpgrade] Executing redirect to Stripe checkout');
          console.log('[HealthSystemUpgrade] Window location before redirect:', window.location.href);
          console.log('[HealthSystemUpgrade] Document ready state:', document.readyState);
          console.log('[HealthSystemUpgrade] Browser info:', {
            userAgent: navigator.userAgent,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            language: navigator.language,
          });
          
          try {
            // Test if we can open a new window first
            const testWindow = window.open('', '_blank');
            if (testWindow) {
              console.log('[HealthSystemUpgrade] Popup test successful, closing test window');
              testWindow.close();
            } else {
              console.warn('[HealthSystemUpgrade] Popup may be blocked by browser');
            }
            
            // Store session info for debugging
            if (data.sessionId) {
              sessionStorage.setItem('stripe_session_debug', JSON.stringify({
                sessionId: data.sessionId,
                checkoutUrl: redirectUrl,
                timestamp: new Date().toISOString(),
                healthSystemId: userData?.healthSystemId,
              }));
            }
            
            console.log('[HealthSystemUpgrade] Attempting redirect via window.location.href');
            window.location.href = redirectUrl;
            console.log('[HealthSystemUpgrade] Redirect command executed');
            
            // Also try alternative redirect methods after a delay
            setTimeout(() => {
              console.log('[HealthSystemUpgrade] Checking if redirect occurred...');
              if (window.location.href === redirectUrl) {
                console.log('[HealthSystemUpgrade] Redirect successful');
              } else {
                console.warn('[HealthSystemUpgrade] Redirect may have failed, trying alternative method');
                window.location.assign(redirectUrl);
              }
            }, 500);
          } catch (error) {
            console.error('[HealthSystemUpgrade] Redirect error:', error);
            toast({
              title: 'Redirect Error',
              description: 'Failed to redirect to payment page. Please try again.',
              variant: 'destructive',
            });
          }
        }, 100);
      } else {
        console.error('[HealthSystemUpgrade] No checkout URL in response:', {
          data,
          dataType: typeof data,
          dataStringified: JSON.stringify(data),
        });
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