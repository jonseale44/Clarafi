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

export function PasskeyAuth() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPasskeys();
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
    if (!passkeyName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your passkey",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);
    
    try {
      // 1. Get registration options from server
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        credentials: 'include'
      });
      
      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }
      
      const options = await optionsResponse.json();
      
      // 2. Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: options
      });
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }
      
      // 3. Convert credential to JSON-serializable format
      console.log('Raw credential:', credential);
      const publicKeyCredential = credential as PublicKeyCredential;
      const response = publicKeyCredential.response as AuthenticatorAttestationResponse;
      
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
      console.log('Request URL:', '/api/auth/webauthn/register/verify');
      
      // 4. Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: requestBody
      });
      
      console.log('Verify response status:', verifyResponse.status);
      console.log('Verify response headers:', verifyResponse.headers);
      
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
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register passkey",
        variant: "destructive"
      });
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Supported</AlertTitle>
              <AlertDescription>
                Your browser doesn't support passkeys. Please use a modern browser.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Button
                onClick={() => setShowRegisterDialog(true)}
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

      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
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
              onClick={handleRegisterPasskey}
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