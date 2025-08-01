import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Edit3, Save, X, Plus, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Comment {
  id: string;
  position: number;
  selectedText?: string;
  content: string;
  type: 'insertion' | 'selection';
}

interface TwoPhaseTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: {
    templateName?: string;
    displayName?: string;
    baseNoteType?: string;
    baseNoteText?: string;
    inlineComments?: Comment[];
  };
  onSave: (templateData: any) => void;
}

const NOTE_TYPES = [
  { value: 'soap', label: 'SOAP Note' },
  { value: 'soapNarrative', label: 'SOAP (Narrative)' },
  { value: 'soapPsychiatric', label: 'SOAP (Psychiatric)' },
  { value: 'soapObGyn', label: 'SOAP (OB/GYN)' },
  { value: 'soapPediatric', label: 'SOAP (Peds)' },
  { value: 'progress', label: 'Progress Note' },
  { value: 'hAndP', label: 'History & Physical' },
  { value: 'apso', label: 'APSO Note' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'procedure', label: 'Procedure Note' }
];

export function TwoPhaseTemplateEditor({
  isOpen,
  onClose,
  mode,
  initialData,
  onSave
}: TwoPhaseTemplateEditorProps) {
  // Phase 1 State
  const [templateName, setTemplateName] = useState(initialData?.templateName || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [baseNoteType, setBaseNoteType] = useState(initialData?.baseNoteType || '');
  const [noteText, setNoteText] = useState(initialData?.baseNoteText || '');
  const [phase1Saved, setPhase1Saved] = useState(!!initialData?.baseNoteText);
  
  // Phase 2 State
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [comments, setComments] = useState<Comment[]>(initialData?.inlineComments || []);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newCommentType, setNewCommentType] = useState<'insertion' | 'selection'>('insertion');
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [indicatorPositions, setIndicatorPositions] = useState<Array<{id: string, left: number, top: number}>>([]);

  // Update indicator positions when comments or noteText change
  useEffect(() => {
    if (!textareaRef.current || !phase1Saved || comments.length === 0) {
      setIndicatorPositions([]);
      return;
    }

    const updatePositions = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const computedStyle = window.getComputedStyle(textarea);
      const fontSize = parseFloat(computedStyle.fontSize);
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2;
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      
      const newPositions = comments.map(comment => {
        const textBeforePosition = noteText.substring(0, comment.position);
        const lines = textBeforePosition.split('\n');
        const lineNumber = lines.length - 1;
        const charPositionInLine = lines[lineNumber].length;
        
        const lineText = lines[lineNumber];
        const textWidth = context.measureText(lineText.substring(0, charPositionInLine)).width;
        
        const top = paddingTop + (lineNumber * lineHeight) + 4;
        const left = paddingLeft + textWidth + 4;
        
        return { id: comment.id, left, top };
      });
      
      setIndicatorPositions(newPositions);
    };

    // Use requestAnimationFrame to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(updatePositions);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [comments, noteText, phase1Saved]);

  const handlePhase1Save = () => {
    if (!templateName || !displayName || !baseNoteType || !noteText) {
      alert('Please fill in all required fields');
      return;
    }
    setPhase1Saved(true);
    console.log('✅ Phase 1 saved - template data locked');
  };

  const handleEditPhase1 = () => {
    setCurrentPhase(1);
    setPhase1Saved(false);
    console.log('📝 Editing Phase 1 - returning to note writing mode');
  };

  const handleTextSelection = useCallback(() => {
    console.log('🔍 [TwoPhaseEditor] Text selection triggered');
    if (!textareaRef.current) {
      console.log('❌ [TwoPhaseEditor] No textarea ref available');
      return;
    }
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);
    
    console.log('🔍 [TwoPhaseEditor] Selection details:', { start, end, text, length: text.length });
    
    if (text.length > 0) {
      console.log('✅ [TwoPhaseEditor] Valid text selection found, opening dialog');
      setSelectedText(text);
      setSelectionStart(start);
      setSelectionEnd(end);
      setNewCommentType('selection');
      setShowCommentDialog(true);
    } else {
      console.log('❌ [TwoPhaseEditor] No text selected or empty selection');
    }
  }, []);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    console.log('🔍 [TwoPhaseEditor] Overlay click triggered');
    console.log('🔍 [TwoPhaseEditor] Phase1Saved:', phase1Saved);
    console.log('🔍 [TwoPhaseEditor] TextareaRef available:', !!textareaRef.current);
    
    if (!textareaRef.current || !phase1Saved) {
      console.log('❌ [TwoPhaseEditor] Click blocked - textarea unavailable or phase 1 not saved');
      return;
    }

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Account for scroll position within the textarea
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    // Calculate coordinates relative to the textarea content, not just the viewport
    const x = event.clientX - rect.left + scrollLeft;
    const y = event.clientY - rect.top + scrollTop;
    
    console.log('🔍 [TwoPhaseEditor] Click position calculation:', { 
      screenCoords: { clientX: event.clientX, clientY: event.clientY },
      textareaRect: rect,
      scrollPosition: { scrollTop, scrollLeft },
      viewportRelative: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      contentRelative: { x, y }
    });
    
    // Use accurate position calculation by temporarily setting focus and using browser APIs
    textarea.focus();
    
    // Get computed styles for accurate measurements
    const computedStyle = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computedStyle.fontSize);
    const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2;
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    
    // Adjust for padding
    const adjustedX = Math.max(0, x - paddingLeft);
    const adjustedY = Math.max(0, y - paddingTop);
    
    // Calculate line number
    const lineNumber = Math.floor(adjustedY / lineHeight);
    
    // Create a temporary canvas to measure text width accurately
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      
      const lines = noteText.split('\n');
      let position = 0;
      
      // Add character positions for lines before the clicked line
      for (let i = 0; i < lineNumber && i < lines.length; i++) {
        position += lines[i].length + 1; // +1 for newline
      }
      
      // For the clicked line, find the character position
      if (lineNumber < lines.length) {
        const lineText = lines[lineNumber];
        let charPosition = 0;
        let currentWidth = 0;
        
        // Measure character by character to find closest position to click
        for (let i = 0; i < lineText.length; i++) {
          const charWidth = context.measureText(lineText[i]).width;
          if (currentWidth + charWidth / 2 > adjustedX) {
            break;
          }
          currentWidth += charWidth;
          charPosition++;
        }
        
        position += Math.min(charPosition, lineText.length);
      }
      
      console.log('🔍 [TwoPhaseEditor] Click position calculation:', {
        lineNumber,
        calculatedPosition: position,
        adjustedX,
        adjustedY,
        clickedLine: lines[lineNumber] || 'NO_LINE',
        totalLines: lines.length,
        noteTextLength: noteText.length,
        textAtPosition: noteText.substring(Math.max(0, position - 10), position + 10),
        charAtPosition: noteText[position] || 'END',
        firstFewLines: lines.slice(0, 3),
        positionDebugCheck: {
          char_at_0: noteText[0],
          char_at_10: noteText[10],
          char_at_50: noteText[50]
        }
      });
      
      setSelectionStart(position);
      setSelectionEnd(position);
      setSelectedText('');
      setNewCommentType('insertion');
      setShowCommentDialog(true);
    } else {
      // Fallback to old method if canvas not available
      const lines = noteText.split('\n');
      let position = 0;
      for (let i = 0; i < lineNumber && i < lines.length; i++) {
        position += lines[i].length + 1;
      }
      if (lineNumber < lines.length) {
        const estimatedChar = Math.floor(adjustedX / (fontSize * 0.6)); // Rough character width
        position += Math.min(estimatedChar, lines[lineNumber].length);
      }
      
      setSelectionStart(position);
      setSelectionEnd(position);
      setSelectedText('');
      setNewCommentType('insertion');
      setShowCommentDialog(true);
    }
  }, [noteText, phase1Saved]);

  const addComment = () => {
    if (!newCommentContent.trim()) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      position: newCommentType === 'selection' ? selectionStart : selectionStart,
      selectedText: newCommentType === 'selection' ? selectedText : undefined,
      content: newCommentContent,
      type: newCommentType
    };
    
    console.log('💬 [AddComment] Creating comment with details:', {
      content: newComment.content,
      storedPosition: newComment.position,
      selectionStart,
      selectionEnd,
      textAtPosition: noteText.substring(newComment.position - 5, newComment.position + 5),
      charAtPosition: noteText[newComment.position] || 'END',
      noteTextLength: noteText.length
    });
    
    setComments(prev => [...prev, newComment]);
    setShowCommentDialog(false);
    setNewCommentContent('');
  };

  const removeComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    console.log('🗑️ Removed comment:', commentId);
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const saveEditedComment = () => {
    if (!editingCommentId || !editingCommentContent.trim()) return;
    
    setComments(prev => prev.map(comment => 
      comment.id === editingCommentId 
        ? { ...comment, content: editingCommentContent.trim() }
        : comment
    ));
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const renderHighlightedText = () => {
    if (!noteText) return null;
    
    let processedText = noteText;
    let textSegments: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Sort comments by position to process them in order
    const sortedComments = [...comments].sort((a, b) => a.position - b.position);
    
    sortedComments.forEach(comment => {
      if (comment.selectedText) {
        // Find the selected text in the note
        const textIndex = processedText.indexOf(comment.selectedText, lastIndex);
        if (textIndex !== -1) {
          // Add text before the highlight
          if (textIndex > lastIndex) {
            textSegments.push(processedText.slice(lastIndex, textIndex));
          }
          
          // Add highlighted text with hover effects
          textSegments.push(
            <span
              key={comment.id}
              className={`inline-block px-1 py-0.5 rounded cursor-pointer transition-all duration-200 ${
                hoveredCommentId === comment.id 
                  ? 'bg-yellow-300 shadow-md' 
                  : 'bg-navy-blue-200 hover:bg-navy-blue-300'
              }`}
              onMouseEnter={() => setHoveredCommentId(comment.id)}
              onMouseLeave={() => setHoveredCommentId(null)}
              onClick={() => startEditingComment(comment)}
              title={`AI Instruction: ${comment.content} (Click to edit)`}
            >
              {comment.selectedText}
            </span>
          );
          
          lastIndex = textIndex + comment.selectedText.length;
        }
      }
    });
    
    // Add remaining text
    if (lastIndex < processedText.length) {
      textSegments.push(processedText.slice(lastIndex));
    }
    
    return (
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {textSegments}
      </div>
    );
  };

  const getCommentIndicators = () => {
    return indicatorPositions.map(position => {
      const comment = comments.find(c => c.id === position.id);
      if (!comment) return null;
      
      return (
        <div
          key={comment.id}
          className="absolute w-3 h-3 bg-navy-blue-500 rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-navy-blue-600 z-10 transition-all duration-200"
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`
          }}
          title={`AI Instruction: ${comment.content} (Click to edit)`}
          onClick={(e) => {
            e.stopPropagation();
            startEditingComment(comment);
          }}
        />
      );
    }).filter(Boolean);
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    
    try {
      // Simulate progress steps for sophisticated animation
      setSaveProgress(25);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const templateData = {
        templateName,
        displayName,
        baseNoteType,
        baseNoteText: noteText,
        inlineComments: comments,
        hasComments: comments.length > 0,
        // The exampleNote will be the processed version with {{}} comments
        exampleNote: generateFinalTemplate()
      };
      
      setSaveProgress(50);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSaveProgress(75);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await onSave(templateData);
      
      setSaveProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🎉 Final template saved with', comments.length, 'comments');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  const generateFinalTemplate = () => {
    // SIMPLE APPROACH: Use the original stored positions which were calculated correctly
    console.log('🔧 [GenerateFinalTemplate] Using original stored positions');
    
    // Sort comments by position in descending order to avoid position shifts
    const sortedComments = [...comments].sort((a, b) => b.position - a.position);
    
    let processedText = noteText;
    
    console.log('🔧 [GenerateFinalTemplate] Processing', sortedComments.length, 'comments');
    console.log('🔧 [GenerateFinalTemplate] Original text length:', noteText.length);
    
    for (const comment of sortedComments) {
      if (comment.type === 'insertion') {
        console.log('🔧 [GenerateFinalTemplate] Processing comment:', {
          content: comment.content,
          storedPosition: comment.position,
          textAtPosition: processedText.substring(comment.position - 5, comment.position + 5),
          charAtPosition: processedText[comment.position] || 'END'
        });
        
        // Use the exact stored position
        const beforeText = processedText.slice(0, comment.position);
        const afterText = processedText.slice(comment.position);
        
        // Add appropriate spacing
        const needsSpaceBefore = beforeText.length > 0 && !beforeText.endsWith(' ') && !beforeText.endsWith('\n');
        const needsSpaceAfter = afterText.length > 0 && !afterText.startsWith(' ') && !afterText.startsWith('\n');
        
        const spaceBefore = needsSpaceBefore ? ' ' : '';
        const spaceAfter = needsSpaceAfter ? ' ' : '';
        
        processedText = `${beforeText}${spaceBefore}{{${comment.content}}}${spaceAfter}${afterText}`;
        
        console.log('🔧 [GenerateFinalTemplate] Inserted', comment.content, 'at original position', comment.position);
      } else if (comment.type === 'selection' && comment.selectedText) {
        // Handle selection-based comments
        const commentedText = `${comment.selectedText} {{${comment.content}}}`;
        processedText = processedText.replace(comment.selectedText, commentedText);
      }
    }
    
    console.log('📝 Final template generated');
    return processedText;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Custom Template' : 'Edit Template'} - 
            Phase {currentPhase}: {currentPhase === 1 ? 'Write Your Ideal Note' : 'Add AI Instructions'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Phase 1: Template Info & Note Writing */}
          {currentPhase === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Phase 1: Template Setup & Note Writing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., SOAP-DrSmith"
                      disabled={phase1Saved}
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., Dr. Smith's SOAP Template"
                      disabled={phase1Saved}
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseNoteType">Base Note Type *</Label>
                    <Select value={baseNoteType} onValueChange={setBaseNoteType} disabled={phase1Saved}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select note type" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="noteText">Example Note (Write your ideal note) *</Label>
                  <div className="text-sm text-gray-600 mb-2">
                    Write your perfect example note exactly how you prefer it. Don't include any AI instructions yet - that's Phase 2.
                  </div>
                  <Textarea
                    id="noteText"
                    ref={textareaRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write your ideal note here..."
                    className="min-h-[300px] font-mono"
                    disabled={phase1Saved}
                  />
                </div>

                <div className="flex gap-2">
                  {!phase1Saved ? (
                    <Button onClick={handlePhase1Save} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Phase 1 & Continue to Comments
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setCurrentPhase(2)} className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Add AI Instructions (Phase 2)
                      </Button>
                      <Button onClick={handleEditPhase1} variant="outline" className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit Note Text
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 2: Interactive Comment Layer */}
          {currentPhase === 2 && phase1Saved && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Phase 2: Add AI Instructions
                  <Badge variant="secondary">{comments.length} comments</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 bg-navy-blue-50 p-3 rounded-lg">
                  <strong>Instructions:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• <strong>Select text</strong> to add instructions about that specific content</li>
                    <li>• <strong>Click anywhere</strong> to add general instructions at that position</li>
                    <li>• Comments appear as blue dots - hover to see content</li>
                    <li>• These instructions will guide AI note generation</li>
                  </ul>
                </div>

                {/* Collapsible Note Text Area */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Note Text - Click to Add AI Instructions
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
                        className="h-8 w-8 p-0"
                      >
                        {isTextareaExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="relative">
                      <div 
                        className={`${
                          isTextareaExpanded ? 'min-h-[400px] max-h-[600px]' : 'min-h-[150px] max-h-[200px]'
                        } overflow-y-auto p-3 bg-gray-50 border rounded-md relative cursor-text transition-all duration-200`}
                      >
                        {/* Hidden textarea for text selection functionality */}
                        <Textarea
                          ref={textareaRef}
                          value={noteText}
                          readOnly
                          className="absolute inset-0 opacity-0 pointer-events-auto resize-none"
                          onMouseUp={handleTextSelection}
                          onClick={handleOverlayClick}
                        />
                        
                        {/* Visible highlighted text */}
                        <div className="relative z-10 pointer-events-none">
                          {renderHighlightedText()}
                        </div>
                        
                        {/* Blue dot indicators for insertion comments */}
                        <div className="absolute inset-0 pointer-events-none">
                          {getCommentIndicators()}
                        </div>
                      </div>
                      
                      {/* Instructions for users */}
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                        <span>• Select text to add AI instruction for that specific content</span>
                        <span>• Click anywhere to add general instruction at that position</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
                          className="ml-auto text-xs"
                        >
                          {isTextareaExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Expand
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments List */}
                {comments.length > 0 && (
                  <div className="space-y-3">
                    <Label>AI Instructions ({comments.length}):</Label>
                    {comments.map(comment => (
                      <div 
                        key={comment.id} 
                        className={`flex items-start gap-3 p-3 rounded border transition-all duration-200 cursor-pointer ${
                          hoveredCommentId === comment.id 
                            ? 'bg-yellow-50 border-yellow-300 shadow-md' 
                            : 'bg-navy-blue-50 border-navy-blue-200 hover:bg-navy-blue-100'
                        }`}
                        onMouseEnter={() => setHoveredCommentId(comment.id)}
                        onMouseLeave={() => setHoveredCommentId(null)}
                        onClick={() => startEditingComment(comment)}
                      >
                        <div className="flex-1">
                          {comment.selectedText ? (
                            <div className="mb-2">
                              <Badge variant="default" className="text-xs bg-navy-blue-600 mb-1">
                                📝 Text-specific instruction
                              </Badge>
                              <div className="text-sm font-medium text-navy-blue-800 bg-navy-blue-100 px-2 py-1 rounded mb-1">
                                "{comment.selectedText}"
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs mb-2 border-navy-blue-300">
                              📍 Position-based instruction
                            </Badge>
                          )}
                          
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                className="min-h-[60px] text-sm"
                                placeholder="Edit your AI instruction..."
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditedComment}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditingComment}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-800">
                              <span className="font-medium">AI Instruction:</span> {comment.content}
                              <div className="text-xs text-gray-500 mt-1">Click to edit</div>
                            </div>
                          )}
                        </div>
                        
                        {editingCommentId !== comment.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeComment(comment.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setCurrentPhase(1)} variant="outline">
                    Back to Phase 1
                  </Button>
                  <Button 
                    onClick={handleFinalSave} 
                    disabled={isSaving}
                    className={`relative overflow-hidden transition-all duration-200 ${
                      isSaving ? 'bg-navy-blue-50 border-navy-blue-200' : ''
                    }`}
                    style={{
                      background: isSaving
                        ? `linear-gradient(90deg, 
                            rgba(59, 130, 246, 0.1) 0%, 
                            rgba(59, 130, 246, 0.1) ${saveProgress}%, 
                            transparent ${saveProgress}%, 
                            transparent 100%)`
                        : undefined
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      {isSaving && (
                        <div 
                          className="h-3 w-3 rounded-full border-2 border-navy-blue-600 border-t-transparent animate-spin"
                          style={{
                            animationDuration: '1s'
                          }}
                        />
                      )}
                      {!isSaving && <Save className="w-4 h-4" />}
                      <span>
                        {isSaving
                          ? `Saving... ${Math.round(saveProgress)}%`
                          : "Save Complete Template"}
                      </span>
                    </div>
                    {/* Precise progress indicator - subtle border animation */}
                    {isSaving && (
                      <div 
                        className="absolute bottom-0 left-0 h-0.5 bg-navy-blue-500 transition-all duration-100 ease-out"
                        style={{
                          width: `${saveProgress}%`
                        }}
                      />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Comment Dialog */}
        <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add AI Instruction {newCommentType === 'selection' ? 'for Selected Text' : 'at Position'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedText && newCommentType === 'selection' && (
                <div className="p-2 bg-gray-100 rounded text-sm">
                  <strong>Selected text:</strong> "{selectedText}"
                </div>
              )}
              <div>
                <Label>Instruction for AI:</Label>
                <Textarea
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="e.g., always place vitals in a single line, use bullet points here, make this section more concise..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addComment} disabled={!newCommentContent.trim()}>
                  Add Instruction
                </Button>
                <Button onClick={() => setShowCommentDialog(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}