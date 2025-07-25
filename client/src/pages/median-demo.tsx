import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle, XCircle, Info, Key, Trash2 } from "lucide-react";
import { 
  isMedianAvailable, 
  checkMedianAuthStatus, 
  saveMedianCredentials, 
  getMedianCredentials,
  deleteMedianCredentials,
  getBiometryTypeName
} from "@/lib/median-auth";
import { useToast } from "@/hooks/use-toast";

export default function MedianDemoPage() {
  const [isMedian, setIsMedian] = useState(false);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [testCredentials, setTestCredentials] = useState({ username: '', password: '' });
  const [savedCredentials, setSavedCredentials] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkMedianEnvironment();
  }, []);

  const checkMedianEnvironment = async () => {
    const available = isMedianAvailable();
    setIsMedian(available);
    
    if (available) {
      const status = await checkMedianAuthStatus();
      setAuthStatus(status);
    }
  };

  const handleSaveCredentials = async () => {
    if (!testCredentials.username || !testCredentials.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    try {
      const saved = await saveMedianCredentials(testCredentials);
      if (saved) {
        toast({
          title: "Success!",
          description: "Credentials saved for Face ID",
        });
        checkMedianEnvironment(); // Refresh status
      } else {
        toast({
          title: "Failed",
          description: "Could not save credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[MedianDemo] Save error:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving credentials",
        variant: "destructive",
      });
    }
  };

  const handleGetCredentials = async () => {
    try {
      const creds = await getMedianCredentials();
      if (creds) {
        setSavedCredentials(creds);
        toast({
          title: "Success!",
          description: "Credentials retrieved successfully",
        });
      } else {
        toast({
          title: "Failed",
          description: "Could not retrieve credentials or authentication was cancelled",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[MedianDemo] Get error:', error);
      toast({
        title: "Error",
        description: "An error occurred while retrieving credentials",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCredentials = async () => {
    try {
      const deleted = await deleteMedianCredentials();
      if (deleted) {
        setSavedCredentials(null);
        toast({
          title: "Success!",
          description: "Credentials deleted",
        });
        checkMedianEnvironment(); // Refresh status
      } else {
        toast({
          title: "Failed",
          description: "Could not delete credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[MedianDemo] Delete error:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Median Face ID / Touch ID Demo</h1>
      
      {/* Environment Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Environment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Median App Detected:</span>
              <Badge variant={isMedian ? "default" : "destructive"}>
                {isMedian ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Yes
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    No
                  </>
                )}
              </Badge>
            </div>
            
            {authStatus && (
              <>
                <div className="flex items-center justify-between">
                  <span>Biometric Available:</span>
                  <Badge variant={authStatus.hasTouchId ? "default" : "secondary"}>
                    {authStatus.hasTouchId ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {getBiometryTypeName(authStatus)}
                      </>
                    ) : (
                      "Not Available"
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Saved Credentials:</span>
                  <Badge variant={authStatus.hasSecret ? "default" : "secondary"}>
                    {authStatus.hasSecret ? (
                      <>
                        <Key className="h-4 w-4 mr-1" />
                        Saved
                      </>
                    ) : (
                      "None"
                    )}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>How to Test Face ID</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>This page must be viewed in the Median mobile app</li>
            <li>Your device must have Face ID or Touch ID enabled</li>
            <li>Save test credentials using the form below</li>
            <li>Try retrieving them with Face ID/Touch ID</li>
            <li>Go to the login page to see Face ID login in action</li>
          </ol>
        </AlertDescription>
      </Alert>

      {isMedian && authStatus?.hasTouchId && (
        <>
          {/* Save Credentials */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Save Test Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={testCredentials.username}
                    onChange={(e) => setTestCredentials({ ...testCredentials, username: e.target.value })}
                    placeholder="Enter test username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded-md"
                    value={testCredentials.password}
                    onChange={(e) => setTestCredentials({ ...testCredentials, password: e.target.value })}
                    placeholder="Enter test password"
                  />
                </div>
                <Button onClick={handleSaveCredentials} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Save Credentials for Face ID
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Retrieve Credentials */}
          {authStatus?.hasSecret && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Test Face ID Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={handleGetCredentials} className="w-full">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Authenticate with {getBiometryTypeName(authStatus)}
                  </Button>
                  
                  {savedCredentials && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Retrieved Credentials</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <p><strong>Username:</strong> {savedCredentials.username}</p>
                          <p><strong>Password:</strong> {"*".repeat(savedCredentials.password.length)}</p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button onClick={handleDeleteCredentials} variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Saved Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isMedian && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Median App Required</AlertTitle>
          <AlertDescription>
            This demo page must be viewed in the Median mobile app to test Face ID functionality.
            Please open this page in your Median app.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}