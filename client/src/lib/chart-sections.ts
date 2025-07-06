import { LucideIcon, Star, Stethoscope, Activity, FileText, Bot, Calendar, History, Heart, Users, Briefcase, Paperclip, TestTube, Camera, AlertCircle } from "lucide-react";

export interface ChartSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  contexts: ('patient-chart' | 'provider-encounter' | 'nurse-encounter')[];
  roles?: ('admin' | 'provider' | 'nurse' | 'ma')[];
  allowExpanded?: boolean;
  compactMode?: boolean;
  expandedWidth?: string;
  priority?: number; // For ordering sections
}

export interface ChartPanelConfig {
  context: 'patient-chart' | 'provider-encounter' | 'nurse-encounter';
  userRole?: string;
  allowResize?: boolean;
  defaultWidth?: string;
  maxExpandedWidth?: string;
  enableSearch?: boolean;
}

export interface ChartPanelState {
  expandedSections: Set<string>;
  isExpanded: boolean;
  currentWidth: string;
  activeSection?: string;
  searchQuery?: string;
}

// Centralized chart sections registry
export const CHART_SECTIONS: ChartSection[] = [
  {
    id: "encounters",
    label: "Patient Encounters",
    icon: Star,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 1,
    allowExpanded: true,
    expandedWidth: "w-96"
  },
  {
    id: "problems",
    label: "Medical Problems",
    icon: AlertCircle,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 2,
    allowExpanded: true,
    expandedWidth: "w-[500px]"
  },
  {
    id: "medication",
    label: "Medication",
    icon: TestTube,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 3,
    allowExpanded: true,
    expandedWidth: "w-[600px]",
    compactMode: true // Enable compact mode to prevent spillover
  },
  {
    id: "allergies",
    label: "Allergies",
    icon: AlertCircle,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 4,
    allowExpanded: true,
    expandedWidth: "w-96"
  },
  {
    id: "labs",
    label: "Labs",
    icon: TestTube,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 5,
    allowExpanded: true,
    expandedWidth: "w-[700px]"
  },
  {
    id: "vitals",
    label: "Vitals",
    icon: Activity,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 6,
    allowExpanded: true,
    expandedWidth: "w-[600px]"
  },
  {
    id: "imaging",
    label: "Imaging",
    icon: Camera,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 7,
    allowExpanded: true,
    expandedWidth: "w-[500px]"
  },
  {
    id: "documents",
    label: "Patient Documents",
    icon: FileText,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 8,
    allowExpanded: true,
    expandedWidth: "w-[800px]"
  },
  {
    id: "family-history",
    label: "Family History",
    icon: Users,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 9,
    allowExpanded: true,
    expandedWidth: "w-96"
  },
  {
    id: "social-history",
    label: "Social History",
    icon: Users,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 10,
    allowExpanded: true,
    expandedWidth: "w-96"
  },
  {
    id: "surgical-history",
    label: "Surgical History",
    icon: History,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 11,
    allowExpanded: true,
    expandedWidth: "w-[500px]"
  },
  {
    id: "attachments",
    label: "Attachments",
    icon: Paperclip,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 12,
    allowExpanded: true,
    expandedWidth: "w-[600px]"
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: Calendar,
    contexts: ['patient-chart', 'provider-encounter', 'nurse-encounter'],
    roles: ['admin', 'provider', 'nurse', 'ma'],
    priority: 13,
    allowExpanded: true,
    expandedWidth: "w-96"
  },
  // Nursing-specific sections
  {
    id: "nursing-assessments",
    label: "Nursing Assessments",
    icon: Stethoscope,
    contexts: ['nurse-encounter'],
    roles: ['admin', 'nurse', 'ma'],
    priority: 15,
    allowExpanded: true,
    expandedWidth: "w-[500px]"
  },
  {
    id: "care-plans",
    label: "Care Plans",
    icon: Heart,
    contexts: ['nurse-encounter'],
    roles: ['admin', 'nurse', 'ma'],
    priority: 16,
    allowExpanded: true,
    expandedWidth: "w-[500px]"
  }
];

// Helper functions
export function getAvailableSections(
  context: ChartPanelConfig['context'], 
  userRole?: string
): ChartSection[] {
  return CHART_SECTIONS
    .filter(section => 
      section.contexts.includes(context) &&
      (!section.roles || !userRole || section.roles.includes(userRole as any))
    )
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));
}

export function getSectionConfig(sectionId: string): ChartSection | undefined {
  return CHART_SECTIONS.find(section => section.id === sectionId);
}

export function getDefaultExpandedSections(context: ChartPanelConfig['context']): string[] {
  return ['encounters']; // Always expand encounters by default
}