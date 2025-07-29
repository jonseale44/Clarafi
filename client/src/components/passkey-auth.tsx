import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRoundIcon, ShieldCheck, AlertCircle, Trash2, Smartphone, Fingerprint } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface Passkey {
  id: number;
  displayName: string;
  createdAt: string;
  lastUsedAt?: string;
  registeredDevice?: string;
}

export function PasskeyAuth() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const { toast } = useToast();
  
  // Check if we're in Replit environment
  const isReplitEnvironment = window.location.hostname.includes('replit');
  // Check if we're in Median app
  const isMedianApp = typeof (window as any).median !== 'undefined';

  useEffect(() => {
    // Check WebAuthn support
    const checkWebAuthnSupport = () => {
      if (!window.PublicKeyCredential) {
        console.log('WebAuthn not supported - PublicKeyCredential not available');
        return false;
      }
      return true;
    };
    
    const isSupported = checkWebAuthnSupport();
    if (isSupported) {
      fetchPasskeys();
    }
  }, []);

  const fetchPasskeys = async () => {
    try {
      const response = await fetch('/api/auth/webauthn/passkeys', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch passkeys:', error);
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      console.log('🚀 [Frontend] Starting passkey registration');
      
      if (!passkeyName.trim()) {
        toast({
          title: "Name Required",
          description: "Please enter a name for your passkey",
          variant: "destructive"
        });
        return;
      }

      setIsRegistering(true);
      
      // 1. Get registration options from server
      console.log('🔵 [Frontend] Requesting registration options...');
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.error || 'Failed to get registration options');
      }
      
      const options = await optionsResponse.json();
      console.log('✅ [Frontend] Received registration options from server');
      console.log('📋 [Frontend] Registration options:', {
        challenge: options.challenge,
        rpId: options.rp?.id,
        rpName: options.rp?.name,
        userId: options.user?.id,
        userName: options.user?.name,
        userDisplayName: options.user?.displayName,
        attestation: options.attestation,
        authenticatorSelection: options.authenticatorSelection,
        timeout: options.timeout,
        pubKeyCredParams: options.pubKeyCredParams,
        excludeCredentials: options.excludeCredentials
      });
      
      // Check browser environment
      console.log('🌐 [Frontend] Browser environment:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        publicKeyCredential: !!window.PublicKeyCredential,
        isSecureContext: window.isSecureContext
      });
      
      // 2. Use SimpleWebAuthn to create credential
      console.log('🔵 [Frontend] Starting WebAuthn registration...');
      console.log('📦 [Frontend] Calling startRegistration with:', { optionsJSON: options });
      
      try {
        // For SimpleWebAuthn v13+, we need to pass options as an object
        const registrationResponse = await startRegistration({ optionsJSON: options });
        console.log('✅ [Frontend] WebAuthn registration completed');
        console.log('📋 [Frontend] Registration response:', {
          id: registrationResponse.id,
          type: registrationResponse.type,
          hasAttestationObject: !!registrationResponse.response?.attestationObject,
          hasClientDataJSON: !!registrationResponse.response?.clientDataJSON,
          transports: registrationResponse.response?.transports
        });
        
        // 3. Send credential to server for verification
        console.log('🔵 [Frontend] Sending credential to server for verification...');
        const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            response: registrationResponse,
            displayName: passkeyName
          })
        });
        
        if (!verifyResponse.ok) {
          const error = await verifyResponse.json();
          throw new Error(error.error || 'Failed to verify credential');
        }
        
        const result = await verifyResponse.json();
        console.log('✅ [Frontend] Registration successful:', result);
        
        toast({
          title: "Success",
          description: "Passkey registered successfully!",
        });
        
        // Refresh passkeys list
        await fetchPasskeys();
        
        // Close dialog and reset state
        setShowRegisterDialog(false);
        setPasskeyName('');
        
      } catch (innerError: any) {
        console.error('💥 [Frontend] Registration error details:', {
          name: innerError.name,
          message: innerError.message,
          code: innerError.code,
          cause: innerError.cause,
          stack: innerError.stack
        });
        throw innerError;
      }
      
    } catch (error: any) {
      console.error('🔴 [Frontend] Passkey registration error:', error);
      console.error('💥 [Frontend] Full error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        cause: error.cause
      });
      
      if (error.name === 'NotAllowedError') {
        // Check if this is the iframe permissions policy error
        if (error.message?.includes('publickey-credentials-create') || 
            error.message?.includes('Permissions Policy')) {
          // Check if we're in production
          const isProduction = window.location.hostname === 'clarafi.ai';
          
          if (isProduction) {
            toast({
              title: "Browser Security Restriction",
              description: "Passkey registration is blocked by your browser's security settings. This can happen if the site is being accessed through certain proxies or security layers. Try accessing the site directly or check your browser settings.",
              variant: "destructive",
              duration: 15000
            });
            console.error('❌ [Frontend] Passkey creation blocked in production environment. Possible causes: browser security settings, proxy, or deployment infrastructure restrictions.');
          } else {
            toast({
              title: "Development Environment Restriction",
              description: "Passkey registration is blocked in the Replit preview. This feature works when deployed to production.",
              variant: "destructive",
              duration: 10000
            });
            console.warn('⚠️ [Frontend] Passkey creation blocked by iframe permissions policy in development.');
          }
        } else {
          toast({
            title: "Registration Cancelled",
            description: "You cancelled the registration or it timed out",
            variant: "destructive"
          });
        }
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
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: number) => {
    if (!confirm('Are you sure you want to delete this passkey?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/webauthn/passkeys/${passkeyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Passkey deleted successfully",
        });
        fetchPasskeys();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete passkey",
        variant: "destructive"
      });
    }
  };

  // Hide passkeys in Median app - use Face ID instead
  if (isMedianApp) {
    return null;
  }

  if (!window.PublicKeyCredential) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Enable passwordless sign-in with biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Supported</AlertTitle>
            <AlertDescription>
              Your browser does not support passkeys. Please use a modern browser like Chrome, Safari, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Enable passwordless sign-in with biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Registration Info */}
            {!isReplitEnvironment && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Local Development</AlertTitle>
                <AlertDescription>
                  Passkey registration may not work on localhost. Deploy your application to test this feature.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Passkey Benefits */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <span className="font-medium">More secure than passwords</span>
              </div>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Uses biometric authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Works across your devices</span>
              </div>
            </div>
            
            {/* Passkeys List */}
            {passkeys.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Your Passkeys</h3>
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{passkey.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(passkey.createdAt).toLocaleDateString()}
                        {passkey.lastUsedAt && ` • Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePasskey(passkey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Register Button */}
            <Button
              onClick={() => setShowRegisterDialog(true)}
              className="w-full"
            >
              <KeyRoundIcon className="mr-2 h-4 w-4" />
              Add a Passkey
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Passkey</DialogTitle>
            <DialogDescription>
              Give your passkey a name to help you identify it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="passkey-name">Passkey Name</Label>
              <Input
                id="passkey-name"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="e.g., MacBook Pro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegisterDialog(false)}
              disabled={isRegistering}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegisterPasskey}
              disabled={isRegistering || !passkeyName.trim()}
            >
              {isRegistering ? 'Registering...' : 'Create Passkey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}