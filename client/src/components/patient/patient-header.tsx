import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Patient } from "@shared/schema";
import { AlertTriangle, Pill } from "lucide-react";

interface PatientHeaderProps {
  patient: Patient;
  allergies: any[];
}

export function PatientHeader({ patient, allergies }: PatientHeaderProps) {
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit", 
      year: "numeric"
    });
  };

  const age = calculateAge(patient.dateOfBirth);
  const criticalAllergies = allergies.filter(allergy => 
    allergy.severity === "severe" || allergy.allergen.toLowerCase().includes("penicillin")
  );

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-6">
          <Avatar className="w-20 h-20 border-2 border-gray-200">
            <AvatarImage 
              src={patient.profilePhotoFilename ? `/uploads/${patient.profilePhotoFilename}` : undefined}
              alt={`${patient.firstName} ${patient.lastName}`}
            />
            <AvatarFallback className="text-lg">
              {patient.firstName[0]}{patient.lastName[0]}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Active Patient
              </Badge>
            </div>
            
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-gray-500">MRN</p>
                <p className="font-medium">{patient.mrn}</p>
              </div>
              <div>
                <p className="text-gray-500">DOB / Age</p>
                <p className="font-medium">
                  {formatDate(patient.dateOfBirth)} ({age} years)
                </p>
              </div>
              <div>
                <p className="text-gray-500">Gender</p>
                <p className="font-medium capitalize">{patient.gender}</p>
              </div>
              <div>
                <p className="text-gray-500">Contact</p>
                <p className="font-medium">{patient.contactNumber || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Critical Alerts */}
        <div className="space-y-2">
          {criticalAllergies.map((allergy, index) => (
            <div key={index} className="flex items-center space-x-2 bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Allergy: {allergy.allergen}</span>
            </div>
          ))}
          
          {patient.activeProblems && Array.isArray(patient.activeProblems) && patient.activeProblems.length > 0 && (
            <div className="flex items-center space-x-2 bg-orange-50 text-orange-800 px-3 py-2 rounded-lg text-sm">
              <Pill className="h-4 w-4" />
              <span>Active Problems: {patient.activeProblems.length}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
