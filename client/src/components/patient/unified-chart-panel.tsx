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
  X
} from "lucide-react";
import { Patient } from "@shared/schema";
import { SharedChartSections } from "./shared-chart-sections";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { 
  getAvailableSections, 
  getSectionConfig, 
  getDefaultExpandedSections,
  type ChartPanelConfig,
  type ChartPanelState 
} from "@/lib/chart-sections";

interface UnifiedChartPanelProps {
  patient: Patient;
  config: ChartPanelConfig;
  encounterId?: number;
  encounter?: any;
  onBackToChart?: () => void;
  highlightAttachmentId?: number;
  isAutoGeneratingMedicalProblems?: boolean;
  medicalProblemsProgress?: number;
}

interface AIDebugSectionProps {
  patientId: number;
}

function AIDebugSection({ patientId }: AIDebugSectionProps) {
  const {
    data: assistantConfig,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant`],
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="p-2 text-xs text-gray-500">Loading assistant info...</div>
    );
  }

  if (error || !assistantConfig) {
    return <div className="p-2 text-xs text-red-600">No assistant found</div>;
  }

  const config = assistantConfig as any;

  return (
    <div className="p-2">
      <div className="text-xs space-y-2">
        <div>
          <span className="font-medium">Assistant:</span>{" "}
          {config?.name || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Model:</span>{" "}
          {config?.model || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Thread:</span>{" "}
          {config?.thread_id ? "Active" : "None"}
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs">
          View Full Debug
        </Button>
      </div>
    </div>
  );
}

export function UnifiedChartPanel({
  patient,
  config,
  encounterId,
  encounter,
  onBackToChart,
  highlightAttachmentId,
  isAutoGeneratingMedicalProblems = false,
  medicalProblemsProgress = 0
}: UnifiedChartPanelProps) {
  // Get current user for role-based filtering
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Panel state
  const [panelState, setPanelState] = useState<ChartPanelState>({
    expandedSections: new Set(getDefaultExpandedSections(config.context)),
    isExpanded: false,
    currentWidth: config.defaultWidth || "w-80",
    activeSection: undefined,
    searchQuery: ""
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [panelWidth, setPanelWidth] = useState(320); // 320px = w-80
  const panelRef = useRef<HTMLDivElement>(null);

  // Get available sections based on context and user role
  const availableSections = getAvailableSections(config.context, currentUser?.role);

  // Filter sections based on search query
  const filteredSections = panelState.searchQuery && panelState.searchQuery.trim()
    ? availableSections.filter(section =>
        section.label.toLowerCase().includes(panelState.searchQuery.toLowerCase())
      )
    : availableSections;

  const toggleSection = (sectionId: string) => {
    setPanelState(prev => {
      const newExpanded = new Set(prev.expandedSections);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      return {
        ...prev,
        expandedSections: newExpanded
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

  // Handle panel resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const diff = e.clientX - dragStart;
    const newWidth = Math.max(280, Math.min(800, panelWidth + diff));
    setPanelWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const renderSectionContent = (section: any) => {
    if (section.id === "encounters") {
      return (
        <div className="text-xs text-gray-600">
          {config.context === 'patient-chart' ? "View all patient encounters" : "Current encounter in progress"}
        </div>
      );
    }

    if (section.id === "ai-debug") {
      return <AIDebugSection patientId={patient.id} />;
    }

    if (section.id === "documents") {
      return (
        <EmbeddedPDFViewer
          patientId={patient.id}
          title="Patient Documents"
          showAllPDFs={false}
        />
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
      />
    );
  };

  return (
    <div 
      ref={panelRef}
      className={`bg-gray-50 border-r border-gray-200 flex flex-col relative transition-all duration-300 ${
        panelState.isExpanded ? 'shadow-lg' : ''
      }`}
      style={{ 
        width: panelState.isExpanded ? panelState.currentWidth : `${panelWidth}px`,
        minWidth: panelState.isExpanded ? '500px' : '280px',
        maxWidth: panelState.isExpanded ? '90vw' : '400px'
      }}
    >
      {/* Resize Handle */}
      {config.allowResize && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-gray-400" />
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
                <p className="text-sm text-blue-600">
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
                <div className={`flex items-center justify-between w-full p-3 text-left hover:bg-gray-100 border-b border-gray-100 transition-colors ${
                  isActive ? 'bg-blue-50 border-blue-200' : ''
                }`}>
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {Icon && <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                    <span className="font-medium text-sm truncate">{section.label}</span>
                    {section.allowExpanded && !panelState.isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          expandSection(section.id);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
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
                  panelState.isExpanded && isActive ? 'p-6' : 'p-3'
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