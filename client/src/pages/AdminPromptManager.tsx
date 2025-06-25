import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, CheckCircle, Clock, Users, FileText, Settings } from "lucide-react";
import { TwoPhaseTemplateEditor } from "@/components/templates/TwoPhaseTemplateEditor";

interface AdminPromptReview {
  id: number;
  templateId: number;
  originalPrompt: string;
  reviewedPrompt?: string;
  reviewStatus: "pending" | "reviewed" | "approved";
  reviewNotes?: string;
  isActive: boolean;
  createdAt: string;
  reviewedAt?: string;
  template: {
    id: number;
    templateName: string;
    baseNoteType: string;
    displayName: string;
  };
  user: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface TemplateWithPrompt {
  id: number;
  templateName: string;
  baseNoteType: string;
  displayName: string;
  userId: number;
  hasActivePrompt: boolean;
  activePromptLength: number;
}

export default function AdminPromptManager() {
  const [selectedReview, setSelectedReview] = useState<AdminPromptReview | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithPrompt | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending reviews
  const { data: pendingReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["/api/admin/prompt-reviews/pending"],
    retry: false,
  });

  // Fetch all templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/admin/templates"],
    retry: false,
  });

  // Update review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async (data: { reviewId: number; reviewedPrompt: string; reviewNotes: string }) => {
      const response = await fetch(`/api/admin/prompt-reviews/${data.reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewedPrompt: data.reviewedPrompt,
          reviewNotes: data.reviewNotes,
          reviewStatus: "reviewed"
        }),
      });
      if (!response.ok) throw new Error("Failed to update review");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-reviews/pending"] });
      toast({ title: "Review updated", description: "Prompt changes saved successfully." });
      setSelectedReview(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update review.", variant: "destructive" });
    },
  });

  // Activate prompt mutation
  const activatePromptMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await fetch(`/api/admin/prompt-reviews/${reviewId}/activate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to activate prompt");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-reviews/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({ title: "Prompt activated", description: "The edited prompt is now active for this template." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to activate prompt.", variant: "destructive" });
    },
  });

  const handleEditPrompt = (review: AdminPromptReview) => {
    setSelectedReview(review);
    setEditedPrompt(review.reviewedPrompt || review.originalPrompt);
    setReviewNotes(review.reviewNotes || "");
  };

  const handleSaveEdit = () => {
    if (!selectedReview) return;
    
    updateReviewMutation.mutate({
      reviewId: selectedReview.id,
      reviewedPrompt: editedPrompt,
      reviewNotes: reviewNotes
    });
  };

  const handleActivatePrompt = (reviewId: number) => {
    activatePromptMutation.mutate(reviewId);
  };

  const handleTemplateEdit = async (templateData: any) => {
    // Update template via API
    try {
      const response = await fetch(`/api/templates/${editingTemplate?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) throw new Error('Failed to update template');
      
      // Refresh data and close editor
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setEditingTemplate(null);
      
      toast({ 
        title: "Template updated", 
        description: "The template has been successfully updated." 
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update template.", 
        variant: "destructive" 
      });
    }
  };

  if (loadingReviews || loadingTemplates) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Prompt Manager</h1>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Prompt Manager</h1>
        <p className="text-muted-foreground mt-2">
          Review and edit GPT-generated prompts from user templates to optimize clinical note generation.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Reviews ({pendingReviews?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Templates ({templates?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {!pendingReviews || pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No pending prompt reviews found.</p>
              </CardContent>
            </Card>
          ) : (
            pendingReviews.map((review: AdminPromptReview) => (
              <Card key={review.id} className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {review.template.displayName}
                        <Badge variant="outline">{review.template.baseNoteType.toUpperCase()}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Created by {review.user.firstName} {review.user.lastName} ({review.user.username})
                        • Generated {new Date(review.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Original
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Original GPT-Generated Prompt</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                              {review.originalPrompt}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        onClick={() => handleEditPrompt(review)}
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Prompt
                      </Button>
                      
                      {review.reviewedPrompt && (
                        <Button
                          onClick={() => handleActivatePrompt(review.id)}
                          variant="default"
                          size="sm"
                          disabled={activatePromptMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Template ID:</span> {review.templateId}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2" variant={
                        review.reviewStatus === "approved" ? "default" :
                        review.reviewStatus === "reviewed" ? "secondary" : "outline"
                      }>
                        {review.reviewStatus}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Original Length:</span> {review.originalPrompt.length} chars
                    </div>
                    <div>
                      <span className="font-medium">Active:</span>
                      <Badge className="ml-2" variant={review.isActive ? "default" : "outline"}>
                        {review.isActive ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                  {review.reviewNotes && (
                    <div className="mt-4">
                      <span className="font-medium">Review Notes:</span>
                      <p className="text-sm text-muted-foreground mt-1">{review.reviewNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates?.map((template: TemplateWithPrompt) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.displayName}
                        <Badge variant="outline">{template.baseNoteType.toUpperCase()}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Template ID: {template.id} • User ID: {template.userId}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.hasActivePrompt ? "default" : "secondary"}>
                        {template.hasActivePrompt ? "Has Admin Prompt" : "Using Original"}
                      </Badge>
                      {template.hasActivePrompt && (
                        <span className="text-sm text-muted-foreground">
                          ({template.activePromptLength} chars)
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate(template)}
                        className="ml-2"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Template
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Prompt Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prompt: {selectedReview?.template.displayName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Original User Template */}
            <div>
              <Label className="text-sm font-medium">Original User Template</Label>
              <div className="text-xs text-gray-500 mb-2">
                This is what the user submitted as their example note
              </div>
              <Textarea
                value={selectedReview?.template?.exampleNote || "No original template available"}
                readOnly
                className="mt-2 h-48 font-mono text-xs bg-gray-50"
              />
            </div>

            {/* Side by side GPT vs Edited */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">GPT-Generated Prompt</Label>
                <div className="text-xs text-gray-500 mb-2">
                  What AI automatically created from the user's template
                </div>
                <Textarea
                  value={selectedReview?.originalPrompt || ""}
                  readOnly
                  className="mt-2 h-96 font-mono text-xs"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Your Improved Version</Label>
                <div className="text-xs text-gray-500 mb-2">
                  Edit the prompt with your clinical expertise
                </div>
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="mt-2 h-96 font-mono text-xs"
                  placeholder="Edit the prompt to improve clinical note generation..."
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Label className="text-sm font-medium">Review Notes</Label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-2"
              placeholder="Add notes about your changes and improvements..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateReviewMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      {editingTemplate && (
        <TwoPhaseTemplateEditor
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          mode="edit"
          initialData={{
            templateName: editingTemplate.templateName,
            displayName: editingTemplate.displayName,
            baseNoteType: editingTemplate.baseNoteType,
            baseNoteText: "", // Will need to fetch this from API
            inlineComments: []
          }}
          onSave={handleTemplateEdit}
        />
      )}
    </div>
  );
}