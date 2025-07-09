// Core EMR Mobile Types
// These types are shared between the mobile app and the main EMR system

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'provider' | 'nurse' | 'ma' | 'front_desk' | 'billing' | 'lab_tech' | 'referral_coordinator' | 'practice_manager' | 'read_only';
  firstName?: string;
  lastName?: string;
  npi?: string;
  healthSystemId: number;
  isActive?: boolean;
}

export interface Patient {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  healthSystemId: number;
  primaryProviderId?: number;
  preferredLocationId?: number;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Encounter {
  id: number;
  patientId: number;
  providerId: number;
  locationId: number;
  encounterDate: string;
  chiefComplaint?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  transcriptionRaw?: string;
  transcriptionProcessed?: string;
  generatedSoapNote?: string;
  signedAt?: string;
  signedBy?: number;
}

export interface VitalSigns {
  id: number;
  patientId: number;
  encounterId?: number;
  recordedAt: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: string;
  oxygenSaturation?: number;
  weight?: number;
  weightUnit?: string;
  height?: number;
  heightUnit?: string;
  bmi?: number;
}

export interface Order {
  id: number;
  patientId: number;
  encounterId: number;
  providerId: number;
  orderType: 'lab' | 'medication' | 'imaging' | 'referral';
  orderDetails: any;
  status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  createdAt: string;
  notes?: string;
}

export interface MedicalProblem {
  id: number;
  patientId: number;
  problemName: string;
  icdCode?: string;
  status: 'active' | 'resolved' | 'chronic' | 'inactive';
  onsetDate?: string;
  resolutionDate?: string;
  notes?: string;
}

export interface Medication {
  id: number;
  patientId: number;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status: 'active' | 'discontinued' | 'completed' | 'on_hold';
  startDate?: string;
  endDate?: string;
  prescriberId?: number;
}

export interface Allergy {
  id: number;
  patientId: number;
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onsetDate?: string;
  status: 'active' | 'inactive' | 'resolved';
}

export interface LabResult {
  id: number;
  patientId: number;
  orderId?: number;
  testName: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  resultDate: string;
  status: 'pending' | 'preliminary' | 'final' | 'corrected';
}

export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  healthSystemId: number;
}

// Voice Recording Types
export interface VoiceRecordingState {
  isRecording: boolean;
  recordingUri?: string;
  transcription?: string;
  isTranscribing: boolean;
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Chart Section Types
export interface ChartSection {
  id: string;
  title: string;
  icon?: string;
  data?: any;
  lastUpdated?: string;
}

// SOAP Note Types
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generatedAt?: string;
  encounterId?: number;
}

// Natural Language Order Types
export interface ParsedOrder {
  type: 'lab' | 'medication' | 'imaging' | 'referral';
  text: string;
  details: any;
  confidence?: number;
}