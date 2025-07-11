import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Loader2, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface SubscriptionKeyVerificationProps {
  onSuccess: (result: { keyType: string; subscriptionTier: number; healthSystemId: number }) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function SubscriptionKeyVerification({ 
  onSuccess, 
  onSkip,
  showSkip = false 
}: SubscriptionKeyVerificationProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const verifyKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest('/api/subscription-keys/validate', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Successful",
        description: "Your subscription key has been verified successfully.",
      });
      onSuccess(data);
    },
    onError: (error: any) => {
      setError(error.error || 'Invalid or expired key. Please check and try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!key.trim()) {
      setError('Please enter a subscription key');
      return;
    }

    // Basic format validation
    const keyPattern = /^[A-Z]{3}-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyPattern.test(key.trim())) {
      setError('Invalid key format. Expected format: XXX-YYYY-XXXX-XXXX');
      return;
    }

    verifyKeyMutation.mutate(key.trim());
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Subscription Key Verification
        </CardTitle>
        <CardDescription>
          Enter your subscription key to access the EMR system. Your clinic administrator should have provided this key.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subscription-key">Subscription Key</Label>
            <Input
              id="subscription-key"
              type="text"
              placeholder="XXX-YYYY-XXXX-XXXX"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toUpperCase());
                setError('');
              }}
              disabled={verifyKeyMutation.isPending}
              className="font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={verifyKeyMutation.isPending || !key.trim()}
              className="flex-1"
            >
              {verifyKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Key
                </>
              )}
            </Button>
            
            {showSkip && onSkip && (
              <Button
                type="button"
                variant="outline"
                onClick={onSkip}
                disabled={verifyKeyMutation.isPending}
              >
                Skip for Now
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Key Format:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>3 letters (your clinic code)</li>
            <li>4 digits (year)</li>
            <li>Two groups of 4 alphanumeric characters</li>
          </ul>
          <p className="mt-3">
            Example: <span className="font-mono text-foreground">WFM-2025-A1B2-C3D4</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}