import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Shield, 
  ChevronDown,
  Edit3
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "./edit-profile-dialog";

interface UserProfileMenuProps {
  className?: string;
}

export function UserProfileMenu({ className }: UserProfileMenuProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Fetch current user data
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      return response;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Redirect to login
      window.location.href = "/auth";
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "Please try again or refresh the page.",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "provider":
        return "bg-navy-blue-100 text-navy-blue-800";
      case "nurse":
        return "bg-green-100 text-green-800";
      case "staff":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-3 h-3" />;
      case "provider":
        return <UserIcon className="w-3 h-3" />;
      case "nurse":
        return <UserIcon className="w-3 h-3" />;
      default:
        return <UserIcon className="w-3 h-3" />;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={`flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 ${className}`}
            data-median="mobile-compact-profile"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary text-white">
                {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-start" data-median="hide-on-mobile-app">
              <span className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="flex items-center space-x-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1.5 py-0.5 h-5 ${getRoleColor(user?.role || '')}`}
                >
                  {getRoleIcon(user?.role || '')}
                  <span className="ml-1 capitalize">{user?.role}</span>
                </Badge>
              </div>
            </div>
            
            <ChevronDown className="w-4 h-4 text-gray-500" data-median="hide-on-mobile-app" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500 font-normal">
                {user?.email}
              </div>
              {user?.credentials && (
                <div className="text-xs text-gray-500 font-normal">
                  {user.credentials}
                </div>
              )}
              {user?.npi && (
                <div className="text-xs text-gray-500 font-normal">
                  NPI: {user.npi}
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setEditProfileOpen(true)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer" 
            onClick={() => window.location.href = '/account-settings'}
          >
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer" 
            onClick={() => window.location.href = '/blog'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Blog
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {user && (
        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          user={{
            id: user.id,
            username: user.username,
            email: user.email || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            role: user.role,
            credentials: user.credentials,
            npi: user.npi,
            healthSystemName: user.healthSystemName
          }}
        />
      )}
    </>
  );
}