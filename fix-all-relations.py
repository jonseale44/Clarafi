#!/usr/bin/env python3
import re

# Read the schema.ts file
with open('shared/schema.ts', 'r') as f:
    content = f.read()

# Pattern to find relations with nullable foreign keys
# This will help us identify and comment out problematic relations

# List of known nullable foreign key fields
nullable_fields = [
    'encounterId',
    'appointmentId',
    'orderedBy',
    'prescriber',
    'labOrderId',
    'pharmacyId',
    'providerId',
    'locationId',
    'healthSystemId',
    'reviewedBy',
    'verifiedBy',
    'addedBy',
    'resolvedBy',
    'externalLabId',
    'attachmentId',
    'parentId',
    'userId',
    'electronicSignatureId',
    'medicationId',
    'preferredPharmacyId',
    'setBy',
    'examinedBy',
    'imagingOrderId',
    'lastUpdatedBy',
]

# Find all relation definitions that use nullable fields
for field in nullable_fields:
    # Pattern to match relations using this field
    pattern = rf'(\s+)(\w+): one\([^,]+,\s*{{\s*fields:\s*\[[^\]]*\.{field}\],.*?}}\)'
    
    # Find all matches
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        original = match.group(0)
        indent = match.group(1)
        
        # Comment out the relation
        commented = '\n'.join([f'{indent}// {line}' if line.strip() else line 
                              for line in original.split('\n')])
        
        content = content.replace(original, commented)

# Write the updated content back
with open('shared/schema.ts', 'w') as f:
    f.write(content)

print("Fixed all nullable foreign key relations")