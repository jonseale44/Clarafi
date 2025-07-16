import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, startOfDay, addMonths, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin, Check, ChevronsUpDown, Calendar, Trash2, Edit } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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
  const [viewMode, setViewMode] = useState<"week" | "day" | "month">("week");
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; name: string } | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  
  // State for appointment details dialog
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [appointmentDetailsDate, setAppointmentDetailsDate] = useState<Date | null>(null);
  const [appointmentDetailsTime, setAppointmentDetailsTime] = useState<string | null>(null);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  
  // State for delete confirmation
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Mutation for updating appointments (drag and drop)
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, date, time }: { appointmentId: number; date: string; time: string }) => {
      console.log('🎯 [UPDATE MUTATION] Starting update request:', {
        appointmentId,
        date,
        time,
        url: `/api/scheduling/appointments/${appointmentId}`
      });
      
      const response = await fetch(`/api/scheduling/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDate: date, appointmentTime: time })
      });
      
      console.log('🎯 [UPDATE MUTATION] Response status:', response.status);
      console.log('🎯 [UPDATE MUTATION] Response headers:', response.headers);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🎯 [UPDATE MUTATION] Error response:', errorData);
        console.error('🎯 [UPDATE MUTATION] Full error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || 'Failed to update appointment');
      }
      
      const data = await response.json();
      console.log('🎯 [UPDATE MUTATION] Success response:', data);
      return data;
    },
    onSuccess: () => {
      console.log('🎯 [UPDATE MUTATION] Success callback triggered');
      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been successfully moved.",
      });
      // Invalidate queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
    },
    onError: (error) => {
      console.error('🎯 [UPDATE MUTATION] Error callback triggered:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule appointment. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleAppointmentDrop = (appointment: Appointment, newDate: Date, newTime: string) => {
    console.log('🎯 [DRAG-DROP] handleAppointmentDrop called:', {
      appointmentId: appointment.id,
      originalDate: appointment.appointmentDate,
      originalTime: appointment.appointmentTime,
      newDate: newDate.toISOString(),
      newTime: newTime
    });
    
    // Format date as YYYY-MM-DD
    const formattedDate = format(newDate, 'yyyy-MM-dd');
    
    console.log('🎯 [DRAG-DROP] Formatted date:', formattedDate);
    
    // Don't update if dropped on same date and time
    if (appointment.appointmentDate === formattedDate && appointment.appointmentTime === newTime) {
      console.log('🎯 [DRAG-DROP] Same date and time, skipping update');
      return;
    }
    
    console.log('🎯 [DRAG-DROP] Calling updateAppointmentMutation with:', {
      appointmentId: appointment.id,
      date: formattedDate,
      time: newTime
    });
    
    updateAppointmentMutation.mutate({
      appointmentId: appointment.id,
      date: formattedDate,
      time: newTime
    });
  };
  
  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart),
        end: addDays(startOfWeek(monthEnd), 6)
      };
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      return {
        start: weekStart,
        end: addDays(weekStart, 6)
      };
    } else {
      // Day view
      return {
        start: startOfDay(currentDate),
        end: startOfDay(currentDate)
      };
    }
  };
  
  const { start: startDate, end: endDate } = getDateRange();
  
  // Mutation for deleting appointments
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await fetch(`/api/scheduling/appointments/${appointmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
      setShowDeleteConfirm(false);
      setAppointmentToDelete(null);
      setShowAppointmentDetails(false);
      // Invalidate queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for completing appointments
  const completeAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await fetch(`/api/scheduling/appointments/${appointmentId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to complete appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed. Historical duration data has been recorded for future AI predictions.",
      });
      setShowAppointmentDetails(false);
      // Invalidate queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete appointment. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/scheduling/appointments', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      providerId,
      locationId
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(providerId && { providerId: providerId.toString() }),
        ...(locationId && { locationId: locationId.toString() })
      });
      const response = await fetch(`/api/scheduling/appointments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
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
  
  const navigate = (direction: number) => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, direction * 7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, direction));
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, direction));
    }
  };
  
  const getAppointmentsForDay = (date: Date) => {
    if (!appointments) return [];
    return appointments.filter(apt => {
      // Parse the date string as local time, not UTC
      const [year, month, day] = apt.appointmentDate.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day);
      return isSameDay(appointmentDate, date);
    });
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 h-full">
        {weekDays.map((date) => {
          const dayAppointments = getAppointmentsForDay(date);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div 
              key={date.toISOString()} 
              className={cn(
                "border rounded-lg p-2 md:p-3 min-h-[200px] md:min-h-[300px] lg:min-h-[400px] hover:bg-gray-50 cursor-pointer transition-all relative overflow-hidden",
                isSelected && "border-blue-500 bg-blue-50 shadow-md",
                !isSelected && "border-gray-200",
                isToday && "ring-2 ring-blue-400",
                isDragging && "opacity-50"
              )}
              onClick={() => setSelectedDate(date)}
              onDoubleClick={(e) => {
                // Only open new appointment if clicking on empty space, not on an appointment
                if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('text-gray-400') || (e.target as HTMLElement).classList.contains('no-appointments')) {
                  setAppointmentDetailsDate(date);
                  setAppointmentDetailsTime('09:00'); // Default time
                  setShowNewAppointmentDialog(true);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-blue-100');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-blue-100');
              }}
              onDrop={(e) => {
                console.log('🎯 [DROP] Drop event triggered on date:', format(date, 'yyyy-MM-dd'));
                console.log('🎯 [DROP] Dragged appointment:', draggedAppointment);
                e.preventDefault();
                e.currentTarget.classList.remove('bg-blue-100');
                if (draggedAppointment) {
                  console.log('🎯 [DROP] Calling handleAppointmentDrop');
                  handleAppointmentDrop(draggedAppointment, date, draggedAppointment.appointmentTime);
                } else {
                  console.log('🎯 [DROP] No dragged appointment found');
                }
              }}
            >
              <div className="sticky top-0 bg-inherit pb-2 border-b mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm md:text-base">{format(date, 'EEE')}</div>
                    <div className="text-xs md:text-sm text-gray-600">{format(date, 'MMM d')}</div>
                  </div>
                  {dayAppointments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayAppointments.length} appts
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto max-h-[350px]">
                {dayAppointments.length === 0 ? (
                  <div className="no-appointments text-center text-gray-400 text-xs mt-8">
                    No appointments
                  </div>
                ) : (
                  dayAppointments.map((apt) => (
                    <div 
                      key={apt.id}
                      className={cn(
                        "bg-white border rounded-lg p-2 text-xs hover:shadow-md transition-all cursor-move",
                        apt.status === 'confirmed' && "border-green-200 bg-green-50",
                        apt.status === 'pending' && "border-yellow-200 bg-yellow-50",
                        apt.status === 'cancelled' && "border-red-200 bg-red-50 opacity-60",
                        apt.status === 'completed' && "border-gray-300 bg-gray-100",
                        (!apt.status || apt.status === 'scheduled') && "border-blue-200 bg-blue-50"
                      )}
                      draggable
                      onDragStart={(e) => {
                        console.log('🎯 [DRAG-START] Starting drag for appointment:', apt.id, apt.patientName);
                        e.stopPropagation();
                        setIsDragging(true);
                        setDraggedAppointment(apt);
                      }}
                      onDragEnd={() => {
                        console.log('🎯 [DRAG-END] Ending drag');
                        setIsDragging(false);
                        setDraggedAppointment(null);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(apt);
                        setShowAppointmentDetails(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{apt.appointmentTime}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {apt.patientVisibleDuration || apt.duration} min
                        </Badge>
                      </div>
                      <div className="font-medium text-gray-900 truncate">{apt.patientName}</div>
                      <div className="text-gray-600 truncate">{apt.appointmentType}</div>
                      {apt.chiefComplaint && (
                        <div className="text-gray-500 italic truncate mt-1">
                          "{apt.chiefComplaint}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(selectedDate);
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
    
    // Create a map of appointments by hour
    const appointmentsByHour = new Map();
    dayAppointments.forEach(apt => {
      const hour = parseInt(apt.appointmentTime.split(':')[0]);
      if (!appointmentsByHour.has(hour)) {
        appointmentsByHour.set(hour, []);
      }
      appointmentsByHour.get(hour).push(apt);
    });
    
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-800">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {dayAppointments.length} appointments
            </span>
            {realtimeStatus && (
              <span className="flex items-center gap-1 text-orange-600">
                <Clock className="h-4 w-4" />
                Running {realtimeStatus.minutesBehind} min behind
              </span>
            )}
          </div>
        </div>
        
        {/* Time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[auto,1fr] gap-0">
            {hours.map(hour => {
              const hourAppointments = appointmentsByHour.get(hour) || [];
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              
              return (
                <> 
                  {/* Time column */}
                  <div key={`time-${hour}`} className="text-right pr-3 py-2 text-sm text-gray-500 font-medium">
                    {format(new Date(2024, 0, 1, hour), 'h a')}
                  </div>
                  
                  {/* Appointments column */}
                  <div 
                    key={`slot-${hour}`} 
                    className="border-l-2 border-gray-200 pl-4 pr-2 py-2 min-h-[60px] relative hover:bg-gray-50 transition-colors"
                    onDoubleClick={(e) => {
                      // Create new appointment at this time slot
                      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('time-slot-line')) {
                        setAppointmentDetailsDate(selectedDate);
                        setAppointmentDetailsTime(timeString);
                        setShowNewAppointmentDialog(true);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-blue-100');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-blue-100');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-blue-100');
                      if (draggedAppointment) {
                        handleAppointmentDrop(draggedAppointment, selectedDate, timeString);
                      }
                    }}
                  >
                    {hourAppointments.length === 0 ? (
                      <div className="h-full flex items-center">
                        <div className="time-slot-line h-0.5 bg-gray-100 w-full"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {hourAppointments.map((apt) => {
                          const minutes = parseInt(apt.appointmentTime.split(':')[1]);
                          const topOffset = (minutes / 60) * 60; // Convert minutes to pixels
                          
                          return (
                            <div
                              key={apt.id}
                              className={cn(
                                "rounded-lg p-3 shadow-sm border-l-4 cursor-move hover:shadow-md transition-all",
                                "bg-gradient-to-r",
                                apt.status === 'confirmed' && "from-green-50 to-green-100 border-green-500",
                                apt.status === 'pending' && "from-yellow-50 to-yellow-100 border-yellow-500",
                                apt.status === 'cancelled' && "from-red-50 to-red-100 border-red-500 opacity-60",
                                apt.status === 'completed' && "from-gray-50 to-gray-100 border-gray-500",
                                (!apt.status || apt.status === 'scheduled') && "from-blue-50 to-blue-100 border-blue-500"
                              )}
                              style={{ marginTop: minutes > 0 ? `${topOffset}px` : 0 }}
                              draggable
                              onDragStart={(e) => {
                                setIsDragging(true);
                                setDraggedAppointment(apt);
                              }}
                              onDragEnd={() => {
                                setIsDragging(false);
                                setDraggedAppointment(null);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(apt);
                                setShowAppointmentDetails(true);
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-gray-600" />
                                  <span className="font-semibold text-sm">{apt.appointmentTime}</span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {apt.patientVisibleDuration || apt.duration} min
                                  </Badge>
                                </div>
                                <Badge className={cn(
                                  "text-[10px]",
                                  apt.status === 'confirmed' && "bg-green-500",
                                  apt.status === 'pending' && "bg-yellow-500",
                                  apt.status === 'cancelled' && "bg-red-500",
                                  apt.status === 'completed' && "bg-gray-500",
                                  apt.status === 'no-show' && "bg-orange-500",
                                  (!apt.status || apt.status === 'scheduled') && "bg-blue-500"
                                )}>
                                  {apt.status || 'scheduled'}
                                </Badge>
                              </div>
                              <div className="font-medium text-gray-900">{apt.patientName}</div>
                              <div className="text-sm text-gray-600">{apt.appointmentType}</div>
                              {apt.chiefComplaint && (
                                <div className="text-xs text-gray-500 italic mt-1">
                                  "{apt.chiefComplaint}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = addDays(startOfWeek(monthEnd), 6);
    
    const days = [];
    let day = calendarStart;
    
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return (
      <div className="h-full flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
            <div key={dayName} className="text-xs md:text-sm font-semibold text-center text-gray-600">
              {dayName}
            </div>
          ))}
        </div>
        
        {/* Calendar grid - responsive heights */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 flex-1">
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            
            return (
              <div
                key={index}
                className={cn(
                  "border rounded-lg p-1 md:p-2 min-h-[60px] md:min-h-[100px] lg:min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden",
                  isSelected && "bg-blue-50 border-blue-500",
                  !isSelected && "border-gray-200",
                  isToday && "ring-2 ring-blue-400",
                  !isCurrentMonth && "text-gray-400 bg-gray-50",
                  isDragging && "opacity-50"
                )}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={(e) => {
                  // Only open new appointment if clicking on empty space
                  if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('.appointment-item')) {
                    setAppointmentDetailsDate(day);
                    setAppointmentDetailsTime('09:00'); // Default time
                    setShowNewAppointmentDialog(true);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-blue-100');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-blue-100');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-blue-100');
                  if (draggedAppointment) {
                    handleAppointmentDrop(draggedAppointment, day, draggedAppointment.appointmentTime);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs md:text-sm font-medium">
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded-full",
                      dayAppointments.length > 5 ? "bg-red-100 text-red-700" : 
                      dayAppointments.length > 3 ? "bg-orange-100 text-orange-700" : 
                      "bg-blue-100 text-blue-700"
                    )}>
                      {dayAppointments.length}
                    </span>
                  )}
                </div>
                
                {/* Show appointments based on screen size */}
                <div className="space-y-0.5 hidden md:block">
                  {/* Medium screens: show 2 appointments */}
                  <div className="md:block lg:hidden">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div 
                        key={apt.id} 
                        className="appointment-item text-xs bg-blue-50 border border-blue-200 rounded px-1 py-0.5 truncate cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => {
                          setIsDragging(true);
                          setDraggedAppointment(apt);
                        }}
                        onDragEnd={() => {
                          setIsDragging(false);
                          setDraggedAppointment(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(apt);
                          setShowAppointmentDetails(true);
                        }}
                      >
                        <span className="font-medium">{apt.appointmentTime}</span> {apt.patientName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                  
                  {/* Large screens: show 3 appointments */}
                  <div className="hidden lg:block">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div 
                        key={apt.id} 
                        className={cn(
                          "appointment-item text-xs rounded px-1 py-0.5 truncate border cursor-move hover:shadow-md transition-shadow",
                          apt.status === 'confirmed' ? "bg-green-50 border-green-200" :
                          apt.status === 'pending' ? "bg-yellow-50 border-yellow-200" :
                          "bg-blue-50 border-blue-200"
                        )}
                        draggable
                        onDragStart={(e) => {
                          setIsDragging(true);
                          setDraggedAppointment(apt);
                        }}
                        onDragEnd={() => {
                          setIsDragging(false);
                          setDraggedAppointment(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(apt);
                          setShowAppointmentDetails(true);
                        }}
                      >
                        <span className="font-medium">{apt.appointmentTime}</span> {apt.patientName}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' && `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
            {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
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
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
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
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* New Appointment Dialog */}
      <ScheduleAppointmentDialog
        open={showNewAppointmentDialog}
        onOpenChange={setShowNewAppointmentDialog}
        selectedDate={appointmentDetailsDate || selectedDate}
        selectedTime={appointmentDetailsTime}
        providerId={providerId}
        locationId={locationId}
      />
      
      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    <div className="font-medium">{selectedAppointment.patientName}</div>
                    <div className="text-sm text-gray-500">ID: {selectedAppointment.patientId}</div>
                  </div>
                </div>
                <div>
                  <Label>Provider</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    <div className="font-medium">{selectedAppointment.providerName}</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    {format(new Date(selectedAppointment.appointmentDate), 'MMMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <Label>Time</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    {selectedAppointment.appointmentTime}
                  </div>
                </div>
                <div>
                  <Label>Duration</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    {selectedAppointment.patientVisibleDuration} minutes
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Type</Label>
                <div className="mt-1 p-3 border rounded-md bg-gray-50">
                  {selectedAppointment.appointmentType}
                </div>
              </div>
              
              {selectedAppointment.chiefComplaint && (
                <div>
                  <Label>Chief Complaint</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    {selectedAppointment.chiefComplaint}
                  </div>
                </div>
              )}
              
              {selectedAppointment.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="mt-1 p-3 border rounded-md bg-gray-50">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}
              
              <div>
                <Label>Status</Label>
                <div className="mt-1 p-3 border rounded-md bg-gray-50">
                  <Badge className={cn(
                    selectedAppointment.status === 'confirmed' && "bg-green-500",
                    selectedAppointment.status === 'pending' && "bg-yellow-500",
                    selectedAppointment.status === 'cancelled' && "bg-red-500",
                    selectedAppointment.status === 'completed' && "bg-gray-500",
                    selectedAppointment.status === 'no-show' && "bg-orange-500",
                    (!selectedAppointment.status || selectedAppointment.status === 'scheduled') && "bg-blue-500"
                  )}>
                    {selectedAppointment.status || 'scheduled'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAppointmentDetails(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAppointmentDetails(false);
                    // TODO: Implement reschedule functionality
                    toast({
                      title: "Coming Soon",
                      description: "Reschedule functionality will be available soon.",
                    });
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
                {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                  <Button
                    variant="default"
                    onClick={() => {
                      if (selectedAppointment) {
                        completeAppointmentMutation.mutate(selectedAppointment.id);
                      }
                    }}
                    disabled={completeAppointmentMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete Appointment
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedAppointment) {
                      deleteAppointmentMutation.mutate(selectedAppointment.id);
                    }
                  }}
                  disabled={deleteAppointmentMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel Appointment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}