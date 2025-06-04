import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import { PatientCreation } from "@/pages/PatientCreation";
import UserSettingsPage from "@/pages/user-settings-page";
import { PatientView } from "@/pages/patient-view";
import { EncounterView } from "@/pages/encounter-view";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/patients/create" component={PatientCreation} />
      <ProtectedRoute path="/patients/:id" component={PatientView} />
      <ProtectedRoute path="/encounters/:id" component={EncounterView} />
      <ProtectedRoute path="/settings" component={UserSettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
