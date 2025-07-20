# Comprehensive Database/Schema Synchronization Plan

## Overview
The database (source of truth) has 81 tables with 1,609 columns, while schema.ts only defines 80 tables with fewer columns. This plan outlines how to comprehensively resolve this drift.

## Phase 1: Generate Complete Schema from Database

### Step 1: Create Schema Generation Script
Create a script that queries PostgreSQL information_schema to generate Drizzle schema definitions:

```typescript
// generate-schema-from-db.ts
import { db } from './server/db';
import fs from 'fs';

async function generateSchemaFromDB() {
  // Query all tables
  const tables = await db.execute(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  for (const table of tables) {
    // Query columns for each table
    const columns = await db.execute(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table.table_name]);

    // Generate Drizzle schema code
    generateDrizzleTable(table.table_name, columns);
  }
}
```

### Step 2: Map PostgreSQL Types to Drizzle Types
- integer → serial() or integer()
- text → text()
- varchar → varchar()
- timestamp → timestamp()
- boolean → boolean()
- jsonb → jsonb()
- numeric/decimal → decimal()
- date → date()
- arrays → .array()

## Phase 2: Handle Missing Tables

### Add Missing Tables to schema.ts:
1. **attachments** table (file storage)
2. **migration_invitations** table (user invitations)

## Phase 3: Update Existing Tables

### Priority Tables (most column mismatches):
1. **appointments** - Ensure all 81 columns are defined
2. **lab_orders** - Add missing columns (43 total)
3. **medications** - Add missing columns (56 total)
4. **orders** - Add missing columns (66 total)
5. **patients** - Verify all columns match

### For Each Table:
1. Compare database columns with schema columns
2. Add missing columns with proper types
3. Update column names if mismatched
4. Preserve existing relations and constraints

## Phase 4: Update Relations and Indexes

### Relations to Verify:
- Foreign keys between tables
- Cascade delete rules
- One-to-many and many-to-many relationships

### Indexes to Add:
- Query performance indexes from database
- Unique constraints
- Composite indexes

## Phase 5: Update TypeScript Types

### Generate Insert/Select Types:
```typescript
export const insertPatientSchema = createInsertSchema(patients);
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type SelectPatient = typeof patients.$inferSelect;
```

## Phase 6: Testing and Validation

### Test Plan:
1. Run `npm run db:push` in dry-run mode
2. Verify no data loss warnings
3. Test all CRUD operations
4. Verify TypeScript compilation
5. Run existing queries to ensure compatibility

## Phase 7: Migration Strategy

### Safe Migration Approach:
1. Backup current schema.ts
2. Update schema incrementally (table by table)
3. Test each table update
4. Document any breaking changes
5. Update related API code if needed

## Implementation Order

### Week 1: Critical Tables
- [ ] attachments table (missing)
- [ ] migration_invitations table (missing)
- [ ] appointments table (81 columns)
- [ ] medications table (56 columns)
- [ ] orders table (66 columns)

### Week 2: Clinical Tables
- [ ] lab_orders table (43 columns)
- [ ] patients table (verify)
- [ ] encounters table
- [ ] vitals table
- [ ] medical_problems table

### Week 3: Administrative Tables
- [ ] users table
- [ ] health_systems table
- [ ] organizations table
- [ ] locations table
- [ ] All scheduling tables

### Week 4: Supporting Tables
- [ ] All remaining tables
- [ ] Relations update
- [ ] Index optimization
- [ ] Final testing

## Benefits After Completion

1. **Full TypeScript Type Safety**: All database operations will have proper types
2. **ORM Features**: Can use Drizzle's full feature set
3. **Better Developer Experience**: IntelliSense for all columns
4. **Reduced Bugs**: Type mismatches caught at compile time
5. **Easier Maintenance**: Schema as single source of truth for types

## Risk Mitigation

1. **No Database Changes**: Only updating TypeScript definitions
2. **Incremental Updates**: Test each change before proceeding
3. **Rollback Plan**: Keep backup of working schema.ts
4. **Production Safety**: Changes don't affect running system

## Success Criteria

- [ ] All 81 database tables defined in schema.ts
- [ ] All 1,609 columns properly typed
- [ ] No TypeScript compilation errors
- [ ] All existing queries continue to work
- [ ] Full type safety restored
- [ ] Documentation updated

This comprehensive approach ensures the schema is brought into complete alignment with the production database while maintaining system stability.