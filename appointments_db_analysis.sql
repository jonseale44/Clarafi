-- List all columns in database appointments table not in schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND table_schema = 'public'
AND column_name NOT IN (
  'id', 'patient_id', 'provider_id', 'location_id', 
  'appointment_date', 'start_time', 'end_time', 'duration',
  'patient_visible_duration', 'provider_scheduled_duration',
  'appointment_type', 'appointment_type_id', 'chief_complaint', 'visit_reason',
  'status', 'confirmation_status', 'checked_in_at', 'checked_in_by',
  'room_assignment', 'urgency_level', 'scheduling_notes',
  'patient_preferences', 'ai_scheduling_data', 'reminders_sent',
  'last_reminder_sent', 'communication_preferences',
  'external_appointment_id', 'synced_at', 'insurance_verified',
  'verified_by', 'recurring_rule', 'recurring_parent_id',
  'waitlist_priority', 'waitlist_reason', 'encounter_id',
  'cancelled_at', 'cancelled_by', 'cancellation_reason',
  'completed_at', 'completed_by', 'no_show_marked_at',
  'no_show_marked_by', 'notes', 'created_at', 'updated_at',
  'created_by', 'updated_by', 'communication_status',
  'durationMinutes', 'aiPredictedDuration', 'actualDuration',
  'useAiScheduling', 'resourceRequirements', 'tags',
  'insuranceVerificationNotes', 'copayCollected', 'copayAmount',
  'formsCompleted', 'vitalSignsTaken', 'roomNumber',
  'intakeCompletedAt', 'providerReadyAt', 'visitCompletedAt',
  'noShowReason', 'lateCancellationReason', 'rescheduledFrom',
  'rescheduledReason', 'parentAppointmentId', 'recurrenceRule',
  'recurrenceExceptions', 'reminderSent', 'reminderSentAt',
  'confirmationSent', 'confirmationSentAt', 'patientConfirmed',
  'patientConfirmedAt', 'waitListPriority', 'referringProvider',
  'referralReason', 'interpreterNeeded', 'interpreterLanguage',
  'wheelchairAccessible', 'specialInstructions', 'preAppointmentNotes',
  'postAppointmentNotes', 'billingNotes', 'chartReviewed',
  'labsReviewed', 'imagesReviewed', 'medicationsReconciled',
  'problemsReviewed', 'aiConfidenceScore', 'durationManuallyOverridden',
  'reminderPreferences'
)
ORDER BY column_name;
