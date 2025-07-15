import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { KeyRoundIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

interface PasskeyLoginFormProps {
  onSuccess?: () => void;
}

export function PasskeyLoginForm({ onSuccess }: PasskeyLoginFormProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handlePasskeyLogin = async () => {
    setIsAuthenticating(true);
    
    try {
      // 1. Get authentication options from server
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({}) // Can include username if needed
      });
      
      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }
      
      const options = await optionsResponse.json();
      
      // Convert base64 strings to ArrayBuffers
      const publicKeyOptions = {
        ...options,
        challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0))
        }))
      };
      
      // 2. Get credential using WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });
      
      if (!credential) {
        throw new Error('Authentication cancelled');
      }
      
      // Convert credential to a format that can be JSON serialized
      const serializableCredential = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array((credential as any).rawId))),
        type: credential.type,
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array((credential as any).response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array((credential as any).response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array((credential as any).response.signature))),
          userHandle: (credential as any).response.userHandle ? btoa(String.fromCharCode(...new Uint8Array((credential as any).response.userHandle))) : null
        }
      };
      
      // 3. Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          response: serializableCredential
        })
      });
      
      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Failed to verify credential');
      }
      
      const result = await verifyResponse.json();
      
      toast({
        title: "Success",
        description: "Logged in successfully with passkey!",
      });
      
      // Handle successful login
      if (onSuccess) {
        onSuccess();
      } else {
        // Check if we need location selection
        const userResponse = await fetch('/api/user', { credentials: 'include' });
        const userData = await userResponse.json();
        
        if (userData.role === 'admin' || (userData.selectedLocationId && userData.rememberLocation)) {
          setLocation('/dashboard');
        } else {
          // Redirect to auth page for location selection
          window.location.href = '/auth';
        }
      }
      
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific error cases
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Authentication Cancelled",
          description: "You cancelled the authentication or it timed out",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: error.message || "Failed to authenticate with passkey",
          variant: "destructive"
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
            Or continue with
          </span>
        </div>
      </div>
      
      <Button
        onClick={handlePasskeyLogin}
        disabled={isAuthenticating}
        variant="outline"
        className="w-full"
      >
        <KeyRoundIcon className="mr-2 h-4 w-4" />
        {isAuthenticating ? 'Authenticating...' : 'Sign in with Passkey'}
      </Button>
    </div>
  );
}