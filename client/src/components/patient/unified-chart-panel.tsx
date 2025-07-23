import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Maximize2, 
  Minimize2,
  GripVertical,
  X,
  Plus
} from "lucide-react";
import { Patient } from "@shared/schema";
import { SharedChartSections } from "./shared-chart-sections";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User as UserType, SelectUserNotePreferences } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { 
  getAvailableSections, 
  getSectionConfig, 
  getDefaultExpandedSections,
  type ChartPanelConfig,
  type ChartPanelState 
} from "@/lib/chart-sections";
import { DenseViewToggle } from "@/components/ui/dense-view-toggle";

interface UnifiedChartPanelProps {
  patient: Patient;
  config: ChartPanelConfig;
  encounterId?: number;
  encounter?: any;
  onBackToChart?: () => void;
  highlightAttachmentId?: number;
  isAutoGeneratingMedicalProblems?: boolean;
  medicalProblemsProgress?: number;
  onSectionChange?: (sectionId: string) => void;
  activeSection?: string;
  mobileSidebarOpen?: boolean; // MEDIAN: Mobile sidebar visibility state
  onCloseMobileSidebar?: () => void; // MEDIAN: Function to close mobile sidebar
  isMedianMobile?: boolean; // MEDIAN: Flag to indicate if running in Median mobile app
  isOpen?: boolean; // MEDIAN: Controlled open state for mobile
  onOpenChange?: (open: boolean) => void; // MEDIAN: Callback for open state changes
  onNewEncounter?: () => void; // MEDIAN: Function to create new encounter (mobile only)
  isPatientChartView?: boolean; // MEDIAN: Whether we're in patient chart view (vs encounter view)
}



export function UnifiedChartPanel({
  patient,
  config,
  encounterId,
  encounter,
  onBackToChart,
  highlightAttachmentId,
  isAutoGeneratingMedicalProblems = false,
  medicalProblemsProgress = 0,
  onSectionChange,
  activeSection,
  mobileSidebarOpen = false,
  onCloseMobileSidebar,
  isMedianMobile = false,
  isOpen,
  onOpenChange,
  onNewEncounter,
  isPatientChartView = false
}: UnifiedChartPanelProps) {
  const queryClient = useQueryClient();
  
  // Get current user for role-based filtering
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Load user preferences
  const { data: userPreferences } = useQuery<SelectUserNotePreferences>({
    queryKey: ["/api/user/preferences"],
    enabled: !!currentUser,
  });

  // Panel state
  const [panelState, setPanelState] = useState<ChartPanelState>({
    expandedSections: new Set(getDefaultExpandedSections(config.context)),
    isExpanded: false,
    currentWidth: config.defaultWidth || "w-80",
    activeSection: activeSection,
    searchQuery: ""
  });

  // Sync external activeSection prop with internal state
  useEffect(() => {
    if (activeSection !== panelState.activeSection) {
      console.log('🔗 [UnifiedChartPanel] Syncing external activeSection:', activeSection);
      setPanelState(prev => ({
        ...prev,
        activeSection: activeSection
      }));
    }
  }, [activeSection, panelState.activeSection]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [panelWidth, setPanelWidth] = useState(400);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // MEDIAN: Handle controlled open state for mobile
  const isPanelOpen = isOpen !== undefined ? isOpen : true; // Default to open if not controlled
  
  // MEDIAN: Effect to handle open state changes
  useEffect(() => {
    if (isMedianMobile && onOpenChange && isOpen !== undefined) {
      // Handle any necessary side effects when panel opens/closes
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    
    return () => {
      if (isMedianMobile) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, isMedianMobile, onOpenChange]);

  // Update panel width when user preferences load
  useEffect(() => {
    console.log('🔧 [ChartPanel] User preferences loaded:', userPreferences);
    if (userPreferences?.chartPanelWidth != null) {
      console.log('🔧 [ChartPanel] Setting panel width from preferences:', userPreferences.chartPanelWidth);
      setPanelWidth(userPreferences.chartPanelWidth);
    }
  }, [userPreferences]);

  // Mutation to save user preferences (no toast)
  const savePreferences = useMutation({
    mutationFn: async (preferences: { chartPanelWidth: number }) => {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify(preferences),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      // Silently update cache without showing any toast
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  // Get available sections based on context and user role
  const availableSections = getAvailableSections(config.context, currentUser?.role);

  // Filter sections based on search query
  const filteredSections = panelState.searchQuery && panelState.searchQuery.trim()
    ? availableSections.filter(section =>
        section.label.toLowerCase().includes((panelState.searchQuery || "").toLowerCase())
      )
    : availableSections;

  const toggleSection = (sectionId: string) => {
    setPanelState(prev => {
      const newExpanded = new Set(prev.expandedSections);
      let newActiveSection = prev.activeSection;
      
      if (newExpanded.has(sectionId)) {
        // If section is already expanded, collapse it
        newExpanded.delete(sectionId);
        // If this was the active section, clear active section
        if (prev.activeSection === sectionId) {
          newActiveSection = undefined;
        }
      } else {
        // If section is collapsed, expand it and make it active
        newExpanded.add(sectionId);
        newActiveSection = sectionId;
        
        // Notify parent component about section change
        console.log('🔗 [UnifiedChartPanel] Setting active section:', sectionId);
        if (onSectionChange) {
          onSectionChange(sectionId);
        }
      }
      
      return {
        ...prev,
        expandedSections: newExpanded,
        activeSection: newActiveSection
      };
    });
  };

  const expandSection = (sectionId: string) => {
    const sectionConfig = getSectionConfig(sectionId);
    if (!sectionConfig?.allowExpanded) return;

    setPanelState(prev => ({
      ...prev,
      isExpanded: true,
      activeSection: sectionId,
      currentWidth: sectionConfig.expandedWidth || "w-[600px]"
    }));
  };

  const collapsePanelToDefault = () => {
    setPanelState(prev => ({
      ...prev,
      isExpanded: false,
      activeSection: undefined,
      currentWidth: config.defaultWidth || "w-80"
    }));
    setPanelWidth(320); // Reset to default
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle panel resizing - Fixed version
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragStartWidth(panelWidth);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || dragStart === 0) return;
    
    const diff = e.clientX - dragStart;
    // Allow dragging up to 50% of screen width (much larger than before)
    const maxWidth = Math.floor(window.innerWidth * 0.5);
    const newWidth = Math.max(280, Math.min(maxWidth, dragStartWidth + diff));
    setPanelWidth(newWidth);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      console.log('🔧 [ChartPanel] Saving panel width to preferences:', panelWidth);
      // Save preferences silently (no toast)
      savePreferences.mutate({ chartPanelWidth: panelWidth });
    }
    setIsDragging(false);
    setDragStart(0);
    setDragStartWidth(0);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const renderSectionContent = (section: any) => {
    if (section.id === "documents") {
      return (
        <EmbeddedPDFViewer
          patientId={patient.id}
          title="Patient Documents"
          showAllPDFs={false}
        />
      );
    }

    // Special handling for encounters section on mobile
    if (section.id === "encounters" && isMedianMobile && onNewEncounter) {
      return (
        <div className="space-y-4">
          {/* MEDIAN: Add New Encounter button for mobile */}
          <div className="flex justify-end px-2">
            <Button 
              onClick={onNewEncounter} 
              className="bg-slate-700 hover:bg-slate-800 text-white"
              data-median="mobile-new-encounter-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Encounter
            </Button>
          </div>
          <SharedChartSections
            patientId={patient.id}
            mode={config.context === 'patient-chart' ? 'patient-chart' : 'encounter'}
            encounterId={encounterId}
            isReadOnly={false}
            sectionId={section.id}
            highlightAttachmentId={highlightAttachmentId}
            isAutoGeneratingMedicalProblems={isAutoGeneratingMedicalProblems}
            medicalProblemsProgress={medicalProblemsProgress}
            compactMode={false}
            isExpanded={panelState.isExpanded}
          />
        </div>
      );
    }

    // Use compact mode for sections that have spillover issues
    const sectionConfig = getSectionConfig(section.id);
    const useCompactMode = sectionConfig?.compactMode && !panelState.isExpanded;

    return (
      <SharedChartSections
        patientId={patient.id}
        mode={config.context === 'patient-chart' ? 'patient-chart' : 'encounter'}
        encounterId={encounterId}
        isReadOnly={false}
        sectionId={section.id}
        highlightAttachmentId={highlightAttachmentId}
        isAutoGeneratingMedicalProblems={isAutoGeneratingMedicalProblems}
        medicalProblemsProgress={medicalProblemsProgress}
        compactMode={useCompactMode}
        isExpanded={panelState.isExpanded}
      />
    );
  };

  return (
    <div 
      ref={panelRef}
      className={`bg-gray-50 border-r border-gray-200 flex flex-col relative transition-all duration-300 ${
        panelState.isExpanded ? 'shadow-lg' : ''
      } ${
        isMedianMobile && mobileSidebarOpen ? 'mobile-sidebar-open' : ''
      }`}
      style={{ 
        width: isMedianMobile ? undefined : (panelState.isExpanded ? panelState.currentWidth : `${panelWidth}px`),
        minWidth: isMedianMobile ? undefined : (panelState.isExpanded ? '500px' : '280px'),
        maxWidth: isMedianMobile ? undefined : (panelState.isExpanded ? '90vw' : '50vw')
      }}
      data-median="unified-chart-panel"
      data-median-app="true"
      /* MEDIAN TAG: This is the main sidebar container that will slide in/out on mobile */
    >
      {/* Resize Handle */}
      {/* MEDIAN TAG: Hide resize handle on mobile */}
      {config.allowResize && (
        <div
          className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-navy-blue-400 bg-gray-200 transition-colors group z-20"
          onMouseDown={handleMouseDown}
          title="Drag to resize panel"
          data-median="panel-resize-handle"
          data-median-app="true"
        >
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      )}

      {/* Patient Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Avatar className="w-12 h-12 border-2 border-gray-200 flex-shrink-0">
              <AvatarImage
                src={
                  patient.profilePhotoFilename
                    ? `/uploads/${patient.profilePhotoFilename}`
                    : undefined
                }
                alt={`${patient.firstName} ${patient.lastName}`}
              />
              <AvatarFallback className="text-sm bg-gray-100">
                {patient.firstName?.[0] || "P"}
                {patient.lastName?.[0] || "P"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                DOB: {formatDate(patient.dateOfBirth)}
              </p>
              {encounterId && (
                <p className="text-sm text-navy-blue-600">
                  Encounter #{encounterId}
                </p>
              )}

              {onBackToChart && (
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={onBackToChart}
                  >
                    ← Back to Chart
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Panel Controls */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* MEDIAN TAG: Mobile close button - only visible on mobile when sidebar is open */}
            {onCloseMobileSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseMobileSidebar}
                className="h-8 w-8 p-0"
                data-median="mobile-sidebar-close"
                data-median-app="true"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {panelState.isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={collapsePanelToDefault}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {config.enableSearch && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search chart sections..."
              value={panelState.searchQuery}
              onChange={(e) => setPanelState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="pl-10 text-sm"
            />
          </div>
        </div>
      )}

      {/* Dense View Toggle */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/50">
        <DenseViewToggle size="sm" />
      </div>

      {/* Chart Sections */}
      <div className="flex-1 overflow-y-auto">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = panelState.expandedSections.has(section.id);
          const isActive = panelState.activeSection === section.id;
          
          return (
            <Collapsible
              key={section.id}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div 
                  className={`flex items-center justify-between w-full chart-section-trigger text-left hover:bg-gray-100 border-b border-gray-100 transition-colors ${
                    isActive ? 'bg-navy-blue-50 border-navy-blue-200' : ''
                  }`}
                  onDoubleClick={(e) => {
                    if (section.allowExpanded && !panelState.isExpanded) {
                      e.stopPropagation();
                      expandSection(section.id);
                    }
                  }}
                  title={section.allowExpanded && !panelState.isExpanded ? "Double-click to expand section" : undefined}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {Icon && <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                    <span className="chart-section-label truncate">{section.label}</span>
                    {section.allowExpanded && !panelState.isExpanded && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          expandSection(section.id);
                        }}
                        className="h-6 w-6 p-1 ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer rounded hover:bg-gray-100 flex items-center justify-center"
                        title="Click to expand section"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={`bg-white border-b border-gray-100 ${
                  panelState.isExpanded && isActive ? 'emr-compact-spacing' : 'emr-compact-small'
                }`}>
                  {renderSectionContent(section)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Expanded Section Overlay */}
      {panelState.isExpanded && panelState.activeSection && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
          {/* Expanded Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {(() => {
                const activeSection = availableSections.find(s => s.id === panelState.activeSection);
                const Icon = activeSection?.icon;
                return (
                  <>
                    {Icon && <Icon className="h-5 w-5 text-gray-600" />}
                    <h2 className="text-lg font-semibold">{activeSection?.label}</h2>
                  </>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapsePanelToDefault}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Expanded Content */}
          <div className="flex-1 overflow-auto p-6">
            {(() => {
              const activeSection = availableSections.find(s => s.id === panelState.activeSection);
              return activeSection ? renderSectionContent(activeSection) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}