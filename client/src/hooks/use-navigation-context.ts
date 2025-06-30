import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface NavigationContext {
  fromSection?: string;
  fromContext?: string;
  fromUrl?: string;
  contextLabel?: string;
}

export function useNavigationContext() {
  const [location, setLocation] = useLocation();
  const [navContext, setNavContext] = useState<NavigationContext | null>(null);

  useEffect(() => {
    // Parse URL parameters to detect navigation context
    const urlParams = new URLSearchParams(window.location.search);
    const fromSection = urlParams.get('from');
    const fromContext = urlParams.get('context');
    const fromUrl = urlParams.get('returnUrl');

    if (fromSection || fromContext || fromUrl) {
      // Determine context label based on source
      let contextLabel = 'Previous Page';
      
      if (fromSection && fromContext) {
        // Format: "from=surgical-history&context=patient-chart"
        contextLabel = `${formatSectionName(fromSection)} (${formatContextName(fromContext)})`;
      } else if (fromSection) {
        contextLabel = formatSectionName(fromSection);
      } else if (fromContext) {
        contextLabel = formatContextName(fromContext);
      }

      setNavContext({
        fromSection: fromSection ?? undefined,
        fromContext: fromContext ?? undefined,
        fromUrl: fromUrl ?? document.referrer,
        contextLabel
      });

      console.log(`🔗 [NavigationContext] Detected navigation from: ${contextLabel}`);
    } else {
      setNavContext(null);
    }
  }, [location]);

  const navigateWithContext = (targetUrl: string, sourceSection: string, sourceContext: string) => {
    // Add navigation context to target URL
    const url = new URL(targetUrl, window.location.origin);
    url.searchParams.set('from', sourceSection);
    url.searchParams.set('context', sourceContext);
    url.searchParams.set('returnUrl', window.location.pathname + window.location.search);
    
    console.log(`🔗 [NavigationContext] Navigating with context: ${sourceSection} (${sourceContext})`);
    setLocation(url.pathname + url.search);
  };

  const goBack = () => {
    if (navContext?.fromUrl) {
      // Parse the return URL and clean only navigation context parameters
      const url = new URL(navContext.fromUrl, window.location.origin);
      url.searchParams.delete('from');
      url.searchParams.delete('context');
      url.searchParams.delete('returnUrl');
      
      const cleanUrl = url.pathname + (url.search ? url.search : '');
      console.log(`🔗 [NavigationContext] Going back to: ${cleanUrl}`);
      setLocation(cleanUrl);
    } else {
      // Fallback to browser history
      window.history.back();
    }
  };

  const clearContext = () => {
    // Remove navigation context from current URL
    const url = new URL(window.location.href);
    url.searchParams.delete('from');
    url.searchParams.delete('context');
    url.searchParams.delete('returnUrl');
    
    const cleanUrl = url.pathname + (url.search ? url.search : '');
    window.history.replaceState({}, '', cleanUrl);
    setNavContext(null);
  };

  return {
    navContext,
    navigateWithContext,
    goBack,
    clearContext,
    hasContext: !!navContext
  };
}

function formatSectionName(section: string): string {
  const sectionMap: Record<string, string> = {
    'surgical-history': 'Surgical History',
    'medical-problems': 'Medical Problems',
    'vitals': 'Vitals',
    'attachments': 'Attachments',
    'encounters': 'Encounters',
    'medications': 'Medications',
    'labs': 'Lab Results',
    'allergies': 'Allergies'
  };
  
  return sectionMap[section] || section.charAt(0).toUpperCase() + section.slice(1);
}

function formatContextName(context: string): string {
  const contextMap: Record<string, string> = {
    'patient-chart': 'Patient Chart',
    'encounter': 'Encounter Detail',
    'nursing-chart': 'Nursing Chart',
    'nursing-encounter': 'Nursing Encounter'
  };
  
  return contextMap[context] || context.charAt(0).toUpperCase() + context.slice(1);
}