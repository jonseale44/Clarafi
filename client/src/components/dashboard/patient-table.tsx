import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, Trash2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Patient } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PatientTableProps {
  patients: Patient[];
}

type SortKey = 'name' | 'mrn' | 'dob' | 'address' | 'location';
type SortDirection = 'asc' | 'desc';

// Helper function to format dates without timezone conversion
const formatDate = (dateString: string): string => {
  // Parse as YYYY-MM-DD and create date in local time
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return format(date, 'MM/dd/yyyy');
};

export function PatientTable({ patients }: PatientTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations to map location IDs to names
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest("DELETE", `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient deleted",
        description: "The patient record has been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting patient",
        description: error.message || "Failed to delete patient",
        variant: "destructive",
      });
    },
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getLocationName = (locationId: number | null | undefined) => {
    if (!locationId) return "Unassigned";
    const location = locations.find((loc: any) => loc.id === locationId);
    return location?.name || "Unknown";
  };

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'name':
          aValue = `${a.lastName}, ${a.firstName}`.toLowerCase();
          bValue = `${b.lastName}, ${b.firstName}`.toLowerCase();
          break;
        case 'mrn':
          aValue = a.mrn;
          bValue = b.mrn;
          break;
        case 'dob':
          aValue = new Date(a.dateOfBirth);
          bValue = new Date(b.dateOfBirth);
          break;
        case 'address':
          aValue = `${a.address || ''} ${a.city || ''} ${a.state || ''}`.toLowerCase();
          bValue = `${b.address || ''} ${b.city || ''} ${b.state || ''}`.toLowerCase();
          break;
        case 'location':
          aValue = getLocationName(a.preferredLocationId).toLowerCase();
          bValue = getLocationName(b.preferredLocationId).toLowerCase();
          break;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [patients, sortKey, sortDirection, locations]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const formatAddress = (patient: Patient) => {
    const parts = [patient.address, patient.city, patient.state];
    const filtered = parts.filter(Boolean);
    return filtered.length > 0 ? filtered.join(', ') : 'Not provided';
  };

  return (
    <div className="rounded-md border" data-median="mobile-patient-table">
      <Table>
        <TableHeader data-median="mobile-table-header">
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('name')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Name
                <SortIcon column="name" />
              </Button>
            </TableHead>
            <TableHead data-median="mobile-hide-column">
              <Button
                variant="ghost"
                onClick={() => handleSort('mrn')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                MRN
                <SortIcon column="mrn" />
              </Button>
            </TableHead>
            <TableHead data-median="hide-on-mobile-app">
              <Button
                variant="ghost"
                onClick={() => handleSort('dob')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Date of Birth
                <SortIcon column="dob" />
              </Button>
            </TableHead>
            <TableHead data-median="hide-on-mobile-app">
              <Button
                variant="ghost"
                onClick={() => handleSort('address')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Address
                <SortIcon column="address" />
              </Button>
            </TableHead>
            <TableHead data-median="hide-on-mobile-app">
              <Button
                variant="ghost"
                onClick={() => handleSort('location')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Clinic Location
                <SortIcon column="location" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPatients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">
                <Link href={`/patients/${patient.id}/chart`}>
                  <span className="text-navy-blue-600 hover:text-navy-blue-800 hover:underline cursor-pointer">
                    {patient.lastName}, {patient.firstName}
                  </span>
                </Link>
              </TableCell>
              <TableCell data-median="mobile-hide-column">{patient.mrn}</TableCell>
              <TableCell data-median="hide-on-mobile-app">{formatDate(patient.dateOfBirth)}</TableCell>
              <TableCell data-median="hide-on-mobile-app">{formatAddress(patient)}</TableCell>
              <TableCell data-median="hide-on-mobile-app">
                <span className={patient.preferredLocationId ? '' : 'text-gray-500 italic'}>
                  {getLocationName(patient.preferredLocationId)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/patients/${patient.id}/chart`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {patient.firstName} {patient.lastName}? 
                          This action cannot be undone and will permanently remove all patient data 
                          including encounters, orders, and medical history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePatientMutation.mutate(patient.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={deletePatientMutation.isPending}
                        >
                          {deletePatientMutation.isPending ? "Deleting..." : "Delete Patient"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}