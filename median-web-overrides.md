# Median Web Overrides for Mobile-Friendly Patient Chart

This document contains the CSS and JavaScript Web Overrides to make the PatientChartView component mobile-friendly in the Median native app.

## Enhanced React-Based Implementation

The implementation now includes:
1. **window.isMedianMobile flag** - Set by JavaScript override to enable React-based mobile detection
2. **Controlled sidebar state** - UnifiedChartPanel accepts isOpen/onOpenChange props for better state management
3. **Conditional rendering** - Mobile toggle button only shows when isMedianMobile is true
4. **Smart close behavior** - Sidebar closes automatically when selecting sections on mobile

## CSS Web Override

Copy and paste this CSS into the Median Web Override CSS field:

```css
/* MEDIAN MOBILE OPTIMIZATIONS - Patient Chart View */

/* Hide sidebar by default on mobile */
[data-median-app="true"] [data-median="unified-chart-panel"] {
  position: fixed;
  left: -100%;
  top: 0;
  height: 100vh;
  width: 85vw;
  max-width: 350px;
  z-index: 50;
  transition: left 0.3s ease-in-out;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
}

/* Full-width sidebar for patient chart view on mobile */
[data-median-app="true"] [data-median="patient-chart-main"] [data-median="unified-chart-panel"] {
  width: 100vw !important;
  max-width: 100vw !important;
}

/* Show sidebar when mobile menu is open */
[data-median-app="true"] [data-median="unified-chart-panel"].mobile-sidebar-open {
  left: 0;
}

/* Ensure encounter view sidebar starts closed on mobile */
[data-median-app="true"] [data-median="encounter-detail-main"] [data-median="unified-chart-panel"] {
  left: -100% !important;
}

/* Override to show when explicitly opened */
[data-median-app="true"] [data-median="encounter-detail-main"] [data-median="unified-chart-panel"].mobile-sidebar-open {
  left: 0 !important;
}

/* Hide resize handle on mobile */
[data-median-app="true"] [data-median="panel-resize-handle"] {
  display: none;
}

/* Style mobile overlay backdrop */
[data-median-app="true"] [data-median="mobile-sidebar-overlay"] {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

/* Mobile menu toggle button is now controlled by React isMedianMobile flag */
/* No CSS needed for visibility as it's conditionally rendered */

/* Hide desktop close button on mobile, show mobile close */
[data-median-app="true"] [data-median="mobile-sidebar-close"] {
  display: inline-flex !important;
}

/* Adjust main content for mobile */
[data-median-app="true"] [data-median="patient-chart-content"] {
  margin-left: 0 !important;
  width: 100% !important;
  padding: 1rem;
}

/* Stack header elements on smaller screens */
@media (max-width: 640px) {
  [data-median-app="true"] [data-median="patient-chart-header"] {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start !important;
  }
  
  [data-median-app="true"] [data-median="patient-info-block"] {
    width: 100%;
  }
  
  /* Make new encounter button full width on mobile */
  [data-median-app="true"] [data-median="new-encounter-button"] {
    width: 100%;
    justify-content: center;
    padding: 0.75rem;
    font-size: 1rem;
  }
  
  /* Hide button text on very small screens */
  @media (max-width: 400px) {
    [data-median-app="true"] [data-median="button-text"] {
      display: none;
    }
  }
}

/* Improve touch targets */
[data-median-app="true"] .chart-section-trigger {
  min-height: 48px;
  padding: 12px 16px;
}

[data-median-app="true"] button {
  min-height: 44px;
  min-width: 44px;
}

/* Adjust font sizes for better mobile readability */
[data-median-app="true"] [data-median="patient-name"] {
  font-size: 1.25rem;
}

[data-median-app="true"] [data-median="patient-chart-info"] {
  font-size: 0.875rem;
}

/* Ensure content sections use full width on mobile */
[data-median-app="true"] [data-median="chart-section-content"] {
  padding: 0;
  width: 100%;
}

/* Hide elements that don't work well on mobile */
[data-median-app="true"] .dense-view-toggle {
  display: none;
}

/* Hide gradient background element */
.flex-1.bg-gradient-to-br.from-primary {
  display: none !important;
}

/* Improve scrolling performance */
[data-median-app="true"] [data-median="unified-chart-panel"],
[data-median-app="true"] [data-median="patient-chart-content"] {
  -webkit-overflow-scrolling: touch;
}

/* Fix any z-index issues */
[data-median-app="true"] [data-median="patient-chart-main"] {
  position: relative;
  overflow: hidden;
}
```

## JavaScript Web Override

Copy and paste this JavaScript into the Median Web Override JS field:

```javascript
// MEDIAN MOBILE OPTIMIZATIONS - Patient Chart View JavaScript

// Set flag immediately before any other code runs
window.isMedianMobile = true;

(function() {
  'use strict';
  
  // Ensure flag persists
  window.isMedianMobile = true;
  
  // Wait for DOM to be ready
  function onReady(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  onReady(function() {
    // Track sidebar state
    let sidebarOpen = false;
    
    // Function to update sidebar state
    function updateSidebarState(isOpen) {
      const sidebar = document.querySelector('[data-median="unified-chart-panel"]');
      const overlay = document.querySelector('[data-median="mobile-sidebar-overlay"]');
      
      if (sidebar) {
        if (isOpen) {
          sidebar.classList.add('mobile-sidebar-open');
        } else {
          sidebar.classList.remove('mobile-sidebar-open');
        }
      }
      
      sidebarOpen = isOpen;
    }
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
      if (sidebarOpen) {
        const sidebar = document.querySelector('[data-median="unified-chart-panel"]');
        const menuToggle = document.querySelector('[data-median="mobile-menu-toggle"]');
        
        if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
          updateSidebarState(false);
        }
      }
    });
    
    // Handle section clicks to close sidebar
    document.addEventListener('click', function(e) {
      const sectionTrigger = e.target.closest('.chart-section-trigger');
      if (sectionTrigger && sidebarOpen) {
        // Close sidebar after a short delay to allow section to expand
        setTimeout(() => updateSidebarState(false), 300);
      }
    });
    
    // Prevent body scroll when sidebar is open
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const sidebar = mutation.target;
          if (sidebar.classList.contains('mobile-sidebar-open')) {
            document.body.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = '';
          }
        }
      });
    });
    
    const sidebar = document.querySelector('[data-median="unified-chart-panel"]');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true });
    }
    
    // Handle back button to close sidebar
    window.addEventListener('popstate', function() {
      if (sidebarOpen) {
        updateSidebarState(false);
      }
    });
    
    // Add swipe gesture to close sidebar
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
    
    function handleSwipe() {
      const sidebar = document.querySelector('[data-median="unified-chart-panel"]');
      if (!sidebar || !sidebarOpen) return;
      
      // Swipe left to close
      if (touchEndX < touchStartX - 50) {
        updateSidebarState(false);
      }
    }
  });
})();
```

## Implementation Notes

1. **Data Attributes Added**: 
   - `data-median-app="true"` on main container and key elements
   - `data-median="[element-name]"` for specific targeting
   - Comments marked with "MEDIAN TAG" in the code

2. **Mobile Optimizations**:
   - Sidebar transforms into a slide-over panel on mobile
   - Touch-friendly button sizes (minimum 44px)
   - Swipe-to-close gesture support
   - Responsive header layout
   - Full-width buttons on small screens

3. **Testing in Median**:
   - Add these overrides in the Median dashboard
   - Test on various mobile devices
   - Verify slide-over animation works smoothly
   - Check that all touch targets are easily tappable

4. **Reverting Changes**:
   - To disable: Remove the CSS/JS from Median Web Overrides
   - To modify: Update the CSS/JS in Median dashboard
   - Code comments help identify Median-specific elements

## Troubleshooting

If the mobile sidebar isn't working:
1. Check that React state updates are triggering properly
2. Verify data-median attributes are rendering in the DOM
3. Check browser console for any JavaScript errors
4. Ensure CSS specificity is sufficient

## Implementation Status

### ✅ Patient Chart View (patient-chart-view.tsx)
- Mobile detection with fallback to screen width (≤768px)
- Sidebar opens by default (full-width 100vw) on mobile
- New Encounter button relocated to sidebar encounters section
- Mobile menu toggle button conditionally rendered
- Overlay backdrop when sidebar is open
- All mobile props passed to UnifiedChartPanel

### ✅ Encounter View (encounter-detail-view.tsx)
- Mobile detection with fallback to screen width (≤768px)
- Sidebar closed by default (slide-over behavior)
- Mobile menu toggle button in header (only shows in Median app)
- Overlay backdrop when sidebar is open
- All mobile props passed to UnifiedChartPanel
- Provider documentation focused by default

### ✅ UnifiedChartPanel (unified-chart-panel.tsx)
- Accepts all mobile-specific props
- Handles isOpen/onOpenChange for controlled state
- Mobile close button in header
- Conditional styling based on isPatientChartView
- Auto-close on section selection (encounter view only)