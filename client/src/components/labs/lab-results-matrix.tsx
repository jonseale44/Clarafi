/**
 * Lab Results Matrix Component
 * 
 * IMPLEMENTATION STATUS: Phase 2 of 6 Complete
 * - Phase 1 ✓: Enhanced table structure using specimen collection dates as columns
 * - Phase 2 ✓: Review notes panel with GPT summaries and conversation reviews
 * - Phase 3: Bidirectional sync & navigation (pending)
 * - Phase 4: Flexible zoom controls (pending)
 * - Phase 5: Review note management (pending)
 * - Phase 6: Performance optimization (pending)
 * 
 * Key Features (Phase 1 & 2):
 * - Columns are specimen collection dates (most recent on LEFT)
 * - Preserves all existing functionality (badges, source tracking, edit/delete)
 * - Falls back to result available date if specimen date not available
 * - Review Notes Panel displays conversation reviews with expandable timelines
 * - Dates shown vertically with GPT-generated summaries
 * 
 * See: docs/LAB_RESULTS_MATRIX_IMPLEMENTATION_GUIDE.md for full details
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, FileText, Calendar, TestTube, Check, FlaskConical, RotateCcw, User, MessageSquare, Phone, Mail, Send, ChevronUp, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useNavigationContext } from '@/hooks/use-navigation-context';

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
    // Source tracking fields for badge display
    sourceType?: string;
    sourceConfidence?: string | number;
    extractedFromAttachmentId?: number;
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
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState<boolean>(true);
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
  
  // GPT Review states
  const [isGeneratingGPTReview, setIsGeneratingGPTReview] = useState(false);
  const [generatedGPTReview, setGeneratedGPTReview] = useState<any>(null);
  const [isApprovingGPTReview, setIsApprovingGPTReview] = useState(false);
  const [showGPTReviewEditor, setShowGPTReviewEditor] = useState(false);
  
  // Editable review states
  const [editableReviewId, setEditableReviewId] = useState<number | null>(null);
  const [editableClinicalReview, setEditableClinicalReview] = useState('');
  const [editablePatientMessage, setEditablePatientMessage] = useState('');
  const [editableNurseMessage, setEditableNurseMessage] = useState('');
  const [reviewSaveStatus, setReviewSaveStatus] = useState<'saved' | 'saving' | 'editing'>('saved');
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Edit/Delete lab result states
  const [editingResult, setEditingResult] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    resultValue: '',
    resultUnits: '',
    referenceRange: '',
    abnormalFlag: '',
    criticalFlag: false,
    providerNotes: ''
  });
  
  // Review Notes Panel state
  const [isReviewNotesPanelOpen, setIsReviewNotesPanelOpen] = useState(true);
  const matrixScrollRef = React.useRef<HTMLDivElement>(null);
  const reviewScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = React.useRef(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { navigateWithContext } = useNavigationContext();

  // Get current user for permission checks
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!currentUserId
  });

  // Function to get source badge for lab results
  const getSourceBadge = (result: any) => {
    if (!result.sourceType || result.sourceType === 'lab_order') {
      return null; // Don't show badge for regular lab orders
    }

    const confidence = result.sourceConfidence ? 
      (typeof result.sourceConfidence === 'string' ? parseFloat(result.sourceConfidence) : result.sourceConfidence) : 0;
    const confidencePercent = Math.round(confidence * 100);
    
    if ((result.sourceType === 'attachment' || result.sourceType === 'attachment_extracted') && result.extractedFromAttachmentId) {
      const handleDocumentClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent cell click
        
        // Check if we're in encounter mode
        if (mode === 'encounter' && encounterId) {
          // Navigate within the encounter context
          navigateWithContext(
            `/patients/${patientId}/encounters/${encounterId}?section=attachments&highlight=${result.extractedFromAttachmentId}`,
            "labs",
            "encounter"
          );
        } else {
          // Regular navigation for patient chart mode
          navigateWithContext(
            `/patients/${patientId}/chart?section=attachments&highlight=${result.extractedFromAttachmentId}`, 
            "labs", 
            "patient-chart"
          );
        }
      };
      
      return (
        <span 
          className="inline-flex ml-1 text-[10px] px-1 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded cursor-pointer hover:bg-amber-200 transition-colors"
          onClick={handleDocumentClick}
          title={`Extracted from attachment with ${confidencePercent}% confidence`}
        >
          MR {confidencePercent}%
        </span>
      );
    }
    
    if (result.sourceType === 'provider_entered') {
      return (
        <span 
          className="inline-flex ml-1 text-[10px] px-1 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded"
          title="Manually entered by provider"
        >
          Manual
        </span>
      );
    }
    
    return null;
  };

  // Get staff members for assignment
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: isReviewPanelOpen
  });

  // GPT Review generation handler
  const handleGenerateGPTReview = async () => {
    if (selectedDates.size === 0 && selectedTestRows.size === 0 && selectedPanels.size === 0) {
      toast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select lab results to generate an AI review.",
      });
      return;
    }

    setIsGeneratingGPTReview(true);
    
    try {
      // Collect all selected result IDs (same logic as review button)
      const resultIds: number[] = [];
      
      if (selectedDates.size > 0) {
        selectedDates.forEach(selectedDisplayDate => {
          matrixData.forEach(test => {
            const matchingResults = test.results.filter(result => {
              const resultDisplayDate = format(new Date(result.date), 'MM/dd/yy');
              return resultDisplayDate === selectedDisplayDate;
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

      console.log(`🤖 [LabMatrix] Generating GPT review for ${resultIds.length} results:`, resultIds);

      const response = await fetch('/api/gpt-lab-review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId,
          resultIds: resultIds,
          encounterId: undefined // Will be determined by the service if needed
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate GPT review');
      }

      const result = await response.json();
      console.log('🤖 [LabMatrix] GPT review generated:', result);
      
      setGeneratedGPTReview(result.data.review);
      
      toast({
        title: "AI Review Generated",
        description: `GPT-4.1 has analyzed ${resultIds.length} lab results and generated clinical interpretations.`,
      });

    } catch (error: any) {
      console.error('🤖 [LabMatrix] GPT review generation error:', error);
      toast({
        variant: "destructive",
        title: "AI Review Failed",
        description: error.message || "Failed to generate AI review. Please try again.",
      });
    } finally {
      setIsGeneratingGPTReview(false);
    }
  };

  // Toggle edit mode for GPT review
  const toggleEditMode = (reviewId: number) => {
    if (editableReviewId === reviewId) {
      // Exit edit mode
      setEditableReviewId(null);
      setReviewSaveStatus('saved');
    } else {
      // Enter edit mode
      setEditableReviewId(reviewId);
      setEditableClinicalReview(generatedGPTReview?.clinicalReview || '');
      setEditablePatientMessage(generatedGPTReview?.patientMessage || '');
      setEditableNurseMessage(generatedGPTReview?.nurseMessage || '');
      setReviewSaveStatus('editing');
    }
  };

  // Debounced save function for GPT review edits
  const debouncedSaveReview = (field: string, value: string) => {
    setReviewSaveStatus('saving');
    
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/gpt-lab-review/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId: editableReviewId,
            [field]: value,
            revisionReason: 'Provider manual edit'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save review changes');
        }

        setReviewSaveStatus('saved');
        
        // Update the generatedGPTReview state to reflect changes
        setGeneratedGPTReview(prev => ({
          ...prev,
          [field]: value,
          status: 'revised'
        }));

      } catch (error) {
        console.error('Error saving review changes:', error);
        setReviewSaveStatus('editing');
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save review changes. Please try again.",
        });
      }
    }, 1000); // 1 second debounce
    
    setSaveTimer(timer);
  };

  // GPT Review approval handler
  const handleApproveGPTReview = async (reviewId: number) => {
    setIsApprovingGPTReview(true);
    
    try {
      const response = await fetch('/api/gpt-lab-review/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve GPT review');
      }

      // Update the review status
      setGeneratedGPTReview((prev: any) => ({
        ...prev,
        status: 'approved'
      }));
      
      toast({
        title: "AI Review Approved",
        description: "The AI-generated review has been approved and can now be sent to patients and nurses.",
      });

    } catch (error: any) {
      console.error('🤖 [LabMatrix] GPT review approval error:', error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message || "Failed to approve AI review. Please try again.",
      });
    } finally {
      setIsApprovingGPTReview(false);
    }
  };

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

  // Delete lab result mutation
  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      const response = await fetch(`/api/patients/${patientId}/lab-results/${resultId}`, {
        method: 'DELETE',
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

  // Permission check for unreview functionality
  const canUnreview = (result: any) => {
    if (!currentUserId) return false;
    // Allow unreview if:
    // 1. Current user reviewed it, OR
    // 2. Current user is the ordering provider, OR  
    // 3. Current user is admin/provider (role-based check would be ideal but not implemented here)
    return result.reviewedBy === currentUserId || result.orderedBy === currentUserId;
  };

  // Handlers for edit/delete
  const handleEditResult = (result: any) => {
    setEditingResult(result);
    setEditFormData({
      resultValue: result.resultValue || "",
      resultUnits: result.resultUnits || "",
      referenceRange: result.referenceRange || "",
      abnormalFlag: result.abnormalFlag || "normal",
      criticalFlag: result.criticalFlag || false,
      providerNotes: result.providerNotes || ""
    });
  };

  const handleDeleteResult = async (resultId: number) => {
    if (window.confirm('Are you sure you want to delete this lab result?')) {
      deleteLabResultMutation.mutate(resultId);
    }
  };

  const { data: labResults, isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const { data: labOrders, isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  // Fetch GPT lab review notes for this patient
  const { data: gptReviewNotesResponse } = useQuery({
    queryKey: [`/api/gpt-lab-review/patient/${patientId}`],
    enabled: !!patientId
  });
  
  // Extract data based on API response structure
  const gptReviewNotes = gptReviewNotesResponse?.data || [];

  const isLoading = resultsLoading || ordersLoading;

  const results = (labResults as any) || [];
  const orders = (labOrders as any) || [];
  
  useEffect(() => {
    console.log('🧪 [LabResultsMatrix] GPT Review Notes Response:', gptReviewNotesResponse);
    console.log('🧪 [LabResultsMatrix] GPT Review Notes Array:', gptReviewNotes);
    console.log('🧪 [LabResultsMatrix] Number of GPT Reviews:', gptReviewNotes.length);
    console.log('🧪 [LabResultsMatrix] Results:', results);
    console.log('🧪 [LabResultsMatrix] Number of Lab Results:', results.length);
  }, [gptReviewNotesResponse, gptReviewNotes, results]);

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
      // Safely handle date parsing - Use specimen collection date as primary grouping
      let resultDate = result.specimenCollectedAt || result.resultAvailableAt;
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
        requisitionNumber: result.requisitionNumber,
        // Add source tracking fields for badge display
        sourceType: result.sourceType,
        sourceConfidence: result.sourceConfidence,
        extractedFromAttachmentId: result.extractedFromAttachmentId
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

  // Create grouped data by panel for panel selection
  const groupedData = useMemo(() => {
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

    return groups;
  }, [matrixData, labPanels]);

  // Create flat list of tests organized by panel but displayed as flat rows
  const flatTestData = useMemo(() => {
    // Create flat list with panel headers
    const flatList: Array<{ type: 'panel', name: string } | { type: 'test', data: MatrixData, panel: string }> = [];
    
    const panelOrder = ['CBC', 'CMP', 'Lipid Panel', 'Thyroid Function', 'HbA1c', 'Other'];
    panelOrder.forEach(panelName => {
      if (groupedData[panelName] && groupedData[panelName].length > 0) {
        flatList.push({ type: 'panel', name: panelName });
        groupedData[panelName].forEach(test => {
          flatList.push({ type: 'test', data: test, panel: panelName });
        });
      }
    });

    return flatList;
  }, [groupedData]);

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
        const dateKey = format(new Date(result.date), 'MM/dd/yy');
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
          const resultDateKey = format(new Date(result.date), 'MM/dd/yy');
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
    const displayDate = format(new Date(date), 'MM/dd/yy');
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
            const resultDisplayDate = format(new Date(result.date), 'MM/dd/yy');
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
      classes += " bg-navy-blue-200 text-navy-blue-900 border-navy-blue-400";
    } else if (isHovered) {
      classes += " bg-navy-blue-100 border-navy-blue-200";
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
      classes += " bg-navy-blue-200 text-navy-blue-900 border-l-blue-500 font-medium";
    } else if (isHovered) {
      classes += " bg-navy-blue-100 border-l-blue-300";
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
    if (abnormalFlag === 'L') return 'bg-navy-blue-100 text-navy-blue-800';
    return 'bg-gray-50 text-gray-700'; // Normal unreviewed state
  };

  // Group GPT reviews by specimen collection date for the Review Notes Panel
  // Must be before any early returns to follow React hooks rules
  const reviewsByDate = useMemo(() => {
    const grouped = new Map<string, Array<{
      id: number;
      clinicalReview: string;
      patientMessage: string;
      nurseMessage: string;
      patientMessageSentAt?: string | null;
      nurseMessageSentAt?: string | null;
      conversationReview?: string | null;
      conversationReviewGeneratedAt?: string | null;
      conversationClosed?: boolean;
      generatedAt: string;
    }>>();
    
    gptReviewNotes.forEach((review: any) => {
      // Get specimen collection dates for the lab results in this review
      // Handle both single value and array formats for resultIds
      const reviewResults = results.filter((r: any) => {
        if (Array.isArray(review.resultIds)) {
          return review.resultIds.includes(r.id);
        } else if (review.resultIds) {
          return review.resultIds === r.id;
        }
        return false;
      });
      
      reviewResults.forEach((result: any) => {
        const date = result.specimenCollectedAt || result.resultAvailableAt;
        if (date) {
          const dateKey = format(new Date(date), 'MM/dd/yy');
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
          }
          // Avoid duplicates
          const exists = grouped.get(dateKey)?.some(r => r.id === review.id);
          if (!exists) {
            grouped.get(dateKey)?.push({
              ...review,
              result,
              fullDate: date
            });
          }
        }
      });
    });
    
    // Sort by date descending (most recent first)
    return new Map([...grouped.entries()].sort((a, b) => 
      new Date(b[1][0].fullDate).getTime() - new Date(a[1][0].fullDate).getTime()
    ));
  }, [gptReviewNotes, results]);
  
  const toggleReviewExpanded = (reviewKey: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewKey)) {
      newExpanded.delete(reviewKey);
    } else {
      newExpanded.add(reviewKey);
    }
    setExpandedReviews(newExpanded);
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
    <>
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
        <div className="lab-matrix-wrapper">
          {/* Fixed header */}
          <div className="lab-matrix-header">
            <div 
              className="lab-matrix-header-scroll"
              ref={(el) => {
                if (el) {
                  // Sync with body scroll
                  const bodyEl = el.parentElement?.nextElementSibling?.querySelector('.lab-matrix-body');
                  if (bodyEl) {
                    bodyEl.addEventListener('scroll', () => {
                      el.scrollLeft = bodyEl.scrollLeft;
                    });
                  }
                }
              }}
            >
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-semibold min-w-[200px] lab-matrix-sticky-col bg-gray-50 border-r border-gray-300">
                      Test
                    </th>
                    {displayColumns.map((dateCol, index) => (
                      <th 
                        key={`header-${index}`} 
                        data-matrix-date={dateCol.displayDate}
                        className="text-center p-3 font-semibold border-r border-gray-300 min-w-[120px] cursor-pointer hover:bg-gray-100 bg-gray-50"
                        onClick={(e) => handleDateClick(dateCol.date, e.shiftKey)}
                        onMouseEnter={() => setHoveredDate(dateCol.date)}
                        onMouseLeave={() => setHoveredDate(null)}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-sm font-medium">{format(new Date(dateCol.date), 'MM/dd/yy')}</span>
                          <span className="text-xs text-gray-600">{format(new Date(dateCol.date), 'HH:mm')}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          </div>

          {/* Scrollable body */}
          <div 
            ref={matrixScrollRef}
            className="lab-matrix-body matrix-scroll-container"
            onScroll={(e) => {
              // Sync header horizontal scroll
              const headerEl = e.currentTarget.previousElementSibling?.querySelector('.lab-matrix-header-scroll');
              if (headerEl) {
                headerEl.scrollLeft = e.currentTarget.scrollLeft;
              }

              if (reviewScrollRef.current && !isScrollingSyncRef.current) {
                isScrollingSyncRef.current = true;
                
                // Find which date column is currently visible
                const scrollLeft = e.currentTarget.scrollLeft;
                const containerRect = e.currentTarget.getBoundingClientRect();
                
                // Find the column that's currently visible (accounting for sticky column)
                const headers = e.currentTarget.querySelectorAll('[data-matrix-date]');
                let visibleDate = '';
                
                headers.forEach((header) => {
                  const rect = header.getBoundingClientRect();
                  // Check if this header is in the visible area (accounting for sticky column width)
                  if (rect.left >= containerRect.left + 200 && rect.left <= containerRect.left + 400) {
                    visibleDate = header.getAttribute('data-matrix-date') || '';
                  }
                });
                
                if (visibleDate) {
                  // Scroll review panel to corresponding date
                  const reviewElements = reviewScrollRef.current.querySelectorAll('[data-review-date]');
                  reviewElements.forEach((element) => {
                    if (element.getAttribute('data-review-date') === visibleDate) {
                      element.scrollIntoView({ behavior: 'auto', block: 'start' });
                    }
                  });
                }
                
                // Reset flag after a delay
                setTimeout(() => {
                  isScrollingSyncRef.current = false;
                }, 300);
              }
            }}
          >
            <table className="w-full border-collapse text-sm">
              <tbody>
              {flatTestData.map((item, index) => {
                if (item.type === 'panel') {
                  // Panel header row - always visible
                  return (
                    <tr key={`panel-${item.name}`} className="border-b-2 border-gray-300 bg-gray-100">
                      <td className="p-3 lab-matrix-sticky-col bg-gray-100 font-bold text-sm border-r border-gray-300">
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
                      className={`border-b hover:bg-muted/20 ${isTestSelected ? 'bg-navy-blue-50' : ''}`}
                    >
                      <td 
                        className="p-3 lab-matrix-sticky-col bg-white border-r border-gray-200 cursor-pointer transition-colors"
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
                          const resultDateKey = format(new Date(r.date), 'MM/dd/yy');
                          return resultDateKey === dateCol.displayDate;
                        });
                        const isDateSelected = selectedDates.has(dateCol.displayDate);
                        
                        let cellClass = "p-3 text-center border-r border-gray-200 transition-colors";
                        if (isDateSelected) {
                          cellClass += " bg-navy-blue-50 border-2 border-navy-blue-200";
                        }
                        
                        return (
                          <td key={`test-${index}`} className={cellClass}>
                            {result ? (
                              <div className="relative group">
                                <div 
                                  className={`px-2 py-1 rounded text-sm font-medium transition-all ${
                                    result.isPending 
                                      ? 'bg-navy-blue-100 text-navy-blue-800 border border-navy-blue-300' 
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
                                  {getSourceBadge(result)}
                                  {result.isPending && (
                                    <span className="inline-block w-2 h-2 bg-navy-blue-500 rounded-full ml-1 animate-pulse" />
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
                                {!result.isPending && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditResult(result)}>
                                        <Edit className="h-3 w-3 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-700"
                                        onClick={() => handleDeleteResult(result.id)}
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                          const resultDisplayDate = format(new Date(result.date), 'MM/dd/yy');
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
                className="bg-navy-blue-600 hover:bg-navy-blue-700 text-white"
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
                    <FileText className="h-4 w-4 text-navy-blue-600" />
                    <span className="font-medium text-navy-blue-800">Review Selected Lab Results</span>
                    <Badge variant="secondary">
                      {(() => {
                        let totalResults = 0;
                        
                        if (selectedDates.size > 0) {
                          selectedDates.forEach(selectedDisplayDate => {
                            matrixData.forEach(test => {
                              const matchingResults = test.results.filter(result => {
                                const resultDisplayDate = format(new Date(result.date), 'MM/dd/yy');
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

                  {/* GPT Lab Review Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                        <Label className="font-medium text-navy-blue-800">AI-Powered Lab Review</Label>
                        <Badge variant="secondary" className="text-xs">GPT-4.1</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateGPTReview}
                        disabled={isGeneratingGPTReview}
                        className="flex items-center gap-2 border-navy-blue-200 text-navy-blue-700 hover:bg-navy-blue-50"
                      >
                        {isGeneratingGPTReview ? (
                          <>
                            <div className="w-3 h-3 border-2 border-navy-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="text-lg">🤖</span>
                            Generate AI Review
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {generatedGPTReview && (
                      <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-navy-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🤖</span>
                            <span className="font-medium text-navy-blue-800">AI Clinical Review</span>
                            <Badge variant="outline" className="text-xs">{generatedGPTReview.status}</Badge>
                            {editableReviewId === generatedGPTReview.id && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                {reviewSaveStatus === 'saving' ? 'Saving...' : reviewSaveStatus === 'saved' ? 'Saved' : 'Editing'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500">
                              Generated in {generatedGPTReview.processingTime}ms • {generatedGPTReview.tokensUsed} tokens
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEditMode(generatedGPTReview.id)}
                              className="text-xs"
                            >
                              {editableReviewId === generatedGPTReview.id ? 'Exit Edit' : 'Edit Review'}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Clinical Interpretation */}
                          <div className="p-3 bg-white border border-navy-blue-200 rounded">
                            <Label className="text-sm font-medium text-navy-blue-700 mb-2 block">Clinical Interpretation</Label>
                            {editableReviewId === generatedGPTReview.id ? (
                              <Textarea
                                value={editableClinicalReview}
                                onChange={(e) => {
                                  setEditableClinicalReview(e.target.value);
                                  debouncedSaveReview('clinicalReview', e.target.value);
                                }}
                                className="text-sm min-h-[60px] resize-none"
                                placeholder="Enter clinical interpretation..."
                              />
                            ) : (
                              <p className="text-sm text-gray-700">{generatedGPTReview.clinicalReview}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Patient Message */}
                            <div className="p-3 bg-white border border-green-200 rounded">
                              <Label className="text-sm font-medium text-green-700 mb-2 block">Patient Message</Label>
                              {editableReviewId === generatedGPTReview.id ? (
                                <Textarea
                                  value={editablePatientMessage}
                                  onChange={(e) => {
                                    setEditablePatientMessage(e.target.value);
                                    debouncedSaveReview('patientMessage', e.target.value);
                                  }}
                                  className="text-sm min-h-[80px] resize-none"
                                  placeholder="Enter patient message..."
                                />
                              ) : (
                                <p className="text-sm text-gray-700">{generatedGPTReview.patientMessage}</p>
                              )}
                            </div>
                            
                            {/* Nurse Message */}
                            <div className="p-3 bg-white border border-orange-200 rounded">
                              <Label className="text-sm font-medium text-orange-700 mb-2 block">Nurse Message</Label>
                              {editableReviewId === generatedGPTReview.id ? (
                                <Textarea
                                  value={editableNurseMessage}
                                  onChange={(e) => {
                                    setEditableNurseMessage(e.target.value);
                                    debouncedSaveReview('nurseMessage', e.target.value);
                                  }}
                                  className="text-sm min-h-[80px] resize-none"
                                  placeholder="Enter nurse message..."
                                />
                              ) : (
                                <p className="text-sm text-gray-700">{generatedGPTReview.nurseMessage}</p>
                              )}
                            </div>
                          </div>
                          
                        
                        <div className="flex justify-between items-center pt-3 border-t border-navy-blue-200">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {generatedGPTReview.status === 'revised' && (
                              <span>Last edited by provider</span>
                            )}
                            {editableReviewId === generatedGPTReview.id && reviewSaveStatus === 'saved' && (
                              <span className="text-green-600">Changes saved automatically</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-navy-blue-600 hover:bg-navy-blue-700 text-white"
                              onClick={() => handleApproveGPTReview(generatedGPTReview.id)}
                              disabled={isApprovingGPTReview}
                            >
                              {isApprovingGPTReview ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Approving...
                                </>
                              ) : (
                                'Approve & Send'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGeneratedGPTReview(null)}
                              className="text-gray-600"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                        </div>
                      </div>
                    )}
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
                                    const resultDisplayDate = format(new Date(result.date), 'MM/dd/yy');
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
                          className="bg-navy-blue-600 hover:bg-navy-blue-700 text-white"
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

    {/* Phase 2: Review Notes Panel with GPT Summaries */}
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Review Notes (Patient Communications)</CardTitle>
          <Badge variant="outline" className="text-xs">
            Phase 2: Conversation Reviews
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={reviewScrollRef}
          className="max-h-[400px] overflow-y-auto p-4 review-scroll-container"
          onScroll={(e) => {
            // Sync scroll from review notes to matrix
            if (!isScrollingSyncRef.current) {
              isScrollingSyncRef.current = true;
              
              const reviewContainer = e.currentTarget;
              const matrixContainer = matrixScrollRef.current;
              if (!matrixContainer) {
                isScrollingSyncRef.current = false;
                return;
              }
              
              // Find which date section is currently visible
              const dateElements = reviewContainer.querySelectorAll('[data-review-date]');
              let visibleDate = '';
              
              dateElements.forEach((element) => {
                const rect = element.getBoundingClientRect();
                const containerRect = reviewContainer.getBoundingClientRect();
                if (rect.top >= containerRect.top && rect.top <= containerRect.top + 100) {
                  visibleDate = element.getAttribute('data-review-date') || '';
                }
              });
              
              if (visibleDate) {
                // Find corresponding column in matrix
                const matrixHeaders = matrixContainer.querySelectorAll('[data-matrix-date]');
                matrixHeaders.forEach((header) => {
                  if (header.getAttribute('data-matrix-date') === visibleDate) {
                    const headerRect = header.getBoundingClientRect();
                    const matrixRect = matrixContainer.getBoundingClientRect();
                    const scrollLeft = header.parentElement?.offsetLeft || 0;
                    matrixContainer.scrollLeft = scrollLeft - 200; // Offset to account for sticky column
                  }
                });
              }
              
              // Reset flag after a delay
              setTimeout(() => {
                isScrollingSyncRef.current = false;
              }, 300);
            }
          }}
        >
          <div className="space-y-3">
            {reviewsByDate.size === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No review communications found for these lab results.</p>
            </div>
          ) : (
            Array.from(reviewsByDate.entries()).map(([dateKey, dateReviews]) => {
              // Get the most recent review for this date to show conversation summary
              const latestReview = dateReviews.reduce((latest, current) => {
                const latestTime = latest.conversationReviewGeneratedAt || latest.generatedAt;
                const currentTime = current.conversationReviewGeneratedAt || current.generatedAt;
                return new Date(currentTime) > new Date(latestTime) ? current : latest;
              });
              
              const reviewKey = `${dateKey}-${latestReview.id}`;
              const isReviewExpanded = expandedReviews.has(reviewKey);
              
              return (
                <div key={dateKey} data-review-date={dateKey} className="border-b pb-3 last:border-b-0">
                  {/* Date Row with Conversation Review */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{dateKey}</span>
                        {latestReview.conversationClosed && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </div>
                      
                      {/* Conversation Review Summary */}
                      <div className="text-sm text-gray-600">
                        {latestReview.conversationReview ? (
                          <div>{latestReview.conversationReview}</div>
                        ) : (
                          <button 
                            onClick={() => toggleReviewExpanded(reviewKey)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                              Review In Progress
                            </Badge>
                            <span className="text-xs">
                              {dateReviews.length} lab result{dateReviews.length > 1 ? 's' : ''} - click to view communications
                            </span>
                          </button>
                        )}
                      </div>
                      
                      {/* Expand button for full timeline */}
                      <button
                        onClick={() => toggleReviewExpanded(reviewKey)}
                        className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {isReviewExpanded ? 'Hide' : 'Expand'} full timeline
                        <ChevronDown className={`h-3 w-3 transition-transform ${
                          isReviewExpanded ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {/* Expanded Timeline */}
                      {isReviewExpanded && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                          {dateReviews.map((review, idx) => (
                            <div key={`${review.id}-${idx}`} className="relative">
                              {/* Timeline dot */}
                              <div className="absolute -left-[21px] top-1 w-3 h-3 bg-white border-2 border-gray-400 rounded-full"></div>
                              
                              {/* Timeline content */}
                              <div className="space-y-2">
                                {/* Provider Review */}
                                <div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <User className="h-3 w-3" />
                                    <span>Provider Review</span>
                                    <span>•</span>
                                    <span>{format(new Date(review.generatedAt), 'h:mm a')}</span>
                                  </div>
                                  <p className="text-sm text-gray-700">{review.clinicalReview}</p>
                                </div>
                                
                                {/* Patient Message */}
                                {review.patientMessage && (
                                  <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                      <Mail className="h-3 w-3" />
                                      <span>Patient Message</span>
                                      {review.patientMessageSentAt && (
                                        <>
                                          <span>•</span>
                                          <span>Sent {format(new Date(review.patientMessageSentAt), 'h:mm a')}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700">{review.patientMessage}</p>
                                  </div>
                                )}
                                
                                {/* Nurse Message */}
                                {review.nurseMessage && (
                                  <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                      <Phone className="h-3 w-3" />
                                      <span>Nurse Notes</span>
                                      {review.nurseMessageSentAt && (
                                        <>
                                          <span>•</span>
                                          <span>{format(new Date(review.nurseMessageSentAt), 'h:mm a')}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700">{review.nurseMessage}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Edit Lab Result Dialog */}
    <Dialog open={!!editingResult} onOpenChange={(open) => !open && setEditingResult(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lab Result</DialogTitle>
          <DialogDescription>
            Modify the lab result values. User-entered values will be marked with a badge.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resultValue">Result Value</Label>
            <Input
              id="resultValue"
              value={editFormData.resultValue}
              onChange={(e) => setEditFormData(prev => ({ ...prev, resultValue: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resultUnits">Units</Label>
            <Input
              id="resultUnits"
              value={editFormData.resultUnits}
              onChange={(e) => setEditFormData(prev => ({ ...prev, resultUnits: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceRange">Reference Range</Label>
            <Input
              id="referenceRange"
              value={editFormData.referenceRange}
              onChange={(e) => setEditFormData(prev => ({ ...prev, referenceRange: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abnormalFlag">Abnormal Flag</Label>
            <Select
              value={editFormData.abnormalFlag}
              onValueChange={(value) => setEditFormData(prev => ({ ...prev, abnormalFlag: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="L">Low</SelectItem>
                <SelectItem value="H">High</SelectItem>
                <SelectItem value="LL">Critical Low</SelectItem>
                <SelectItem value="HH">Critical High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="criticalFlag"
              checked={editFormData.criticalFlag}
              onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, criticalFlag: !!checked }))}
            />
            <Label htmlFor="criticalFlag">Critical Result</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="providerNotes">Provider Notes</Label>
            <Textarea
              id="providerNotes"
              value={editFormData.providerNotes}
              onChange={(e) => setEditFormData(prev => ({ ...prev, providerNotes: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingResult(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingResult) {
                  // Convert "normal" back to empty string for database
                  const updates = {
                    ...editFormData,
                    abnormalFlag: editFormData.abnormalFlag === "normal" ? "" : editFormData.abnormalFlag
                  };
                  updateLabResultMutation.mutate({ 
                    resultId: editingResult.id, 
                    updates 
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}