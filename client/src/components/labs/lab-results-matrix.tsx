import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, FileText, Calendar, TestTube, Check, FlaskConical, RotateCcw } from 'lucide-react';

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
  
  const queryClient = useQueryClient();



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

  // Define lab panel groupings following real EMR standards
  // This ensures ALL components of standard panels are grouped together correctly
  const labPanels = useMemo(() => ({
    'Complete Blood Count': [
      // Core CBC components
      'Hemoglobin', 'Hematocrit', 'White Blood Cell Count', 'Red Blood Cell Count', 'Platelet Count',
      // CBC indices
      'Mean Corpuscular Volume', 'Mean Corpuscular Hemoglobin', 'Mean Corpuscular Hemoglobin Concentration',
      // CBC differential - CRITICAL: These were being incorrectly categorized as "Other"
      'Lymphocytes %', 'Neutrophils %', 'Monocytes %', 'Eosinophils %', 'Basophils %',
      // Absolute counts
      'Lymphocytes Absolute', 'Neutrophils Absolute', 'Monocytes Absolute', 'Eosinophils Absolute', 'Basophils Absolute',
      // Additional CBC components
      'Red Cell Distribution Width', 'Mean Platelet Volume', 'Platelet Distribution Width',
      // Common alternative naming variations used in different lab systems
      'WBC', 'RBC', 'HGB', 'HCT', 'PLT', 'MCV', 'MCH', 'MCHC', 'RDW', 'MPV', 'PDW',
      'LYMPH', 'NEUT', 'MONO', 'EOS', 'BASO', 'Lymph %', 'Neut %', 'Mono %', 'Eos %', 'Baso %'
    ],
    'Basic Metabolic Panel': [
      'Glucose', 'Sodium', 'Potassium', 'Chloride', 'BUN', 'Creatinine', 'CO2',
      // Alternative naming variations
      'Blood Urea Nitrogen', 'Carbon Dioxide', 'Na', 'K', 'Cl', 'Creat', 'Glucose Random', 'Glucose Fasting'
    ],
    'Comprehensive Metabolic Panel': [
      // All BMP components are included in CMP
      'Glucose', 'Sodium', 'Potassium', 'Chloride', 'BUN', 'Creatinine', 'CO2',
      'Blood Urea Nitrogen', 'Carbon Dioxide', 'Na', 'K', 'Cl', 'Creat',
      // Additional CMP-specific components
      'Total Protein', 'Albumin', 'Total Bilirubin', 'AST', 'ALT', 'Alkaline Phosphatase',
      // Alternative naming
      'SGOT', 'SGPT', 'Alk Phos', 'T Bili', 'T Protein', 'Alb', 'TP', 'ALB'
    ],
    'Lipid Panel': [
      'Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides',
      // Alternative naming
      'Cholesterol Total', 'HDL', 'LDL', 'CHOL', 'TG', 'TRIG'
    ],
    'Thyroid Function': [
      'TSH', 'T3', 'T4', 'Free T4', 'Free T3',
      // Alternative naming
      'Thyroid Stimulating Hormone', 'Thyroxine', 'Triiodothyronine', 'FT4', 'FT3'
    ],
    'Coagulation Studies': [
      'PT', 'PTT', 'INR', 'Prothrombin Time', 'Partial Thromboplastin Time', 
      'International Normalized Ratio', 'aPTT', 'PT/INR'
    ],
    'Liver Function': [
      'AST', 'ALT', 'Total Bilirubin', 'Direct Bilirubin', 'Alkaline Phosphatase', 'GGT',
      'SGOT', 'SGPT', 'T Bili', 'D Bili', 'Alk Phos', 'Gamma-Glutamyl Transferase'
    ],
    'Renal Function': [
      'BUN', 'Creatinine', 'BUN/Creatinine Ratio', 'eGFR', 'Urea', 'Creat'
    ],
    'Cardiac Markers': [
      'Troponin I', 'Troponin T', 'CK-MB', 'CK', 'BNP', 'NT-proBNP', 'Creatine Kinase'
    ],
    'Hemoglobin A1c': [
      'Hemoglobin A1c', 'HbA1c', 'A1c', 'Glycated Hemoglobin'
    ],
    'Urinalysis': [
      'Protein', 'Glucose', 'Ketones', 'Blood', 'Leukocyte Esterase', 'Nitrites',
      'Specific Gravity', 'pH', 'Color', 'Clarity'
    ],
    'Other': []
  }), []);

  const matrixData = useMemo(() => {
    if (!results.length && !orders.length) return [];

    const testGroups = new Map<string, MatrixData>();

    // Process existing results
    results.forEach((result: any) => {
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

  // Group tests by lab panels
  const groupedData = useMemo(() => {
    const groups: { [key: string]: MatrixData[] } = {};
    
    // Initialize groups
    Object.keys(labPanels).forEach(panel => {
      groups[panel] = [];
    });

    matrixData.forEach(test => {
      let assigned = false;
      for (const [panelName, testNames] of Object.entries(labPanels)) {
        if (testNames.includes(test.testName)) {
          groups[panelName].push(test);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        groups['Other'].push(test);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [matrixData, labPanels]);

  // Group results by encounter instead of individual dates
  const encounterColumns = useMemo(() => {
    const encounterMap = new Map<number, {
      encounterId: number;
      date: string;
      displayDate: string;
      resultCount: number;
    }>();
    
    matrixData.forEach(test => {
      test.results.forEach(result => {
        if (result.encounterId && typeof result.encounterId === 'number') {
          if (!encounterMap.has(result.encounterId)) {
            encounterMap.set(result.encounterId, {
              encounterId: result.encounterId,
              date: result.date,
              displayDate: format(new Date(result.date), 'MM/dd/yyyy HH:mm'),
              resultCount: 0
            });
          }
          encounterMap.get(result.encounterId)!.resultCount++;
        }
      });
    });

    return Array.from(encounterMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matrixData]);

  const maxColumns = mode === 'compact' ? 5 : mode === 'encounter' ? 3 : 10;
  const displayColumns = encounterColumns.slice(0, maxColumns);

  // Legacy dateColumns for backward compatibility
  const dateColumns = useMemo(() => {
    return encounterColumns.map(enc => enc.date);
  }, [encounterColumns]);

  // Group results by encounter for encounter-level review
  const encountersByDate = useMemo(() => {
    const encounters = new Map<string, number[]>();
    encounterColumns.forEach(enc => {
      encounters.set(enc.date, [enc.encounterId]);
    });
    return encounters;
  }, [encounterColumns]);

  const handleDateClick = (date: string, isShiftClick: boolean) => {
    // Selection behavior for visual highlighting - this should happen first
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      if (isShiftClick) {
        newSelected.add(date);
      } else {
        newSelected.clear();
        newSelected.add(date);
      }
    }
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


    if (selectedDates.size > 0 && selectedTestRows.size === 0 && selectedPanels.size === 0) {
      // Review by encounter(s) - collect all result IDs for selected dates
      const encounterIds: number[] = [];
      const resultIds: number[] = [];
      
      selectedDates.forEach(date => {
        const encounters = encountersByDate.get(date) || [];
        encounterIds.push(...encounters);
        
        // Collect all lab result IDs for this date
        matrixData.forEach(test => {
          test.results.forEach(result => {
            if (result.date === date) {
              resultIds.push(result.id);
            }
          });
        });
      });
      

      onReviewEncounter?.(Array.from(selectedDates).join(', '), encounterIds);
    } else if (selectedPanels.size > 0 && selectedDates.size === 0) {
      // Review by lab panel(s)
      const resultIds: number[] = [];
      selectedPanels.forEach(panelName => {
        const panelTests = groupedData[panelName] || [];
        panelTests.forEach(test => {
          resultIds.push(...test.results.map(r => r.id));
        });
      });

      onReviewTestGroup?.(Array.from(selectedPanels).join(', '), resultIds);
    } else if (selectedTestRows.size > 0 && selectedDates.size === 0) {
      // Review by test group(s)
      const resultIds: number[] = [];
      selectedTestRows.forEach(testName => {
        const test = matrixData.find(t => t.testName === testName);
        if (test) {
          resultIds.push(...test.results.map(r => r.id));
        }
      });

      onReviewTestGroup?.(Array.from(selectedTestRows).join(', '), resultIds);
    } else if (selectedTestRows.size === 1 && selectedDates.size === 1) {
      // Review specific test on specific date
      const testName = Array.from(selectedTestRows)[0];
      const date = Array.from(selectedDates)[0];
      const test = matrixData.find(t => t.testName === testName);
      const result = test?.results.find(r => r.date === date);

      if (result) {
        onReviewSpecific?.(testName, date, result.id);
      }
    } else {

    }
  };

  const handleUnreviewSelection = () => {


    if (selectedDates.size > 0 && selectedTestRows.size === 0 && selectedPanels.size === 0) {
      // Unreview by encounter(s) - get reviewed results for these dates
      const encounterIds: number[] = [];
      const resultIds: number[] = [];
      selectedDates.forEach(date => {
        const encounters = encountersByDate.get(date) || [];
        encounterIds.push(...encounters);
        
        // Get all reviewed results for this date (results that are NOT pending review)
        matrixData.forEach(test => {
          test.results.forEach(result => {
            if (result.date === date && !result.needsReview && result.isReviewed) { 
              resultIds.push(result.id);
            }
          });
        });
      });

      onUnreviewEncounter?.(Array.from(selectedDates).join(', '), encounterIds, resultIds);
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
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-medium min-w-[180px] sticky left-0 bg-muted/30 text-xs">
                  Test
                </th>
                {displayColumns.map(encounter => (
                  <th 
                    key={encounter.encounterId} 
                    className={getDateHeaderClass(encounter.date)}
                    onClick={(e) => handleDateClick(encounter.date, e.shiftKey)}
                    onMouseEnter={() => setHoveredDate(encounter.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <div className="text-xs whitespace-pre-line flex flex-col items-center justify-center gap-1 leading-tight">
                      {selectedDates.has(encounter.date) && <Calendar className="h-2 w-2" />}
                      <span className="text-xs font-medium">{encounter.displayDate}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Encounter #{encounter.encounterId}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {Object.entries(groupedData).flatMap(([panelName, tests]) => {
                const panelRows = [];
                
                // Panel header row
                const isPanelSelected = selectedPanels.has(panelName);
                const isPanelExpanded = expandedPanels.has(panelName);
                const panelHasPendingResults = tests.some(test => 
                  test.results.some(result => result.needsReview)
                );
                
                let panelClass = "border-b-2 border-gray-300 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors";
                if (isPanelSelected) {
                  panelClass += " bg-blue-200";
                } else if (panelHasPendingResults) {
                  panelClass += " bg-yellow-100";
                }
                
                panelRows.push(
                  <tr key={`panel-${panelName}`} className={panelClass}>
                    <td 
                      className="p-2 sticky left-0 bg-inherit"
                      onClick={() => handlePanelClick(panelName)}
                    >
                      <div className="flex items-center gap-1">
                        {isPanelSelected && <FlaskConical className="h-3 w-3 text-blue-600" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePanelExpansion(panelName);
                          }}
                          className="h-4 w-4 p-0"
                        >
                          {isPanelExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        <div>
                          <div className="font-semibold text-sm">{panelName}</div>
                          <div className="text-xs text-muted-foreground">
                            {tests.length} tests
                            {panelHasPendingResults && " • Pending review"}
                          </div>
                        </div>
                      </div>
                    </td>
                    {displayColumns.map(date => (
                      <td key={date} className="p-3 text-center">
                        <span className="text-muted-foreground text-xs">—</span>
                      </td>
                    ))}
                  </tr>
                );
                
                // Individual test rows (only if panel is expanded)
                if (isPanelExpanded) {
                  tests.forEach((test) => {
                    const testRows = [
                      <tr key={test.testName} className="border-b hover:bg-muted/20">
                        <td 
                          className={`${getTestRowClass(test.testName)} cursor-pointer transition-colors`}
                          onClick={() => handleTestRowClick(test.testName)}
                          onMouseEnter={() => setHoveredTestRow(test.testName)}
                          onMouseLeave={() => setHoveredTestRow(null)}
                        >
                          <div className="flex items-center gap-1 ml-4">
                            {selectedTestRows.has(test.testName) && <TestTube className="h-2 w-2 text-blue-600" />}
                            {test.results.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTestExpansion(test.testName);
                                }}
                                className="h-4 w-4 p-0"
                              >
                                {expandedTests.has(test.testName) ? (
                                  <ChevronDown className="h-2 w-2" />
                                ) : (
                                  <ChevronRight className="h-2 w-2" />
                                )}
                              </Button>
                            )}
                            <div>
                              <div className="font-medium text-xs">{test.testName}</div>
                              <div className="text-xs text-muted-foreground opacity-75">
                                ({test.unit})
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {displayColumns.map(encounter => {
                          const result = test.results.find(r => r.encounterId === encounter.encounterId);
                          const isDateSelected = selectedDates.has(encounter.date);
                          const isEncounterHighlighted = result?.encounterId && 
                            selectedDates.has(encounter.date) && 
                            result.encounterId === encounter.encounterId;
                          
                          let cellClass = "p-1 text-center transition-colors";
                          if (isDateSelected || isEncounterHighlighted) {
                            cellClass += " bg-blue-50 border-2 border-blue-200";
                          }
                          
                          return (
                            <td key={encounter.encounterId} className={cellClass}>
                              {result ? (
                                <div className="relative">
                                  <div 
                                    className={`px-1 py-0.5 rounded text-xs transition-all ${result.isPending ? 'bg-blue-100 text-blue-800 border border-blue-300' : `cursor-pointer ${getValueClass(result.abnormalFlag, result.criticalFlag, result.needsReview, result.isReviewed, canUnreview(result))}`} ${result.needsReview ? 'hover:scale-105 hover:shadow-md' : ''}`}
                                    onClick={() => {
                                      // Only trigger individual lab result actions for specific review/unreview
                                      // This preserves the single-click review behavior for individual results
                                      if (!result.isPending) {
                                        if (result.needsReview) {
                                          onReviewSpecific?.(test.testName, date, result.id);
                                        } else if (result.isReviewed && canUnreview(result)) {
                                          onUnreviewSpecific?.(test.testName, date, result.id);
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
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ];
                    
                    if (expandedTests.has(test.testName)) {
                      testRows.push(
                        <tr key={`${test.testName}-expanded`}>
                          <td colSpan={displayColumns.length + 1} className="bg-muted/10 p-4">
                            <div className="space-y-2 text-sm ml-6">
                              <div>
                                <span className="font-medium">Reference Range: </span>
                                {test.referenceRange}
                              </div>
                              <div>
                                <span className="font-medium">Test Code: </span>
                                {test.testCode}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Click test values to view detailed result information
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    
                    panelRows.push(...testRows);
                  });
                }
                
                return panelRows;
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
                    selectedDates.forEach(selectedDate => {
                      matrixData.forEach(test => {
                        const matchingResults = test.results.filter(result => {
                          // Direct date string comparison
                          const match = result.date === selectedDate;

                          return match;
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