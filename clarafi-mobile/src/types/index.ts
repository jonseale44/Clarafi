// Shared types for Clarafi Mobile
// These match your existing database schema

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  mrn: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  primaryPhysician?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Encounter {
  id: number;
  patientId: number;
  date: string;
  chiefComplaint?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  vitalSigns?: VitalSigns;
  providerId?: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface Order {
  id: number;
  encounterId: number;
  type: 'medication' | 'lab' | 'imaging' | 'referral';
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  details?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'provider' | 'nurse' | 'ma' | 'front_desk' | 'billing' | 'lab_tech' | 'referral_coordinator' | 'practice_manager' | 'read_only';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}