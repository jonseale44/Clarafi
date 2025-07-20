# External Lab Integration Flow - Complete Lifecycle

## Your CBC Order Journey

### Step 1: Order Creation & Signing
✅ **COMPLETED** - Your CBC order (ID: 1799) was:
- Created via AI parsing from "Complete Blood Count" 
- Signed successfully and marked as "approved"
- Stored in the `orders` table with orderType='lab'

### Step 2: External Lab Transmission
🔄 **NOW HAPPENING** - When you sign a lab order:
1. **Automatic Conversion**: Regular order → Lab order in `lab_orders` table
2. **Lab Routing**: System determines target lab (LabCorp, Quest, Hospital)
3. **External Order ID**: Generated (e.g., LC1750372345ABCD)
4. **HL7 Transmission**: Simulated message to external lab
5. **Requisition Number**: Created for tracking

### Step 3: External Lab Processing
🧪 **REALISTIC SIMULATION** - Your CBC will go through:

#### Processing Steps:
1. **Order Received** (5 minutes) - External lab acknowledges
2. **Specimen Collection** (60 minutes) - Patient visit for blood draw
3. **Lab-Specific Processing** (varies by lab):
   - **LabCorp**: Burlington, NC facility + intake process
   - **Quest**: Elmwood Park, NJ + quality verification  
   - **Hospital**: Internal lab + rapid processing
4. **Specimen Analysis** (2-4 hours for CBC)
5. **Result Verification** (30 minutes) - Lab director review
6. **Result Transmission** (15 minutes) - Back to your EMR

### Step 4: Result Generation
📊 **REALISTIC DATA** - When processing completes:
- **WBC**: 6.8 K/uL (normal range 4.0-11.0)
- **RBC**: 4.5 M/uL (normal range 4.2-5.4) 
- **Hemoglobin**: 14.2 g/dL (normal range 12.0-16.0)
- **Hematocrit**: 42.1% (normal range 36-46)
- **Platelets**: 285 K/uL (normal range 150-450)

Results include:
- 80% chance normal values
- 15% chance abnormal (flagged H/L)
- 5% chance critical values (triggers alerts)

### Step 5: Provider Review
📋 **BACK TO YOUR EMR** - Results appear in:
- Dashboard "Lab Orders to Review" 
- Patient chart lab results section
- Real-time notifications for critical values
- Bulk review capabilities

## External Lab Mock APIs

### LabCorp Integration
```
POST /api/external-lab-mock/labcorp/orders
GET /api/external-lab-mock/labcorp/orders/{id}/status
GET /api/external-lab-mock/labcorp/orders/{id}/results
```

**Features**:
- Burlington, NC processing center
- Collection tube specifications (Lavender top EDTA for CBC)
- Realistic 2-4 hour turnaround
- Quality verification steps

### Quest Diagnostics Integration  
```
POST /api/external-lab-mock/quest/orders
GET /api/external-lab-mock/quest/orders/{id}/workflow
```

**Features**:
- Elmwood Park, NJ main lab
- MyQuest tracking URLs
- Accession number format
- Workflow phase tracking

### Hospital Lab Integration
```
POST /api/external-lab-mock/hospital/orders
GET /api/external-lab-mock/hospital/orders/{id}
```

**Features**:
- Department routing (Hematology for CBC)
- On-call pathologist contact
- STAT processing capabilities
- Internal requisition system

## Monitoring Your Orders

### Real-Time Status API
```
GET /api/lab-status/patient/112     # All your lab orders
GET /api/lab-status/encounter/317  # This encounter's orders  
GET /api/lab-status/active-simulations  # Live processing status
```

### Lab Simulator Dashboard
Visit `/lab-simulator` to:
- Create test orders with different scenarios
- Monitor active simulations in real-time
- View processing steps and timelines
- Cancel simulations if needed

## Integration Points

Your EMR now connects lab orders to external labs through:

1. **Order Signing** → **Automatic External Transmission**
2. **External Lab APIs** → **Realistic Processing Simulation** 
3. **Result Generation** → **Provider Review Workflow**
4. **Critical Values** → **Immediate Notifications**
5. **Patient Communication** → **Portal/SMS Notifications**

This provides comprehensive testing of the complete lab lifecycle from order to result, simulating real-world LabCorp, Quest, and hospital lab integrations.