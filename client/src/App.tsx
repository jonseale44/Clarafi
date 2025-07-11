import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { UploadProvider } from "@/contexts/UploadContext";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import { PatientCreation } from "@/pages/PatientCreation";
import UserSettingsPage from "@/pages/user-settings-page";
import { PatientView } from "@/pages/patient-view";
import { EncounterView } from "@/pages/encounter-view";
import { PatientLabResults } from "@/pages/patient-lab-results";
import { LabSimulator } from "@/pages/lab-simulator";

import { VitalsFlowsheetPage } from "@/pages/vitals-flowsheet-page";
import AdminPromptManager from "@/pages/AdminPromptManager";
import { AdminUserManagement } from "@/pages/AdminUserManagement";
import SubscriptionConfigPage from "@/pages/subscription-config-page";
import PaymentPage from "@/pages/payment-page";
import DevTestPage from "@/pages/dev-test-page";
import TestMigration from "@/pages/test-migration";
import PracticeMigration from "@/pages/practice-migration";
import AdminClinicImport from "@/pages/admin-clinic-import";
import { AdminSubscriptionKeysPage } from "@/pages/admin-subscription-keys-page";
import { HealthSystemUpgradePage } from "@/pages/health-system-upgrade-page";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/patients/create" component={PatientCreation} />
      <ProtectedRoute path="/patients/:id/chart" component={PatientView} />
      <ProtectedRoute path="/patients/:id" component={PatientView} />
      <ProtectedRoute path="/patients/:patientId/labs" component={PatientLabResults} />
      <ProtectedRoute path="/patients/:patientId/encounters/:id" component={EncounterView} />
      <ProtectedRoute path="/lab-simulator" component={LabSimulator} />
      <ProtectedRoute path="/encounters/:id" component={EncounterView} />
      <ProtectedRoute path="/settings" component={UserSettingsPage} />

      <ProtectedRoute path="/encounters/:encounterId/vitals" component={VitalsFlowsheetPage} />
      <ProtectedRoute path="/vitals-flowsheet/:encounterId" component={VitalsFlowsheetPage} />
      <ProtectedRoute path="/admin/prompts" component={AdminPromptManager} />
      <ProtectedRoute path="/admin/users" component={AdminUserManagement} />
      <ProtectedRoute path="/admin/subscription-config" component={SubscriptionConfigPage} />
      <ProtectedRoute path="/admin/subscription-keys" component={AdminSubscriptionKeysPage} />
      <ProtectedRoute path="/admin/health-system-upgrade" component={HealthSystemUpgradePage} />
      <ProtectedRoute path="/admin/clinic-import" component={AdminClinicImport} />
      <ProtectedRoute path="/dev/test" component={DevTestPage} />
      <ProtectedRoute path="/test-migration" component={TestMigration} />
      <ProtectedRoute path="/practice-migration" component={PracticeMigration} />

      <Route path="/auth" component={AuthPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UploadProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </UploadProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
