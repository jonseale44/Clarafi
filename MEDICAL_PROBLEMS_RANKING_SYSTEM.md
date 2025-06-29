# Medical Problems Ranking System Documentation

## Overview
The medical problems ranking system uses GPT-4.1 artificial intelligence to assign intelligent clinical priority rankings to every medical condition in a patient's problem list. This creates a dynamic, patient-specific prioritization that helps healthcare providers focus on the most clinically significant conditions.

## Ranking Algorithm
- **Method**: Relative percentage-based factor scoring with user weight customization
- **GPT Intelligence**: AI assigns percentage scores (0-100%) for each factor, distributed across all patient conditions
- **User Control**: Providers can adjust factor importance through weight preferences
- **Final Priority**: Calculated by multiplying factor percentages by user weights

## Core Ranking Factors (Relative Percentage System)

### 1. Clinical Severity & Immediacy (Primary Factor)
**Default Weight**: 40% of total ranking calculation

**Relative Scoring**: GPT assigns percentage (0-100%) based on clinical severity compared to patient's other conditions
- **Life-threatening conditions**: Highest percentages (80-100%)
  - Examples: Acute MI, stroke, acute renal failure, sepsis
  - Requires immediate intervention and monitoring

- **Urgent conditions requiring monitoring**: High percentages (60-80%)
  - Examples: Uncontrolled diabetes with neuropathy, severe HTN, heart failure exacerbation
  - Active management needed to prevent complications

- **Chronic conditions requiring active management**: Medium percentages (40-60%)
  - Examples: Controlled diabetes, stable CAD, CKD stages 3-4
  - Ongoing medication adjustments and regular monitoring

- **Stable chronic conditions**: Lower percentages (20-40%)
  - Examples: Well-controlled hypertension, stable thyroid disease
  - Routine monitoring with established treatment

- **Historical/resolved conditions**: Minimal percentages (5-20%)
  - Examples: Past surgeries, resolved pneumonia
  - Relevant for medical history but minimal active management

- **Minor/routine conditions**: Lowest percentages (0-10%)
  - Examples: Seasonal allergies, minor skin conditions, historical procedures
  - Minimal clinical significance or intervention needed

### 2. Treatment Complexity & Follow-up Needs
**Default Weight**: 30% of total ranking calculation

**Relative Scoring**: GPT assigns percentage (0-100%) based on treatment complexity compared to patient's other conditions
- **Multiple medications with interactions**: Higher percentages (70-100%)
- **Specialist management requirements**: Higher percentages (60-90%)
- **Complex dosing or monitoring**: Higher percentages (50-80%)
- **Simple medication management**: Lower percentages (20-50%)
- **Self-limiting conditions**: Lowest percentages (0-20%)

### 3. Patient-Specific Frequency & Impact
**Default Weight**: 20% of total ranking calculation

**Relative Scoring**: GPT assigns percentage (0-100%) based on frequency and impact compared to patient's other conditions
- **Recently mentioned/updated conditions**: Higher percentages (70-100%)
- **Conditions mentioned across multiple encounters**: Higher percentages (60-90%)
- **Long-term stable conditions**: Lower percentages (20-50%)
- **Conditions not mentioned recently**: Lower percentages (10-30%)
- **Patient-reported symptom burden**: Influences percentage allocation

### 4. Current Clinical Relevance
**Default Weight**: 10% of total ranking calculation

**Relative Scoring**: GPT assigns percentage (0-100%) based on current clinical relevance compared to patient's other conditions
- **Conditions actively being treated today**: Highest percentages (80-100%)
  - Acute interventions, medication changes, symptom management

- **Conditions requiring medication adjustments**: High percentages (60-80%)
  - Dose titrations, drug substitutions, monitoring lab values

- **Conditions for routine monitoring**: Medium percentages (40-60%)
  - Stable conditions with scheduled follow-ups

- **Stable baseline conditions**: Lower percentages (20-40%)
  - Well-controlled chronic diseases

- **Historical reference only**: Lowest percentages (0-20%)
  - Past conditions relevant for context but not active management

## GPT-4 Intelligence Features

### Medical Synonym Recognition
The ranking system incorporates sophisticated medical intelligence to recognize condition relationships:
- HTN = Hypertension = High Blood Pressure = Essential Hypertension
- DM = Diabetes = Type 2 Diabetes = T2DM = Diabetes Mellitus
- CAD = Coronary Artery Disease = Ischemic Heart Disease = CHD
- CHF = Congestive Heart Failure = Heart Failure = HF

### Condition Evolution Detection
The system recognizes when conditions progress or evolve:
- "Diabetes" → "Diabetes with neuropathy" (same condition, evolved complexity)
- "Hypertension" → "Hypertension with target organ damage" (progression)
- "Heart Failure" → "Heart Failure with reduced ejection fraction" (specification)

### ICD-10 Code Family Analysis
Related ICD-10 codes are recognized as variants of the same condition:
- E11.x family = Type 2 Diabetes variations (E11.9, E11.40, E11.21)
- I10-I15 = Hypertensive diseases
- J44.x = COPD family
- I50.x = Heart failure family

## Patient-Specific Context

### Relative Prioritization
Rankings are assigned relative to other conditions the patient has:
- A patient with multiple severe conditions may have their "stable hypertension" ranked lower than someone with hypertension as their primary concern
- The system considers the entire medical complexity of each individual patient

### Encounter Context Integration
Rankings consider both current encounter data and historical attachment information:
- Recent SOAP note mentions increase priority
- Historical document context provides baseline reference
- Frequency across multiple visits influences ranking

## Implementation Technical Details

### Processing Pipeline
1. **GPT-4.1 Analysis**: Each medical condition is analyzed using comprehensive clinical prompts
2. **Multi-factor Evaluation**: All four ranking factors are simultaneously considered
3. **Decimal Precision Assignment**: Unique decimal rankings prevent ties
4. **Reasoning Documentation**: Each ranking includes clinical reasoning explanation
5. **Dynamic Updates**: Rankings adjust as new clinical information becomes available

### Quality Assurance
- **Temperature Setting**: 0.1 for consistent, reliable rankings
- **Structured JSON Output**: Ensures parsing reliability
- **Reasoning Validation**: Each ranking includes explanatory text
- **Error Handling**: Fallback systems for incomplete data

## Clinical Examples

### High Priority Examples
- **Acute myocardial infarction**: Clinical severity 95%, Treatment complexity 85%, Patient frequency 90%, Clinical relevance 100% = High priority
- **Type 2 diabetes with neuropathy**: Clinical severity 70%, Treatment complexity 75%, Patient frequency 80%, Clinical relevance 85% = High priority

### Medium Priority Examples
- **Essential hypertension, well controlled**: Clinical severity 40%, Treatment complexity 30%, Patient frequency 60%, Clinical relevance 50% = Medium priority
- **Chronic kidney disease stage 3**: Clinical severity 60%, Treatment complexity 55%, Patient frequency 65%, Clinical relevance 70% = Medium priority

### Low Priority Examples
- **History of appendectomy**: Clinical severity 5%, Treatment complexity 0%, Patient frequency 10%, Clinical relevance 5% = Low priority
- **Seasonal allergies**: Clinical severity 15%, Treatment complexity 20%, Patient frequency 25%, Clinical relevance 15% = Low priority

## User Interface Integration

### Tooltip Display
When users hover over rank badges, they see:
- Current rank number with decimal precision
- Explanation of the four ranking factors
- Scale reference (1.00 = highest, 99.99 = lowest)
- Clinical reasoning for the specific ranking

### Visual Indicators
- Color coding based on priority level
- Consistent with confidence scoring tooltip design
- Hover effects indicate interactive elements
- Clear priority terminology (Critical, High, Medium, Low)

## System Benefits

### For Healthcare Providers
- **Intelligent Prioritization**: Focus attention on most critical conditions
- **Clinical Decision Support**: AI-powered ranking reduces cognitive load
- **Consistency**: Standardized prioritization across all patients
- **Efficiency**: Quick identification of high-priority conditions

### For Patient Care
- **Comprehensive Assessment**: All conditions appropriately weighted
- **Dynamic Updates**: Rankings reflect current clinical status
- **Historical Context**: Past conditions appropriately de-prioritized
- **Quality Improvement**: Systematic approach to condition management

## Future Enhancements

### Planned Improvements
- Integration with real-time vital signs for dynamic re-ranking
- Machine learning from provider ranking adjustments
- Integration with clinical guidelines and protocols
- Population health analytics for condition prioritization trends

### Research Applications
- Clinical outcome correlation with ranking accuracy
- Provider workflow optimization studies
- Patient satisfaction correlation with appropriate prioritization
- Health system resource allocation optimization

---
*Last Updated: June 27, 2025*
*System Version: Unified Medical Problems Parser v1.0*