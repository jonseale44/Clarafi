# Medication Formulary Expansion Plan
## Goal: 500 Most Commonly Prescribed Medications

### Current State
- **12 medications** in local databases (client + server)
- AI fallback for unlimited coverage
- Hybrid architecture working well

### Target State
- **500 most prescribed medications** locally stored
- Covers ~85-90% of all prescribing patterns
- Periodic updates to maintain currency
- Maintains AI fallback for edge cases

## Implementation Strategy

### Phase 1: Database Schema Enhancement
1. Create `medication_formulary` table with:
   - Medication name (generic + brand)
   - Standard strengths array
   - Available forms array
   - Route mappings
   - Sig templates
   - Clinical data (therapeutic class, indications)
   - Regulatory data (controlled status, prior auth)
   - Update metadata (last_updated, source)

### Phase 2: Data Population
**Top 500 Medications by Prescription Volume:**

#### Cardiovascular (50 meds)
- Lisinopril, Amlodipine, Atorvastatin, Metoprolol
- Losartan, Carvedilol, Hydrochlorothiazide, Simvastatin
- Warfarin, Clopidogrel, Furosemide, Digoxin...

#### Diabetes/Endocrine (40 meds)
- Metformin, Insulin glargine, Glipizide, Sitagliptin
- Levothyroxine, Pioglitazone, Glyburide...

#### Respiratory (35 meds)
- Albuterol, Montelukast, Fluticasone, Budesonide
- Prednisone, Azithromycin, Dextromethorphan...

#### Mental Health (45 meds)
- Sertraline, Escitalopram, Alprazolam, Lorazepam
- Trazodone, Bupropion, Duloxetine, Aripiprazole...

#### Pain/Anti-inflammatory (40 meds)
- Ibuprofen, Acetaminophen, Tramadol, Gabapentin
- Naproxen, Meloxicam, Cyclobenzaprine...

#### Antibiotics (50 meds)
- Amoxicillin, Doxycycline, Cephalexin, Ciprofloxacin
- Clindamycin, Sulfamethoxazole/Trimethoprim...

#### GI/Acid Reflux (30 meds)
- Omeprazole, Pantoprazole, Ondansetron, Loperamide
- Docusate, Simethicone, Sucralfate...

#### Neurological (35 meds)
- Amlodipine, Topiramate, Lamotrigine, Levetiracetam
- Donepezil, Carbidopa/Levodopa...

#### Dermatology (25 meds)
- Hydrocortisone, Triamcinolone, Mupirocin, Ketoconazole
- Tretinoin, Benzoyl peroxide...

#### Others (150 meds)
- Birth control, vitamins, eye drops, specialty medications

### Phase 3: Update Mechanism
1. **Quarterly updates** from authoritative sources:
   - FDA Orange Book
   - RxNorm/RxNav
   - Clinical guidelines
   - Prescribing pattern data

2. **Automated sync process**:
   - Download latest formulary data
   - Compare with existing entries
   - Flag changes for review
   - Update with clinical approval

### Phase 4: Fallback Strategy
- Local lookup first (500 meds)
- AI fallback for unlisted medications
- Cache AI responses for performance
- Learn from usage patterns

## Benefits
- **Performance**: Sub-100ms lookup for 85-90% of prescriptions
- **Accuracy**: Clinically validated data for common medications
- **Coverage**: Unlimited through AI fallback
- **Currency**: Regular updates ensure latest information
- **Efficiency**: Reduced API calls and costs

## Technical Implementation
1. Create medication formulary migration
2. Build data import scripts
3. Update medication intelligence service
4. Add formulary management UI
5. Implement update scheduling

## Timeline
- **Week 1**: Database schema and core infrastructure
- **Week 2**: Data population (first 100 medications)
- **Week 3**: Integration and testing
- **Week 4**: Full 500 medication deployment
- **Ongoing**: Quarterly updates

This expansion would position our EMR with enterprise-level medication intelligence while maintaining our innovative AI-powered flexibility.