import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function MagicLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const { setUser } = useAuth();

  useEffect(() => {
    if (token) {
      validateMagicLink(token);
    }
  }, [token]);

  const validateMagicLink = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/magic-link/${token}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.purpose === 'login' && data.user) {
          // Login successful
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          setUser(data.user);
          
          // Check if password change is required
          setTimeout(() => {
            if (data.user.requirePasswordChange) {
              setLocation('/password-change-required');
            } else {
              setLocation('/dashboard');
            }
          }, 2000);
        } else if (data.purpose === 'registration' && data.email) {
          // Registration magic link validated
          setStatus('success');
          setMessage('Email verified! Please complete your registration.');
          setEmail(data.email);
          // Redirect to registration with pre-filled email
          setTimeout(() => {
            setLocation(`/auth?tab=register&email=${encodeURIComponent(data.email)}`);
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Invalid or expired link');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to validate link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-navy-blue rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="text-navy-blue">CLAR</span><span className="text-gold">AFI</span>
              </h1>
            </div>
          </div>
          <CardTitle>Magic Link Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Validating your login link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-medium">{message}</p>
              {email && (
                <p className="text-sm text-muted-foreground">
                  Email: {email}
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                The link may have expired or already been used.
              </p>
              <Button 
                onClick={() => setLocation('/auth')}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}