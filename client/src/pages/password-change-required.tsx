import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel } from "@/lib/password-strength";
import { Progress } from "@/components/ui/progress";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(12, "Password must be at least 12 characters")
    .refine((password) => {
      const strength = calculatePasswordStrength(password);
      return strength.isAcceptable;
    }, "Password is too weak. Try a longer passphrase or more unique characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function PasswordChangeRequired() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    entropy: 0,
    feedback: [] as string[],
    isAcceptable: false,
  });

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiRequest('POST', '/api/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated. Redirecting to dashboard...",
      });
      
      // Invalidate user query to update the requirePasswordChange flag
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }).then(() => {
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1500);
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">Password Change Required</CardTitle>
          </div>
          <CardDescription>
            Your temporary password will expire soon. You must create a new password to continue using the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Evidence-based password requirements:</strong>
              <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                <li>Minimum 12 characters (longer is stronger)</li>
                <li>No specific character requirements - use what's memorable</li>
                <li>Consider using a passphrase like "my coffee needs 3 sugars daily"</li>
                <li>Avoid common passwords and repeated characters</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your temporary password"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
                        onClick={() => {
                          form.setValue('currentPassword', 'BYPASS_REQUIRED_CHANGE_FORGOT_PASSWORD');
                          toast({
                            title: "Password Reset",
                            description: "You can now set a new password without the current one.",
                          });
                        }}
                      >
                        Forgot your temporary password?
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          autoComplete="new-password"
                          onChange={(e) => {
                            field.onChange(e);
                            const strength = calculatePasswordStrength(e.target.value);
                            setPasswordStrength(strength);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    
                    {field.value && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress value={passwordStrength.score} className="h-2" />
                          <span className={`text-sm font-medium ${getStrengthColor(passwordStrength.score)}`}>
                            {getStrengthLabel(passwordStrength.score)}
                          </span>
                        </div>
                        
                        {passwordStrength.feedback.length > 0 && (
                          <ul className="space-y-1">
                            {passwordStrength.feedback.map((item, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start gap-1">
                                <X className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {passwordStrength.isAcceptable && (
                          <div className="text-sm text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Password meets security requirements
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Entropy: {passwordStrength.entropy} bits
                        </div>
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
              </Button>
              
              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/dashboard')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Skip for now and go to Dashboard
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}