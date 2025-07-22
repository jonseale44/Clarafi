# CMS PECOS Data Acquisition Guide

## Overview
PECOS (Provider Enrollment, Chain, and Ownership System) contains the authoritative organizational hierarchy data for US healthcare providers, including true ownership chains, parent-subsidiary relationships, and corporate structures.

## Why PECOS vs NPPES?
- **NPPES**: Flat registry, no hierarchy information, publicly available
- **PECOS**: Complete ownership chains, organizational relationships, requires Data Use Agreement (DUA)

## Steps to Obtain PECOS Data

### 1. Register for CMS Enterprise Portal (1-2 weeks)
- Go to https://portal.cms.gov
- Click "New User Registration"
- Select "I want to access CMS data for research/business purposes"
- Complete identity verification (requires SSN, address verification)
- Wait for approval email (typically 3-5 business days)

### 2. Request PECOS Data Access (2-3 weeks)
Once registered:
- Log into CMS Enterprise Portal
- Navigate to "CMS Data" → "Request Data"
- Select "PECOS Provider Enrollment Data"
- Complete the Data Use Agreement (DUA) form:
  - Purpose: "Healthcare provider directory management"
  - Data elements needed: Organization relationships, ownership chains
  - Security measures: Describe your data protection protocols
  - Intended use: EMR system provider directory

### 3. Data Use Agreement Requirements
You'll need to provide:
- **Organization Information**
  - Legal entity name
  - Tax ID/EIN
  - Physical address
  - Data security officer contact

- **Technical Safeguards**
  - Encryption at rest and in transit
  - Access controls and audit logs
  - Data retention policies
  - Incident response procedures

- **Use Case Justification**
  - Why you need ownership data
  - How it benefits healthcare delivery
  - Compliance with HIPAA

### 4. Review and Approval (2-4 weeks)
- CMS reviews your DUA application
- May request additional information
- Legal review of your organization
- Final approval notification

### 5. Data Access and Format
Once approved:
- Access via SFTP or secure download
- Format: CSV files with multiple tables
- Key tables:
  - `ENROLLMENT`: Basic provider information
  - `OWNERSHIP`: Parent-subsidiary relationships
  - `CHAIN`: Multi-level ownership chains
  - `ASSOCIATIONS`: Provider-to-organization mappings

## PECOS Data Structure

### Ownership Table Example
```csv
PARENT_ID,SUBSIDIARY_ID,OWNERSHIP_PCT,EFFECTIVE_DATE
1001,2001,100,2020-01-01
1001,2002,100,2020-01-01
3001,4001,75,2019-06-15
```

### Chain Table Example
```csv
ROOT_ORG_ID,LEVEL_1_ID,LEVEL_2_ID,LEVEL_3_ID
ASCENSION,ASC_TEXAS,ASC_WACO,HILLSBORO_CLINIC
MAYO,MAYO_MIDWEST,MAYO_ROCHESTER,null
```

## Alternative Options

### 1. Third-Party Data Vendors
Companies that already have PECOS DUA:
- **Definitive Healthcare**: $15,000-50,000/year
- **IQVIA**: Custom pricing, typically $30,000+
- **Symphony Health**: Enterprise pricing
- **Advantage: Immediate access, pre-processed data**
- **Disadvantage: Expensive, may have usage restrictions**

### 2. State-Level Data
Some states provide organizational data:
- California OSHPD
- Texas DSHS
- New York DOH
- **Advantage: Easier to obtain**
- **Disadvantage: State-specific only**

### 3. Direct Health System APIs
Major systems provide their own APIs:
- Epic (App Orchard)
- Cerner/Oracle
- Athena
- **Advantage: Real-time, authoritative**
- **Disadvantage: Must integrate each system separately**

## Timeline Summary
- Total time: 5-9 weeks from start to data access
- Registration: 1-2 weeks
- DUA submission: 2-3 weeks
- Approval: 2-4 weeks

## Cost
- CMS PECOS data: Free (after DUA approval)
- Third-party vendors: $15,000-100,000/year
- Development time: 2-4 weeks to integrate

## Next Steps
1. Start CMS Enterprise Portal registration immediately
2. Prepare security documentation for DUA
3. Consider third-party vendor as faster alternative
4. Design data import pipeline while waiting for approval

## Contact Information
- CMS Data Support: 1-844-254-5475
- Email: data@cms.hhs.gov
- Portal: https://portal.cms.gov