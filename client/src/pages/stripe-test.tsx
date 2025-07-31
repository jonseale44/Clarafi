import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function StripeTest() {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<any>(null);

  // Get stored session from sessionStorage
  const storedSession = sessionStorage.getItem('stripe_session_debug');
  const parsedSession = storedSession ? JSON.parse(storedSession) : null;

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check API connection
      console.log('[StripeTest] Testing API connection...');
      const configResponse = await apiRequest('GET', '/api/subscription/config');
      const config = await configResponse.json();
      results.apiConnection = { success: true, data: config };
    } catch (error: any) {
      results.apiConnection = { success: false, error: error.message };
    }

    try {
      // Test 2: Create test session
      console.log('[StripeTest] Creating test checkout session...');
      const response = await apiRequest('POST', '/api/stripe/upgrade-to-tier2', {
        healthSystemId: 2 // Using Waco Family Medicine
      });
      const data = await response.json();
      
      if (data.success && data.sessionId) {
        results.sessionCreation = { 
          success: true, 
          sessionId: data.sessionId,
          checkoutUrl: data.checkoutUrl,
          urlLength: data.checkoutUrl?.length,
          urlStart: data.checkoutUrl?.substring(0, 50)
        };
        setSessionId(data.sessionId);
      } else {
        results.sessionCreation = { success: false, error: 'No session created', data };
      }
    } catch (error: any) {
      results.sessionCreation = { success: false, error: error.message };
    }

    setTestResults(results);
    setLoading(false);
  };

  const checkSessionStatus = async () => {
    if (!sessionId) {
      alert('Please run diagnostics first or enter a session ID');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/stripe/debug-session/${sessionId}`);
      const data = await response.json();
      setSessionStatus(data);
      console.log('[StripeTest] Session status:', data);
    } catch (error: any) {
      setSessionStatus({ error: error.message });
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Integration Diagnostics</CardTitle>
          <CardDescription>
            Test and troubleshoot your Stripe checkout integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stored Session Info */}
          {parsedSession && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Previous Session Info</h3>
              <div className="text-sm space-y-1">
                <p>Session ID: <code className="bg-white px-1 rounded">{parsedSession.sessionId}</code></p>
                <p>Created: {parsedSession.timestamp}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSessionId(parsedSession.sessionId)}
                  className="mt-2"
                >
                  Use This Session
                </Button>
              </div>
            </div>
          )}

          {/* Diagnostic Tests */}
          <div>
            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              className="mb-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </Button>

            {testResults && (
              <div className="space-y-4">
                {/* API Connection Test */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">API Connection</h4>
                    {testResults.apiConnection.success ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" /> Success
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">
                        <XCircle className="mr-1 h-3 w-3" /> Failed
                      </Badge>
                    )}
                  </div>
                  {!testResults.apiConnection.success && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {testResults.apiConnection.error}
                    </p>
                  )}
                </div>

                {/* Session Creation Test */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Checkout Session Creation</h4>
                    {testResults.sessionCreation.success ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" /> Success
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">
                        <XCircle className="mr-1 h-3 w-3" /> Failed
                      </Badge>
                    )}
                  </div>
                  {testResults.sessionCreation.success ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm">
                        Session ID: 
                        <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                          {testResults.sessionCreation.sessionId}
                        </code>
                      </p>
                      <p className="text-sm">
                        URL Length: {testResults.sessionCreation.urlLength} chars
                      </p>
                      <p className="text-sm">
                        URL Start: <code className="text-xs">{testResults.sessionCreation.urlStart}...</code>
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(testResults.sessionCreation.checkoutUrl)}
                        className="mt-2"
                      >
                        Copy Checkout URL
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {testResults.sessionCreation.error}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Session Status Check */}
          <div className="space-y-4">
            <h3 className="font-semibold">Check Session Status</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter session ID (e.g., cs_test_...)"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={checkSessionStatus}
                disabled={loading || !sessionId}
              >
                Check Status
              </Button>
            </div>

            {sessionStatus && (
              <div className="border rounded-lg p-4">
                {sessionStatus.error ? (
                  <div className="text-red-600">
                    <AlertCircle className="inline mr-2 h-4 w-4" />
                    Error: {sessionStatus.error}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Status:</span>
                      <Badge>{sessionStatus.session?.status || 'Unknown'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Payment Status:</span>
                      <Badge variant="outline">{sessionStatus.session?.payment_status || 'Unknown'}</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Created: {sessionStatus.session?.created}</p>
                      <p>Expires: {sessionStatus.session?.expires_at}</p>
                      <p>Customer Email: {sessionStatus.session?.customer_email}</p>
                      <p>Amount: ${(sessionStatus.session?.amount_total || 0) / 100} {sessionStatus.session?.currency?.toUpperCase()}</p>
                    </div>
                    {sessionStatus.session?.url && (
                      <div className="mt-4">
                        <a 
                          href={sessionStatus.session.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Open Checkout Page →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Run diagnostics to test the connection and create a session</li>
              <li>Check the session status to see if it's valid</li>
              <li>Copy the checkout URL and try opening it in a new tab</li>
              <li>If the page is stuck loading, check:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>You're using test API keys (sk_test_... and pk_test_...)</li>
                  <li>Your Stripe account is in test mode</li>
                  <li>Browser console for any errors</li>
                  <li>Try a different browser or incognito mode</li>
                </ul>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}