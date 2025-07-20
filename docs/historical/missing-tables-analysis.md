# Missing Tables Analysis

## Tables in Schema but NOT in Database:
- asymmetricSchedulingConfig
- attachmentExtractedContent
- dataModificationLogs
- documentProcessingQueue
- emailNotifications
- emergencyAccessLogs
- externalLabs
- gptLabReviewNotes
- imagingOrders
- medicalHistory (this is being imported in storage.ts but doesn't exist!)
- medicationFormulary
- organizationDocuments
- patientOrderPreferences
- patientSchedulingPatterns
- providerSchedules
- providerSchedulingPatterns
- realtimeScheduleStatus
- resourceBookings
- scheduleExceptions
- schedulePreferences
- schedulingResources
- schedulingRules
- schedulingTemplates
- signatures
- signedOrders
- subscriptionHistory
- subscriptionKeys
- templateShares
- templateVersions
- userAssistantThreads
- userEditPatterns
- userNoteTemplates
- magicLinks

## Tables in Database but NOT in Schema:
- dashboards
- session

## Critical Issues Found:
1. `medicalHistory` is imported in storage.ts line 3 but doesn't exist in database or properly in schema
2. `gptLabReviewNotes` is referenced in deletePatient but doesn't exist in database
3. Many scheduling-related tables are missing
4. Many template-related tables are missing
5. Many subscription/authentication tables are missing