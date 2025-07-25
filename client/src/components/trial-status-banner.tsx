import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, CreditCard, Lock } from "lucide-react";
import { Link } from "wouter";

interface TrialStatus {
  status: 'active' | 'warning' | 'expired' | 'grace_period' | 'deactivated';
  daysRemaining: number;
  trialEndDate: string;
  gracePeriodEndDate: string | null;
  restrictions: {
    readOnly: boolean;
    noNewPatients: boolean;
    noDataExport: boolean;
  };
}

export function TrialStatusBanner() {
  const { data: trialData, isLoading } = useQuery<{
    trialStatus: TrialStatus;
    upgradeUrl: string;
  }>({
    queryKey: ["/api/trial-status"],
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 0, // Always fetch fresh trial status
  });

  console.log('🎯 [TrialStatusBanner] Render:', { isLoading, trialData });

  if (isLoading || !trialData) {
    return null;
  }

  const { trialStatus, upgradeUrl } = trialData;
  console.log('🎯 [TrialStatusBanner] Trial Status:', trialStatus);

  // Don't show banner for active paid accounts
  if (trialStatus.status === 'active' && trialStatus.daysRemaining === -1) {
    return null;
  }

  const getBannerConfig = () => {
    switch (trialStatus.status) {
      case 'warning':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          title: `${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'} left in your trial`,
          message: `Your free trial expires soon. Upgrade now to keep your data and continue using all features.`,
          buttonText: 'Upgrade Now - $149/month',
          urgent: true,
        };
      case 'grace_period':
        return {
          variant: 'destructive' as const,
          icon: Lock,
          title: 'Trial expired - Read-only access',
          message: 'Your trial has expired. You have 7 days of read-only access before your account is deactivated.',
          buttonText: 'Upgrade to Restore Access',
          urgent: true,
        };
      case 'deactivated':
        return {
          variant: 'destructive' as const,
          icon: Lock,
          title: 'Account deactivated',
          message: 'Your trial has expired and your account has been deactivated. Upgrade to restore access to your data.',
          buttonText: 'Reactivate Account',
          urgent: true,
        };
      case 'active':
        if (trialStatus.daysRemaining <= 7) {
          return {
            variant: 'default' as const,
            icon: Calendar,
            title: `${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'} left in your trial`,
            message: 'Enjoying Clarafi? Upgrade anytime to continue using all features without interruption.',
            buttonText: 'Upgrade - $149/month',
            urgent: false,
          };
        }
        return null;
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Alert 
      variant={config.variant} 
      className={`border-l-4 ${config.urgent ? 'animate-pulse' : ''} ${
        config.variant === 'destructive' 
          ? 'border-l-red-500 bg-red-50 dark:bg-red-950' 
          : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
      }`}
    >
      <IconComponent className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="font-semibold text-sm mb-1">{config.title}</div>
          <div className="text-sm opacity-90">{config.message}</div>
          
          {trialStatus.restrictions.readOnly && (
            <div className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
              <Lock className="h-3 w-3 inline mr-1" />
              Read-only mode: You can view data but cannot make changes
            </div>
          )}
        </div>
        
        <div className="ml-4 flex gap-2">
          {trialStatus.status === 'grace_period' && (
            <Link href="/export-data">
              <Button variant="outline" size="sm" className="text-xs">
                Export Data
              </Button>
            </Link>
          )}
          
          <Link href={upgradeUrl}>
            <Button 
              size="sm" 
              className={`text-xs whitespace-nowrap ${
                config.urgent 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              {config.buttonText}
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Smaller version for mobile/compact areas
export function TrialStatusCompact() {
  const { data: trialData } = useQuery<{
    trialStatus: TrialStatus;
    upgradeUrl: string;
  }>({
    queryKey: ["/api/trial-status"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  if (!trialData || trialData.trialStatus.daysRemaining === -1) {
    return null;
  }

  const { trialStatus, upgradeUrl } = trialData;

  if (trialStatus.status === 'active' && trialStatus.daysRemaining > 7) {
    return null;
  }

  const isUrgent = trialStatus.status === 'warning' || trialStatus.status === 'grace_period' || trialStatus.status === 'deactivated';

  return (
    <Link href={upgradeUrl}>
      <Button 
        size="sm" 
        variant={isUrgent ? "destructive" : "default"}
        className={`text-xs ${isUrgent ? 'animate-pulse' : ''}`}
      >
        {trialStatus.status === 'grace_period' ? (
          <>
            <Lock className="h-3 w-3 mr-1" />
            Read-Only
          </>
        ) : trialStatus.status === 'deactivated' ? (
          <>
            <Lock className="h-3 w-3 mr-1" />
            Reactivate
          </>
        ) : (
          <>
            <Calendar className="h-3 w-3 mr-1" />
            {trialStatus.daysRemaining}d left
          </>
        )}
      </Button>
    </Link>
  );
}