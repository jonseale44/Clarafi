import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Building2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MigrationWizard } from '@/components/MigrationWizard';
import { useAuth } from '@/hooks/use-auth';

export default function TestMigration() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [testPatientsCreated, setTestPatientsCreated] = useState(false);
  const [selectedTargetHealthSystem, setSelectedTargetHealthSystem] = useState<number | null>(null);
  const [availableHealthSystems, setAvailableHealthSystems] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch available health systems (excluding the user's current one)
    const fetchHealthSystems = async () => {
      try {
        const response = await apiRequest('GET', '/api/health-systems/public');
        const data = await response.json();
        // Filter out the user's current health system
        const otherSystems = data.filter((hs: any) => hs.id !== user?.healthSystemId);
        setAvailableHealthSystems(otherSystems);
      } catch (error) {
        console.error('Failed to fetch health systems:', error);
      }
    };
    
    if (user) {
      fetchHealthSystems();
    }
  }, [user]);

  const createTestPatients = async () => {
    setIsCreating(true);
    
    try {
      // Create test patients with different origins
      const testPatients = [
        // Clinic patient (can auto-migrate)
        {
          firstName: "John",
          lastName: "Clinic",
          dateOfBirth: "1960-05-15",
          gender: "male",
          mrn: "CLINIC001",
          contactNumber: "254-555-0101",
          email: "john.clinic@test.com",
          address: "123 Clinic St, Waco, TX 76707"
        },
        // Hospital patient (requires consent)
        {
          firstName: "Mary",
          lastName: "Hospital",
          dateOfBirth: "1975-08-22",
          gender: "female",
          mrn: "HOSP001",
          contactNumber: "254-555-0102",
          email: "mary.hospital@test.com",
          address: "456 Hospital Ave, Waco, TX 76708"
        },
        // Private practice patient (provider's own)
        {
          firstName: "Robert",
          lastName: "Private",
          dateOfBirth: "1955-03-10",
          gender: "male",
          mrn: "PRIV001",
          contactNumber: "254-555-0103",
          email: "robert.private@test.com",
          address: "789 Private Dr, Waco, TX 76709"
        }
      ];

      const results = await Promise.all(
        testPatients.map(patient => 
          apiRequest('/api/patients', 'POST', patient)
        )
      );

      // Add some medical data to make it interesting
      for (const patient of results) {
        // Add a medical problem
        await apiRequest('/api/medical-problems', 'POST', {
          patientId: patient.id,
          icdCode: "E11.9",
          description: "Type 2 diabetes mellitus without complications",
          status: "active",
          diagnosisDate: "2023-01-15",
          severity: "moderate"
        });

        // Add a medication
        await apiRequest('/api/medications', 'POST', {
          patientId: patient.id,
          medicationName: "Metformin",
          dosage: "500mg",
          frequency: "BID",
          route: "PO",
          status: "active",
          prescribedDate: "2023-01-15"
        });
      }

      setTestPatientsCreated(true);
      toast({
        title: "Test Patients Created",
        description: "Created 3 test patients with different origins for migration testing."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create test patients",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };



  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Migration System</h1>
        
        {!showWizard && (
          <>
            <Alert className="mb-6">
              <Users className="h-4 w-4" />
              <AlertTitle>Migration Testing Scenario</AlertTitle>
              <AlertDescription>
                This page simulates what happens when you transition from individual practice to joining 
                a group practice. The system will analyze your patients and determine which ones can be 
                automatically migrated based on their data origin and HIPAA requirements.
              </AlertDescription>
            </Alert>
            
            {user && (
              <Alert className="mb-4">
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  You're currently part of <strong>{user.healthSystemName || 'your practice'}</strong>. 
                  The migration wizard will help you move appropriate patient data when joining a different practice.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Create Test Patients</CardTitle>
                  <CardDescription>
                    Create sample patients with different data origins to test migration scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Clinic Patient</span>
                      <span className="text-sm text-muted-foreground">- Can auto-migrate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Hospital Patient</span>
                      <span className="text-sm text-muted-foreground">- Requires consent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Private Practice Patient</span>
                      <span className="text-sm text-muted-foreground">- Your derivative work</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={createTestPatients} 
                    disabled={isCreating || testPatientsCreated}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Test Patients...
                      </>
                    ) : testPatientsCreated ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Test Patients Created
                      </>
                    ) : (
                      "Create Test Patients"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Choose Target Practice</CardTitle>
                  <CardDescription>
                    Select which health system or practice you're joining
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Which practice are you joining?
                    </label>
                    <Select
                      value={selectedTargetHealthSystem?.toString() || ""}
                      onValueChange={(value) => setSelectedTargetHealthSystem(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a health system" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHealthSystems.map((hs) => (
                          <SelectItem key={hs.id} value={hs.id.toString()}>
                            {hs.name} {hs.systemType ? `(${hs.systemType})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTargetHealthSystem && (
                    <Alert>
                      <AlertDescription>
                        When you join a new practice, your patients will need to be migrated 
                        based on their origin and HIPAA requirements.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Test Migration</CardTitle>
                  <CardDescription>
                    Launch the migration wizard to see how patients are categorized
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setShowWizard(true)}
                    disabled={!testPatientsCreated || !selectedTargetHealthSystem}
                    className="w-full"
                  >
                    Open Migration Wizard
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Understanding the Migration Process</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Clinic Patients (Auto-migrate)</h4>
                    <p className="text-muted-foreground">
                      Patients seen at the clinic that's adopting the EMR. Since the clinic owns this data,
                      these patients can be automatically migrated when joining a group practice.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Hospital Patients (Consent Required)</h4>
                    <p className="text-muted-foreground">
                      Patients from hospital rounds or other facilities. HIPAA requires explicit consent
                      before transferring their data to a different health system.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Private Practice Patients (Provider's Work)</h4>
                    <p className="text-muted-foreground">
                      Patients from your individual practice. The derivative work (notes, problem lists,
                      medication reconciliation) belongs to you as the provider.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {showWizard && selectedTargetHealthSystem && (
          <MigrationWizard 
            targetHealthSystemId={selectedTargetHealthSystem}
            onComplete={() => {
              setShowWizard(false);
              toast({
                title: "Migration Complete",
                description: "Selected patients have been migrated successfully."
              });
            }}
            onCancel={() => setShowWizard(false)}
          />
        )}
      </div>
    </div>
  );
}