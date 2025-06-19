import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';

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
        id: result.id
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
            
            <tbody>
              {matrixData.flatMap((test) => {
                const rows = [
                  <tr key={test.testName} className="border-b hover:bg-muted/20">
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