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

/* Collapse unified chart panel by default in encounter views */
[data-median="encounter-view-chart-panel"] {
    width: 60px !important;
    min-width: 60px !important;
}

/* Hide chart content when collapsed */
[data-median="encounter-view-chart-panel"][data-collapsed="true"] .chart-section-trigger,
[data-median="encounter-view-chart-panel"][data-collapsed="true"] [data-median="unified-chart-search"],
[data-median="encounter-view-chart-panel"][data-collapsed="true"] .chart-section-content {
    display: none !important;
}

/* Show expand button when collapsed */
[data-median="encounter-view-chart-panel"][data-collapsed="true"] [data-median="expand-chart-button"] {
    display: flex !important;
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