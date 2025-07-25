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
import AccountSettingsPage from "@/pages/account-settings-page";
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
import UpgradePage from "@/pages/upgrade-page";
import StripeTest from "@/pages/stripe-test";
import AdminVerification from "@/pages/admin-verification";
import AdminVerificationComplete from "@/pages/admin-verification-complete";
import AdminVerificationReview from "@/pages/admin-verification-review";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminHealthcareData from "@/pages/admin-healthcare-data";
import ClinicAdminDashboard from "@/pages/clinic-admin-dashboard";
import PasswordChangeRequired from "@/pages/password-change-required";
import MagicLinkPage from "@/pages/magic-link-page";
import SchedulingPage from "@/pages/scheduling";
import SystemAdminTestPatients from "@/pages/system-admin-test-patients";
import BlogPage from "@/pages/blog";
import BlogArticlePage from "@/pages/blog-article";
import AdminBlogManagement from "@/pages/admin-blog-management";
import Pricing from "@/pages/pricing";
import { AdminPharmacyImport } from "@/pages/AdminPharmacyImport";
import AdminMarketingDashboard from "@/pages/admin-marketing-dashboard";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import BusinessAssociateAgreement from "@/pages/legal/business-associate-agreement";
import TermsOfServiceLegal from "@/pages/legal/terms-of-service";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";

function Router() {
  return (
    <Switch>
      {/* Public landing page as root */}
      <Route path="/" component={LandingPage} />
      
      {/* Protected dashboard route */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/healthcare-data" component={AdminHealthcareData} />
      <ProtectedRoute path="/clinic-admin" component={ClinicAdminDashboard} />
      <ProtectedRoute path="/patients/create" component={PatientCreation} />
      <ProtectedRoute path="/patients/:id/chart" component={PatientView} />
      <ProtectedRoute path="/patients/:id" component={PatientView} />
      <ProtectedRoute path="/patient-chart/:id" component={PatientView} />
      <ProtectedRoute path="/patients/:patientId/labs" component={PatientLabResults} />
      <ProtectedRoute path="/patients/:patientId/encounters/:id" component={EncounterView} />
      <ProtectedRoute path="/lab-simulator" component={LabSimulator} />
      <ProtectedRoute path="/encounters/:id" component={EncounterView} />
      <ProtectedRoute path="/scheduling" component={SchedulingPage} />
      <ProtectedRoute path="/settings" component={UserSettingsPage} />
      <ProtectedRoute path="/account-settings" component={AccountSettingsPage} />

      <ProtectedRoute path="/encounters/:encounterId/vitals" component={VitalsFlowsheetPage} />
      <ProtectedRoute path="/vitals-flowsheet/:encounterId" component={VitalsFlowsheetPage} />
      <ProtectedRoute path="/admin/prompts" component={AdminPromptManager} />
      <ProtectedRoute path="/admin/users" component={AdminUserManagement} />
      <ProtectedRoute path="/admin/subscription-config" component={SubscriptionConfigPage} />
      <ProtectedRoute path="/admin/subscription-keys" component={AdminSubscriptionKeysPage} />
      <ProtectedRoute path="/admin/health-system-upgrade" component={HealthSystemUpgradePage} />
      <ProtectedRoute path="/admin/clinic-import" component={AdminClinicImport} />
      <ProtectedRoute path="/admin/verification-review" component={AdminVerificationReview} />
      <ProtectedRoute path="/admin/test-patients" component={SystemAdminTestPatients} />
      <ProtectedRoute path="/admin/blog" component={AdminBlogManagement} />
      <ProtectedRoute path="/admin/pharmacy-import" component={AdminPharmacyImport} />
      <ProtectedRoute path="/admin/marketing" component={AdminMarketingDashboard} />
      <ProtectedRoute path="/dev/test" component={DevTestPage} />
      <ProtectedRoute path="/dev/stripe-test" component={StripeTest} />
      <ProtectedRoute path="/test-migration" component={TestMigration} />
      <ProtectedRoute path="/practice-migration" component={PracticeMigration} />
      <ProtectedRoute path="/password-change-required" component={PasswordChangeRequired} />

      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/magic-link/:token" component={MagicLinkPage} />
      <Route path="/admin-verification" component={AdminVerification} />
      <Route path="/admin-verification-complete" component={AdminVerificationComplete} />
      <Route path="/payment" component={PaymentPage} />
      <ProtectedRoute path="/upgrade" component={UpgradePage} />
      
      {/* Public Blog Routes */}
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogArticlePage} />
      
      {/* Public Pricing Page */}
      <Route path="/pricing" component={Pricing} />
      
      {/* Legal Pages */}
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/legal/baa" component={BusinessAssociateAgreement} />
      <Route path="/legal/terms" component={TermsOfServiceLegal} />
      
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
