import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Plus, Clock, MapPin, User, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ScheduleAppointmentDialog } from "@/components/scheduling/schedule-appointment-dialog";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
  providerName: string;
  locationName: string;
  chiefComplaint?: string;
  notes?: string;
  predictedDuration: number;
  patientVisibleDuration: number;
  providerId?: number;
  locationId?: number;
}

interface AppointmentsSectionProps {
  patientId: number;
}

export function AppointmentsSection({ patientId }: AppointmentsSectionProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patient details
  const { data: patient } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: !!patientId,
  });

  // Fetch appointments for this patient (past year to next year)
  const { startDate, endDate, startDateStr, endDateStr } = useMemo(() => {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    return {
      startDate: start,
      endDate: end,
      startDateStr: start.toISOString(),
      endDateStr: end.toISOString()
    };
  }, []); // Empty dependency array ensures dates are calculated only once

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/scheduling/appointments', { 
      patientId,
      startDate: startDateStr,
      endDate: endDateStr
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        patientId: patientId.toString(),
        startDate: startDateStr,
        endDate: endDateStr
      });
      const response = await fetch(`/api/scheduling/appointments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    enabled: !!patientId,
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await fetch(`/api/scheduling/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to cancel appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
      setShowCancelDialog(false);
      setSelectedAppointment(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      case 'no-show':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleDialog(true);
  };

  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelDialog(true);
  };

  const upcomingAppointments = appointments.filter(apt => {
    // Parse the date string as local time, not UTC
    const [year, month, day] = apt.appointmentDate.split('-').map(Number);
    const [hour, minute] = apt.appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hour, minute);
    return appointmentDateTime > new Date();
  });

  const pastAppointments = appointments.filter(apt => {
    // Parse the date string as local time, not UTC
    const [year, month, day] = apt.appointmentDate.split('-').map(Number);
    const [hour, minute] = apt.appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hour, minute);
    return appointmentDateTime <= new Date();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Appointments</h2>
        <Button onClick={() => setShowScheduleDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Schedule Appointment
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              Loading appointments...
            </div>
          </CardContent>
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No appointments scheduled</p>
              <p className="text-sm">Click "Schedule Appointment" to book a visit.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
              {upcomingAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">
                            {appointment.appointmentType}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{(() => {
                              // Parse the date string as local time, not UTC
                              const [year, month, day] = appointment.appointmentDate.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day);
                              return format(localDate, 'MMMM d, yyyy');
                            })()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{appointment.appointmentTime} ({appointment.patientVisibleDuration} min)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{appointment.providerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{appointment.locationName}</span>
                          </div>
                        </div>

                        {appointment.chiefComplaint && (
                          <div className="pt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Reason for visit:</span> {appointment.chiefComplaint}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReschedule(appointment)}
                        >
                          Reschedule
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancel(appointment)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Past Appointments */}
          {pastAppointments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Past Appointments</h3>
              {pastAppointments.slice(0, 5).map((appointment) => (
                <Card key={appointment.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-700">
                            {appointment.appointmentType}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{(() => {
                            // Parse the date string as local time, not UTC
                            const [year, month, day] = appointment.appointmentDate.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return format(localDate, 'MMM d, yyyy');
                          })()}</span>
                          <span>{appointment.appointmentTime}</span>
                          <span>{appointment.providerName}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Schedule Appointment Dialog */}
      {showScheduleDialog && patient && (
        <ScheduleAppointmentDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          preselectedPatient={{
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            mrn: patient.mrn,
            dateOfBirth: patient.dateOfBirth,
          }}
        />
      )}

      {/* Reschedule Appointment Dialog */}
      {showRescheduleDialog && selectedAppointment && patient && (
        <ScheduleAppointmentDialog
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          preselectedPatient={{
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            mrn: patient.mrn,
            dateOfBirth: patient.dateOfBirth,
          }}
          providerId={selectedAppointment.providerId}
          locationId={selectedAppointment.locationId}
          selectedDate={new Date(selectedAppointment.appointmentDate)}
        />
      )}

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent data-median="cancel-appointment-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment?
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md" data-median="appointment-details-summary">
                  <p className="font-medium">{selectedAppointment.appointmentType}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedAppointment.appointmentDate), 'MMMM d, yyyy')} at {selectedAppointment.appointmentTime}
                  </p>
                  <p className="text-sm text-gray-600">with {selectedAppointment.providerName}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAppointment && cancelAppointmentMutation.mutate(selectedAppointment.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}