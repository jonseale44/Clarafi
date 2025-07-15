-- Advanced AI Scheduling System Tables
-- Created: January 16, 2025
-- Purpose: Implement next-generation scheduling system that exceeds Epic/Athena capabilities

-- Scheduling AI Configuration - Global factors that can be measured
CREATE TABLE IF NOT EXISTS scheduling_ai_factors (
  id SERIAL PRIMARY KEY,
  factor_category TEXT NOT NULL, -- 'patient', 'provider', 'visit', 'environmental', 'operational', 'dynamic'
  factor_name TEXT NOT NULL UNIQUE, -- 'problem_count', 'medication_count', 'no_show_risk', etc.
  factor_description TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'number', 'boolean', 'percentage', 'time_series'
  
  -- Default configuration
  default_enabled BOOLEAN DEFAULT true,
  default_weight DECIMAL(5, 2) DEFAULT 50.00, -- 0-100
  
  -- Calculation method
  calculation_method TEXT, -- SQL query or function name
  source_table TEXT, -- Where data comes from
  update_frequency TEXT, -- 'realtime', 'hourly', 'daily', 'weekly'
  
  -- Impact on duration
  impact_direction TEXT, -- 'increase', 'decrease', 'both'
  max_impact_minutes INTEGER, -- Maximum minutes this factor can add/subtract
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Factor Weights - Per provider/location customization
CREATE TABLE IF NOT EXISTS scheduling_ai_weights (
  id SERIAL PRIMARY KEY,
  factor_id INTEGER NOT NULL REFERENCES scheduling_ai_factors(id),
  
  -- Scope (can be provider-specific, location-specific, or health system wide)
  provider_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  health_system_id INTEGER REFERENCES health_systems(id),
  
  -- Customized settings
  enabled BOOLEAN NOT NULL,
  weight DECIMAL(5, 2) NOT NULL, -- 0-100
  
  -- Override calculation parameters
  custom_parameters JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id)
);

-- Patient Scheduling Patterns - AI learning data per patient
CREATE TABLE IF NOT EXISTS patient_scheduling_patterns (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  
  -- Historical patterns
  avg_visit_duration DECIMAL(5, 2), -- minutes
  avg_duration_by_type JSONB, -- {annual: 45, follow_up: 22}
  visit_duration_std_dev DECIMAL(5, 2),
  
  -- Arrival patterns
  avg_arrival_delta DECIMAL(5, 2), -- minutes early/late (negative = early)
  arrival_consistency DECIMAL(5, 2), -- 0-100 score
  
  -- No-show patterns
  no_show_rate DECIMAL(5, 2), -- percentage
  no_show_by_day_of_week JSONB,
  no_show_by_time_of_day JSONB,
  last_no_show_date DATE,
  
  -- Communication patterns
  preferred_reminder_time INTEGER, -- hours before appointment
  response_rate DECIMAL(5, 2), -- percentage
  preferred_contact_method TEXT, -- 'sms', 'email', 'phone', 'portal'
  
  -- Complexity indicators
  avg_question_count DECIMAL(5, 2), -- from transcripts
  portal_message_frequency DECIMAL(5, 2), -- messages per month
  
  -- Special considerations
  requires_interpreter BOOLEAN DEFAULT false,
  mobility_issues BOOLEAN DEFAULT false,
  cognitive_considerations BOOLEAN DEFAULT false,
  
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider Scheduling Patterns - AI learning data per provider
CREATE TABLE IF NOT EXISTS provider_scheduling_patterns (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id), -- Can be location-specific
  
  -- Performance metrics
  avg_visit_duration DECIMAL(5, 2),
  avg_duration_by_type JSONB,
  avg_duration_by_hour JSONB, -- Performance by hour of day
  
  -- Efficiency patterns
  avg_transition_time DECIMAL(5, 2), -- Time between patients
  documentation_lag DECIMAL(5, 2), -- Minutes to complete notes
  
  -- Schedule adherence
  on_time_percentage DECIMAL(5, 2),
  avg_running_behind DECIMAL(5, 2), -- minutes
  catch_up_patterns JSONB,
  
  -- Workload preferences
  preferred_patient_load INTEGER, -- per day
  max_complex_visits INTEGER, -- per day
  buffer_preferences JSONB,
  
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointment Duration History - Actual vs predicted for AI learning
CREATE TABLE IF NOT EXISTS appointment_duration_history (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id),
  
  -- Predictions
  ai_predicted_duration INTEGER NOT NULL, -- minutes
  provider_scheduled_duration INTEGER NOT NULL, -- What provider actually scheduled
  patient_visible_duration INTEGER NOT NULL, -- What patient saw
  
  -- Actuals
  actual_duration INTEGER, -- Actual visit duration
  actual_arrival_delta INTEGER, -- Minutes early/late
  
  -- Factors used in prediction
  factors_used JSONB,
  
  -- Feedback for learning
  prediction_accuracy DECIMAL(5, 2), -- percentage
  provider_feedback TEXT, -- 'too_short', 'too_long', 'just_right'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduling Templates - For non-AI traditional scheduling
CREATE TABLE IF NOT EXISTS scheduling_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scope
  provider_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  health_system_id INTEGER REFERENCES health_systems(id),
  
  -- Template configuration
  slot_duration INTEGER NOT NULL, -- 15, 20, 30 minutes
  start_time TEXT NOT NULL, -- "08:00"
  end_time TEXT NOT NULL, -- "17:00"
  
  -- Breaks and buffers
  lunch_start TEXT,
  lunch_duration INTEGER, -- minutes
  buffer_between_appts INTEGER DEFAULT 0,
  
  -- Rules
  allow_double_booking BOOLEAN DEFAULT false,
  max_patients_per_day INTEGER,
  
  -- Days of week (stored as array of integers 0-6)
  days_of_week INTEGER[],
  
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id)
);

-- Appointment Types - Define visit types and their default durations
CREATE TABLE IF NOT EXISTS appointment_types (
  id SERIAL PRIMARY KEY,
  
  -- Scope
  health_system_id INTEGER REFERENCES health_systems(id),
  location_id INTEGER REFERENCES locations(id),
  
  -- Type details
  type_name TEXT NOT NULL, -- 'new_patient', 'follow_up', 'annual_physical', etc.
  type_code TEXT NOT NULL, -- Short code for scheduling
  category TEXT NOT NULL, -- 'routine', 'acute', 'preventive', 'procedure'
  
  -- Duration configuration
  default_duration INTEGER NOT NULL, -- minutes
  min_duration INTEGER NOT NULL,
  max_duration INTEGER NOT NULL,
  
  -- Scheduling rules
  allow_online_scheduling BOOLEAN DEFAULT true,
  requires_pre_auth BOOLEAN DEFAULT false,
  requires_special_prep BOOLEAN DEFAULT false,
  prep_instructions TEXT,
  
  -- Resource requirements
  default_resource_requirements JSONB,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Preferences - Provider preferences for their schedule
CREATE TABLE IF NOT EXISTS schedule_preferences (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  
  -- AI vs Template preference
  use_ai_scheduling BOOLEAN DEFAULT true,
  ai_aggressiveness DECIMAL(5, 2) DEFAULT 50.00, -- 0-100
  
  -- Time preferences
  preferred_start_time TEXT, -- "08:00"
  preferred_end_time TEXT, -- "17:00"
  preferred_lunch_time TEXT,
  preferred_lunch_duration INTEGER, -- minutes
  
  -- Patient load preferences
  ideal_patients_per_day INTEGER,
  max_patients_per_day INTEGER,
  preferred_buffer_minutes INTEGER DEFAULT 5,
  
  -- Complex visit handling
  max_complex_visits_per_day INTEGER,
  complex_visit_spacing TEXT, -- 'spread_out', 'morning', 'afternoon'
  
  -- Double booking preferences
  allow_double_booking BOOLEAN DEFAULT false,
  double_booking_rules JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asymmetric Scheduling Configuration - Patient vs Provider view
CREATE TABLE IF NOT EXISTS asymmetric_scheduling_config (
  id SERIAL PRIMARY KEY,
  
  -- Scope
  provider_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  health_system_id INTEGER REFERENCES health_systems(id),
  
  -- Configuration
  enabled BOOLEAN DEFAULT true,
  patient_min_duration INTEGER DEFAULT 20, -- What patient sees minimum
  provider_min_duration INTEGER DEFAULT 10, -- What provider sees minimum
  rounding_interval INTEGER DEFAULT 10, -- Round to nearest X minutes
  
  -- Buffer rules
  default_buffer_minutes INTEGER DEFAULT 0,
  buffer_for_chronic_patients INTEGER DEFAULT 10,
  buffer_threshold_problem_count INTEGER DEFAULT 5,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id)
);

-- Real-time Schedule Adjustments - Track running behind/ahead
CREATE TABLE IF NOT EXISTS realtime_schedule_status (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  schedule_date DATE NOT NULL,
  
  -- Current status
  current_patient_id INTEGER REFERENCES patients(id),
  current_appointment_id INTEGER REFERENCES appointments(id),
  running_behind_minutes INTEGER DEFAULT 0,
  
  -- Tracking
  last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  day_started_at TIMESTAMP,
  estimated_catch_up_time TEXT,
  
  -- AI recommendations
  ai_recommendations JSONB
);

-- Resource Management - Rooms and equipment
CREATE TABLE IF NOT EXISTS scheduling_resources (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  
  -- Resource details
  resource_type TEXT NOT NULL, -- 'room', 'equipment', 'staff'
  resource_name TEXT NOT NULL,
  resource_code TEXT,
  
  -- Capabilities
  capabilities TEXT[], -- ['exam', 'procedure', 'xray']
  capacity INTEGER DEFAULT 1, -- How many can use simultaneously
  
  -- Scheduling rules
  requires_cleaning_minutes INTEGER DEFAULT 0,
  maintenance_schedule JSONB,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Bookings - Track resource usage
CREATE TABLE IF NOT EXISTS resource_bookings (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES scheduling_resources(id),
  appointment_id INTEGER REFERENCES appointments(id),
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'reserved', -- 'reserved', 'in_use', 'cleaning', 'available'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id)
);

-- Update appointments table to add asymmetric scheduling columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER,
ADD COLUMN IF NOT EXISTS provider_scheduled_duration INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduling_ai_weights_provider ON scheduling_ai_weights(provider_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_ai_weights_location ON scheduling_ai_weights(location_id);
CREATE INDEX IF NOT EXISTS idx_patient_scheduling_patterns_patient ON patient_scheduling_patterns(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_scheduling_patterns_provider ON provider_scheduling_patterns(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointment_duration_history_appointment ON appointment_duration_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_realtime_schedule_status_provider_date ON realtime_schedule_status(provider_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_date ON resource_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_appointments_asymmetric ON appointments(patient_visible_duration, provider_scheduled_duration);

-- Insert default AI factors for the system
INSERT INTO scheduling_ai_factors (factor_category, factor_name, factor_description, data_type, default_weight, impact_direction, max_impact_minutes) VALUES
-- Patient factors
('patient', 'problem_count', 'Number of active medical problems', 'number', 70.00, 'increase', 15),
('patient', 'medication_count', 'Number of active medications', 'number', 60.00, 'increase', 10),
('patient', 'age_over_65', 'Patient is over 65 years old', 'boolean', 50.00, 'increase', 10),
('patient', 'new_patient', 'First visit with this provider', 'boolean', 90.00, 'increase', 30),
('patient', 'chronic_conditions', 'Has diabetes, CHF, COPD, etc.', 'boolean', 80.00, 'increase', 20),
('patient', 'mental_health_dx', 'Has psychiatric diagnosis', 'boolean', 75.00, 'increase', 15),
('patient', 'language_barrier', 'Requires interpreter', 'boolean', 85.00, 'increase', 15),
('patient', 'mobility_issues', 'Has mobility/transfer needs', 'boolean', 70.00, 'increase', 10),

-- Provider factors
('provider', 'provider_efficiency', 'Provider speed relative to peers', 'percentage', 80.00, 'both', 10),
('provider', 'documentation_speed', 'Average note completion time', 'time_series', 60.00, 'increase', 5),
('provider', 'running_behind', 'Currently behind schedule', 'number', 90.00, 'decrease', 10),
('provider', 'fatigue_level', 'Based on patients seen today', 'percentage', 70.00, 'increase', 5),

-- Visit factors
('visit', 'visit_type', 'Type of appointment', 'text', 100.00, 'both', 45),
('visit', 'chief_complaint_complexity', 'AI-analyzed complaint complexity', 'percentage', 85.00, 'increase', 20),
('visit', 'preventive_care_due', 'Overdue screenings/vaccines', 'boolean', 65.00, 'increase', 10),
('visit', 'follow_up_interval', 'Days since last visit', 'number', 55.00, 'both', 10),

-- Environmental factors
('environmental', 'day_of_week', 'Monday vs Friday patterns', 'text', 40.00, 'both', 5),
('environmental', 'time_of_day', 'Morning vs afternoon', 'text', 45.00, 'both', 5),
('environmental', 'season', 'Flu season, allergy season', 'text', 50.00, 'increase', 10),
('environmental', 'holiday_proximity', 'Near major holidays', 'boolean', 60.00, 'increase', 5),

-- Operational factors
('operational', 'same_day_appointment', 'Scheduled today', 'boolean', 70.00, 'increase', 5),
('operational', 'double_booked', 'Overlapping appointments', 'boolean', 80.00, 'decrease', 10),
('operational', 'staff_availability', 'MA/nurse coverage', 'percentage', 65.00, 'both', 5),
('operational', 'room_availability', 'Exam rooms free', 'percentage', 75.00, 'both', 5),

-- Dynamic factors
('dynamic', 'portal_messages', 'Recent patient messages', 'number', 55.00, 'increase', 5),
('dynamic', 'lab_results_pending', 'Abnormal results to discuss', 'boolean', 70.00, 'increase', 10),
('dynamic', 'prior_visit_overtime', 'Last visit ran long', 'boolean', 75.00, 'increase', 10),
('dynamic', 'no_show_risk', 'Predicted no-show probability', 'percentage', 85.00, 'decrease', 15);