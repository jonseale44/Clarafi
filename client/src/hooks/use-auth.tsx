import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
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
    onSuccess: async (data: { user: SelectUser; registrationType?: string }) => {
      // Store user data but don't log them in yet
      queryClient.setQueryData(["/api/user"], null); // Keep them logged out
      
      // For individual registrations, redirect to payment
      if (data.registrationType === 'individual') {
        // Create Stripe subscription with trial
        try {
          const subscriptionRes = await apiRequest("POST", "/api/stripe/create-subscription", {
            email: data.user.email,
            name: `${data.user.firstName} ${data.user.lastName}`,
            tier: 1, // Tier 1 for individual providers
            billingPeriod: 'monthly',
            healthSystemId: data.user.healthSystemId
          });
          
          const subscriptionData = await subscriptionRes.json();
          
          if (subscriptionData.success && subscriptionData.clientSecret) {
            // Store registration data for after payment
            sessionStorage.setItem('pendingRegistration', JSON.stringify({
              userId: data.user.id,
              email: data.user.email
            }));
            
            // Redirect to Stripe Checkout
            toast({
              title: "Registration successful",
              description: "Redirecting to complete subscription setup...",
              variant: "default",
              duration: 3000,
            });
            
            // Redirect to a payment page (we'll create this next)
            setTimeout(() => {
              window.location.href = `/payment?clientSecret=${subscriptionData.clientSecret}`;
            }, 2000);
          } else {
            throw new Error("Failed to create subscription");
          }
        } catch (error) {
          console.error("Subscription error:", error);
          toast({
            title: "Registration successful",
            description: "Account created. Please contact support to complete subscription setup.",
            variant: "default",
            duration: 7000,
          });
        }
      } else {
        // For join_existing, show email verification message
        toast({
          title: "Registration successful", 
          description: "Please check your email to verify your account. You'll need to verify your email before you can log in.",
          variant: "default",
          duration: 7000,
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
