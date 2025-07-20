# Multi-Tenant SaaS Architecture for Clarafi EMR

## Business Model Overview

### Tier 1 - Individual Provider Subscriptions
- Individual providers sign up and pay monthly subscription
- Each provider gets their own "virtual health system"
- They can use note writer and other tools (some features disabled)
- Build up their own patient database over time

### Tier 2 - Group Practice Migrations
- Individual providers can join existing group practices
- When joining, they bring their patient data with them
- Multiple individual providers can merge into a single health system
- Seamless data migration preserves all historical records

### Tier 3 - Enterprise Health Systems
- Full-featured EMR for large health systems
- Multiple organizations and locations
- Advanced features like lab integrations, multi-location workflows

## Architecture Implementation

### 1. Database Schema Changes (COMPLETED)

We've added critical multi-tenant isolation fields:

```sql
-- Health Systems table now includes subscription management
healthSystems:
  - subscriptionTier (1=Individual, 2=Small Group, 3=Enterprise)
  - subscriptionStatus (active, suspended, cancelled)
  - mergedIntoHealthSystemId (for tracking migrations)
  - originalProviderId (for individual provider accounts)

-- Users now belong to a health system
users:
  - healthSystemId (NOT NULL) - links user to their health system

-- Patients now belong to a health system  
patients:
  - healthSystemId (NOT NULL) - ensures patient data isolation
```

### 2. Data Isolation Pattern

Every query must filter by healthSystemId:

```typescript
// BAD - Cross-tenant data leak risk
const patients = await db.select().from(patients);

// GOOD - Tenant-isolated query
const patients = await db.select()
  .from(patients)
  .where(eq(patients.healthSystemId, req.user.healthSystemId));
```

### 3. Individual Provider Onboarding

When Dr. Smith signs up:

```typescript
// 1. Create virtual health system
const healthSystem = await db.insert(healthSystems).values({
  name: "Dr. Smith Private Practice",
  shortName: "Dr. Smith",
  systemType: "individual_provider",
  subscriptionTier: 1,
  subscriptionStatus: "active",
  originalProviderId: drSmithUserId
});

// 2. Create virtual location
const location = await db.insert(locations).values({
  healthSystemId: healthSystem.id,
  name: "Dr. Smith's Office",
  locationType: "clinic"
});

// 3. Assign Dr. Smith to their location
await db.insert(userLocations).values({
  userId: drSmithUserId,
  locationId: location.id,
  roleAtLocation: "primary_provider",
  isPrimary: true
});
```

### 4. Group Practice Migration

When Dr. Smith (300 patients) joins Waco Medical Group:

```typescript
// 1. Update all Dr. Smith's patients to new health system
await db.update(patients)
  .set({ healthSystemId: wacoMedicalGroupId })
  .where(eq(patients.healthSystemId, drSmithHealthSystemId));

// 2. Update Dr. Smith's user record
await db.update(users)
  .set({ healthSystemId: wacoMedicalGroupId })
  .where(eq(users.id, drSmithUserId));

// 3. Mark old health system as merged
await db.update(healthSystems)
  .set({ 
    mergedIntoHealthSystemId: wacoMedicalGroupId,
    mergedDate: new Date(),
    active: false
  })
  .where(eq(healthSystems.id, drSmithHealthSystemId));
```

### 5. Handling Duplicate Patients

When Providers B and C both have records for John Doe:

```typescript
// Option 1: Keep separate records (default)
- Provider B's John Doe (ID: 1001)
- Provider C's John Doe (ID: 2001)

// Option 2: Merge on join (requires manual review)
- Compare demographics
- Merge medical history with audit trail
- Preserve both providers' notes with attribution
```

### 6. Security Middleware

Implement automatic tenant filtering:

```typescript
// middleware/tenant-isolation.ts
export const tenantIsolation = (req, res, next) => {
  if (!req.user?.healthSystemId) {
    return res.status(403).json({ error: "No health system access" });
  }
  
  // Attach to request for all queries
  req.tenantId = req.user.healthSystemId;
  next();
};
```

### 7. Subscription Feature Gates

Control features by tier:

```typescript
const FEATURE_TIERS = {
  labIntegration: 2,        // Tier 2+
  multiLocation: 2,         // Tier 2+
  customTemplates: 1,       // All tiers
  bulkImport: 3,           // Enterprise only
  apiAccess: 3,            // Enterprise only
  advancedReporting: 2,    // Tier 2+
};

function canAccessFeature(feature: string, userTier: number): boolean {
  return userTier >= FEATURE_TIERS[feature];
}
```

## Implementation Checklist

### Phase 1 - Core Multi-Tenancy (CRITICAL)
- [x] Add healthSystemId to patients table
- [x] Add healthSystemId to users table
- [x] Add subscription fields to healthSystems
- [ ] Update all patient queries to filter by healthSystemId
- [ ] Update all API endpoints with tenant isolation
- [ ] Add middleware for automatic tenant filtering
- [ ] Create migration scripts for existing data

### Phase 2 - Individual Provider Support
- [ ] Create signup flow for individual providers
- [ ] Auto-create virtual health system on signup
- [ ] Implement Tier 1 feature restrictions
- [ ] Build subscription management UI

### Phase 3 - Migration Features
- [ ] Build provider migration wizard
- [ ] Implement patient data transfer logic
- [ ] Create merge conflict resolution UI
- [ ] Add audit trail for migrations

### Phase 4 - Advanced Features
- [ ] Patient matching algorithms
- [ ] Bulk migration tools
- [ ] Health system merge capabilities
- [ ] Cross-tenant reporting (admin only)

## Security Considerations

1. **Row-Level Security**: Every table with patient data needs healthSystemId
2. **API Security**: No cross-tenant queries allowed
3. **Migration Security**: Require explicit approval for data transfers
4. **Audit Trail**: Log all cross-tenant operations
5. **HIPAA Compliance**: Ensure proper BAAs with each health system

## Next Steps

1. **Immediate Priority**: Update all storage.ts methods to include healthSystemId filtering
2. **Critical Security**: Add tenant isolation middleware to all routes
3. **Testing**: Create test cases for cross-tenant isolation
4. **Documentation**: Update API docs with tenant requirements