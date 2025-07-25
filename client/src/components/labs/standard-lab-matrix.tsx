import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  providerNotes?: string;
  sourceType?: string;
}

export function StandardLabMatrix({ patientId, mode = 'full', showTitle = true }: StandardLabMatrixProps) {
  const { toast } = useToast();
  const [editingResult, setEditingResult] = useState<LabResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    resultValue: '',
    resultUnits: '',
    referenceRange: '',
    abnormalFlag: '',
    criticalFlag: false,
    providerNotes: ''
  });

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  // Delete lab result mutation
  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      const response = await fetch(`/api/patients/${patientId}/lab-results/${resultId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete lab result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      toast({ title: "Lab result deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete lab result", variant: "destructive" });
    }
  });

  // Update lab result mutation
  const updateLabResultMutation = useMutation({
    mutationFn: async ({ resultId, updates }: { resultId: number, updates: typeof editFormData }) => {
      const response = await fetch(`/api/patients/${patientId}/lab-results/${resultId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update lab result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      toast({ title: "Lab result updated successfully" });
      setEditingResult(null);
    },
    onError: () => {
      toast({ title: "Failed to update lab result", variant: "destructive" });
    }
  });

  const handleEditResult = (result: LabResult) => {
    setEditingResult(result);
    setEditFormData({
      resultValue: result.resultValue || "",
      resultUnits: result.resultUnits || "",
      referenceRange: result.referenceRange || "",
      abnormalFlag: result.abnormalFlag || "",
      criticalFlag: result.criticalFlag || false,
      providerNotes: result.providerNotes || ""
    });
  };

  const handleUpdateResult = () => {
    if (!editingResult) return;
    const updates = {
      ...editFormData,
      abnormalFlag: editFormData.abnormalFlag === 'normal' ? '' : editFormData.abnormalFlag
    };
    updateLabResultMutation.mutate({
      resultId: editingResult.id,
      updates
    });
  };

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

  // Group results by date since encounter IDs are null
  const dateColumns = useMemo(() => {
    const results = Array.isArray(labResults) ? labResults as LabResult[] : [];
    const dateMap = new Map<string, { date: string; results: LabResult[] }>();
    
    results.forEach(result => {
      const dateKey = format(new Date(result.resultAvailableAt), 'yyyy-MM-dd HH:mm');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: result.resultAvailableAt,
          results: []
        });
      }
      dateMap.get(dateKey)!.results.push(result);
    });

    return Array.from(dateMap.entries())
      .map(([dateKey, data]) => ({ dateKey, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [labResults]);

  // Get result for specific test in specific date
  const getTestResult = (testKey: string, dateKey: string) => {
    const dateData = dateColumns.find(d => d.dateKey === dateKey);
    if (!dateData) return null;
    
    const result = dateData.results.find(r => {
      // Exact match first
      if (r.testName === testKey) return true;
      
      // Normalize names for matching
      const normalizeTestName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedResult = normalizeTestName(r.testName);
      const normalizedKey = normalizeTestName(testKey);
      
      // Only match if they're exactly equal after normalization
      // This prevents "Hemoglobin" from matching "Hemoglobin A1c"
      return normalizedResult === normalizedKey;
    });
    
    return result || null;
  };

  const getCellClass = (value: string | null, testKey: string, dateKey: string) => {
    if (!value) return 'p-3 text-center border-r border-gray-200 text-gray-400';
    
    const dateData = dateColumns.find(d => d.dateKey === dateKey);
    const result = dateData?.results.find(r => {
      // Exact match first
      if (r.testName === testKey) return true;
      
      // Normalize names for matching (same logic as getTestValue)
      const normalizeTestName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedResult = normalizeTestName(r.testName);
      const normalizedKey = normalizeTestName(testKey);
      
      // Only match if they're exactly equal after normalization
      return normalizedResult === normalizedKey;
    });
    
    let baseClass = 'p-3 text-center border-r border-gray-200 font-medium';
    
    if (result?.criticalFlag) {
      baseClass += ' bg-red-100 text-red-800';
    } else if (result?.abnormalFlag === 'H') {
      baseClass += ' bg-orange-100 text-orange-800';
    } else if (result?.abnormalFlag === 'L') {
      baseClass += ' bg-navy-blue-100 text-navy-blue-800';
    } else {
      baseClass += ' text-gray-900';
    }
    
    return baseClass;
  };

  if (isLoading) {
    return <div className="p-4">Loading lab results...</div>;
  }

  const maxColumns = mode === 'compact' ? 4 : 8;
  const displayDates = dateColumns.slice(0, maxColumns);

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
                {displayDates.map((dateCol, index) => (
                  <th 
                    key={`date-${index}`}
                    className="text-center p-3 font-semibold border-r border-gray-300 min-w-[120px]"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{format(new Date(dateCol.date), 'yyyy-MM-dd')}</span>
                      <span className="text-xs text-gray-600">{format(new Date(dateCol.date), 'HH:mm')}</span>
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
                      {displayDates.map((dateCol, index) => (
                        <td key={`panel-${index}`} className="p-3 border-r border-gray-300 bg-gray-100"></td>
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
                        {displayDates.map((dateCol, index) => {
                          const result = getTestResult(test.key, dateCol.dateKey);
                          const value = result?.resultValue;
                          return (
                            <td 
                              key={`test-${index}`}
                              className={getCellClass(value, test.key, dateCol.dateKey)}
                            >
                              {result ? (
                                <div className="flex items-center justify-between">
                                  <span className="flex-1">
                                    {value}
                                    {result.sourceType === 'user_entered' && (
                                      <Badge variant="outline" className="ml-1 text-xs text-navy-blue-600">
                                        User Entered
                                      </Badge>
                                    )}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-gray-100"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="cursor-pointer text-navy-blue-600"
                                        onClick={() => handleEditResult(result)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer text-red-600"
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this lab result?')) {
                                            deleteLabResultMutation.mutate(result.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ) : (
                                '—'
                              )}
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
        
        {mode === 'compact' && dateColumns.length > maxColumns && (
          <div className="p-3 text-center border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {maxColumns} most recent of {dateColumns.length} total dates
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingResult} onOpenChange={(open) => !open && setEditingResult(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lab Result</DialogTitle>
            <DialogDescription>
              Update the lab result values and flags
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input 
                id="testName" 
                value={editingResult?.testName || ''} 
                disabled 
                className="bg-gray-50"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resultValue">Result Value</Label>
                <Input 
                  id="resultValue" 
                  value={editFormData.resultValue}
                  onChange={(e) => setEditFormData({...editFormData, resultValue: e.target.value})}
                  placeholder="Enter result value"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resultUnits">Units</Label>
                <Input 
                  id="resultUnits" 
                  value={editFormData.resultUnits}
                  onChange={(e) => setEditFormData({...editFormData, resultUnits: e.target.value})}
                  placeholder="e.g., mg/dL"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="referenceRange">Reference Range</Label>
              <Input 
                id="referenceRange" 
                value={editFormData.referenceRange}
                onChange={(e) => setEditFormData({...editFormData, referenceRange: e.target.value})}
                placeholder="e.g., 70-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="abnormalFlag">Abnormal Flag</Label>
              <Select 
                value={editFormData.abnormalFlag || 'normal'}
                onValueChange={(value) => setEditFormData({...editFormData, abnormalFlag: value})}
              >
                <SelectTrigger id="abnormalFlag">
                  <SelectValue placeholder="Select abnormal flag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="L">Low</SelectItem>
                  <SelectItem value="H">High</SelectItem>
                  <SelectItem value="LL">Critical Low</SelectItem>
                  <SelectItem value="HH">Critical High</SelectItem>
                  <SelectItem value="A">Abnormal</SelectItem>
                  <SelectItem value="AA">Critical Abnormal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="criticalFlag"
                checked={editFormData.criticalFlag}
                onCheckedChange={(checked) => setEditFormData({...editFormData, criticalFlag: checked as boolean})}
              />
              <Label htmlFor="criticalFlag" className="cursor-pointer">
                Mark as Critical
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="providerNotes">Provider Notes</Label>
              <Textarea 
                id="providerNotes" 
                value={editFormData.providerNotes}
                onChange={(e) => setEditFormData({...editFormData, providerNotes: e.target.value})}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingResult(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateResult}
                disabled={updateLabResultMutation.isPending}
              >
                {updateLabResultMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}