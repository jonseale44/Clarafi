/**
 * User Note Templates API Routes
 * Handles custom template creation, sharing, and management
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertUserNoteTemplateSchema, insertTemplateShareSchema, insertUserNotePreferencesSchema } from "@shared/schema";
import { TemplatePromptGenerator } from "./template-prompt-generator";
import { ClinicalNoteTemplates } from "./routes"; // Import your existing templates

export default function setupTemplateRoutes(app: Express) {
  
  // Get user's custom templates
  app.get("/api/templates/user", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      const userId = (req as any).user.id;
      console.log(`📋 [Templates] Fetching templates for user ${userId}`);
      
      const templates = await storage.getUserNoteTemplates(userId);
      
      console.log(`📋 [Templates] Retrieved ${templates.length} templates for user ${userId}`);
      res.json(templates);
    } catch (error: any) {
      console.error("❌ [Templates] Error fetching user templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get templates by note type (includes base templates + custom)
  app.get("/api/templates/by-type/:noteType", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        console.log("❌ [Templates] Unauthorized request to by-type endpoint");
        return res.sendStatus(401);
      }
      
      const userId = (req as any).user.id;
      const { noteType } = req.params;
      
      // Get user's custom templates for this note type
      const customTemplates = await storage.getUserTemplatesByType(userId, noteType);
      
      // Add base template option
      const displayName = noteType === 'hAndP' ? 'H&P' : noteType.toUpperCase();
      const baseTemplateOption = {
        id: `base-${noteType}`,
        templateName: displayName,
        displayName: `${displayName} (Standard)`,
        baseNoteType: noteType,
        isPersonal: false,
        isDefault: false,
        isBaseTemplate: true
      };
      
      const allTemplates = [baseTemplateOption, ...customTemplates];
      
      console.log(`📋 [Templates] Retrieved ${allTemplates.length} templates for ${noteType} (user ${userId})`);
      console.log(`📋 [Templates] Custom templates found:`, customTemplates.map(t => ({ id: t.id, name: t.displayName, type: t.baseNoteType })));
      res.json(allTemplates);
    } catch (error: any) {
      console.error("❌ [Templates] Error fetching templates by type:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Create new custom template from example
  app.post("/api/templates/create-from-example", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      const userId = (req as any).user.id;
      const { templateName, displayName, baseNoteType, exampleNote } = req.body;
      
      if (!templateName || !displayName || !baseNoteType || !exampleNote) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      console.log(`🏗️ [Templates] Creating template "${templateName}" for user ${userId}`);
      
      // Generate GPT prompt from example
      console.log(`🧠 [Templates] Generating prompt from example for ${templateName}`);
      const generatedPrompt = await TemplatePromptGenerator.generatePromptFromExample(
        baseNoteType,
        exampleNote,
        templateName
      );
      console.log(`✅ [Templates] Generated prompt (${generatedPrompt.length} chars)`);
      
      // Create template
      const templateData = {
        userId,
        templateName,
        baseNoteType,
        displayName,
        isPersonal: true,
        isDefault: false,
        createdBy: userId,
        exampleNote,
        generatedPrompt,
        enableAiLearning: true,
        learningConfidence: "0.75",
        active: true,
        version: 1
      };
      
      console.log(`💾 [Templates] Saving template to database:`, {
        userId: templateData.userId,
        templateName: templateData.templateName,
        baseNoteType: templateData.baseNoteType,
        displayName: templateData.displayName
      });
      
      const created = await storage.createUserNoteTemplate(templateData);
      
      // Automatically create admin prompt review for the generated prompt
      try {
        await storage.createAdminPromptReview({
          templateId: created.id,
          originalPrompt: generatedPrompt,
          reviewStatus: "pending"
        });
        console.log(`📋 [Templates] Created admin prompt review for template ${created.id}`);
      } catch (reviewError) {
        console.error("⚠️ [Templates] Failed to create admin prompt review:", reviewError);
        // Continue execution - don't fail template creation if review creation fails
      }
      
      console.log(`✅ [Templates] Created template "${templateName}" with ID ${created.id}`);
      res.json(created);
    } catch (error: any) {
      console.error("❌ [Templates] Error creating template:", error);
      console.error("❌ [Templates] Error stack:", error.stack);
      console.error("❌ [Templates] Error details:", {
        name: error.name,
        message: error.message,
        code: error.code
      });
      res.status(500).json({ 
        error: "Failed to create template",
        details: error.message 
      });
    }
  });

  // Generate example note from base template
  app.post("/api/templates/generate-example", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { noteType, patientId, sampleTranscription } = req.body;
      
      if (!noteType) {
        return res.status(400).json({ error: "Note type is required" });
      }
      
      console.log(`📝 [Templates] Generating example ${noteType} note`);
      
      // Use your existing clinical note generation with sample data
      const samplePatientContext = `
PATIENT CONTEXT:
- Name: John Doe
- Age: 65 years old
- Gender: Male
- MRN: SAMPLE123

ACTIVE MEDICAL PROBLEMS:
- Hypertension, well controlled
- Type 2 diabetes mellitus
- Chronic kidney disease stage 3

CURRENT MEDICATIONS:
- Metformin 1000mg twice daily
- Lisinopril 10mg daily
- Atorvastatin 20mg daily

KNOWN ALLERGIES:
- Penicillin (rash)

RECENT VITALS:
- BP: 128/78 mmHg
- HR: 72 bpm
- Temp: 98.6°F
- RR: 16/min
- SpO2: 98% RA
      `.trim();
      
      const sampleTranscript = sampleTranscription || `Patient presents for routine follow-up. Reports feeling well overall. Blood pressure well controlled on current medications. Blood sugar levels have been stable. No new symptoms or concerns. Taking medications as prescribed. Exercise tolerance good. No chest pain or shortness of breath.`;
      
      // Get base template prompt
      const basePrompt = ClinicalNoteTemplates.getPrompt(noteType, samplePatientContext, sampleTranscript);
      
      // Generate example note (simplified for example generation)
      const exampleNote = await generateExampleNote(basePrompt);
      
      res.json({ exampleNote, sampleContext: samplePatientContext, sampleTranscript });
    } catch (error: any) {
      console.error("❌ [Templates] Error generating example:", error);
      res.status(500).json({ error: "Failed to generate example" });
    }
  });

  // Update existing template
  app.put("/api/templates/:templateId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      const { exampleNote, displayName, enableAiLearning } = req.body;
      
      // Verify ownership
      const existing = await storage.getUserNoteTemplate(parseInt(templateId));
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      const updates: any = { displayName, enableAiLearning };
      
      // If example note changed, regenerate prompt
      if (exampleNote && exampleNote !== existing.exampleNote) {
        console.log(`🔄 [Templates] Updating template ${templateId} - regenerating prompt`);
        
        updates.exampleNote = exampleNote;
        updates.generatedPrompt = await TemplatePromptGenerator.generatePromptFromExample(
          existing.baseNoteType,
          exampleNote,
          existing.templateName
        );
        updates.version = (existing.version || 1) + 1;
      }
      
      const updated = await storage.updateUserNoteTemplate(parseInt(templateId), updates);
      
      console.log(`✅ [Templates] Updated template ${templateId}`);
      res.json(updated);
    } catch (error: any) {
      console.error("❌ [Templates] Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Duplicate template
  app.post("/api/templates/:templateId/duplicate", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      
      // Verify ownership
      const existing = await storage.getUserNoteTemplate(parseInt(templateId));
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      // Generate unique name with (1), (2), etc.
      const baseName = existing.templateName;
      let newName = `${baseName} (1)`;
      let counter = 1;
      
      // Check if name exists and increment counter
      while (await storage.templateNameExists(userId, newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
      }
      
      // Create duplicate with new name
      const duplicateData = {
        userId: userId,
        templateName: newName,
        displayName: `${existing.displayName} (${counter})`,
        baseNoteType: existing.baseNoteType,
        exampleNote: existing.exampleNote || "",
        generatedPrompt: existing.generatedPrompt || "",
        enableAiLearning: existing.enableAiLearning ?? true,
        learningConfidence: existing.learningConfidence || "0.75",
        isPersonal: true,
        isDefault: false,
        createdBy: userId,
        parentTemplateId: existing.id,
        active: true,
        version: 1,
        usageCount: 0
      };
      
      const duplicate = await storage.createUserNoteTemplate(duplicateData);
      
      console.log(`✅ [Templates] Duplicated template ${templateId} as "${newName}"`);
      res.json(duplicate);
    } catch (error: any) {
      console.error("❌ [Templates] Error duplicating template:", error);
      res.status(500).json({ error: "Failed to duplicate template" });
    }
  });

  // Delete template
  app.delete("/api/templates/:templateId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      
      // Verify ownership
      const existing = await storage.getUserNoteTemplate(parseInt(templateId));
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      await storage.deleteUserNoteTemplate(parseInt(templateId));
      
      console.log(`🗑️ [Templates] Deleted template ${templateId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ [Templates] Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Set default template for note type
  app.post("/api/templates/:templateId/set-default", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      
      // Verify ownership
      const template = await storage.getUserNoteTemplate(parseInt(templateId));
      if (!template || template.userId !== userId) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      await storage.setDefaultTemplate(userId, parseInt(templateId), template.baseNoteType);
      
      console.log(`⭐ [Templates] Set template ${templateId} as default for ${template.baseNoteType}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ [Templates] Error setting default:", error);
      res.status(500).json({ error: "Failed to set default template" });
    }
  });

  // Update existing template
  app.put("/api/templates/:templateId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      const { templateName, displayName, baseNoteType, baseNoteText, inlineComments } = req.body;
      
      // Verify template ownership or admin access
      const template = await storage.getUserNoteTemplate(parseInt(templateId));
      const isAdmin = (req as any).user.role === 'admin';
      
      if (!template || (template.userId !== userId && !isAdmin)) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      // If admin is editing, generate new prompt from updated template
      let generatedPrompt = template.generatedPrompt; // Keep existing by default
      
      if (baseNoteText && inlineComments) {
        try {
          const promptGenerator = new TemplatePromptGenerator();
          generatedPrompt = await promptGenerator.generatePromptFromTemplate(
            baseNoteText,
            inlineComments,
            baseNoteType
          );
          console.log(`🤖 [Templates] Generated new prompt for updated template (${generatedPrompt.length} chars)`);
        } catch (promptError) {
          console.error("⚠️ [Templates] Failed to generate new prompt, keeping existing:", promptError);
        }
      }
      
      const updateData = {
        templateName,
        displayName,
        baseNoteType,
        baseNoteText,
        inlineComments: JSON.stringify(inlineComments || []),
        generatedPrompt,
        updatedAt: new Date()
      };
      
      const updated = await storage.updateUserNoteTemplate(parseInt(templateId), updateData);
      
      console.log(`✅ [Templates] Updated template ${templateId} by ${isAdmin ? 'admin' : 'user'}`);
      res.json(updated);
    } catch (error: any) {
      console.error("❌ [Templates] Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Share template with another user
  app.post("/api/templates/:templateId/share", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { templateId } = req.params;
      const { targetUsername, shareMessage } = req.body;
      
      if (!targetUsername) {
        return res.status(400).json({ error: "Target username is required" });
      }
      
      // Verify template ownership
      const template = await storage.getUserNoteTemplate(parseInt(templateId));
      if (!template || template.userId !== userId) {
        return res.status(403).json({ error: "Template not found or access denied" });
      }
      
      // Find target user
      const targetUser = await storage.getUserByUsername(targetUsername);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create share
      const share = await storage.createTemplateShare({
        templateId: parseInt(templateId),
        sharedBy: userId,
        sharedWith: targetUser.id,
        shareMessage: shareMessage || "",
        status: "pending"
      });
      
      console.log(`📤 [Templates] Shared template ${templateId} with user ${targetUser.username}`);
      res.json(share);
    } catch (error: any) {
      console.error("❌ [Templates] Error sharing template:", error);
      res.status(500).json({ error: "Failed to share template" });
    }
  });

  // Get pending template shares
  app.get("/api/templates/pending-shares", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const pendingShares = await storage.getPendingTemplateShares(userId);
      
      console.log(`📥 [Templates] Retrieved ${pendingShares.length} pending shares for user ${userId}`);
      res.json(pendingShares);
    } catch (error: any) {
      console.error("❌ [Templates] Error fetching pending shares:", error);
      res.status(500).json({ error: "Failed to fetch pending shares" });
    }
  });

  // Accept shared template
  app.post("/api/templates/shares/:shareId/accept", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req as any).user.id;
      const { shareId } = req.params;
      
      const adoptedTemplate = await storage.adoptSharedTemplate(userId, parseInt(shareId));
      
      console.log(`✅ [Templates] User ${userId} adopted shared template ${adoptedTemplate.id}`);
      res.json(adoptedTemplate);
    } catch (error: any) {
      console.error("❌ [Templates] Error accepting share:", error);
      res.status(500).json({ error: "Failed to accept shared template" });
    }
  });

  // Decline shared template
  app.post("/api/templates/shares/:shareId/decline", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { shareId } = req.params;
      
      await storage.updateTemplateShareStatus(parseInt(shareId), "declined");
      
      console.log(`❌ [Templates] Declined share ${shareId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ [Templates] Error declining share:", error);
      res.status(500).json({ error: "Failed to decline share" });
    }
  });

  // Delete template
  app.delete("/api/templates/:templateId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      const userId = (req as any).user.id;
      const templateId = parseInt(req.params.templateId);
      
      if (!templateId) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Check if template belongs to user
      const template = await storage.getUserNoteTemplate(templateId);
      if (!template || template.userId !== userId) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      await storage.deleteUserNoteTemplate(templateId);
      
      console.log(`✅ [Templates] Deleted template "${template.templateName}" (ID: ${templateId})`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ [Templates] Error deleting template:", error);
      res.status(500).json({ 
        error: "Failed to delete template",
        details: error.message 
      });
    }
  });

}

// Helper function for generating example notes
async function generateExampleNote(prompt: string): Promise<string> {
    // Simplified example generation - in production, use your existing OpenAI integration
    const commonExamples = {
      soap: `**SUBJECTIVE:**
- Patient reports feeling well overall with good energy levels
- Blood pressure medications well tolerated, no side effects
- Blood sugar levels stable with current regimen
- Denies chest pain, shortness of breath, or palpitations
- No new symptoms or concerns since last visit

**OBJECTIVE:**
Vitals: BP: 128/78 mmHg | HR: 72 bpm | Temp: 98.6°F | RR: 16/min | SpO2: 98% RA

Physical Exam:
Gen: Well-appearing, NAD
CV: RRR, no murmurs, gallops, or rubs
Lungs: CTAB, no wheezes or crackles
Ext: No edema, pulses intact

**ASSESSMENT:**
1. Hypertension - well controlled on current medications
2. Type 2 diabetes mellitus - stable glycemic control
3. Chronic kidney disease stage 3 - stable

**PLAN:**
1. Continue current antihypertensive regimen
2. Maintain diabetes management with metformin
3. Follow up in 3 months with routine labs
4. Patient education on diet and exercise reinforced`,

      progress: `**INTERVAL HISTORY:**
Patient continues to do well on hospital day 2. Pain well controlled with current regimen. Ambulating independently. Tolerating regular diet without issues.

**PHYSICAL EXAM:**
Vitals stable. Afebrile. Surgical site clean, dry, intact with no signs of infection.

**ASSESSMENT & PLAN:**
1. Post-operative day 2 - recovering well
2. Pain management adequate
3. Plan for discharge tomorrow if continues stable
4. Follow-up scheduled in clinic in 1 week`
    };

    // Return a sample based on note type detection
    if (prompt.toLowerCase().includes('soap')) {
      return commonExamples.soap;
    } else if (prompt.toLowerCase().includes('progress')) {
      return commonExamples.progress;
    } else {
      return commonExamples.soap; // Default fallback
    }
}