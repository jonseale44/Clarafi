import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRoundIcon, ShieldCheck, AlertCircle, Trash2, Smartphone } from 'lucide-react';
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

interface Passkey {
  id: number;
  displayName: string;
  createdAt: string;
  lastUsedAt?: string;
  registeredDevice?: string;
}

// Helper function to convert base64url to ArrayBuffer
function base64ToArrayBuffer(base64url: string): ArrayBuffer {
  console.log('🔐 [Base64 Conversion] Input:', {
    value: base64url,
    length: base64url.length,
    type: typeof base64url,
    containsDash: base64url.includes('-'),
    containsUnderscore: base64url.includes('_'),
    containsEquals: base64url.includes('='),
    containsWhitespace: /\s/.test(base64url),
    firstChars: base64url.substring(0, 10),
    lastChars: base64url.substring(base64url.length - 10)
  });
  
  // Convert base64url to base64
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  console.log('🔐 [Base64 Conversion] After URL replacements:', {
    value: base64,
    length: base64.length,
    changed: base64 !== base64url
  });
  
  // Add padding if necessary
  const paddingNeeded = (4 - base64.length % 4) % 4;
  const padded = base64 + '=='.substring(0, paddingNeeded);
  
  console.log('🔐 [Base64 Conversion] After padding:', {
    value: padded,
    length: padded.length,
    paddingAdded: paddingNeeded,
    finalChars: padded.substring(padded.length - 4)
  });
  
  try {
    const binaryString = atob(padded);
    console.log('🔐 [Base64 Conversion] Successfully decoded:', {
      binaryLength: binaryString.length,
      firstBytes: binaryString.charCodeAt(0) + ',' + binaryString.charCodeAt(1) + ',' + binaryString.charCodeAt(2)
    });
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (atobError) {
    console.error('🔴 [Base64 Conversion] atob() failed:', {
      error: atobError,
      input: padded,
      inputLength: padded.length,
      inputChars: padded.split('').map((c, i) => `${i}:${c}(${c.charCodeAt(0)})`).slice(0, 20).join(' ')
    });
    throw atobError;
  }
}

export function PasskeyAuth() {
  console.log('🎯🎯🎯 [Frontend] PasskeyAuth component rendering');
  
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const { toast } = useToast();
  
  // Check if we're in Replit environment
  const isReplitEnvironment = window.location.hostname.includes('replit');

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
    // Wrap EVERYTHING in a try-catch to catch any early errors
    try {
      console.log('🚀🚀🚀 [Frontend] handleRegisterPasskey called - ABSOLUTE FIRST LINE');
      console.log('🚀 [Frontend] Current state:', {
        passkeyName,
        isRegistering,
        passkeysCount: passkeys.length
      });
      
      if (!passkeyName.trim()) {
        toast({
          title: "Name Required",
          description: "Please enter a name for your passkey",
          variant: "destructive"
        });
        return;
      }

      setIsRegistering(true);
      console.log('🚀 [Frontend] Registration started');
      
      try {
      // 1. Get registration options from server
      console.log('🔵 [Frontend] Requesting registration options...');
      
      // Add a global error event listener temporarily
      const errorHandler = (event: ErrorEvent) => {
        console.error('🔴🔴🔴 [Frontend] GLOBAL ERROR EVENT:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      };
      window.addEventListener('error', errorHandler);
      
      // Override fetch temporarily to log all calls
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('🔍🔍🔍 [Frontend] Fetch intercepted:', {
          url: args[0],
          options: args[1]
        });
        return originalFetch.apply(this, args).then(response => {
          console.log('🔍 [Frontend] Fetch response received:', {
            url: args[0],
            status: response.status,
            ok: response.ok
          });
          return response;
        }).catch(error => {
          console.error('🔴🔴🔴 [Frontend] Fetch failed:', {
            url: args[0],
            error: error,
            message: error.message
          });
          throw error;
        });
      };
      
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }).catch(fetchError => {
        console.error('🔴 [Frontend] Fetch error:', fetchError);
        window.removeEventListener('error', errorHandler);
        window.fetch = originalFetch; // Restore original fetch
        throw fetchError;
      });
      
      // Restore original fetch
      window.fetch = originalFetch;
      
      // Remove error handler after fetch completes
      window.removeEventListener('error', errorHandler);
      
      console.log('🔵 [Frontend] Registration options response:', {
        status: optionsResponse.status,
        statusText: optionsResponse.statusText,
        headers: Object.fromEntries(optionsResponse.headers.entries()),
        ok: optionsResponse.ok
      });
      
      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        console.error('🔴 [Frontend] Error response body:', errorText);
        
        // Check if it's HTML (error page)
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          console.error('🔴 [Frontend] Received HTML instead of JSON - server error');
          throw new Error('Server returned an error page instead of JSON response');
        }
        
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Failed to get registration options');
        } catch {
          throw new Error(`Failed to get registration options: ${optionsResponse.statusText}`);
        }
      }
      
      let options;
      try {
        const responseText = await optionsResponse.text();
        console.log('🔵 [Frontend] Raw response text:', responseText);
        options = JSON.parse(responseText);
      } catch (parseError) {
        console.error('🔴 [Frontend] Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON response');
      }
      
      console.log('🔵 [Frontend] Parsed options from server:', options);
      console.log('🔵 [Frontend] Options structure:', {
        hasChallenge: !!options.challenge,
        challengeType: typeof options.challenge,
        challengeValue: options.challenge,
        hasUser: !!options.user,
        userId: options.user?.id,
        userIdType: typeof options.user?.id,
        allKeys: Object.keys(options)
      });
      
      // Convert base64 strings to ArrayBuffer as required by WebAuthn API
      let publicKeyOptions;
      try {
        console.log('🔵 [Frontend] Starting base64 conversions...');
        
        // First check if challenge is actually a base64 string
        if (typeof options.challenge !== 'string') {
          console.error('🔴 [Frontend] Challenge is not a string:', {
            type: typeof options.challenge,
            value: options.challenge
          });
          throw new Error('Challenge must be a string');
        }
        
        console.log('🔵 [Frontend] Converting challenge:', {
          value: options.challenge,
          length: options.challenge.length
        });
        const challenge = base64ToArrayBuffer(options.challenge);
        console.log('✅ [Frontend] Challenge converted successfully:', {
          byteLength: challenge.byteLength
        });
        
        // Check if user ID is a string
        if (typeof options.user?.id !== 'string') {
          console.error('🔴 [Frontend] User ID is not a string:', {
            type: typeof options.user?.id,
            value: options.user?.id
          });
          throw new Error('User ID must be a string');
        }
        
        console.log('🔵 [Frontend] Converting user ID:', {
          value: options.user.id,
          length: options.user.id.length
        });
        const userId = base64ToArrayBuffer(options.user.id);
        console.log('✅ [Frontend] User ID converted successfully:', {
          byteLength: userId.byteLength
        });
        
        // Handle excludeCredentials if present
        let excludeCredentials = options.excludeCredentials;
        if (excludeCredentials && Array.isArray(excludeCredentials)) {
          console.log('🔵 [Frontend] Converting excludeCredentials:', excludeCredentials.length, 'items');
          excludeCredentials = excludeCredentials.map((cred: any, index: number) => {
            console.log(`🔵 [Frontend] Converting credential ${index}:`, cred.id);
            return {
              ...cred,
              id: base64ToArrayBuffer(cred.id)
            };
          });
        }
        
        publicKeyOptions = {
          ...options,
          challenge,
          user: {
            ...options.user,
            id: userId
          },
          excludeCredentials
        };
        
        console.log('✅ [Frontend] Public key options prepared:', {
          ...publicKeyOptions,
          challenge: `ArrayBuffer(${publicKeyOptions.challenge.byteLength} bytes)`,
          user: {
            ...publicKeyOptions.user,
            id: `ArrayBuffer(${publicKeyOptions.user.id.byteLength} bytes)`
          }
        });
      } catch (conversionError: any) {
        console.error('🔴 [Frontend] Base64 conversion error:', {
          error: conversionError,
          message: conversionError.message,
          stack: conversionError.stack,
          name: conversionError.name,
          lastAttemptedValue: options.user?.id || options.challenge
        });
        
        // Log the exact error details
        if (conversionError.message && conversionError.message.includes('atob')) {
          console.error('🔴 [Frontend] atob error detected - invalid base64 encoding');
        }
        
        throw new Error(`Failed to convert base64 data: ${conversionError.message}`);
      }
      
      // 2. Create credential using WebAuthn API
      console.log('Creating credential with options:', {
        ...publicKeyOptions,
        challenge: `ArrayBuffer(${publicKeyOptions.challenge.byteLength} bytes)`,
        user: {
          ...publicKeyOptions.user,
          id: `ArrayBuffer(${publicKeyOptions.user.id.byteLength} bytes)`
        }
      });
      
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser. Please use Chrome, Safari, Firefox, or Edge.');
      }
      
      // Check if we can create credentials
      if (!navigator.credentials || !navigator.credentials.create) {
        throw new Error('Credential Management API is not available.');
      }
      
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }
      
      // 3. Convert credential to JSON-serializable format
      console.log('Raw credential:', credential);
      console.log('Credential type:', credential.type);
      console.log('Credential id:', credential.id);
      
      const publicKeyCredential = credential as PublicKeyCredential;
      const response = publicKeyCredential.response as AuthenticatorAttestationResponse;
      
      console.log('Response type:', response.constructor.name);
      console.log('Has clientDataJSON:', !!response.clientDataJSON);
      console.log('Has attestationObject:', !!response.attestationObject);
      
      const credentialData = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))),
        type: credential.type,
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)))
        },
        transports: (response as any).getTransports?.() || []
      };
      
      console.log('Credential data to send:', credentialData);
      
      const requestBody = JSON.stringify({
        response: credentialData,
        displayName: passkeyName
      });
      
      console.log('Request body:', requestBody);
      console.log('Request body length:', requestBody.length);
      
      const verifyUrl = '/api/auth/webauthn/register/verify';
      console.log('Request URL:', verifyUrl);
      console.log('Full URL:', window.location.origin + verifyUrl);
      
      // 4. Send credential to server for verification
      console.log('Making fetch request...');
      const verifyResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: requestBody
      });
      
      console.log('Verify response received');
      console.log('Verify response status:', verifyResponse.status);
      console.log('Verify response status text:', verifyResponse.statusText);
      console.log('Verify response URL:', verifyResponse.url);
      console.log('Verify response type:', verifyResponse.type);
      console.log('Verify response headers:', Array.from(verifyResponse.headers.entries()));
      
      const responseText = await verifyResponse.text();
      console.log('Raw response text:', responseText);
      
      // Try to parse as JSON, but handle HTML responses
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON. Response was:', responseText);
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          throw new Error('Server returned HTML instead of JSON - possibly a 404 error');
        }
        throw new Error('Invalid server response');
      }
      
      if (!verifyResponse.ok) {
        throw new Error(responseData.error || 'Failed to verify credential');
      }
      
      toast({
        title: "Success",
        description: "Passkey registered successfully!",
      });
      
      setShowRegisterDialog(false);
      setPasskeyName('');
      fetchPasskeys();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Failed to register passkey";
      
      if (error.message?.includes('atob')) {
        errorMessage = "Server sent invalid data format. Please try again.";
      } else if (error.message?.includes('publickey-credentials-create')) {
        errorMessage = "WebAuthn is not available. Please ensure you're using a supported browser and not in private/incognito mode.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Registration was cancelled or not allowed.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Security error. Ensure you're accessing the site over HTTPS.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
    } catch (outerError: any) {
      console.error('🔴🔴🔴 [Frontend] OUTER ERROR CAUGHT:', {
        error: outerError,
        message: outerError.message,
        stack: outerError.stack,
        name: outerError.name
      });
      toast({
        title: "Registration Failed",
        description: outerError.message || "An unexpected error occurred",
        variant: "destructive"
      });
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

      if (!response.ok) {
        throw new Error('Failed to delete passkey');
      }

      toast({
        title: "Success",
        description: "Passkey deleted successfully",
      });
      
      fetchPasskeys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete passkey",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Passkeys
          </CardTitle>
          <CardDescription>
            Manage your passkeys for secure, passwordless authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!window.PublicKeyCredential ? (
            <div className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">WebAuthn/Passkeys Not Available</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Passkeys are not supported in this browser environment. This is a known limitation in some embedded browsers.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 text-sm">
                <p className="font-medium">Alternative secure authentication options:</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>
                    <strong>Magic Links:</strong> Use passwordless email login (available on the login page)
                  </li>
                  <li>
                    <strong>Strong Password:</strong> Continue using your current 12+ character password
                  </li>
                  <li>
                    <strong>Different Browser:</strong> Try Chrome, Safari, Firefox, or Edge directly (not embedded)
                  </li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  For the best experience, we recommend using magic link authentication which provides secure, passwordless access via email.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={() => {
                  console.log('🚀 [Frontend] Add New Passkey button clicked');
                  setShowRegisterDialog(true);
                }}
                disabled={loading}
                className="w-full"
              >
                <KeyRoundIcon className="mr-2 h-4 w-4" />
                Add New Passkey
              </Button>

              {passkeys.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Your Passkeys</h4>
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{passkey.displayName}</p>
                          <p className="text-sm text-gray-500">
                            Created {new Date(passkey.createdAt).toLocaleDateString()}
                            {passkey.lastUsedAt && (
                              <> • Last used {new Date(passkey.lastUsedAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePasskey(passkey.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Passkeys</AlertTitle>
                  <AlertDescription>
                    You haven't registered any passkeys yet. Add one to enable passwordless login.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRegisterDialog} onOpenChange={(open) => {
        console.log('🚀 [Frontend] Dialog open state changed to:', open);
        setShowRegisterDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Passkey</DialogTitle>
            <DialogDescription>
              Give your passkey a name to help you identify it later
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="passkey-name">Passkey Name</Label>
              <Input
                id="passkey-name"
                placeholder="e.g., MacBook Pro, iPhone 15"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRegistering) {
                    handleRegisterPasskey();
                  }
                }}
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
              onClick={() => {
                console.log('🚀🚀🚀 [Frontend] Register Passkey button clicked in dialog - IMMEDIATE');
                console.log('🚀 [Frontend] Current passkey name:', passkeyName);
                console.log('🚀 [Frontend] isRegistering:', isRegistering);
                try {
                  handleRegisterPasskey();
                } catch (immediateError) {
                  console.error('🔴🔴🔴 [Frontend] IMMEDIATE ERROR in button click:', immediateError);
                }
              }}
              disabled={isRegistering || !passkeyName.trim()}
            >
              {isRegistering ? 'Registering...' : 'Register Passkey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}