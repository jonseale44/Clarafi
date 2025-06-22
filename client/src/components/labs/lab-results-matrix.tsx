import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, FileText, Calendar, TestTube, Check, FlaskConical, RotateCcw, User, MessageSquare, Phone, Mail, Send, ChevronUp } from 'lucide-react';

interface LabResultsMatrixProps {
  patientId: number;
  mode?: 'full' | 'compact' | 'encounter' | 'review';
  encounterId?: number;
  showTitle?: boolean;
  pendingReviewIds?: number[]; // IDs of results that need review
  currentUserId?: number; // Current user ID for permission checks
  onReviewEncounter?: (date: string, encounterIds: number[]) => void;
  onReviewTestGroup?: (testName: string, resultIds: number[]) => void;
  onReviewSpecific?: (testName: string, date: string, resultId: number) => void;
  onUnreviewEncounter?: (date: string, encounterIds: number[], resultIds: number[]) => void;
  onUnreviewTestGroup?: (testName: string, resultIds: number[]) => void;
  onUnreviewSpecific?: (testName: string, date: string, resultId: number) => void;
}

// Quick-pick review templates
const REVIEW_TEMPLATES = [
  { id: 'normal', label: 'Normal - No action needed', value: 'Results reviewed. All values within normal limits. No action required.' },
  { id: 'followup', label: 'Follow-up recommended', value: 'Results reviewed. Recommend follow-up in [timeframe]. Patient to be contacted.' },
  { id: 'abnormal_monitor', label: 'Abnormal - Monitor', value: 'Results reviewed. Abnormal values noted. Continue monitoring. Recheck in [timeframe].' },
  { id: 'abnormal_action', label: 'Abnormal - Action required', value: 'Results reviewed. Abnormal values require intervention. Plan: [specify action].' },
  { id: 'critical_contacted', label: 'Critical - Patient contacted', value: 'Critical results reviewed. Patient contacted at [time] via [method]. Plan discussed.' },
  { id: 'trending', label: 'Trending appropriately', value: 'Results reviewed. Values trending as expected. Continue current management.' },
  { id: 'medication_adjust', label: 'Medication adjustment needed', value: 'Results reviewed. Medication adjustment indicated. Plan: [specify changes].' },
];

interface MatrixData {
  testName: string;
  testCode: string;
  unit: string;
  referenceRange: string;
  results: Array<{
    date: string;
    value: string;
    abnormalFlag?: string;
    criticalFlag?: boolean;
    id: number | string;
    encounterId?: number;
    needsReview?: boolean;
    isReviewed?: boolean;
    reviewedBy?: number;
    orderedBy?: number;
    isPending?: boolean;
    externalOrderId?: string;
    requisitionNumber?: string;
  }>;
}

export function LabResultsMatrix({ 
  patientId, 
  mode = 'full', 
  encounterId,
  showTitle = true,
  pendingReviewIds = [],
  currentUserId,
  onReviewEncounter,
  onReviewTestGroup,
  onReviewSpecific,
  onUnreviewEncounter,
  onUnreviewTestGroup,
  onUnreviewSpecific
}: LabResultsMatrixProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['Complete Blood Count', 'Basic Metabolic Panel'])); // Default open panels
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedTestRows, setSelectedTestRows] = useState<Set<string>>(new Set());
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredTestRow, setHoveredTestRow] = useState<string | null>(null);
  
  // Review interface state
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState<boolean>(false);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [assignedStaff, setAssignedStaff] = useState<string>('');
  const [communicationPlan, setCommunicationPlan] = useState({
    patientNotification: false,
    phoneCall: false,
    smsText: false,
    letter: false,
    portalRelease: true,
    urgentContact: false
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user for permission checks
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!currentUserId
  });

  // Get staff members for assignment
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: isReviewPanelOpen
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: {
      resultIds: number[];
      reviewNote: string;
      reviewTemplate?: string;
      assignedTo?: number;
      communicationPlan: any;
    }) => {
      console.log('🔍 [LabResultsMatrix] Review mutation starting with payload:', {
        resultIds: reviewData.resultIds,
        resultIdsCount: reviewData.resultIds.length,
        reviewNote: reviewData.reviewNote,
        reviewType: 'batch'
      });

      const response = await fetch('/api/lab-review/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultIds: reviewData.resultIds,
          reviewNote: reviewData.reviewNote,
          reviewTemplate: reviewData.reviewTemplate,
          reviewType: 'batch',
          assignedTo: reviewData.assignedTo,
          communicationPlan: reviewData.communicationPlan
        })
      });
      
      console.log('🔍 [LabResultsMatrix] API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('🔍 [LabResultsMatrix] API error response:', error);
        throw new Error(error.error?.message || error.message || 'Review failed');
      }
      
      const result = await response.json();
      console.log('🔍 [LabResultsMatrix] API success response:', result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Review Completed",
        description: `Successfully reviewed ${data.data?.resultCount || 0} lab results`,
      });
      
      // Clear selections and close panel
      setSelectedDates(new Set());
      setSelectedTestRows(new Set());
      setSelectedPanels(new Set());
      setIsReviewPanelOpen(false);
      setReviewNote('');
      setSelectedTemplate('');
      setAssignedStaff('');
      
      // Refresh lab results
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to complete lab review",
        variant: "destructive"
      });
    }
  });



  // Permission check for unreview functionality
  const canUnreview = (result: any) => {
    if (!currentUserId) return false;
    // Allow unreview if:
    // 1. Current user reviewed it, OR
    // 2. Current user is the ordering provider, OR  
    // 3. Current user is admin/provider (role-based check would be ideal but not implemented here)
    return result.reviewedBy === currentUserId || result.orderedBy === currentUserId;
  };

  const { data: labResults, isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const { data: labOrders, isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  const isLoading = resultsLoading || ordersLoading;

  const results = (labResults as any) || [];
  const orders = (labOrders as any) || [];

  // Define lab panel groupings with proper hierarchy - CMP takes precedence over BMP
  const labPanels = useMemo(() => ({
    'CBC': [
      'White Blood Cell Count', 'WBC', 'Red Blood Cell Count', 'RBC', 
      'Hemoglobin', 'HGB', 'Hematocrit', 'HCT', 'Platelet Count', 'PLT',
      'Mean Corpuscular Volume', 'MCV', 'Mean Corpuscular Hemoglobin', 'MCH', 
      'Mean Corpuscular Hemoglobin Concentration', 'MCHC', 'Red Cell Distribution Width', 'RDW',
      'Mean Platelet Volume', 'MPV', 'Platelet Distribution Width', 'PDW',
      'Lymphocytes %', 'Neutrophils %', 'Monocytes %', 'Eosinophils %', 'Basophils %',
      'Lymphocytes Absolute', 'Neutrophils Absolute', 'Monocytes Absolute', 'Eosinophils Absolute', 'Basophils Absolute',
      'LYMPH', 'NEUT', 'MONO', 'EOS', 'BASO', 'Lymph %', 'Neut %', 'Mono %', 'Eos %', 'Baso %'
    ],
    'CMP': [
      // Core electrolytes and kidney function
      'Glucose', 'Sodium', 'Potassium', 'Chloride', 'Blood Urea Nitrogen', 'BUN', 'Creatinine', 'Carbon Dioxide', 'CO2',
      // Liver function components
      'Total Protein', 'Albumin', 'Total Bilirubin', 'AST (SGOT)', 'ALT (SGPT)', 'Alkaline Phosphatase', 'Calcium',
      // Alternative naming variations
      'Na', 'K', 'Cl', 'Creat', 'AST', 'ALT', 'SGOT', 'SGPT', 'Alk Phos', 'T Bili', 'T Protein', 'Alb', 'TP', 'ALB', 'Ca'
    ],
    'Lipid Panel': [
      'Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides',
      'Cholesterol Total', 'HDL', 'LDL', 'CHOL', 'TG', 'TRIG'
    ],
    'Thyroid Function': [
      'TSH', 'T3', 'T4', 'Free T4', 'Free T3',
      'Thyroid Stimulating Hormone', 'Thyroxine', 'Triiodothyronine', 'FT4', 'FT3'
    ],
    'HbA1c': [
      'Hemoglobin A1c', 'HbA1c', 'A1c', 'Glycated Hemoglobin'
    ],
    'Other': []
  }), []);

  const matrixData = useMemo(() => {
    console.log('🧪 [LabResultsMatrix] Processing data - results:', results.length, 'orders:', orders.length);
    
    if (!results.length && !orders.length) return [];

    const testGroups = new Map<string, MatrixData>();

    // Process existing results
    results.forEach((result: any) => {
      console.log('🧪 [LabResultsMatrix] Processing result:', result.testName, 'encounter:', result.encounterId);
      const key = result.testName;
      
      if (!testGroups.has(key)) {
        testGroups.set(key, {
          testName: result.testName,
          testCode: result.testCode || 'N/A',
          unit: result.resultUnits || '',
          referenceRange: result.referenceRange || 'N/A',
          results: []
        });
      }

      const testGroup = testGroups.get(key)!;
      // Safely handle date parsing
      let resultDate = result.resultAvailableAt;
      try {
        if (resultDate) {
          const parsedDate = new Date(resultDate);
          if (isNaN(parsedDate.getTime())) {
            resultDate = new Date().toISOString();
          }
        } else {
          resultDate = new Date().toISOString();
        }
      } catch (error) {
        resultDate = new Date().toISOString();
      }

      testGroup.results.push({
        date: resultDate,
        value: result.resultValue,
        abnormalFlag: result.abnormalFlag,
        criticalFlag: result.criticalFlag,
        id: result.id,
        encounterId: result.encounterId,
        needsReview: pendingReviewIds.includes(result.id) && result.reviewedBy === null,
        isReviewed: result.reviewedBy !== null,
        reviewedBy: result.reviewedBy,
        orderedBy: result.orderedBy,
        isPending: false,
        externalOrderId: result.externalOrderId,
        requisitionNumber: result.requisitionNumber
      });
    });

    // Process pending orders (only if no results exist for that order)
    orders.forEach((order: any) => {
      if (order.orderStatus === 'pending') {
        const key = order.testName;
        const hasResults = results.some((result: any) => result.labOrderId === order.id);
        
        if (!hasResults) {
          if (!testGroups.has(key)) {
            testGroups.set(key, {
              testName: order.testName,
              testCode: order.testCode || 'N/A',
              unit: '',
              referenceRange: 'Pending',
              results: []
            });
          }

          const testGroup = testGroups.get(key)!;
          let orderDate = order.orderedAt;
          try {
            if (orderDate) {
              const parsedDate = new Date(orderDate);
              if (isNaN(parsedDate.getTime())) {
                orderDate = new Date().toISOString();
              }
            } else {
              orderDate = new Date().toISOString();
            }
          } catch (error) {
            orderDate = new Date().toISOString();
          }

          testGroup.results.push({
            date: orderDate,
            value: 'PENDING',
            abnormalFlag: 'PENDING',
            criticalFlag: false,
            id: `pending_${order.id}`,
            encounterId: order.encounterId,
            needsReview: false,
            isReviewed: false,
            reviewedBy: null,
            orderedBy: order.orderedBy,
            isPending: true,
            externalOrderId: order.externalOrderId,
            requisitionNumber: order.requisitionNumber
          });
        }
      }
    });

    // Sort results by date for each test
    testGroups.forEach(test => {
      test.results.sort((a, b) => {
        try {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } catch (error) {
          return 0;
        }
      });
    });

    return Array.from(testGroups.values()).sort((a, b) => a.testName.localeCompare(b.testName));
  }, [results, orders, pendingReviewIds]);

  // Create flat list of tests organized by panel but displayed as flat rows
  const flatTestData = useMemo(() => {
    const groups: { [key: string]: MatrixData[] } = {};
    
    // Initialize groups
    Object.keys(labPanels).forEach(panel => {
      groups[panel] = [];
    });

    // Process each test and assign to the most specific panel
    matrixData.forEach(test => {
      let assigned = false;
      
      // Check panels in order of specificity (CMP before BMP, etc.)
      const panelOrder = ['CBC', 'CMP', 'Lipid Panel', 'Thyroid Function', 'HbA1c', 'Other'];
      
      for (const panelName of panelOrder) {
        if (labPanels[panelName] && labPanels[panelName].includes(test.testName)) {
          groups[panelName].push(test);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        groups['Other'].push(test);
      }
    });

    // Create flat list with panel headers
    const flatList: Array<{ type: 'panel', name: string } | { type: 'test', data: MatrixData, panel: string }> = [];
    
    const panelOrder = ['CBC', 'CMP', 'Lipid Panel', 'Thyroid Function', 'HbA1c', 'Other'];
    panelOrder.forEach(panelName => {
      if (groups[panelName] && groups[panelName].length > 0) {
        flatList.push({ type: 'panel', name: panelName });
        groups[panelName].forEach(test => {
          flatList.push({ type: 'test', data: test, panel: panelName });
        });
      }
    });

    return flatList;
  }, [matrixData, labPanels]);

  // Create date-based columns since encounter IDs are null
  const dateColumns = useMemo(() => {
    console.log('🧪 [LabResultsMatrix] Building date columns from matrixData:', matrixData.length);
    
    const dateMap = new Map<string, {
      date: string;
      displayDate: string;
      resultCount: number;
    }>();
    
    matrixData.forEach(test => {
      test.results.forEach(result => {
        const dateKey = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
        console.log('🧪 [LabResultsMatrix] Processing result for date columns:', dateKey);
        
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: result.date,
            displayDate: dateKey,
            resultCount: 0
          });
        }
        dateMap.get(dateKey)!.resultCount++;
      });
    });

    const columns = Array.from(dateMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('🧪 [LabResultsMatrix] Generated date columns:', columns.length, columns);
    return columns;
  }, [matrixData]);

  const maxColumns = mode === 'compact' ? 5 : mode === 'encounter' ? 3 : 10;
  const displayColumns = dateColumns.slice(0, maxColumns);
  
  // Define encounterColumns for compatibility with existing compact mode logic
  const encounterColumns = dateColumns;

  // Group results by date for date-level review
  const resultsByDate = useMemo(() => {
    const results = new Map<string, number[]>();
    dateColumns.forEach(col => {
      const resultIds: number[] = [];
      matrixData.forEach(test => {
        test.results.forEach(result => {
          const resultDateKey = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
          if (resultDateKey === col.displayDate) {
            resultIds.push(result.id as number);
          }
        });
      });
      results.set(col.date, resultIds);
    });
    return results;
  }, [dateColumns, matrixData]);

  const handleDateClick = (date: string, isShiftClick: boolean) => {
    console.log('🧪 [LabResultsMatrix] Date clicked:', date, 'isShiftClick:', isShiftClick);
    
    // Convert ISO date to display format for consistent matching
    const displayDate = format(new Date(date), 'yyyy-MM-dd HH:mm');
    console.log('🧪 [LabResultsMatrix] Converted to display format:', displayDate);
    
    // Selection behavior for visual highlighting - this should happen first
    const newSelected = new Set(selectedDates);
    if (newSelected.has(displayDate)) {
      newSelected.delete(displayDate);
    } else {
      if (isShiftClick) {
        newSelected.add(displayDate);
      } else {
        newSelected.clear();
        newSelected.add(displayDate);
      }
    }
    console.log('🧪 [LabResultsMatrix] Updated selected dates:', Array.from(newSelected));
    setSelectedDates(newSelected);
    
    // Note: Auto-review is now only triggered via the Review Selected button
    // This ensures proper selection counting works in dashboard view
  };

  const handleTestRowClick = (testName: string) => {
    // Selection behavior for visual highlighting - this should happen first
    const newSelected = new Set(selectedTestRows);
    if (newSelected.has(testName)) {
      newSelected.delete(testName);
    } else {
      newSelected.add(testName);
    }
    setSelectedTestRows(newSelected);
    
    // Note: Auto-review is now only triggered via the Review Selected button
    // This ensures proper selection counting works in dashboard view
  };

  const handlePanelClick = (panelName: string) => {
    // Selection behavior for visual highlighting - this should happen first
    const newSelected = new Set(selectedPanels);
    if (newSelected.has(panelName)) {
      newSelected.delete(panelName);
    } else {
      newSelected.add(panelName);
    }
    setSelectedPanels(newSelected);
    
    // Note: Auto-review is now only triggered via the Review Selected button
    // This ensures proper selection counting works in dashboard view
  };

  const togglePanelExpansion = (panelName: string) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(panelName)) {
      newExpanded.delete(panelName);
    } else {
      newExpanded.add(panelName);
    }
    setExpandedPanels(newExpanded);
  };

  const handleReviewSelection = () => {
    // Open the integrated review panel instead of calling callbacks
    setIsReviewPanelOpen(true);
  };

  const handleUnreviewSelection = () => {


    if (selectedDates.size > 0 && selectedTestRows.size === 0 && selectedPanels.size === 0) {
      // Unreview by date(s) - get reviewed results for these dates
      const resultIds: number[] = [];
      selectedDates.forEach(selectedDisplayDate => {
        // Get all reviewed results for this date (results that are NOT pending review)
        matrixData.forEach(test => {
          test.results.forEach(result => {
            const resultDisplayDate = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
            if (resultDisplayDate === selectedDisplayDate && !result.needsReview && result.isReviewed) { 
              resultIds.push(result.id);
            }
          });
        });
      });

      onUnreviewEncounter?.(Array.from(selectedDates).join(', '), [], resultIds);
    } else if (selectedTestRows.size > 0 && selectedDates.size === 0) {
      // Unreview by test group(s) - get reviewed results for these tests
      const resultIds: number[] = [];
      selectedTestRows.forEach(testName => {
        const test = matrixData.find(t => t.testName === testName);
        if (test) {
          test.results.forEach(result => {
            if (!result.needsReview && result.isReviewed) { // reviewed results only
              resultIds.push(result.id);
            }
          });
        }
      });

      onUnreviewTestGroup?.(Array.from(selectedTestRows).join(', '), resultIds);
    }
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
    setSelectedTestRows(new Set());
    setSelectedPanels(new Set());
  };

  // Add effect to clear selection when data changes (after review)
  // Use a stable reference to prevent infinite loops
  const resultsHash = React.useMemo(() => 
    results.map(r => `${r.id}-${r.reviewedBy}`).join(','), [results]
  );
  
  React.useEffect(() => {
    // Clear selection when lab results review state changes
    if (selectedDates.size > 0 || selectedTestRows.size > 0 || selectedPanels.size > 0) {
      setSelectedDates(new Set());
      setSelectedTestRows(new Set());
      setSelectedPanels(new Set());
    }
  }, [resultsHash]); // Only depend on the hash of results, not the selection state

  // Force re-render when results change to ensure visual state is updated
  const resultIds = React.useMemo(() => 
    results.map(r => r.id).join(','), [results]
  );

  const getDateHeaderClass = (date: string) => {
    const isSelected = selectedDates.has(date);
    const isHovered = hoveredDate === date;
    const hasPendingResults = matrixData.some(test => 
      test.results.some(result => result.date === date && result.needsReview)
    );
    
    let classes = "text-center p-1 font-medium min-w-[80px] cursor-pointer transition-colors border-2 text-xs";
    
    if (isSelected) {
      classes += " bg-blue-200 text-blue-900 border-blue-400";
    } else if (isHovered) {
      classes += " bg-blue-100 border-blue-200";
    } else if (hasPendingResults) {
      classes += " bg-yellow-100 border-yellow-300";
    } else {
      classes += " border-transparent";
    }
    
    return classes;
  };

  const getTestRowClass = (testName: string) => {
    const isSelected = selectedTestRows.has(testName);
    const isHovered = hoveredTestRow === testName;
    const hasPendingResults = matrixData
      .find(test => test.testName === testName)?.results
      .some(result => result.needsReview);
    
    let classes = "p-2 sticky left-0 bg-white border-l-4 transition-all text-sm";
    
    if (isSelected) {
      classes += " bg-blue-200 text-blue-900 border-l-blue-500 font-medium";
    } else if (isHovered) {
      classes += " bg-blue-100 border-l-blue-300";
    } else if (hasPendingResults) {
      classes += " bg-yellow-50 border-l-yellow-400";
    } else {
      classes += " border-l-transparent";
    }
    
    return classes;
  };

  const toggleTestExpansion = (testName: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedTests(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd/yy\nHH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const getValueClass = (abnormalFlag?: string, criticalFlag?: boolean, needsReview?: boolean, isReviewed?: boolean, canUnreviewResult?: boolean) => {
    if (needsReview) return 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400';
    if (criticalFlag) return 'bg-red-100 text-red-800 border border-red-300';
    if (isReviewed && canUnreviewResult) return 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200';
    if (isReviewed) return 'bg-gray-50 text-gray-700 border border-gray-200'; // Normal reviewed state
    if (abnormalFlag === 'H') return 'bg-orange-100 text-orange-800';
    if (abnormalFlag === 'L') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-50 text-gray-700'; // Normal unreviewed state
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No lab results available for this patient.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && mode !== 'encounter' && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lab Results Matrix</CardTitle>
            {mode !== 'full' && (
              <Button variant="outline" size="sm" onClick={() => {
                window.location.href = `/patients/${patientId}/labs`;
              }}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Full Results
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="text-left p-3 font-semibold min-w-[200px] sticky left-0 bg-gray-50 border-r border-gray-300">
                  Test
                </th>
                {displayColumns.map((dateCol, index) => (
                  <th 
                    key={`date-${index}`} 
                    className="text-center p-3 font-semibold border-r border-gray-300 min-w-[120px] cursor-pointer hover:bg-gray-100"
                    onClick={(e) => handleDateClick(dateCol.date, e.shiftKey)}
                    onMouseEnter={() => setHoveredDate(dateCol.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-sm font-medium">{format(new Date(dateCol.date), 'yyyy-MM-dd')}</span>
                      <span className="text-xs text-gray-600">{format(new Date(dateCol.date), 'HH:mm')}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {flatTestData.map((item, index) => {
                if (item.type === 'panel') {
                  // Panel header row - always visible
                  return (
                    <tr key={`panel-${item.name}`} className="border-b-2 border-gray-300 bg-gray-100">
                      <td className="p-3 sticky left-0 bg-gray-100 font-bold text-sm border-r border-gray-300">
                        {item.name}
                      </td>
                      {displayColumns.map((dateCol, index) => (
                        <td key={`panel-${index}`} className="p-3 text-center border-r border-gray-200">
                          <span className="text-muted-foreground text-xs">—</span>
                        </td>
                      ))}
                    </tr>
                  );
                } else {
                  // Test row - always visible, no accordion
                  const test = item.data;
                  const isTestSelected = selectedTestRows.has(test.testName);
                  
                  return (
                    <tr 
                      key={test.testName} 
                      className={`border-b hover:bg-muted/20 ${isTestSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td 
                        className="p-3 sticky left-0 bg-white border-r border-gray-200 cursor-pointer transition-colors"
                        onClick={() => handleTestRowClick(test.testName)}
                        onMouseEnter={() => setHoveredTestRow(test.testName)}
                        onMouseLeave={() => setHoveredTestRow(null)}
                      >
                        <div className="flex flex-col">
                          <div className="font-medium text-sm">{test.testName}</div>
                          {test.unit && (
                            <div className="text-xs text-muted-foreground">
                              ({test.unit})
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {displayColumns.map((dateCol, index) => {
                        const result = test.results.find(r => {
                          const resultDateKey = format(new Date(r.date), 'yyyy-MM-dd HH:mm');
                          return resultDateKey === dateCol.displayDate;
                        });
                        const isDateSelected = selectedDates.has(dateCol.displayDate);
                        
                        let cellClass = "p-3 text-center border-r border-gray-200 transition-colors";
                        if (isDateSelected) {
                          cellClass += " bg-blue-50 border-2 border-blue-200";
                        }
                        
                        return (
                          <td key={`test-${index}`} className={cellClass}>
                            {result ? (
                              <div 
                                className={`px-2 py-1 rounded text-sm font-medium transition-all ${
                                  result.isPending 
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                    : result.criticalFlag
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : result.abnormalFlag && result.abnormalFlag !== 'N'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : result.needsReview
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300 font-bold'
                                    : result.isReviewed
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'text-gray-900'
                                } ${result.needsReview ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}`}
                                onClick={() => {
                                  if (!result.isPending) {
                                    if (result.needsReview) {
                                      onReviewSpecific?.(test.testName, dateCol.date, result.id);
                                    } else if (result.isReviewed && canUnreview(result)) {
                                      onUnreviewSpecific?.(test.testName, dateCol.date, result.id);
                                    }
                                  }
                                }}
                                title={result.isPending ? `Order placed. External ID: ${result.externalOrderId || 'N/A'}` : undefined}
                              >
                                {result.value}
                                {result.isPending && (
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1 animate-pulse" />
                                )}
                                {!result.isPending && result.criticalFlag && (
                                  <AlertTriangle className="inline h-3 w-3 ml-1" />
                                )}
                                {!result.isPending && result.needsReview && (
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full ml-1" />
                                )}
                                {!result.isPending && result.isReviewed && canUnreview(result) && (
                                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-1" title="Click to unreview" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
        
        {/* Bottom Review Button - only shown when selections are made */}
        {(selectedDates.size > 0 || selectedTestRows.size > 0 || selectedPanels.size > 0) && (
          <div className="border-t p-2 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {(() => {
                  // Calculate total lab results count for selected items
                  let totalResults = 0;
                  
                  // Count results for selected dates (encounters)
                  if (selectedDates.size > 0) {
                    selectedDates.forEach(selectedDisplayDate => {
                      console.log('🔍 [LabResultsMatrix] Counting results for selected display date:', selectedDisplayDate);
                      matrixData.forEach(test => {
                        const matchingResults = test.results.filter(result => {
                          // Convert result date to display format for comparison
                          const resultDisplayDate = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
                          const matches = resultDisplayDate === selectedDisplayDate;
                          if (matches) {
                            console.log('🔍 [LabResultsMatrix] Found matching result for count:', {
                              testName: test.testName,
                              resultId: result.id,
                              resultDisplayDate,
                              selectedDisplayDate
                            });
                          }
                          return matches;
                        });
                        totalResults += matchingResults.length;
                      });
                    });
                  }
                  
                  // Count results for selected test rows
                  if (selectedTestRows.size > 0) {
                    selectedTestRows.forEach(testName => {
                      const test = matrixData.find(t => t.testName === testName);
                      if (test) {
                        totalResults += test.results.length;
                      }
                    });
                  }
                  
                  // Count results for selected panels
                  if (selectedPanels.size > 0) {
                    selectedPanels.forEach(panelName => {
                      const panelTests = groupedData[panelName] || [];
                      panelTests.forEach(test => {
                        totalResults += test.results.length;
                      });
                    });
                  }
                  
                  return `${totalResults} lab result${totalResults !== 1 ? 's' : ''} selected`;
                })()}
              </div>
              <Button
                onClick={handleReviewSelection}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-3 w-3 mr-1" />
                Review
              </Button>
              <Button
                onClick={handleUnreviewSelection}
                disabled={selectedDates.size === 0 && selectedTestRows.size === 0 && selectedPanels.size === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
                Unreview
              </Button>
            </div>
          </div>
        )}

        {/* Integrated Review Panel */}
        {(selectedDates.size > 0 || selectedTestRows.size > 0 || selectedPanels.size > 0) && (
          <Collapsible open={isReviewPanelOpen} onOpenChange={setIsReviewPanelOpen}>
            <div className="border-t bg-slate-50">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Review Selected Lab Results</span>
                    <Badge variant="secondary">
                      {(() => {
                        let totalResults = 0;
                        
                        if (selectedDates.size > 0) {
                          selectedDates.forEach(selectedDisplayDate => {
                            matrixData.forEach(test => {
                              const matchingResults = test.results.filter(result => {
                                const resultDisplayDate = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
                                return resultDisplayDate === selectedDisplayDate;
                              });
                              totalResults += matchingResults.length;
                            });
                          });
                        }
                        
                        if (selectedTestRows.size > 0) {
                          selectedTestRows.forEach(testName => {
                            const test = matrixData.find(t => t.testName === testName);
                            if (test) totalResults += test.results.length;
                          });
                        }
                        
                        if (selectedPanels.size > 0) {
                          selectedPanels.forEach(panelName => {
                            const panelTests = groupedData[panelName] || [];
                            panelTests.forEach(test => {
                              totalResults += test.results.length;
                            });
                          });
                        }
                        
                        return `${totalResults} result${totalResults !== 1 ? 's' : ''}`;
                      })()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser?.role === 'provider' && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Review Authorized
                      </Badge>
                    )}
                    {isReviewPanelOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="px-3 pb-3">
                <div className="space-y-4">
                  {/* Quick Pick Templates */}
                  <div className="space-y-2">
                    <Label htmlFor="review-template">Quick-Pick Templates</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or write custom note..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_TEMPLATES.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Review Note */}
                  <div className="space-y-2">
                    <Label htmlFor="review-note">Clinical Review Note</Label>
                    <Textarea
                      id="review-note"
                      placeholder="Enter your clinical review and interpretation..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                    {selectedTemplate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const template = REVIEW_TEMPLATES.find(t => t.id === selectedTemplate);
                          if (template) {
                            setReviewNote(template.value);
                          }
                        }}
                      >
                        Apply Template
                      </Button>
                    )}
                  </div>

                  {/* Communication and Assignment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Staff Assignment */}
                    <div className="space-y-2">
                      <Label>Assign Follow-up To</Label>
                      <Select value={assignedStaff} onValueChange={setAssignedStaff}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(staffMembers || []).map((staff: any) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.firstName} {staff.lastName} ({staff.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Communication Options */}
                    <div className="space-y-2">
                      <Label>Patient Communication</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="portal-release"
                            checked={communicationPlan.portalRelease}
                            onCheckedChange={(checked) => 
                              setCommunicationPlan(prev => ({ ...prev, portalRelease: !!checked }))
                            }
                          />
                          <Label htmlFor="portal-release" className="text-sm">Release to patient portal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="phone-call"
                            checked={communicationPlan.phoneCall}
                            onCheckedChange={(checked) => 
                              setCommunicationPlan(prev => ({ ...prev, phoneCall: !!checked }))
                            }
                          />
                          <Label htmlFor="phone-call" className="text-sm">Phone call required</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sms-text"
                            checked={communicationPlan.smsText}
                            onCheckedChange={(checked) => 
                              setCommunicationPlan(prev => ({ ...prev, smsText: !!checked }))
                            }
                          />
                          <Label htmlFor="sms-text" className="text-sm">SMS notification</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="urgent-contact"
                            checked={communicationPlan.urgentContact}
                            onCheckedChange={(checked) => 
                              setCommunicationPlan(prev => ({ ...prev, urgentContact: !!checked }))
                            }
                          />
                          <Label htmlFor="urgent-contact" className="text-sm">Urgent contact needed</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsReviewPanelOpen(false);
                          setReviewNote('');
                          setSelectedTemplate('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentUser?.role === 'provider' ? (
                        <Button
                          onClick={async () => {
                            // Collect all selected result IDs
                            const resultIds: number[] = [];
                            
                            if (selectedDates.size > 0) {
                              selectedDates.forEach(selectedDisplayDate => {
                                console.log('🔍 [LabResultsMatrix] Processing selected display date:', selectedDisplayDate);
                                matrixData.forEach(test => {
                                  const matchingResults = test.results.filter(result => {
                                    const resultDisplayDate = format(new Date(result.date), 'yyyy-MM-dd HH:mm');
                                    const matches = resultDisplayDate === selectedDisplayDate;
                                    if (matches) {
                                      console.log('🔍 [LabResultsMatrix] Found matching result:', {
                                        testName: test.testName,
                                        resultId: result.id,
                                        resultDate: result.date,
                                        resultDisplayDate,
                                        selectedDisplayDate
                                      });
                                    }
                                    return matches;
                                  });
                                  resultIds.push(...matchingResults.map(r => r.id as number));
                                });
                              });
                            }
                            
                            if (selectedTestRows.size > 0) {
                              selectedTestRows.forEach(testName => {
                                const test = matrixData.find(t => t.testName === testName);
                                if (test) {
                                  resultIds.push(...test.results.map(r => r.id as number));
                                }
                              });
                            }
                            
                            if (selectedPanels.size > 0) {
                              selectedPanels.forEach(panelName => {
                                const panelTests = groupedData[panelName] || [];
                                panelTests.forEach(test => {
                                  resultIds.push(...test.results.map(r => r.id as number));
                                });
                              });
                            }

                            console.log('🔍 [LabResultsMatrix] Starting review mutation with data:', {
                              resultIds,
                              resultIdsCount: resultIds.length,
                              reviewNote,
                              reviewTemplate: selectedTemplate,
                              assignedTo: assignedStaff ? parseInt(assignedStaff) : undefined,
                              communicationPlan,
                              selectedDates: Array.from(selectedDates),
                              selectedTestRows: Array.from(selectedTestRows),
                              selectedPanels: Array.from(selectedPanels)
                            });

                            reviewMutation.mutate({
                              resultIds,
                              reviewNote,
                              reviewTemplate: selectedTemplate,
                              assignedTo: assignedStaff ? parseInt(assignedStaff) : undefined,
                              communicationPlan
                            });
                          }}
                          disabled={reviewMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {reviewMutation.isPending ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Complete Review
                            </>
                          )}
                        </Button>
                      ) : (
                        <Badge variant="destructive">
                          Only providers can review lab results
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        
        {mode === 'compact' && encounterColumns.length > maxColumns && (
          <div className="p-2 text-center border-t bg-muted/10">
            <div className="text-xs text-muted-foreground">
              Showing {maxColumns} most recent of {encounterColumns.length} total encounters
            </div>
            <Button variant="link" size="sm" className="mt-1 text-xs h-6">
              View All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}