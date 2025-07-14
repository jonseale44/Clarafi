import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Shield, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileCheck,
  Users,
  ArrowRight,
  Mail,
  Loader2,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface MigrationInvitation {
  id: number;
  targetHealthSystemId: number;
  targetHealthSystemName: string;
  invitationCode: string;
  message?: string;
  createdByUserName: string;
  expiresAt: string;
  status: string;
}

interface MigrationAnalysis {
  totalPatients: number;
  autoMigrateCount: number;
  requiresConsentCount: number;
  patientCategories: {
    clinicPatients: number;
    hospitalPatients: number;
    privatePatients: number;
    unknownOrigin: number;
  };
}

export default function PracticeMigration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('invitations');
  const [invitations, setInvitations] = useState<MigrationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [selectedInvitation, setSelectedInvitation] = useState<MigrationInvitation | null>(null);
  const [migrationAnalysis, setMigrationAnalysis] = useState<MigrationAnalysis | null>(null);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await apiRequest('GET', '/api/migration/invitations');
      const data = await response.json();
      setInvitations(data.filter((inv: MigrationInvitation) => inv.status === 'pending'));
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const validateInvitationCode = async () => {
    if (!invitationCode.trim()) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter an invitation code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/migration/validate-invitation', {
        invitationCode: invitationCode.trim()
      });
      const data = await response.json();
      
      if (data.valid) {
        setSelectedInvitation(data.invitation);
        toast({
          title: 'Valid Invitation',
          description: `Invitation from ${data.invitation.targetHealthSystemName} verified`,
        });
        analyzeMigration(data.invitation.targetHealthSystemId);
      } else {
        toast({
          title: 'Invalid Code',
          description: data.message || 'The invitation code is not valid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate invitation code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeMigration = async (targetHealthSystemId: number) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/migration/analyze', {
        targetHealthSystemId
      });
      const data = await response.json();
      setMigrationAnalysis(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze migration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeMigration = async () => {
    if (!selectedInvitation || !migrationAnalysis) return;

    setIsMigrating(true);
    setMigrationProgress(0);

    try {
      // Start migration
      const response = await apiRequest('POST', '/api/migration/execute', {
        invitationCode: selectedInvitation.invitationCode,
        targetHealthSystemId: selectedInvitation.targetHealthSystemId
      });
      
      const result = await response.json();
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // Wait for migration to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      toast({
        title: 'Migration Complete',
        description: `Successfully migrated ${result.migratedCount} patients to ${selectedInvitation.targetHealthSystemName}`,
      });

      // Redirect to dashboard after successful migration
      setTimeout(() => {
        queryClient.invalidateQueries();
        navigate('/');
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: 'Migration Failed',
        description: error.message || 'An error occurred during migration',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      queryClient.clear();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/auth');
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Navigation header */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Practice Migration Portal</h1>
        <p className="text-muted-foreground">
          Securely transfer your patient data when joining a new healthcare organization
        </p>
      </div>

      {/* Security Notice */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>HIPAA-Compliant Migration</AlertTitle>
        <AlertDescription>
          All patient data transfers are encrypted and comply with HIPAA regulations. 
          Only authorized invitations from verified healthcare organizations are accepted.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invitations">Active Invitations</TabsTrigger>
          <TabsTrigger value="new-migration">Enter Invitation Code</TabsTrigger>
        </TabsList>

        {/* Active Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Invitations</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any pending migration invitations at this time.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('new-migration')}>
                    Enter Invitation Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{invitation.targetHealthSystemName}</CardTitle>
                        <CardDescription>
                          Invited by {invitation.createdByUserName}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {invitation.message && (
                      <p className="text-sm text-muted-foreground mb-4">{invitation.message}</p>
                    )}
                    <Button 
                      onClick={() => {
                        setSelectedInvitation(invitation);
                        analyzeMigration(invitation.targetHealthSystemId);
                      }}
                      className="w-full"
                    >
                      Review Migration Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Enter Code Tab */}
        <TabsContent value="new-migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enter Invitation Code</CardTitle>
              <CardDescription>
                Enter the secure invitation code provided by the healthcare organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter invitation code"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  maxLength={12}
                />
                <Button 
                  onClick={validateInvitationCode}
                  disabled={isLoading || !invitationCode.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
              
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Invitation codes are case-sensitive and expire after 30 days. 
                  Contact the inviting organization if you need a new code.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Migration Analysis Results */}
      {selectedInvitation && migrationAnalysis && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Migration Analysis</CardTitle>
            <CardDescription>
              Migrating to {selectedInvitation.targetHealthSystemName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{migrationAnalysis.totalPatients}</div>
                <div className="text-sm text-muted-foreground">Total Patients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{migrationAnalysis.autoMigrateCount}</div>
                <div className="text-sm text-muted-foreground">Auto-Migrate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{migrationAnalysis.requiresConsentCount}</div>
                <div className="text-sm text-muted-foreground">Requires Consent</div>
              </div>
            </div>

            {/* Patient Categories */}
            <div className="space-y-2">
              <h4 className="font-medium mb-2">Patient Categories</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span>Clinic Patients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{migrationAnalysis.patientCategories.clinicPatients}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Private Practice Patients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{migrationAnalysis.patientCategories.privatePatients}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span>Hospital Patients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{migrationAnalysis.patientCategories.hospitalPatients}</span>
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Migration Progress */}
            {isMigrating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Migration Progress</span>
                  <span>{migrationProgress}%</span>
                </div>
                <Progress value={migrationProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={executeMigration}
                disabled={isMigrating}
                className="flex-1"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Execute Migration
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedInvitation(null);
                  setMigrationAnalysis(null);
                }}
                disabled={isMigrating}
              >
                Cancel
              </Button>
            </div>

            {/* Legal Notice */}
            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                By proceeding with this migration, you confirm that you have the legal authority to transfer 
                these patient records and that this transfer complies with all applicable HIPAA regulations 
                and state laws. An audit log of this migration will be maintained for compliance purposes.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}