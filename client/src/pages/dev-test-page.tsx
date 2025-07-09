import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Send } from "lucide-react";

export default function DevTestPage() {
  const [email, setEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleDeleteTestUser = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email to delete",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/dev/delete-test-user/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setEmail("");
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete test user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email to resend verification",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const data = await apiRequest({
        url: "/api/resend-verification",
        method: "POST",
        data: { email },
      });
      
      toast({
        title: data.success ? "Success" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p>This page is only available in development mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Development Test Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Email Verification Testing</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={handleDeleteTestUser}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete Test User"}
                </Button>
                <p className="text-sm text-gray-500">
                  Delete a test user by email to re-test registration
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  variant="secondary"
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isResending ? "Resending..." : "Resend Verification Email"}
                </Button>
                <p className="text-sm text-gray-500">
                  Resend verification email for an unverified user
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">How to test email verification:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Register a new account with your email</li>
              <li>Check console logs for the verification link</li>
              <li>Click the link to verify your email</li>
              <li>Use "Delete Test User" to reset and test again</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}