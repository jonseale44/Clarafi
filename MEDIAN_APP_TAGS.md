# Median App Tags Documentation

This document lists all the `data-median` attributes and classes added to React components throughout the medical EMR application to enable mobile-specific styling and behavior when running as a Median-powered mobile app.

## Purpose

These tags allow you to:
- Hide certain elements in the mobile app
- Apply different spacing or layouts for mobile
- Prioritize content visibility on smaller screens
- Create mobile-optimized user experiences

**Important**: These tags have NO effect on the standard web browser experience. They are purely for use with Median's Web Overrides feature.

## Tag Categories

### 1. Visibility Control Tags

#### `data-median="hide-on-mobile-app"`
**Usage**: Completely hide elements in the mobile app
**Applied to**:
- Desktop-only features in header (date/time display)
- Extended user profile information
- Secondary stat cards (messages, prescriptions)
- Address and location columns in patient table
- Clear context button in navigation breadcrumb
- Chevron icon in user profile menu
- Weight card in quick stats
- Scheduling and Blog navigation tabs in dashboard
- All admin navigation items (Admin Prompts, Admin Users, Subscription Config, etc.)
- Practice Migration link for both admin and provider roles
- "Create Patient" button text (keeping icon only on mobile)

#### `data-median="mobile-hide-column"`
**Usage**: Hide specific table columns on mobile
**Applied to**:
- MRN column in patient table (both header and cells)

### 2. Layout and Spacing Tags

#### `data-median="mobile-reduced-width"`
**Usage**: Reduce width of elements on mobile
**Applied to**:
- Global search form in header

#### `data-median="mobile-reduced-padding"`
**Usage**: Reduce padding/spacing on mobile
**Applied to**: (Ready to be used, not yet applied)

### 3. Component-Specific Tags

#### Header Components
- `data-median="header-desktop-layout"` - Main header container
- `data-median="mobile-notification-icon"` - Notification bell icon
- `data-median="mobile-header-wrapper"` - Top navigation bar wrapper in dashboard
- `data-median="mobile-header-content"` - Header content flex container
- `data-median="mobile-nav-container"` - Navigation container with brand and tabs
- `data-median="mobile-brand"` - Brand logo and text container
- `data-median="mobile-brand-text"` - CLARAFI brand text
- `data-median="mobile-scrollable-nav"` - Navigation that should be horizontally scrollable on mobile
- `data-median="mobile-header-actions"` - Right side actions container (Create Patient, User Menu)
- `data-median="mobile-compact-button"` - Compact button style for mobile
- `data-median="mobile-user-menu"` - User profile menu wrapper

#### User Profile
- `data-median="mobile-compact-profile"` - User profile button

#### Dashboard Stats
- `data-median="mobile-stats-grid"` - Stats grid container
- `data-median="mobile-stat-card-priority"` - High-priority stat cards (pending encounters, lab orders, blood pressure, heart rate, pain scale)
- `data-median="mobile-stat-card-secondary"` - Secondary stat cards (completed today, imaging, temperature, O2 saturation)

#### Navigation
- `data-median="mobile-navigation-breadcrumb"` - Navigation breadcrumb container
- `data-median="mobile-back-button"` - Back navigation buttons

#### Tables
- `data-median="mobile-patient-table"` - Patient table container
- `data-median="mobile-table-header"` - Table header row

#### Tabs
- `data-median="mobile-dashboard-tabs"` - Dashboard tabs container
- `data-median="mobile-tabs-list"` - Tab list container
- `data-median="mobile-tab-secondary"` - Secondary tab items

#### Page Containers
- `data-median="patient-view-container"` - Patient view page container
- `data-median="mobile-patient-header"` - Patient page header
- `data-median="mobile-patient-main"` - Patient main content area
- `data-median="patient-chart-main"` - Patient chart main container
- `data-median="desktop-chart-panel"` - Desktop-only chart panel
- `data-median="desktop-only"` - Desktop-only content sections
- `data-median="mobile-full-width-chart"` - Mobile full-width chart container
- `data-median="encounter-view-container"` - Encounter view container
- `data-median="mobile-encounter-main"` - Encounter main content area
- `data-median="encounter-detail-view"` - Encounter detail view container
- `data-median="nursing-encounter-view"` - Nursing encounter view container
- `data-median="encounter-view-chart-panel"` - Encounter view chart panel wrapper
- `data-median="provider-documentation-content"` - Provider documentation main content

#### Vital Signs
- `data-median="mobile-vitals-grid"` - Vitals grid container
- `data-median="mobile-vital-card-priority"` - Priority vital cards (BP, HR, pain)
- `data-median="mobile-vital-card-secondary"` - Secondary vital cards (temp, O2)

#### Patient Parser
- `data-median="qr-code-section"` - QR code photo capture section in patient parser

#### UI Elements
- `data-median="new-encounter-button"` - New encounter button in header (hidden on mobile)
- `data-median="mobile-new-encounter-container"` - Mobile new encounter container in encounters tab
- `data-median="unified-chart-panel"` - Unified chart panel container
- `data-median="unified-chart-search"` - Chart search input
- `data-median="expand-chart-button"` - Mobile expand button for collapsed chart

## Usage with Median

To apply mobile-specific styles or behavior in your Median app configuration:

### CSS Examples
```css
/* Hide elements on mobile */
[data-median="hide-on-mobile-app"] {
    display: none !important;
}

/* Hide auth hero section on mobile */
[data-median="auth-hero-section"] {
    display: none !important;
}

/* === PATIENT CHART VIEW MOBILE LAYOUT === */

/* Hide desktop chart panel on mobile */
[data-median="desktop-chart-panel"] {
    display: none !important;
}

/* Hide desktop main content on mobile */
[data-median="desktop-only"] {
    display: none !important;
}

/* Show full-width mobile chart panel */
[data-median="mobile-full-width-chart"] {
    display: block !important;
    width: 100% !important;
}

/* Make unified chart panel full width on mobile */
[data-median="mobile-full-width-chart"] [data-median="unified-chart-panel"] {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 100vw !important;
}

/* Hide new encounter button in header on mobile (it's in encounters tab now) */
[data-median="new-encounter-button"] {
    display: none !important;
}

/* Show mobile new encounter button in encounters tab */
[data-median="mobile-new-encounter-container"] {
    display: block !important;
}

/* === ENCOUNTER VIEW MOBILE LAYOUT === */

/* Main encounter view container */
[data-median="encounter-detail-view"],
[data-median="nursing-encounter-view"] {
    padding: 0 !important;
    margin: 0 !important;
}

/* Collapse unified chart panel by default in encounter views */
[data-median="encounter-view-chart-panel"] {
    position: fixed !important;
    left: -320px !important;
    top: 0 !important;
    height: 100vh !important;
    width: 320px !important;
    background: white !important;
    z-index: 1000 !important;
    transition: left 0.3s ease !important;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1) !important;
}

/* When expanded, slide in from left */
[data-median="encounter-view-chart-panel"]:not([data-collapsed="true"]) {
    left: 0 !important;
}

/* Show expand button fixed at top to align with collapse button */
[data-median="expand-chart-button"] {
    display: flex !important;
    position: fixed !important;
    left: 10px !important;
    top: 80px !important; /* Aligned with typical header height */
    width: 40px !important;
    height: 40px !important;
    padding: 0 !important;
    margin: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    background: #1e3a8a !important;
    color: white !important;
    border: none !important;
    border-radius: 50% !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    z-index: 999 !important;
}

/* Hide expand button when panel is expanded */
[data-median="encounter-view-chart-panel"]:not([data-collapsed="true"]) ~ [data-median="expand-chart-button"] {
    display: none !important;
}

/* Collapse button inside expanded panel */
[data-median="collapse-chart-button"] {
    display: none !important;
}

[data-median="encounter-view-chart-panel"]:not([data-collapsed="true"]) [data-median="collapse-chart-button"] {
    display: flex !important;
    position: absolute !important;
    right: 10px !important;
    top: 10px !important;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    margin: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    background: #f3f4f6 !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
    z-index: 10 !important;
}

/* Provider documentation content - full width */
[data-median="provider-documentation-content"] {
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
}

/* Fix card and content padding */
[data-median="provider-documentation-content"] .p-6 {
    padding: 16px !important;
}

[data-median="provider-documentation-content"] .p-4 {
    padding: 12px !important;
}

/* Ensure buttons stay within their containers */
[data-median="provider-documentation-content"] button {
    max-width: 100% !important;
    white-space: normal !important;
    word-wrap: break-word !important;
}

/* Fix flex containers to prevent overflow */
[data-median="provider-documentation-content"] .flex {
    flex-wrap: wrap !important;
    gap: 8px !important;
}

/* Ensure cards fill width */
[data-median="provider-documentation-content"] > div > div {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
}

/* === RESPONSIVE BUTTON FIXES (Web and Mobile) === */

/* Fix button overflow for Orders and Billing sections */
@media (max-width: 768px) {
    /* Order section buttons */
    [data-median="provider-documentation-content"] .space-y-4 > div > div:first-child {
        flex-wrap: wrap !important;
        gap: 8px !important;
    }
    
    /* Update from SOAP and Add Order buttons */
    [data-median="provider-documentation-content"] button[type="button"] {
        min-width: auto !important;
        padding: 8px 12px !important;
        font-size: 14px !important;
    }
    
    /* Ensure proper spacing */
    [data-median="provider-documentation-content"] .p-6 {
        padding: 12px !important;
    }
    
    /* Fix card headers */
    [data-median="provider-documentation-content"] .space-y-4 {
        width: 100% !important;
    }
    
    /* Ensure full width for sections */
    [data-median="provider-documentation-content"] .flex-1 {
        width: 100% !important;
        min-width: 0 !important;
    }
}

/* === LANDSCAPE ORIENTATION FIXES === */

/* Apply same collapse behavior in landscape mode */
@media (orientation: landscape) {
    /* Ensure chart panel stays off-screen when collapsed in landscape */
    [data-median="encounter-view-chart-panel"][data-collapsed="true"] {
        left: -320px !important;
    }
    
    /* Keep expand button visible in landscape */
    [data-median="expand-chart-button"] {
        display: flex !important;
    }
    
    /* Adjust top position for landscape if needed */
    @media (max-height: 500px) {
        [data-median="expand-chart-button"] {
            top: 60px !important; /* Slightly higher for smaller landscape screens */
        }
    }
}

/* === HIDE FREQUENT TOAST NOTIFICATIONS IN MOBILE === */

/* Hide all toast notifications in mobile app to prevent UI interference */
/* This targets the Radix UI toast viewport and all toasts within it */
.fixed.top-0.z-\\[100\\],
.fixed.top-0.z-\\[100\\] > div[data-state="open"],
.fixed.top-0.z-\\[100\\] > div[data-state="closed"] {
    display: none !important;
    visibility: hidden !important;
}

/* Alternative: Hide just the toast viewport completely */
div[data-radix-presence-viewport],
div[style*="--radix-toast"] {
    display: none !important;
}

/* Backup: Target toast elements by their structure */
.group.pointer-events-auto.relative.flex.w-full.items-center.justify-between {
    display: none !important;
}

/* Additional targeting for any remaining toasts */
[data-state="open"][data-swipe="move"],
[data-state="open"][data-swipe="cancel"],
[data-state="open"][data-swipe="end"],
[data-state="open"].animate-in,
[data-state="closed"].animate-out {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
}

/* === OTHER MOBILE STYLES === */

/* Adjust grid layout for mobile */
[data-median="mobile-stats-grid"] {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem !important;
}

/* Reduce padding on mobile */
[data-median="mobile-reduced-padding"] {
    padding: 0.5rem !important;
}

/* Make tables responsive */
[data-median="mobile-patient-table"] table {
    font-size: 0.875rem;
}

/* Mobile header responsive styles */
[data-median="mobile-header-wrapper"] {
    padding: 0.5rem !important;
}

[data-median="mobile-nav-container"] {
    gap: 0.5rem !important;
}

[data-median="mobile-scrollable-nav"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
}

/* Icon-only button on mobile */
[data-median="mobile-compact-button"] span {
    display: none !important;
}

/* Adjust vital cards layout */
[data-median="mobile-vitals-grid"] {
    grid-template-columns: repeat(2, 1fr) !important;
}

/* Hide secondary cards on very small screens */
@media (max-width: 360px) {
    [data-median="mobile-stat-card-secondary"] {
        display: none;
    }
}
```

### JavaScript Examples
```javascript
// Adjust behavior for mobile
if (document.querySelector('[data-median="patient-view-container"]')) {
    // Add swipe gestures or other mobile-specific interactions
}

// Modify tab behavior on mobile
const mobileTabs = document.querySelector('[data-median="mobile-dashboard-tabs"]');
if (mobileTabs) {
    // Convert to dropdown on very small screens
}
```

## Best Practices

1. **Test on Multiple Screen Sizes**: Ensure your overrides work well on various mobile devices
2. **Maintain Consistency**: Use consistent naming patterns for similar elements
3. **Progressive Enhancement**: Start with hiding non-essential elements, then optimize layouts
4. **Performance**: Be mindful of CSS specificity and JavaScript performance on mobile devices
5. **Accessibility**: Ensure hidden elements don't break screen reader navigation

## Future Considerations

Additional tags that could be added:
- `data-median="mobile-dropdown"` - Convert elements to dropdowns on mobile
- `data-median="mobile-collapsible"` - Make sections collapsible on mobile
- `data-median="mobile-swipeable"` - Enable swipe gestures
- `data-median="mobile-sticky"` - Make elements sticky on mobile scroll

## Notes

- All tags are designed to be invisible to standard web browsers
- No JavaScript logic has been added to components - only tagging
- Tags can be combined with existing classes for more specific targeting
- The `median-*` class pattern is also available as an alternative to data attributes