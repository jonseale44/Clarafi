# Complete Attachment Upload to Vitals Extraction Workflow

## Overview
This document traces the complete technical workflow from uploading a medical document attachment to extracting vitals and storing them in the database with proper source attribution.

## 🔥 WORKFLOW ARCHITECTURE

### 1. **UPLOAD WORKFLOW** - File Upload & Storage
**Primary Files:**
- `server/patient-attachments-routes.ts` - Upload endpoint handlers
- `shared/schema.ts` - Database schemas for attachments

**Process:**
1. **Frontend Upload** (`client/src/components/patient/patient-attachments.tsx`)
   - User selects file(s) via drag-and-drop or file picker
   - FormData created with file(s) and metadata
   - POST request to `/api/patients/:patientId/attachments/bulk`

2. **Backend File Processing** (`server/patient-attachments-routes.ts`)
   - Multer handles file storage in `uploads/attachments/`
   - Generates secure MD5-based filename
   - Creates thumbnail for images
   - Validates file type (PDF, JPEG, PNG, TIFF, DICOM)
   - Inserts record into `patient_attachments` table
   - **TRIGGERS:** Document analysis queue

**Key Logging Points:**
```
🔥 [UPLOAD WORKFLOW] ============= STARTING ATTACHMENT UPLOAD =============
📎 [AttachmentUpload] ✅ File uploaded successfully
📎 [AttachmentUpload] ✅ Attachment created with ID: {id}
📎 [AttachmentUpload] 🔄 Queuing attachment for document analysis
```

### 2. **ANALYSIS WORKFLOW** - OCR & Document Processing
**Primary Files:**
- `server/document-analysis-service.ts` - GPT-4.1 Vision OCR processing
- `shared/schema.ts` - Document processing queue and extracted content schemas

**Process:**
1. **Document Queuing**
   - Checks if already processed to avoid duplicates
   - Inserts into `document_processing_queue` table
   - Updates status to "processing"

2. **File Conversion**
   - **Images:** Sharp library resizes and converts to JPEG
   - **PDFs:** pdftoppm converts first page to image
   - Converts to base64 for GPT Vision API

3. **GPT-4.1 Vision Processing**
   - Sends base64 image to OpenAI GPT-4.1 Vision
   - Extracts full text content via OCR
   - Determines document type (H&P, discharge summary, nursing notes, etc.)
   - Generates AI title for document

4. **Results Storage**
   - Updates `attachment_extracted_content` table
   - Sets `processingStatus` to "completed"
   - **TRIGGERS:** Chart processing

**Key Logging Points:**
```
🔥 [ANALYSIS WORKFLOW] ============= STARTING DOCUMENT ANALYSIS =============
📄 [DocumentAnalysis] 🤖 Calling GPT-4.1 Vision for OCR processing
📄 [DocumentAnalysis] ✅ GPT-4.1 Vision processing complete
📄 [DocumentAnalysis] 💾 Saving extraction results to database
```

### 3. **CHART WORKFLOW** - Medical Data Extraction
**Primary Files:**
- `server/attachment-chart-processor.ts` - Orchestrates chart data extraction
- `server/vitals-parser-service.ts` - GPT-4.1-nano vitals parsing

**Process:**
1. **Chart Processing Initiation**
   - Fetches attachment and extracted content from database
   - Verifies document is ready for processing
   - Determines document type for specialized processing

2. **Universal Vitals Extraction**
   - **ANY document type** can contain vitals (not just H&P)
   - Fetches patient context (age, gender) for better parsing
   - Calls enhanced vitals parsing service

**Key Logging Points:**
```
🔥 [CHART WORKFLOW] ============= STARTING CHART PROCESSING =============
🔥 [VITALS WORKFLOW] ============= STARTING VITALS EXTRACTION =============
🩺 [VitalsExtraction] Document text length: {length} characters
```

### 4. **VITALS WORKFLOW** - GPT-4.1-nano Parsing
**Primary Files:**
- `server/vitals-parser-service.ts` - Core vitals parsing logic
- `server/attachment-chart-processor.ts` - Enhanced medical document parsing

**Process:**
1. **Enhanced Medical Document Parsing**
   - Uses specialized prompt for ANY medical document type
   - Extracts vitals section context and date information
   - Handles multiple document formats (H&P, nursing notes, discharge summaries)

2. **GPT-4.1-nano Processing**
   - Calls OpenAI GPT-4.1-nano with medical vitals extraction prompt
   - Parses structured JSON response with vitals data
   - Calculates confidence score based on extracted fields
   - Validates and cleans extracted values

3. **Data Validation**
   - Converts units (Celsius to Fahrenheit, kg to lbs, cm to inches)
   - Validates blood pressure format (systolic/diastolic)
   - Flags critical values in warnings array

**Key Logging Points:**
```
🤖 [VitalsParser] ============= STARTING GPT-4.1-NANO VITALS PARSING =============
🩺 [VitalsParser] 🤖 Calling OpenAI GPT-4.1-nano...
🩺 [VitalsParser] ✅ OpenAI response received in {time}ms
🩺 [VitalsExtraction] ✅ Successfully extracted vitals with {confidence}% confidence
```

### 5. **DATABASE WORKFLOW** - Source-Attributed Storage
**Primary Files:**
- `server/attachment-chart-processor.ts` - Database insertion logic
- `shared/schema.ts` - Vitals table schema with source tracking

**Process:**
1. **Vitals Record Creation**
   - Maps parsed vitals to database schema
   - Adds comprehensive source attribution
   - Includes confidence scoring and provenance tracking

2. **Source Attribution Fields**
   - `sourceType`: "attachment"
   - `sourceConfidence`: Confidence percentage (e.g., "0.85")
   - `sourceNotes`: Description of extraction context
   - `extractedFromAttachmentId`: Links back to source document
   - `parsedFromText`: Boolean flag for AI-extracted data
   - `originalText`: Raw text section used for extraction

3. **Database Insertion**
   - Inserts into `vitals` table with full provenance
   - Available immediately in vitals flowsheet
   - Shows source indicator in UI (e.g., "Doc Extract 85%")

**Key Logging Points:**
```
🔥 [DATABASE WORKFLOW] ============= SAVING VITALS TO DATABASE =============
💾 [VitalsSave] ✅ Blood Pressure: {systolic}/{diastolic}
💾 [VitalsSave] ✅ Source Confidence: {confidence}
💾 [VitalsSave] ✅ Attachment ID: {attachmentId}
🔥 [WORKFLOW COMPLETE] ============= ATTACHMENT TO VITALS EXTRACTION COMPLETE =============
```

## 🚨 LEGACY CODE ANALYSIS - Potential Developer Confusion

### Legacy Routes & Files That Could Cause Confusion:

1. **`server/vitals-parser-api.ts`** - LEGACY STANDALONE ROUTE
   - **Issue:** Provides `/api/vitals/parse` endpoint for standalone vitals parsing
   - **Problem:** Bypasses attachment source tracking - vitals parsed here lose provenance
   - **Used by:** Manual vitals parsing in nursing templates and vitals flowsheet
   - **Recommendation:** Keep for manual entry but ensure developers understand it's for user-typed vitals, not attachment extraction

2. **`client/src/components/NursingTemplateAssessment.tsx`** - PARALLEL VITALS ENTRY
   - **Issue:** Has its own vitals parsing logic that calls `/api/vitals/parse`
   - **Problem:** Creates vitals without attachment source attribution
   - **Recommendation:** Clearly document this is for nurse-entered text vitals, not document extraction

3. **Multiple Vitals Entry Points:**
   - **Attachment Route:** `attachment-chart-processor.ts` → Universal document vitals extraction
   - **Manual Route:** `vitals-parser-api.ts` → User-typed vitals parsing  
   - **Nursing Route:** `NursingTemplateAssessment.tsx` → Nurse assessment vitals
   - **Recommendation:** Consolidate or clearly document the different use cases

### Source Attribution Inconsistencies:

1. **Manual Entry vs Document Extraction**
   - Document-extracted vitals have `sourceType: "attachment"` with confidence scores
   - Manual vitals have `sourceType: "manual_entry"` with `sourceConfidence: "1.00"`
   - **Recommendation:** Ensure UI clearly distinguishes these sources

2. **Frontend Display Logic**
   - `client/src/components/vitals/vitals-flowsheet.tsx` shows source badges
   - Currently uses placeholder "Doc Extract 85%" badge
   - **Recommendation:** Connect to actual confidence scores from database

## 🔧 KEY TECHNICAL DECISIONS

### AI Models Used:
- **GPT-4.1 Vision:** Document OCR and text extraction
- **GPT-4.1-nano:** Vitals parsing (cost-effective for structured data extraction)

### Data Provenance Strategy:
- Every vitals entry tracks its source with confidence scoring
- Links back to original document for audit trail
- Supports multiple entry methods with clear attribution

### Universal Document Processing:
- ANY medical document type can yield vitals (not just H&P documents)
- Enhanced prompts handle various document formats
- Extensible architecture for future chart section extraction

## 🎯 CURRENT STATE SUMMARY

✅ **Implemented:**
- Complete upload → OCR → vitals extraction → database workflow
- Source attribution and confidence scoring
- Universal document type processing
- Comprehensive logging throughout workflow

✅ **Working Features:**
- Automatic vitals extraction from any medical document
- Proper database storage with provenance tracking
- UI display with source indicators

⚠️ **Areas for Future Developer Attention:**
- Consolidate multiple vitals parsing entry points
- Connect UI source badges to actual database confidence scores
- Extend pattern to other chart sections (medications, allergies, medical history)
- Consider deprecating standalone vitals parsing API to reduce confusion

This workflow provides a solid foundation for expanding automatic chart population from attachments to other medical data types.