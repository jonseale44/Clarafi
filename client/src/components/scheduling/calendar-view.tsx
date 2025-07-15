import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
      <Dialog open={showNewAppointmentDialog} onOpenChange={setShowNewAppointmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <Input 
                  id="patient" 
                  placeholder="Search for patient..." 
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="appointment-type">Appointment Type</Label>
                <Select defaultValue="follow-up">
                  <SelectTrigger id="appointment-type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-patient">New Patient</SelectItem>
                    <SelectItem value="follow-up">Follow Up</SelectItem>
                    <SelectItem value="physical">Annual Physical</SelectItem>
                    <SelectItem value="sick-visit">Sick Visit</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="telehealth">Telehealth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  defaultValue={format(selectedDate, 'yyyy-MM-dd')}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Select defaultValue="09:00">
                  <SelectTrigger id="time" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="08:30">8:30 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="09:30">9:30 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="10:30">10:30 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="12:30">12:30 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:30">1:30 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="15:30">3:30 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="16:30">4:30 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select defaultValue="20">
                <SelectTrigger id="duration" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                ✨ AI will predict actual duration based on patient and visit type
              </p>
            </div>

            <div>
              <Label htmlFor="chief-complaint">Chief Complaint</Label>
              <Textarea 
                id="chief-complaint"
                placeholder="Enter reason for visit..."
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Any special instructions or notes..."
                className="mt-2"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowNewAppointmentDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Appointment Scheduled",
                    description: "The appointment has been successfully added to the calendar.",
                  });
                  setShowNewAppointmentDialog(false);
                }}
              >
                Schedule Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}