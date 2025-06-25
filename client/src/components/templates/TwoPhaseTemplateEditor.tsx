import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Edit3, Save, X, Plus } from 'lucide-react';
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
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);
    
    if (text.length > 0) {
      setSelectedText(text);
      setSelectionStart(start);
      setSelectionEnd(end);
      setNewCommentType('selection');
      setShowCommentDialog(true);
    }
  }, []);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (!textareaRef.current || !phase1Saved) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert click position to text position (approximation)
    const lineHeight = 20; // Approximate line height
    const charWidth = 8; // Approximate character width
    const line = Math.floor(y / lineHeight);
    const char = Math.floor(x / charWidth);
    
    const lines = noteText.split('\n');
    let position = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    position += Math.min(char, lines[line]?.length || 0);
    
    setSelectionStart(position);
    setSelectionEnd(position);
    setSelectedText('');
    setNewCommentType('insertion');
    setShowCommentDialog(true);
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
    
    setComments(prev => [...prev, newComment]);
    setShowCommentDialog(false);
    setNewCommentContent('');
    console.log(`💬 Added ${newCommentType} comment:`, newComment.content);
  };

  const removeComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    console.log('🗑️ Removed comment:', commentId);
  };

  const getCommentIndicators = () => {
    return comments.map(comment => {
      // Calculate approximate pixel position for comment indicator
      const lines = noteText.substring(0, comment.position).split('\n');
      const line = lines.length - 1;
      const char = lines[line].length;
      
      return (
        <div
          key={comment.id}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-blue-600 z-10"
          style={{
            left: `${char * 8 + 8}px`,
            top: `${line * 20 + 8}px`
          }}
          title={`Comment: ${comment.content}`}
          onClick={(e) => {
            e.stopPropagation();
            // Could show comment details here
          }}
        />
      );
    });
  };

  const handleFinalSave = () => {
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
    
    onSave(templateData);
    console.log('🎉 Final template saved with', comments.length, 'comments');
  };

  const generateFinalTemplate = () => {
    // Process the base note text and inject {{}} comments
    let processedText = noteText;
    const sortedComments = [...comments].sort((a, b) => b.position - a.position);
    
    for (const comment of sortedComments) {
      if (comment.type === 'insertion') {
        processedText = 
          processedText.slice(0, comment.position) +
          `{{${comment.content}}} ` +
          processedText.slice(comment.position);
      } else if (comment.type === 'selection' && comment.selectedText) {
        const commentedText = `${comment.selectedText} {{${comment.content}}}`;
        processedText = processedText.replace(comment.selectedText, commentedText);
      }
    }
    
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
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>Instructions:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• <strong>Select text</strong> to add instructions about that specific content</li>
                    <li>• <strong>Click anywhere</strong> to add general instructions at that position</li>
                    <li>• Comments appear as blue dots - hover to see content</li>
                    <li>• These instructions will guide AI note generation</li>
                  </ul>
                </div>

                <div className="relative">
                  <div 
                    ref={overlayRef}
                    className="absolute inset-0 z-10 pointer-events-none"
                  >
                    {getCommentIndicators()}
                  </div>
                  
                  <Textarea
                    value={noteText}
                    readOnly
                    className="min-h-[300px] font-mono bg-gray-50 relative z-20 cursor-text"
                    onMouseUp={handleTextSelection}
                    onClick={handleOverlayClick}
                  />
                </div>

                {/* Comments List */}
                {comments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current AI Instructions:</Label>
                    {comments.map(comment => (
                      <div key={comment.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Badge variant={comment.type === 'selection' ? 'default' : 'secondary'}>
                          {comment.type === 'selection' ? 'Text' : 'Position'}
                        </Badge>
                        <div className="flex-1">
                          {comment.selectedText && (
                            <div className="text-xs text-gray-600 italic">
                              "{comment.selectedText}"
                            </div>
                          )}
                          <div className="text-sm">{comment.content}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeComment(comment.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setCurrentPhase(1)} variant="outline">
                    Back to Phase 1
                  </Button>
                  <Button onClick={handleFinalSave} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Complete Template
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