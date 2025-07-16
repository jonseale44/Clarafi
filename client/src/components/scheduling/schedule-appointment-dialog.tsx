import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Calendar, User, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AIDurationDisplay } from "./ai-duration-display";
import { useAuth } from "@/hooks/use-auth";

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
}

interface ScheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatient?: Patient;
  providerId?: number;
  locationId?: number;
  selectedDate?: Date;
  selectedTime?: string;
}

export function ScheduleAppointmentDialog({
  open,
  onOpenChange,
  preselectedPatient,
  providerId,
  locationId,
  selectedDate = new Date(),
  selectedTime
}: ScheduleAppointmentDialogProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient || null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  
  // Form fields
  const [appointmentType, setAppointmentType] = useState("follow-up");
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState(selectedTime || "09:00");
  const [duration, setDuration] = useState("20");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [notes, setNotes] = useState("");
  
  // AI predictions state
  const [aiPrediction, setAiPrediction] = useState<{
    aiPredictedDuration: number;
    patientVisibleDuration: number;
    providerScheduledDuration: number;
    complexityFactors?: any;
  } | null>(null);
  const [fetchingPrediction, setFetchingPrediction] = useState(false);

  // Set preselected patient if provided
  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatient(preselectedPatient);
    }
  }, [preselectedPatient]);

  // Update date when selectedDate prop changes
  useEffect(() => {
    setDate(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setDate(format(selectedDate, 'yyyy-MM-dd'));
      setTime(selectedTime || "09:00");
      setDuration("20");
      setAppointmentType("follow-up");
      setChiefComplaint("");
      setNotes("");
      if (!preselectedPatient) {
        setSelectedPatient(null);
      }
    }
  }, [open, selectedDate, preselectedPatient]);

  // Fetch AI prediction when relevant fields change
  useEffect(() => {
    if (!selectedPatient || !date || !time || !appointmentType) {
      setAiPrediction(null);
      return;
    }

    const fetchPrediction = async () => {
      setFetchingPrediction(true);
      try {
        const effectiveProviderId = providerId || currentUser?.id;
        if (!effectiveProviderId) {
          return;
        }

        const response = await fetch('/api/scheduling/appointments/preview-duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: selectedPatient.id,
            providerId: effectiveProviderId,
            appointmentType,
            appointmentDate: date,
            appointmentTime: time,
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          setAiPrediction(prediction);
        }
      } catch (error) {
        console.error('Error fetching AI prediction:', error);
      } finally {
        setFetchingPrediction(false);
      }
    };

    fetchPrediction();
  }, [selectedPatient, providerId, currentUser?.id, appointmentType, date, time]);


  // Get user's locations
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
    enabled: open,
  });

  // Get providers for selected location
  const { data: providers = [] } = useQuery({
    queryKey: ['/api/users', { role: 'provider' }],
    enabled: open,
  });

  // Query for patient search - show all patients initially, then filter by search
  const { data: allPatients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    enabled: open && !preselectedPatient,
  });

  // Filter patients based on search query
  const patients = patientSearchQuery.length > 0
    ? allPatients.filter(patient => {
        const searchLower = patientSearchQuery.toLowerCase();
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        return fullName.includes(searchLower) || patient.mrn.toLowerCase().includes(searchLower);
      })
    : allPatients;

  // Get appointment types
  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['/api/scheduling/appointment-types'],
    enabled: open,
  });

  const handleScheduleAppointment = async () => {
    console.log('📅 [ScheduleAppointment] Starting appointment scheduling');
    console.log('📅 [ScheduleAppointment] Selected patient:', selectedPatient);
    console.log('📅 [ScheduleAppointment] Available providers:', providers);
    console.log('📅 [ScheduleAppointment] Available locations:', locations);
    console.log('📅 [ScheduleAppointment] Current state:', {
      date,
      time,
      appointmentType,
      duration,
      chiefComplaint,
      notes
    });

    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('📅 [ScheduleAppointment] Current user:', currentUser);
      
      // Get the current user's ID as provider - use either passed providerId or current user
      const effectiveProviderId = providerId || currentUser?.id;
      const selectedLocationId = locationId || locations[0]?.id;
      
      if (!effectiveProviderId) {
        toast({
          title: "Error",
          description: "No provider selected. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const appointmentData = {
        patientId: selectedPatient.id,
        providerId: effectiveProviderId,
        locationId: selectedLocationId,
        appointmentDate: date,
        appointmentTime: time,
        appointmentTypeId: 1, // Default for now
        appointmentType,
        chiefComplaint,
        notes,
        duration: aiPrediction ? aiPrediction.providerScheduledDuration : parseInt(duration),
        patientVisibleDuration: aiPrediction ? aiPrediction.patientVisibleDuration : parseInt(duration),
        useAiScheduling: true, // Enable AI scheduling
      };
      
      console.log('📅 [ScheduleAppointment] Sending appointment data:', appointmentData);

      const response = await fetch('/api/scheduling/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      const responseData = await response.json();
      console.log('📅 [ScheduleAppointment] Response:', response.status, responseData);
      
      if (!response.ok) {
        console.error('📅 [ScheduleAppointment] Error response:', responseData);
        
        // Handle conflict errors specifically
        if (response.status === 409) {
          toast({
            title: "Time Slot Unavailable",
            description: responseData.message || "This time slot conflicts with an existing appointment",
            variant: "destructive",
          });
          onOpenChange(false);
          return;
        }
        
        throw new Error(responseData.error || 'Failed to schedule appointment');
      }

      toast({
        title: "Appointment Scheduled",
        description: `Appointment scheduled for ${selectedPatient.firstName} ${selectedPatient.lastName} on ${format(new Date(date), 'MMMM d, yyyy')} at ${time}`,
      });
      
      // Invalidate all appointment queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient">Patient</Label>
              {preselectedPatient ? (
                <div className="mt-2 p-3 border rounded-md bg-gray-50">
                  <div className="font-medium">{preselectedPatient.firstName} {preselectedPatient.lastName}</div>
                  <div className="text-sm text-gray-500">
                    DOB: {new Date(preselectedPatient.dateOfBirth).toLocaleDateString()} • MRN: {preselectedPatient.mrn}
                  </div>
                </div>
              ) : (
                <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={patientSearchOpen}
                      className="w-full justify-between mt-2"
                    >
                      {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Search for patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search by name or MRN..."
                        value={patientSearchQuery}
                        onValueChange={setPatientSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No patients found.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.firstName} ${patient.lastName}`}
                              onSelect={() => {
                                setSelectedPatient(patient);
                                setPatientSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                                <div className="text-sm text-gray-500">
                                  <span>DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                                  <span className="mx-2">•</span>
                                  <span>MRN: {patient.mrn}</span>
                                </div>
                                {patient.address && (
                                  <span className="text-xs text-gray-400">
                                    {patient.address}, {patient.city}, {patient.state}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div>
              <Label htmlFor="appointment-type">Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Select value={time} onValueChange={setTime}>
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
            <Select 
              value={aiPrediction ? aiPrediction.providerScheduledDuration.toString() : duration} 
              onValueChange={setDuration}
              disabled={!!aiPrediction}
            >
              <SelectTrigger id="duration" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="40">40 minutes</SelectItem>
                <SelectItem value="50">50 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="70">70 minutes</SelectItem>
                <SelectItem value="80">80 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
            {!aiPrediction && (
              <p className="text-sm text-gray-500 mt-1">
                ✨ AI will predict actual duration based on patient and visit type
              </p>
            )}
            {aiPrediction && (
              <p className="text-sm text-blue-600 mt-1">
                🤖 AI-adjusted duration based on patient complexity
              </p>
            )}
          </div>

          {/* AI Duration Prediction Display */}
          {aiPrediction && (
            <div className="mt-4">
              <AIDurationDisplay
                baseDuration={parseInt(duration)}
                patientVisibleDuration={aiPrediction.patientVisibleDuration}
                providerScheduledDuration={aiPrediction.providerScheduledDuration}
                aiPredictedDuration={aiPrediction.aiPredictedDuration}
                complexityFactors={aiPrediction.complexityFactors}
              />
            </div>
          )}

          <div>
            <Label htmlFor="chief-complaint">Chief Complaint</Label>
            <Textarea 
              id="chief-complaint"
              placeholder="Enter reason for visit..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea 
              id="notes"
              placeholder="Any special instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleAppointment}>
              Schedule Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}