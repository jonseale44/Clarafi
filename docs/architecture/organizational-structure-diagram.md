# EMR Organizational Architecture
## Real-World Healthcare System Examples

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            HEALTH SYSTEMS (Top Level)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🏥 Ascension Health System          🏥 Seton Healthcare Family          🏥 Independent Practices   │
│     • 2,600+ care sites nationwide     • Austin-based Catholic system      • Single/small groups     │
│     • 150+ hospitals                   • 11 hospitals, 40+ clinics        • Local family medicine   │
│     • Standardized EMR across system   • Dell Medical School partner      • Direct patient care     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ORGANIZATIONS (Regional Level)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🌎 Ascension Central Texas          🌎 Seton Network Austin           🌎 Waco Family Medicine      │
│     • Regional coordination            • Austin metro coverage           • Independent group         │
│     • Waco/Temple/Bryan markets        • Travis/Williamson counties      • Multiple locations        │
│     • Shared resources & protocols    • Integrated care model           • Shared staff/resources    │
│                                                                                                      │
│  🌎 Ascension North Texas            🌎 Seton Network Georgetown                                     │
│     • Dallas/Fort Worth region         • Suburban expansion                                          │
│     • Different market dynamics        • Growing patient base                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            LOCATIONS (Physical Sites)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🏢 Ascension Providence Waco         🏢 Seton Medical Center Austin      🏢 Waco Family Medicine   │
│     • 7700 Fish Pond Rd, Waco         • 1201 W 38th St, Austin           • 3825 W Waco Dr          │
│     • Full-service hospital           • Level II trauma center            • Primary care clinic     │
│     • ER, surgery, specialty care     • 436 beds, full services           • Family medicine focus   │
│                                                                                                      │
│  🏢 Ascension Family Medicine         🏢 Seton Northwest Hospital         🏢 Waco Family Medicine   │
│     • 2302 Herring Ave, Waco          • 11113 Research Blvd, Austin      • West Waco location       │
│     • Outpatient primary care         • 436 beds, specialty services     • Pediatrics & adults     │
│     • Same-day appointments           • Emergency & urgent care           • Lab services on-site    │
│                                                                                                      │
│  🏢 Ascension Hillsboro Clinic        🏢 Seton Williamson Hospital                                   │
│     • Rural/community location        • 201 Seton Pkwy, Round Rock                                  │
│     • Limited services                • Growing suburban market                                       │
│     • Telemedicine connections        • 169 beds, growing services                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Provider Login Workflow

### Real EMR Experience (Epic/Cerner/Athena):
```
1. Login with credentials
   ↓
2. SELECT LOCATION: 
   📍 Ascension Providence Waco
   📍 Ascension Family Medicine Waco  
   📍 Ascension Hillsboro Clinic
   ↓
3. Location context applied:
   • Patient schedules filtered by location
   • Location-specific resources available
   • Provider permissions activated
   • Billing/facility codes set
```

## Our EMR Architecture Implementation

### Database Structure:
```sql
health_systems
├── id, name ("Ascension Health System")
├── system_type ("health_system", "clinic_group", "independent")
└── branding (logos, colors, contact info)

organizations  
├── health_system_id → health_systems.id
├── name ("Ascension Central Texas")  
├── organization_type ("regional_health", "hospital", "clinic_group")
└── geographic_info (region, city, state)

locations
├── organization_id → organizations.id (nullable)
├── health_system_id → health_systems.id (can bypass organization)
├── name ("Ascension Providence Waco")
├── location_type ("clinic", "hospital", "urgent_care")
├── address, services, capabilities
└── operating_hours, facility_details

user_locations (Provider Assignments)
├── user_id → users.id
├── location_id → locations.id  
├── role_at_location ("primary_provider", "covering_provider")
├── is_primary (home location)
└── permissions (schedule, view_patients, create_orders)

user_session_locations (Login Context)
├── user_id → users.id
├── location_id → locations.id
├── selected_at, is_active
└── remember_selection
```

## Flexibility Examples

### Large Health System (Ascension):
```
Ascension Health System
├── Ascension Central Texas
│   ├── Providence Waco (Hospital)
│   ├── Family Medicine Waco (Clinic)
│   └── Hillsboro Clinic (Rural)
├── Ascension North Texas  
│   ├── Dallas Medical Center
│   └── Plano Family Medicine
└── Ascension Gulf Coast
    ├── Houston Methodist
    └── Galveston Clinics
```

### Mid-Size Regional (Seton):
```
Seton Healthcare Family
├── Seton Network Austin
│   ├── Seton Medical Center Austin
│   ├── Seton Northwest Hospital  
│   └── Multiple Austin clinics
└── Seton Network Georgetown
    ├── Seton Williamson Hospital
    └── Suburban clinics
```

### Independent Practice (Waco Family Medicine):
```
Waco Family Medicine (Health System)
└── [Skip Organization Level]
    ├── Main Waco Location
    ├── West Waco Location  
    └── Hewitt Location
```

### Solo Provider:
```
Dr. Smith Family Practice
└── [Skip Organization Level]
    └── Single Location
        • 123 Main St, Hometown
        • One provider, basic setup
```

## Key Benefits of This Architecture

1. **Scalability**: Works for 1 provider or 10,000+ providers
2. **Real-World Mapping**: Matches actual healthcare organizational structures  
3. **Location Context**: Providers select working location like real EMRs
4. **Flexible Hierarchy**: Can skip organizational levels as needed
5. **Provider Mobility**: Support providers working at multiple locations
6. **Patient-Centered Data**: All patient information shared across locations
7. **Billing Integration**: Location-specific facility codes and billing workflows

This architecture enables our EMR to serve everyone from solo family physicians to massive health systems like Ascension, while maintaining the familiar login and location selection workflow that healthcare providers expect.