import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    credentials?: string;
    npi?: string;
    healthSystemName?: string;
  };
}

export function EditProfileDialog({ open, onOpenChange, user }: EditProfileDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    credentials: user.credentials || "",
    npi: user.npi || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", `/api/user/profile`, data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (!showPasswordSection) {
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", `/api/change-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordSection(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showPasswordSection) {
      // Handle password change
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        toast({
          title: "Missing Fields",
          description: "Please fill in all password fields.",
          variant: "destructive",
        });
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "New password and confirmation password must match.",
          variant: "destructive",
        });
        return;
      }
      
      changePasswordMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    } else {
      // Handle profile update
      updateProfileMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handlePasswordChange = (field: keyof typeof passwordData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Toggle between profile and password */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={!showPasswordSection ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPasswordSection(false)}
              >
                Profile Information
              </Button>
              <Button
                type="button"
                variant={showPasswordSection ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPasswordSection(true)}
              >
                Change Password
              </Button>
            </div>

            {!showPasswordSection ? (
              <>
                {/* Health System - Read Only */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Health System:</strong> {user.healthSystemName || "Not assigned"}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Health system assignment can only be changed by an administrator.
                    </span>
                  </AlertDescription>
                </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange("firstName")}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange("lastName")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange("email")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">Professional Credentials</Label>
              <Input
                id="credentials"
                value={formData.credentials}
                onChange={handleInputChange("credentials")}
                placeholder="MD, DO, RN, NP, etc."
              />
            </div>

            {(user.role === "provider" || user.role === "nurse") && (
              <div className="space-y-2">
                <Label htmlFor="npi">NPI Number</Label>
                <Input
                  id="npi"
                  value={formData.npi}
                  onChange={handleInputChange("npi")}
                  placeholder="10-digit NPI"
                  maxLength={10}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Role changes must be requested through your administrator.
              </p>
            </div>
              </>
            ) : (
              <>
                {/* Password Change Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange("currentPassword")}
                      required
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange("newPassword")}
                      required
                      placeholder="Enter your new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange("confirmPassword")}
                      required
                      placeholder="Confirm your new password"
                    />
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.
                    </AlertDescription>
                  </Alert>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setShowPasswordSection(false);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
              disabled={updateProfileMutation.isPending || changePasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || changePasswordMutation.isPending}
            >
              {(updateProfileMutation.isPending || changePasswordMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {showPasswordSection ? "Changing Password..." : "Saving..."}
                </>
              ) : (
                showPasswordSection ? "Change Password" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}