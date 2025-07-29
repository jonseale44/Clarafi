import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { startRegistration } from '@simplewebauthn/browser';

interface PasskeySetupPromptProps {
  userId: number;
}

export function PasskeySetupPrompt({ userId }: PasskeySetupPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  // Check if user has passkeys
  const { data: passkeys, isLoading } = useQuery({
    queryKey: ['/api/auth/webauthn/passkeys'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/webauthn/passkeys');
      if (!response.ok) throw new Error('Failed to fetch passkeys');
      return response.json();
    },
    enabled: !!userId,
  });

  // Check if prompt was previously dismissed
  useEffect(() => {
    const dismissedKey = `passkey-prompt-dismissed-${userId}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setIsDismissed(true);
    }
  }, [userId]);

  // Show prompt if user has no passkeys and hasn't dismissed it
  useEffect(() => {
    // Don't show prompt in Replit environment as passkeys don't work there
    const isReplitEnvironment = window.location.hostname.includes('replit');
    // Also hide in Median app - use Face ID instead
    const isMedianApp = typeof (window as any).median !== 'undefined';
    
    if (!isLoading && passkeys && passkeys.length === 0 && !isDismissed && !isReplitEnvironment && !isMedianApp) {
      // Small delay to let the page settle
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, [passkeys, isLoading, isDismissed]);

  const handleDismiss = () => {
    const dismissedKey = `passkey-prompt-dismissed-${userId}`;
    localStorage.setItem(dismissedKey, 'true');
    setIsOpen(false);
    setIsDismissed(true);
  };

  const handleSetupPasskey = async () => {
    try {
      // Start passkey registration
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();
      
      // Use SimpleWebAuthn to create credential (v13+ syntax)
      const registrationResponse = await startRegistration({ optionsJSON: options });
      
      // Send to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          response: registrationResponse,
          displayName: navigator.userAgent.includes('Mac') ? 'MacBook Pro' : 'Windows PC'
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify registration');
      }

      toast({
        title: "Success!",
        description: "Your passkey has been registered. You can now use it to sign in faster.",
      });

      setIsOpen(false);
      setIsDismissed(true);
      
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Registration Cancelled",
          description: "You cancelled the registration or it timed out",
          variant: "destructive"
        });
      } else if (error.name === 'InvalidStateError') {
        toast({
          title: "Registration Failed",
          description: "This authenticator may already be registered. Try a different one.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to register passkey",
          variant: "destructive"
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" data-median="passkey-setup-dialog">
        <DialogHeader data-median="passkey-setup-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle>Set Up Faster Sign-In</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
              data-median="dismiss-passkey-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="mt-3">
            Add a passkey to sign in faster and more securely. Your device will remember you, so you won't need to enter your password every time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-900">Benefits of Passkeys:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Sign in with Face ID, Touch ID, or Windows Hello</li>
              <li>• No passwords to remember or type</li>
              <li>• More secure than passwords</li>
              <li>• Works across your devices</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            Not Now
          </Button>
          <Button
            onClick={handleSetupPasskey}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Set Up Passkey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}