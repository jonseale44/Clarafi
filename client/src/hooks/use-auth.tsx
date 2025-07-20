import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      
      // Check if login failed due to email verification
      if (!res.ok && data.message === "Please verify your email before logging in.") {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      
      return data;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      if (error.message === "EMAIL_NOT_VERIFIED") {
        toast({
          title: "Email Verification Required",
          description: "Please check your email and click the verification link before logging in. Check your spam folder if you don't see it.",
          variant: "default",
          duration: 10000, // Show for 10 seconds
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Registration failed" }));
        const error = new Error(errorData.message || "Registration failed");
        // Attach field information for form-specific error handling
        (error as any).field = errorData.field;
        throw error;
      }
      return await res.json();
    },
    onSuccess: async (data: any, variables: any) => {
      // Store user data but don't log them in yet
      queryClient.setQueryData(["/api/user"], null); // Keep them logged out
      
      // Check if payment is required (individual provider registration)
      if (data.requiresPayment && data.paymentUrl) {
        // Store registration data for after payment
        sessionStorage.setItem('pendingRegistration', JSON.stringify({
          email: data.user?.email || variables.email
        }));
        
        // Redirect to Stripe Checkout
        toast({
          title: "Registration successful",
          description: "Redirecting to complete subscription setup...",
          variant: "default",
          duration: 3000,
        });
        
        // Redirect to Stripe hosted checkout page
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 2000);
      } else if (data.emailVerificationRequired) {
        // For users who need to verify email
        toast({
          title: "Registration successful", 
          description: data.message || "Please check your email to verify your account. You'll need to verify your email before you can log in.",
          variant: "default",
          duration: 7000,
        });
      } else {
        // Legacy case - should not happen with new code
        toast({
          title: "Registration successful", 
          description: "Your account has been created.",
          variant: "default",
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
