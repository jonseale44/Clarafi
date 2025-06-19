import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LabResultsMatrixProps {
  patientId: number;
  mode?: 'full' | 'compact' | 'encounter';
  encounterId?: number;
  showTitle?: boolean;
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
  }>;
}

export function LabResultsMatrix({ 
  patientId, 
  mode = 'full', 
  encounterId,
  showTitle = true 
}: LabResultsMatrixProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  
  console.log('🧪 [LabResultsMatrix] Rendering with:', { patientId, mode, encounterId });

  // Fetch lab results
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  // Transform data into matrix format
  const matrixData = useMemo(() => {
    const safeResults = Array.isArray(labResults) ? labResults : [];
    console.log('🧪 [LabResultsMatrix] Processing results:', safeResults.length);
    
    if (safeResults.length === 0) return [];

    // Group by test name
    const grouped = safeResults.reduce((acc: { [key: string]: any[] }, result) => {
      const key = result.testName;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    // Convert to matrix format
    const matrix: MatrixData[] = Object.entries(grouped).map(([testName, results]) => {
      const typedResults = results as any[];
      
      // Sort by date and get unique time points
      const sortedResults = typedResults.sort((a, b) => 
        new Date(a.resultAvailableAt).getTime() - new Date(b.resultAvailableAt).getTime()
      );

      return {
        testName,
        testCode: sortedResults[0]?.testCode || '',
        unit: sortedResults[0]?.resultUnits || '',
        referenceRange: sortedResults[0]?.referenceRange || '',
        results: sortedResults.map(result => ({
          date: result.resultAvailableAt,
          value: result.resultValue,
          abnormalFlag: result.abnormalFlag,
          criticalFlag: result.criticalFlag,
          id: result.id
        }))
      };
    });

    // Sort by test name for consistent display
    return matrix.sort((a, b) => a.testName.localeCompare(b.testName));
  }, [labResults]);

  // Get all unique date columns
  const dateColumns = useMemo(() => {
    const allDates = new Set<string>();
    matrixData.forEach(test => {
      test.results.forEach(result => {
        allDates.add(result.date);
      });
    });
    
    return Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [matrixData]);

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

  const getValueClass = (abnormalFlag?: string, criticalFlag?: boolean) => {
    if (criticalFlag) return 'text-red-600 font-semibold bg-red-50';
    if (abnormalFlag && abnormalFlag !== 'N') return 'text-amber-600 font-medium bg-amber-50';
    return 'text-gray-900';
  };

  const maxColumns = mode === 'compact' ? 3 : dateColumns.length;
  const displayColumns = dateColumns.slice(-maxColumns); // Show most recent columns

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading lab results...</div>
        </CardContent>
      </Card>
    );
  }

  if (matrixData.length === 0) {
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
                // Navigate to unified lab results page
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
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-semibold min-w-[200px] sticky left-0 bg-muted/30">
                  Test
                </th>
                {displayColumns.map(date => (
                  <th key={date} className="text-center p-3 font-semibold min-w-[100px]">
                    <div className="text-xs whitespace-pre-line">
                      {formatDate(date)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Body */}
            <tbody>
              {matrixData.map((test) => (
                <React.Fragment key={test.testName}>
                  <tr className="border-b hover:bg-muted/20">
                    <td className="p-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        {test.results.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTestExpansion(test.testName)}
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
                            <div className={`px-2 py-1 rounded text-sm ${getValueClass(result.abnormalFlag, result.criticalFlag)}`}>
                              {result.value}
                              {result.criticalFlag && (
                                <AlertTriangle className="inline h-3 w-3 ml-1" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Expanded details */}
                  {expandedTests.has(test.testName) && (
                    <tr>
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
                  )}
                </React.Fragment>
              ))}
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