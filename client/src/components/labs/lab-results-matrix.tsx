import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, FileText, Calendar, TestTube, Check } from 'lucide-react';

interface LabResultsMatrixProps {
  patientId: number;
  mode?: 'full' | 'compact' | 'encounter' | 'review';
  encounterId?: number;
  showTitle?: boolean;
  pendingReviewIds?: number[]; // IDs of results that need review
  onReviewEncounter?: (date: string, encounterIds: number[]) => void;
  onReviewTestGroup?: (testName: string, resultIds: number[]) => void;
  onReviewSpecific?: (testName: string, date: string, resultId: number) => void;
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
  }>;
}

export function LabResultsMatrix({ 
  patientId, 
  mode = 'full', 
  encounterId,
  showTitle = true,
  pendingReviewIds = [],
  onReviewEncounter,
  onReviewTestGroup,
  onReviewSpecific
}: LabResultsMatrixProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedTestRows, setSelectedTestRows] = useState<Set<string>>(new Set());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredTestRow, setHoveredTestRow] = useState<string | null>(null);

  console.log('🧪 [LabResultsMatrix] Rendering with:', { patientId, mode, encounterId });

  const { data: labResults, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const results = (labResults as any) || [];
  console.log('🧪 [LabResultsMatrix] Processing results:', results.length);

  const matrixData = useMemo(() => {
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
      testGroup.results.push({
        date: result.resultAvailableAt,
        value: result.resultValue,
        abnormalFlag: result.abnormalFlag,
        criticalFlag: result.criticalFlag,
        id: result.id,
        encounterId: result.encounterId,
        needsReview: pendingReviewIds.includes(result.id)
      });
    });

    // Sort results by date for each test
    testGroups.forEach(test => {
      test.results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(testGroups.values()).sort((a, b) => a.testName.localeCompare(b.testName));
  }, [results]);

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
    if (isShiftClick) {
      const newSelected = new Set(selectedDates);
      if (newSelected.has(date)) {
        newSelected.delete(date);
      } else {
        newSelected.add(date);
      }
      setSelectedDates(newSelected);
    } else {
      setSelectedDates(new Set([date]));
    }
  };

  const handleTestRowClick = (testName: string) => {
    const newSelected = new Set(selectedTestRows);
    if (newSelected.has(testName)) {
      newSelected.delete(testName);
    } else {
      newSelected.add(testName);
    }
    setSelectedTestRows(newSelected);
  };

  const handleReviewSelection = () => {
    if (selectedDates.size > 0 && selectedTestRows.size === 0) {
      // Review by encounter(s)
      const encounterIds: number[] = [];
      selectedDates.forEach(date => {
        const encounters = encountersByDate.get(date) || [];
        encounterIds.push(...encounters);
      });
      onReviewEncounter?.(Array.from(selectedDates).join(', '), encounterIds);
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
    }
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
    setSelectedTestRows(new Set());
  };

  const getDateHeaderClass = (date: string) => {
    const isSelected = selectedDates.has(date);
    const isHovered = hoveredDate === date;
    const hasPendingResults = matrixData.some(test => 
      test.results.some(result => result.date === date && result.needsReview)
    );
    
    let classes = "text-center p-3 font-semibold min-w-[100px] cursor-pointer transition-colors";
    
    if (isSelected) {
      classes += " bg-blue-200 text-blue-900";
    } else if (isHovered) {
      classes += " bg-blue-100";
    } else if (hasPendingResults) {
      classes += " bg-yellow-100";
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

  const getValueClass = (abnormalFlag?: string, criticalFlag?: boolean, needsReview?: boolean) => {
    if (needsReview) return 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400';
    if (criticalFlag) return 'bg-red-100 text-red-800 border border-red-300';
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
                  <div className="flex items-center gap-2">
                    Test
                    {(selectedDates.size > 0 || selectedTestRows.size > 0) && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleReviewSelection}
                          className="h-6 px-2 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearSelection}
                          className="h-6 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
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
              {matrixData.flatMap((test) => {
                const rows = [
                  <tr key={test.testName} className="border-b hover:bg-muted/20">
                    <td 
                      className={getTestRowClass(test.testName)}
                      onClick={() => handleTestRowClick(test.testName)}
                      onMouseEnter={() => setHoveredTestRow(test.testName)}
                      onMouseLeave={() => setHoveredTestRow(null)}
                    >
                      <div className="flex items-center gap-2">
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
                      return (
                        <td key={date} className="p-3 text-center">
                          {result ? (
                            <div className="relative">
                              <div className={`px-2 py-1 rounded text-sm ${getValueClass(result.abnormalFlag, result.criticalFlag, result.needsReview)}`}>
                                {result.value}
                                {result.criticalFlag && (
                                  <AlertTriangle className="inline h-3 w-3 ml-1" />
                                )}
                                {result.needsReview && (
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full ml-1" />
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
                  rows.push(
                    <tr key={`${test.testName}-expanded`}>
                      <td colSpan={displayColumns.length + 1} className="bg-muted/10 p-4">
                        <div className="space-y-2 text-sm">
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
                
                return rows;
              })}
            </tbody>
          </table>
        </div>
        
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