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
    id: number;
    encounterId?: number;
    needsReview?: boolean;
    isReviewed?: boolean;
    reviewedBy?: number;
    orderedBy?: number;
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

  console.log('🧪 [LabResultsMatrix] Rendering with:', { patientId, mode, encounterId });

  // Permission check for unreview functionality
  const canUnreview = (result: any) => {
    if (!currentUserId) return false;
    // Allow unreview if:
    // 1. Current user reviewed it, OR
    // 2. Current user is the ordering provider, OR  
    // 3. Current user is admin/provider (role-based check would be ideal but not implemented here)
    return result.reviewedBy === currentUserId || result.orderedBy === currentUserId;
  };

  const { data: labResults, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const results = (labResults as any) || [];
  console.log('🧪 [LabResultsMatrix] Processing results:', results.length);

  // Define lab panel groupings
  const labPanels: { [key: string]: string[] } = {
    'Complete Blood Count': ['Hemoglobin', 'Hematocrit', 'White Blood Cell Count', 'Red Blood Cell Count', 'Platelet Count', 'Mean Corpuscular Volume', 'Mean Corpuscular Hemoglobin', 'Mean Corpuscular Hemoglobin Concentration'],
    'Basic Metabolic Panel': ['Glucose', 'Sodium', 'Potassium', 'Chloride', 'BUN', 'Creatinine', 'CO2'],
    'Comprehensive Metabolic Panel': ['Glucose', 'Sodium', 'Potassium', 'Chloride', 'BUN', 'Creatinine', 'CO2', 'Total Protein', 'Albumin', 'Total Bilirubin', 'AST', 'ALT', 'Alkaline Phosphatase'],
    'Lipid Panel': ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides'],
    'Thyroid Function': ['TSH', 'T3', 'T4', 'Free T4'],
    'Other': []
  };

  const matrixData = useMemo(() => {
    console.log('🧪 [LabResultsMatrix] Processing results:', results.length);
    console.log('🧪 [LabResultsMatrix] Sample result structure:', results.slice(0, 2).map(r => ({
      id: r.id,
      testName: r.testName,
      resultAvailableAt: r.resultAvailableAt,
      specimenCollectedAt: r.specimenCollectedAt,
      orderedAt: r.orderedAt,
      encounterId: r.encounterId
    })));
    
    if (!results.length) return [];

    const testGroups = new Map<string, MatrixData>();

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
            console.warn('Invalid date for result:', result.id, resultDate);
            resultDate = new Date().toISOString(); // Fallback to current date
          }
        } else {
          resultDate = new Date().toISOString(); // Fallback to current date
        }
      } catch (error) {
        console.warn('Date parsing error for result:', result.id, error);
        resultDate = new Date().toISOString(); // Fallback to current date
      }

      console.log('🧪 [LabResultsMatrix] Result', result.id, 'final date:', resultDate, 'original:', result.resultAvailableAt);

      testGroup.results.push({
        date: resultDate,
        value: result.resultValue,
        abnormalFlag: result.abnormalFlag,
        criticalFlag: result.criticalFlag,
        id: result.id,
        encounterId: result.encounterId,
        needsReview: pendingReviewIds.includes(result.id),
        isReviewed: result.reviewedBy !== null,
        reviewedBy: result.reviewedBy,
        orderedBy: result.orderedBy
      });
    });

    // Sort results by date for each test
    testGroups.forEach(test => {
      test.results.sort((a, b) => {
        try {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } catch (error) {
          console.warn('Date sorting error:', a.date, b.date);
          return 0;
        }
      });
    });

    return Array.from(testGroups.values()).sort((a, b) => a.testName.localeCompare(b.testName));
  }, [results]);

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
  }, [matrixData]);

  const dateColumns = useMemo(() => {
    const allDates = new Set<string>();
    matrixData.forEach(test => {
      test.results.forEach(result => allDates.add(result.date));
    });
    return Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [matrixData]);

  const maxColumns = mode === 'compact' ? 5 : mode === 'encounter' ? 3 : 10;
  const displayColumns = dateColumns.slice(0, maxColumns);

  // Group results by encounter for encounter-level review
  const encountersByDate = useMemo(() => {
    const encounters = new Map<string, number[]>();
    matrixData.forEach(test => {
      test.results.forEach(result => {
        if (result.encounterId) {
          const date = result.date;
          if (!encounters.has(date)) {
            encounters.set(date, []);
          }
          if (!encounters.get(date)!.includes(result.encounterId)) {
            encounters.get(date)!.push(result.encounterId);
          }
        }
      });
    });
    return encounters;
  }, [matrixData]);

  const handleDateClick = (date: string, isShiftClick: boolean) => {
    // Check if this date has pending review results
    const hasPendingResults = matrixData.some(test => 
      test.results.some(result => result.date === date && result.needsReview)
    );

    if (hasPendingResults) {
      // Immediately trigger review for this date
      const encounterIds: number[] = [];
      const encounters = encountersByDate.get(date) || [];
      encounterIds.push(...encounters);
      console.log('🔍 [LabMatrix] Auto-triggering review for date:', date, 'encounters:', encounterIds);
      onReviewEncounter?.(date, encounterIds);
      return;
    }

    // Normal selection behavior for dates without pending results
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
  };

  const handleTestRowClick = (testName: string) => {
    // Check if this test has pending review results
    const hasPendingResults = matrixData
      .find(test => test.testName === testName)?.results
      .some(result => result.needsReview);

    if (hasPendingResults) {
      // Immediately trigger review for this test
      const test = matrixData.find(t => t.testName === testName);
      if (test) {
        const resultIds = test.results.map(r => r.id);
        console.log('🔍 [LabMatrix] Auto-triggering review for test:', testName, 'resultIds:', resultIds);
        onReviewTestGroup?.(testName, resultIds);
        return;
      }
    }

    // Normal selection behavior for tests without pending results
    const newSelected = new Set(selectedTestRows);
    if (newSelected.has(testName)) {
      newSelected.delete(testName);
    } else {
      newSelected.add(testName);
    }
    setSelectedTestRows(newSelected);
  };

  const handlePanelClick = (panelName: string) => {
    // Check if this panel has pending review results
    const panelTests = groupedData[panelName] || [];
    const hasPendingResults = panelTests.some(test => 
      test.results.some(result => result.needsReview)
    );

    if (hasPendingResults) {
      // Immediately trigger review for this panel
      const resultIds: number[] = [];
      panelTests.forEach(test => {
        resultIds.push(...test.results.map(r => r.id));
      });
      console.log('🔍 [LabMatrix] Auto-triggering review for panel:', panelName, 'resultIds:', resultIds);
      onReviewTestGroup?.(panelName, resultIds);
      return;
    }

    // Normal selection behavior for panels without pending results
    const newSelected = new Set(selectedPanels);
    if (newSelected.has(panelName)) {
      newSelected.delete(panelName);
    } else {
      newSelected.add(panelName);
    }
    setSelectedPanels(newSelected);
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
    console.log('🔍 [LabMatrix] Review selection triggered with:', {
      selectedDates: Array.from(selectedDates),
      selectedTestRows: Array.from(selectedTestRows),
      selectedPanels: Array.from(selectedPanels),
      matrixDataLength: matrixData.length,
      groupedDataKeys: Object.keys(groupedData)
    });

    if (selectedDates.size > 0 && selectedTestRows.size === 0 && selectedPanels.size === 0) {
      // Review by encounter(s)
      const encounterIds: number[] = [];
      selectedDates.forEach(date => {
        const encounters = encountersByDate.get(date) || [];
        console.log('🔍 [LabMatrix] Encounters for date', date, ':', encounters);
        encounterIds.push(...encounters);
      });
      console.log('🔍 [LabMatrix] Calling onReviewEncounter with:', Array.from(selectedDates).join(', '), encounterIds);
      onReviewEncounter?.(Array.from(selectedDates).join(', '), encounterIds);
    } else if (selectedPanels.size > 0 && selectedDates.size === 0) {
      // Review by lab panel(s)
      const resultIds: number[] = [];
      selectedPanels.forEach(panelName => {
        const panelTests = groupedData[panelName] || [];
        console.log('🔍 [LabMatrix] Panel tests for', panelName, ':', panelTests.length);
        panelTests.forEach(test => {
          console.log('🔍 [LabMatrix] Test results for', test.testName, ':', test.results.map(r => r.id));
          resultIds.push(...test.results.map(r => r.id));
        });
      });
      console.log('🔍 [LabMatrix] Calling onReviewTestGroup with panel resultIds:', resultIds);
      onReviewTestGroup?.(Array.from(selectedPanels).join(', '), resultIds);
    } else if (selectedTestRows.size > 0 && selectedDates.size === 0) {
      // Review by test group(s)
      const resultIds: number[] = [];
      selectedTestRows.forEach(testName => {
        const test = matrixData.find(t => t.testName === testName);
        console.log('🔍 [LabMatrix] Found test for', testName, ':', test ? test.results.length + ' results' : 'not found');
        if (test) {
          console.log('🔍 [LabMatrix] Result IDs for', testName, ':', test.results.map(r => r.id));
          resultIds.push(...test.results.map(r => r.id));
        }
      });
      console.log('🔍 [LabMatrix] Calling onReviewTestGroup with test resultIds:', resultIds);
      onReviewTestGroup?.(Array.from(selectedTestRows).join(', '), resultIds);
    } else if (selectedTestRows.size === 1 && selectedDates.size === 1) {
      // Review specific test on specific date
      const testName = Array.from(selectedTestRows)[0];
      const date = Array.from(selectedDates)[0];
      const test = matrixData.find(t => t.testName === testName);
      const result = test?.results.find(r => r.date === date);
      console.log('🔍 [LabMatrix] Specific review for', testName, 'on', date, ':', result ? result.id : 'not found');
      if (result) {
        onReviewSpecific?.(testName, date, result.id);
      }
    } else {
      console.log('🔍 [LabMatrix] No matching review condition found');
    }
  };

  const handleUnreviewSelection = () => {
    console.log('🔍 [LabMatrix] Unreview selection triggered with:', {
      selectedDates: Array.from(selectedDates),
      selectedTestRows: Array.from(selectedTestRows),
      selectedPanels: Array.from(selectedPanels),
      matrixDataLength: matrixData.length,
      groupedDataKeys: Object.keys(groupedData)
    });

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
      console.log('🔍 [LabMatrix] Calling onUnreviewEncounter with:', Array.from(selectedDates).join(', '), encounterIds, resultIds);
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
      console.log('🔍 [LabMatrix] Calling onUnreviewTestGroup with test resultIds:', resultIds);
      onUnreviewTestGroup?.(Array.from(selectedTestRows).join(', '), resultIds);
    }
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
    setSelectedTestRows(new Set());
    setSelectedPanels(new Set());
  };

  const getDateHeaderClass = (date: string) => {
    const isSelected = selectedDates.has(date);
    const isHovered = hoveredDate === date;
    const hasPendingResults = matrixData.some(test => 
      test.results.some(result => result.date === date && result.needsReview)
    );
    
    let classes = "text-center p-3 font-semibold min-w-[100px] cursor-pointer transition-colors border-2";
    
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
    
    let classes = "p-3 sticky left-0 bg-white cursor-pointer transition-colors";
    
    if (isSelected) {
      classes += " bg-blue-200";
    } else if (isHovered) {
      classes += " bg-blue-100";
    } else if (hasPendingResults) {
      classes += " bg-yellow-50";
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
    if (abnormalFlag === 'H') return 'bg-orange-100 text-orange-800';
    if (abnormalFlag === 'L') return 'bg-blue-100 text-blue-800';
    return 'bg-green-50 text-green-800';
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
      {showTitle && (
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-semibold min-w-[200px] sticky left-0 bg-muted/30">
                  Test
                </th>
                {displayColumns.map(date => (
                  <th 
                    key={date} 
                    className={getDateHeaderClass(date)}
                    onClick={(e) => handleDateClick(date, e.shiftKey)}
                    onMouseEnter={() => setHoveredDate(date)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <div className="text-xs whitespace-pre-line flex items-center justify-center gap-1">
                      {selectedDates.has(date) && <Calendar className="h-3 w-3" />}
                      {formatDate(date)}
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
                      className="p-3 sticky left-0 bg-inherit"
                      onClick={() => handlePanelClick(panelName)}
                    >
                      <div className="flex items-center gap-2">
                        {isPanelSelected && <FlaskConical className="h-4 w-4 text-blue-600" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePanelExpansion(panelName);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          {isPanelExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
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
                          className={getTestRowClass(test.testName)}
                          onClick={() => handleTestRowClick(test.testName)}
                          onMouseEnter={() => setHoveredTestRow(test.testName)}
                          onMouseLeave={() => setHoveredTestRow(null)}
                        >
                          <div className="flex items-center gap-2 ml-6">
                            {selectedTestRows.has(test.testName) && <TestTube className="h-3 w-3 text-blue-600" />}
                            {test.results.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTestExpansion(test.testName);
                                }}
                                className="h-5 w-5 p-0"
                              >
                                {expandedTests.has(test.testName) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <div>
                              <div className="font-medium text-sm">{test.testName}</div>
                              <div className="text-xs text-muted-foreground">
                                ({test.unit})
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {displayColumns.map(date => {
                          const result = test.results.find(r => r.date === date);
                          const isDateSelected = selectedDates.has(date);
                          const isEncounterHighlighted = result?.encounterId && 
                            selectedDates.has(date) && 
                            encountersByDate.get(date)?.includes(result.encounterId);
                          
                          let cellClass = "p-3 text-center transition-colors";
                          if (isDateSelected || isEncounterHighlighted) {
                            cellClass += " bg-blue-50 border-2 border-blue-200";
                          }
                          
                          return (
                            <td key={date} className={cellClass}>
                              {result ? (
                                <div className="relative">
                                  <div 
                                    className={`px-2 py-1 rounded text-sm cursor-pointer transition-all ${getValueClass(result.abnormalFlag, result.criticalFlag, result.needsReview, result.isReviewed, canUnreview(result))} ${result.needsReview ? 'hover:scale-105 hover:shadow-md' : ''}`}
                                    onClick={() => {
                                      if (result.needsReview) {
                                        // Immediately trigger review for this specific result
                                        console.log('🔍 [LabMatrix] Auto-triggering review for specific result:', test.testName, date, result.id);
                                        onReviewSpecific?.(test.testName, date, result.id);
                                      } else if (result.isReviewed && canUnreview(result)) {
                                        // Allow unreview if user has permission
                                        console.log('🔍 [LabMatrix] Auto-triggering unreview for specific result:', test.testName, date, result.id);
                                        onUnreviewSpecific?.(test.testName, date, result.id);
                                      }
                                    }}
                                  >
                                    {result.value}
                                    {result.criticalFlag && (
                                      <AlertTriangle className="inline h-3 w-3 ml-1" />
                                    )}
                                    {result.needsReview && (
                                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full ml-1" />
                                    )}
                                    {result.isReviewed && canUnreview(result) && (
                                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-1" title="Click to unreview" />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
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
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedDates.size > 0 && `${selectedDates.size} date${selectedDates.size > 1 ? 's' : ''} selected`}
                {selectedTestRows.size > 0 && `${selectedTestRows.size} test${selectedTestRows.size > 1 ? 's' : ''} selected`}
                {selectedPanels.size > 0 && `${selectedPanels.size} panel${selectedPanels.size > 1 ? 's' : ''} selected`}
              </div>
              <Button
                onClick={handleReviewSelection}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Review Selected
              </Button>
              <Button
                onClick={handleUnreviewSelection}
                disabled={selectedDates.size === 0 && selectedTestRows.size === 0 && selectedPanels.size === 0}
                variant="outline"
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4" />
                Unreview Selected
              </Button>
            </div>
          </div>
        )}
        
        {mode === 'compact' && dateColumns.length > maxColumns && (
          <div className="p-3 text-center border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing {maxColumns} most recent results of {dateColumns.length} total
            </div>
            <Button variant="link" size="sm" className="mt-1">
              View All Results
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}