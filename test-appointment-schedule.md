# Test Appointment Scheduling

Please try scheduling an appointment again from the UI. The system should now:

1. Include the providerId (current user ID: 61)
2. Convert date/time strings to proper Date objects
3. Show detailed logging in the console

The appointment data being sent should look like:
```json
{
  "patientId": 67,
  "providerId": 61,
  "locationId": 2,
  "appointmentDate": "2025-07-24",
  "appointmentTime": "09:00",
  "appointmentType": "follow-up",
  "duration": 20,
  "patientVisibleDuration": 20
}
```

The server will convert this to the proper format with startTime and endTime as Date objects.