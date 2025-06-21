import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StandardLabMatrixProps {
  patientId: number;
  mode?: 'full' | 'compact';
  showTitle?: boolean;
}

interface LabResult {
  id: number;
  testName: string;
  resultValue: string;
  resultUnits: string;
  abnormalFlag?: string;
  criticalFlag?: boolean;
  encounterId?: number;
  resultAvailableAt: string;
  referenceRange?: string;
}

export function StandardLabMatrix({ patientId, mode = 'full', showTitle = true }: StandardLabMatrixProps) {
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  // Define standard lab panel structure
  const labPanels = {
    'CBC': [
      { name: 'WBC', unit: '(x10³/μL)', key: 'White Blood Cell Count' },
      { name: 'Hgb', unit: '(g/dL)', key: 'Hemoglobin' },
      { name: 'Hct', unit: '(%)', key: 'Hematocrit' },
      { name: 'Platelets', unit: '(k/μL)', key: 'Platelet Count' },
      { name: 'MCV', unit: '(fL)', key: 'Mean Corpuscular Volume' },
    ],
    'CMP': [
      { name: 'Na', unit: '(mmol/L)', key: 'Sodium' },
      { name: 'K', unit: '(mmol/L)', key: 'Potassium' },
      { name: 'Cl', unit: '(mmol/L)', key: 'Chloride' },
      { name: 'BUN', unit: '(mg/dL)', key: 'Blood Urea Nitrogen' },
      { name: 'Creatinine', unit: '(mg/dL)', key: 'Creatinine' },
      { name: 'Glucose', unit: '(mg/dL)', key: 'Glucose' },
      { name: 'AST', unit: '(U/L)', key: 'AST (SGOT)' },
      { name: 'ALT', unit: '(U/L)', key: 'ALT (SGPT)' },
      { name: 'Total Protein', unit: '(g/dL)', key: 'Total Protein' },
      { name: 'Albumin', unit: '(g/dL)', key: 'Albumin' },
      { name: 'Total Bilirubin', unit: '(mg/dL)', key: 'Total Bilirubin' },
      { name: 'Alkaline Phosphatase', unit: '(U/L)', key: 'Alkaline Phosphatase' },
      { name: 'Calcium', unit: '(mg/dL)', key: 'Calcium' },
    ],
    'Other': []
  };

  // Group results by encounter
  const encounterData = useMemo(() => {
    const results = Array.isArray(labResults) ? labResults as LabResult[] : [];
    const encounters = new Map<number, { date: string; results: LabResult[] }>();
    
    results.forEach(result => {
      if (result.encounterId) {
        if (!encounters.has(result.encounterId)) {
          encounters.set(result.encounterId, {
            date: result.resultAvailableAt,
            results: []
          });
        }
        encounters.get(result.encounterId)!.results.push(result);
      }
    });

    return Array.from(encounters.entries())
      .map(([encounterId, data]) => ({ encounterId, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [labResults]);

  // Get value for specific test in specific encounter with better matching
  const getTestValue = (testKey: string, encounterId: number) => {
    const encounter = encounterData.find(e => e.encounterId === encounterId);
    if (!encounter) return null;
    
    const result = encounter.results.find(r => {
      // Exact match first
      if (r.testName === testKey) return true;
      
      // Normalize names for matching
      const normalizeTestName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedResult = normalizeTestName(r.testName);
      const normalizedKey = normalizeTestName(testKey);
      
      // Check for common variations
      return normalizedResult === normalizedKey ||
             normalizedResult.includes(normalizedKey) ||
             normalizedKey.includes(normalizedResult);
    });
    
    return result ? result.resultValue : null;
  };

  const getCellClass = (value: string | null, testKey: string, encounterId: number) => {
    if (!value) return 'p-3 text-center border-r border-gray-200 text-gray-400';
    
    const encounter = encounterData.find(e => e.encounterId === encounterId);
    const result = encounter?.results.find(r => 
      r.testName === testKey || 
      r.testName.includes(testKey) ||
      testKey.includes(r.testName)
    );
    
    let baseClass = 'p-3 text-center border-r border-gray-200 font-medium';
    
    if (result?.criticalFlag) {
      baseClass += ' bg-red-100 text-red-800';
    } else if (result?.abnormalFlag === 'H') {
      baseClass += ' bg-orange-100 text-orange-800';
    } else if (result?.abnormalFlag === 'L') {
      baseClass += ' bg-blue-100 text-blue-800';
    } else {
      baseClass += ' text-gray-900';
    }
    
    return baseClass;
  };

  if (isLoading) {
    return <div className="p-4">Loading lab results...</div>;
  }

  const maxColumns = mode === 'compact' ? 4 : 8;
  const displayEncounters = encounterData.slice(0, maxColumns);

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>Lab Results Matrix</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="text-left p-3 font-semibold min-w-[200px] sticky left-0 bg-gray-50 border-r border-gray-300">
                  Test
                </th>
                {displayEncounters.map(encounter => (
                  <th 
                    key={encounter.encounterId}
                    className="text-center p-3 font-semibold border-r border-gray-300 min-w-[120px]"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{format(new Date(encounter.date), 'yyyy-MM-dd')}</span>
                      <span className="text-xs text-gray-600">{format(new Date(encounter.date), 'HH:mm')}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {Object.entries(labPanels).map(([panelName, tests]) => {
                if (tests.length === 0) return null;
                
                return (
                  <React.Fragment key={panelName}>
                    {/* Panel Header */}
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <td className="p-3 sticky left-0 bg-gray-100 border-r border-gray-300">
                        <div className="font-bold text-base text-gray-800">{panelName}</div>
                      </td>
                      {displayEncounters.map(encounter => (
                        <td key={encounter.encounterId} className="p-3 border-r border-gray-300 bg-gray-100"></td>
                      ))}
                    </tr>
                    
                    {/* Individual Test Rows */}
                    {tests.map(test => (
                      <tr key={test.key} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 sticky left-0 bg-white border-r border-gray-300">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{test.name} {test.unit}</span>
                          </div>
                        </td>
                        {displayEncounters.map(encounter => {
                          const value = getTestValue(test.key, encounter.encounterId);
                          return (
                            <td 
                              key={encounter.encounterId}
                              className={getCellClass(value, test.key, encounter.encounterId)}
                            >
                              {value || '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {mode === 'compact' && encounterData.length > maxColumns && (
          <div className="p-3 text-center border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {maxColumns} most recent of {encounterData.length} total encounters
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}