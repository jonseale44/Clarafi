#!/bin/bash

echo "Checking for nullable foreign keys in relations..."

# Check all foreign key fields that might be nullable
echo "Checking labResults.labOrderId..."
grep -n "labOrderId: integer" shared/schema.ts | grep -v "notNull"

echo "Checking labResults.encounterId..."
grep -n "encounterId: integer" shared/schema.ts | grep -v "notNull" | head -5

echo "Checking other nullable foreign keys..."
grep -n "Id: integer" shared/schema.ts | grep -v "notNull" | grep -v "id: serial" | head -20