#!/bin/bash

echo "Fixing schema import mismatches..."

# Fix patient schema imports
find server -name "*.ts" -exec sed -i 's/insertPatientSchema/insertPatientsSchema as insertPatientSchema/g' {} \;
find server -name "*.ts" -exec sed -i 's/insertPatientAttachmentSchema/insertPatientAttachmentsSchema as insertPatientAttachmentSchema/g' {} \;

# Fix encounter schema imports  
find server -name "*.ts" -exec sed -i 's/insertEncounterSchema/insertEncountersSchema as insertEncounterSchema/g' {} \;

# Fix order schema imports
find server -name "*.ts" -exec sed -i 's/insertOrderSchema/insertOrdersSchema as insertOrderSchema/g' {} \;

# Fix medication schema imports
find server -name "*.ts" -exec sed -i 's/insertMedicationSchema/insertMedicationsSchema as insertMedicationSchema/g' {} \;

# Fix lab order schema imports
find server -name "*.ts" -exec sed -i 's/insertLabOrderSchema/insertLabOrdersSchema as insertLabOrderSchema/g' {} \;

# Fix imaging order schema imports
find server -name "*.ts" -exec sed -i 's/insertImagingOrderSchema/insertImagingOrdersSchema as insertImagingOrderSchema/g' {} \;

# Fix medical problem schema imports
find server -name "*.ts" -exec sed -i 's/insertMedicalProblemSchema/insertMedicalProblemsSchema as insertMedicalProblemSchema/g' {} \;

# Fix allergy schema imports
find server -name "*.ts" -exec sed -i 's/insertAllergySchema/insertAllergiesSchema as insertAllergySchema/g' {} \;

# Fix vital schema imports
find server -name "*.ts" -exec sed -i 's/insertVitalSchema/insertVitalsSchema as insertVitalSchema/g' {} \;

# Fix appointment schema imports
find server -name "*.ts" -exec sed -i 's/insertAppointmentSchema/insertAppointmentsSchema as insertAppointmentSchema/g' {} \;

# Fix signature schema imports
find server -name "*.ts" -exec sed -i 's/insertSignatureSchema/insertSignaturesSchema as insertSignatureSchema/g' {} \;

# Fix lab result schema imports
find server -name "*.ts" -exec sed -i 's/insertLabResultSchema/insertLabResultsSchema as insertLabResultSchema/g' {} \;

# Fix imaging result schema imports
find server -name "*.ts" -exec sed -i 's/insertImagingResultSchema/insertImagingResultsSchema as insertImagingResultSchema/g' {} \;

# Fix social history schema imports
find server -name "*.ts" -exec sed -i 's/insertSocialHistorySchema/insertSocialHistorysSchema as insertSocialHistorySchema/g' {} \;

# Fix surgical history schema imports
find server -name "*.ts" -exec sed -i 's/insertSurgicalHistorySchema/insertSurgicalHistorysSchema as insertSurgicalHistorySchema/g' {} \;

# Fix family history schema imports
find server -name "*.ts" -exec sed -i 's/insertFamilyHistorySchema/insertFamilyHistorysSchema as insertFamilyHistorySchema/g' {} \;

# Fix medical history schema imports
find server -name "*.ts" -exec sed -i 's/insertMedicalHistorySchema/insertMedicalHistorysSchema as insertMedicalHistorySchema/g' {} \;

echo "Fixed all schema import mismatches"