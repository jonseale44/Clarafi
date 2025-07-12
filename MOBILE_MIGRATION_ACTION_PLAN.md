# EMR Mobile Migration Action Plan

## Your Migration Toolkit

I've created a comprehensive migration plan for you. Here's what you now have:

### 📚 Documentation Created
1. **EMR_WEB_TO_MOBILE_ARCHITECTURE.md** - Complete file mapping and feature matrix
2. **MOBILE_MIGRATION_PRACTICAL_GUIDE.md** - Step-by-step implementation guide
3. **MOBILE_CODE_TRANSFORMATION_EXAMPLES.md** - Real code examples from your EMR

## Immediate Next Steps

### 1. GitHub Setup (Today)
```bash
# Create a new branch for mobile work
git checkout -b mobile-migration-main

# Create your first feature branch
git checkout -b mobile/fix-api-service

# After each component is done
git add .
git commit -m "mobile: implement [feature]"
git push origin mobile/[feature-name]
```

### 2. Fix Your Expo App Connection (First Priority)
Use the prompt in `/EXPO_APP_DATABASE_CONNECTION_PROMPT.md` to fix the database connection.

### 3. Start With These Files (Week 1)

#### Day 1-2: API Service
**Web File**: `client/src/lib/api-client.ts`
**Mobile File**: `clarafi-mobile/src/services/api.ts`

Give this to your assistant:
```
Please refactor the web API client from client/src/lib/api-client.ts 
for React Native. It should:
- Work with the backend at http://localhost:5000
- Handle authentication tokens with SecureStore
- Include all the same methods as the web version
- Add proper error handling for mobile
```

#### Day 3-4: Types & Interfaces
**Web File**: `shared/schema.ts`
**Mobile File**: `clarafi-mobile/src/types/index.ts`

This is mostly copy-paste! These TypeScript types work in both web and mobile.

#### Day 5: Patient List Enhancement
**Web File**: `client/src/pages/patients-page.tsx`
**Mobile File**: `clarafi-mobile/src/screens/PatientListScreen.tsx`

Use the transformation example in `MOBILE_CODE_TRANSFORMATION_EXAMPLES.md`.

### 4. Component-by-Component Migration

For each component, follow this pattern:

1. **Find the web version** (use the file mapping in the architecture guide)
2. **Create mobile version** using the transformation examples
3. **Test on device/simulator**
4. **Commit to Git**

### 5. Priority Order

#### Must Have (Week 1-2)
- [ ] API Service
- [ ] Authentication (login, registration)
- [ ] Patient List
- [ ] Patient Chart (basic)
- [ ] Allergies display
- [ ] Medications display
- [ ] Vitals display

#### Should Have (Week 3-4)
- [ ] SOAP note creation
- [ ] Voice recording enhancements
- [ ] Order entry (full)
- [ ] Lab results
- [ ] Medical problems

#### Nice to Have (Week 5-6)
- [ ] Imaging viewer
- [ ] Document management
- [ ] Appointments
- [ ] Offline support

## How to Use These Guides

### For Each Feature:
1. **Check Architecture Guide** - Find which web files implement the feature
2. **Look at Code Examples** - See how similar components were transformed
3. **Follow Practical Guide** - Use the patterns and component library
4. **Ask Your Assistant** - Give them the web code and ask for mobile version

### Example Prompt for Your Assistant:
```
I need to convert the AllergiesSection component from web to React Native.

Web version is in: client/src/components/chart-sections/allergies-section.tsx

Please create a mobile version that:
- Uses React Native components (View, Text, FlatList)
- Includes the same functionality (display, add, edit, delete)
- Uses React Navigation for any navigation
- Follows the style patterns in MOBILE_CODE_TRANSFORMATION_EXAMPLES.md
- Works with our API service
```

## Quick Reference

### File Location Map
```
Web → Mobile
client/src/pages/* → clarafi-mobile/src/screens/*
client/src/components/* → clarafi-mobile/src/components/*
client/src/lib/* → clarafi-mobile/src/services/*
client/src/hooks/* → clarafi-mobile/src/hooks/*
```

### Component Conversion Cheat Sheet
```
div → View
span/p/h1 → Text
button → TouchableOpacity + Text
input → TextInput
img → Image
a → TouchableOpacity or Link
select → Picker or custom Modal
form → View (no form element needed)
```

### Style Conversion
```
className="flex flex-col p-4" → style={{ flexDirection: 'column', padding: 16 }}
className="text-xl font-bold" → style={{ fontSize: 20, fontWeight: 'bold' }}
className="bg-blue-500" → style={{ backgroundColor: '#3B82F6' }}
```

## Today's Action Items

1. **Fix the Expo app API connection** using the prompt provided
2. **Set up Git branches** for organized development
3. **Start with API service migration** - this unlocks everything else
4. **Test login functionality** once API is working

## Questions to Answer

Before starting each component, ask yourself:
1. What web files implement this feature?
2. What mobile-specific features should I add? (pull-to-refresh, swipe actions, etc.)
3. How will this look on small screens?
4. What touch gestures make sense here?

## Need Help?

When stuck, provide your assistant with:
1. The web component code
2. The desired mobile functionality
3. Reference to the transformation examples
4. Any specific mobile features you want

The guides contain everything you need to systematically convert your entire EMR to mobile. Start with the API service today and work through the priority list!