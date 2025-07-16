import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScheduleAppointmentDialog } from "./schedule-appointment-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CalendarViewProps {
  providerId?: number;
  locationId?: number;
}

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  providerId: number;
  providerName: string;
  locationId: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentTypeId: number;
  appointmentType: string;
  status: string;
  predictedDuration: number;
  patientVisibleDuration: number;
  chiefComplaint?: string;
  notes?: string;
}

export function CalendarView({ providerId, locationId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; name: string } | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  
  // Fetch appointments for the current week
  const startDate = startOfWeek(currentDate);
  const endDate = addDays(startDate, 6);
  
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/scheduling/appointments', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      providerId,
      locationId
    }],
    enabled: true
  });

  // Query for patient search - using search endpoint with proper query parameter
  const { data: patients = [] } = useQuery<Array<{ 
    id: number; 
    firstName: string; 
    lastName: string; 
    mrn: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    phone: string;
  }>>({
    queryKey: ['/api/patients/search', patientSearchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearchQuery)}`);
      if (!response.ok) throw new Error('Failed to search patients');
      return response.json();
    },
    enabled: patientSearchQuery.length > 0, // Start searching immediately
  });
  
  // Fetch real-time schedule status if viewing today
  const { data: realtimeStatus } = useQuery({
    queryKey: ['/api/scheduling/realtime-status', {
      providerId,
      date: selectedDate.toISOString()
    }],
    enabled: isSameDay(selectedDate, new Date()) && !!providerId,
    refetchInterval: 60000 // Refresh every minute
  });
  
  const navigateWeek = (direction: number) => {
    setCurrentDate(addDays(currentDate, direction * 7));
  };
  
  const getAppointmentsForDay = (date: Date) => {
    if (!appointments) return [];
    return appointments.filter(apt => 
      isSameDay(new Date(apt.appointmentDate), date)
    );
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-gray-500';
      case 'no-show': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };
  
  const renderWeekView = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      weekDays.push(date);
    }
    
    return (
      <div className="grid grid-cols-7 gap-2 h-full">
        {weekDays.map((date) => (
          <div 
            key={date.toISOString()} 
            className={`border rounded-lg p-2 min-h-[400px] ${
              isSameDay(date, selectedDate) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            } hover:bg-gray-50 cursor-pointer`}
            onClick={() => setSelectedDate(date)}
          >
            <div className="font-semibold text-sm mb-2">
              {format(date, 'EEE')}
              <br />
              {format(date, 'MMM d')}
            </div>
            <div className="space-y-1">
              {getAppointmentsForDay(date).map((apt) => (
                <div 
                  key={apt.id}
                  className="bg-white border rounded p-1 text-xs hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{apt.appointmentTime}</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status)}`} />
                  </div>
                  <div className="truncate text-gray-600">{apt.patientName}</div>
                  <div className="text-gray-500">{apt.appointmentType}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(selectedDate);
    
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold mb-4">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </div>
        {dayAppointments.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No appointments scheduled for this day
          </Card>
        ) : (
          dayAppointments.map((apt) => (
            <Card key={apt.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{apt.appointmentTime}</span>
                    <Badge variant="outline" className="text-xs">
                      {apt.patientVisibleDuration} min
                    </Badge>
                    {apt.predictedDuration !== apt.patientVisibleDuration && (
                      <Badge variant="secondary" className="text-xs">
                        Provider: {apt.predictedDuration} min
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{apt.patientName}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {apt.appointmentType}
                  </div>
                  {apt.chiefComplaint && (
                    <div className="text-sm text-gray-500">
                      Chief Complaint: {apt.chiefComplaint}
                    </div>
                  )}
                </div>
                <Badge className={getStatusColor(apt.status)}>
                  {apt.status}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
          <Button 
            size="sm" 
            className="ml-4"
            onClick={() => setShowNewAppointmentDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Appointment
          </Button>
        </div>
      </div>
      
      {/* Real-time Status Alert */}
      {realtimeStatus && realtimeStatus.runningBehind && (
        <Card className="mb-4 p-3 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-800">
              Provider is running {realtimeStatus.minutesBehind} minutes behind schedule
            </span>
          </div>
        </Card>
      )}
      
      {/* Calendar Content */}
      <div className="flex-1">
        {viewMode === 'week' ? renderWeekView() : renderDayView()}
      </div>

      {/* New Appointment Dialog */}
      <ScheduleAppointmentDialog
        open={showNewAppointmentDialog}
        onOpenChange={setShowNewAppointmentDialog}
        selectedDate={selectedDate}
        providerId={providerId}
        locationId={locationId}
      />
    </div>
  );
}