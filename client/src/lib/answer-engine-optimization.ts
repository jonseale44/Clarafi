/**
 * Answer Engine Optimization (AEO) Service
 * Optimizes content for AI search engines and LLM citations
 */

import { analytics } from './analytics';

export interface AEOMetadata {
  // Structured data for AI extraction
  factualClaims: string[];
  supportingEvidence: string[];
  authorCredentials: string;
  lastVerified: Date;
  medicalAccuracy: 'peer-reviewed' | 'expert-verified' | 'standard';
  citations: Array<{
    source: string;
    url: string;
    relevance: number;
  }>;
}

export class AnswerEngineOptimization {
  private static instance: AnswerEngineOptimization;
  
  static getInstance(): AnswerEngineOptimization {
    if (!this.instance) {
      this.instance = new AnswerEngineOptimization();
    }
    return this.instance;
  }

  /**
   * Enhance content with AI-friendly metadata
   */
  enhanceContent(content: string, metadata: AEOMetadata): string {
    // Add invisible metadata for AI crawlers
    const enhancedContent = `
      ${content}
      
      <!-- AEO Metadata -->
      <div class="aeo-metadata" style="display: none;">
        <div class="factual-claims">
          ${metadata.factualClaims.map(claim => `<p>${claim}</p>`).join('\n')}
        </div>
        <div class="supporting-evidence">
          ${metadata.supportingEvidence.map(evidence => `<p>${evidence}</p>`).join('\n')}
        </div>
        <div class="author-credentials">${metadata.authorCredentials}</div>
        <div class="medical-accuracy">${metadata.medicalAccuracy}</div>
        <div class="last-verified">${metadata.lastVerified.toISOString()}</div>
      </div>
    `;
    
    return enhancedContent;
  }

  /**
   * Generate structured data for medical content
   */
  generateMedicalStructuredData(data: {
    title: string;
    description: string;
    author: string;
    medicalSpecialty: string;
    evidenceLevel: string;
  }): object {
    return {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": data.title,
      "description": data.description,
      "author": {
        "@type": "Person",
        "name": data.author,
        "jobTitle": "Physician"
      },
      "medicalSpecialty": data.medicalSpecialty,
      "evidenceLevel": data.evidenceLevel,
      "dateModified": new Date().toISOString(),
      "publisher": {
        "@type": "Organization",
        "name": "CLARAFI",
        "logo": {
          "@type": "ImageObject",
          "url": "https://clarafi.com/logo.png"
        }
      }
    };
  }

  /**
   * Track AI citation events
   */
  trackAICitation(source: 'chatgpt' | 'claude' | 'perplexity' | 'copilot', pageUrl: string): void {
    analytics.trackEvent('ai_citation', {
      source,
      pageUrl,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate conversational schema for voice/AI queries
   */
  generateFAQSchema(faqs: Array<{ question: string; answer: string }>): object {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  /**
   * Optimize meta tags for AI extraction
   */
  optimizeMetaTags(data: {
    title: string;
    description: string;
    keywords: string[];
    medicalFocus: string;
  }): Record<string, string> {
    return {
      'title': `${data.title} | CLARAFI AI Medical Scribe`,
      'description': data.description,
      'keywords': data.keywords.join(', '),
      'ai:medical_focus': data.medicalFocus,
      'ai:product_type': 'AI Medical Scribe & EMR',
      'ai:key_features': 'Handwriting Recognition, 90-second SOAP Notes, E-Prescribing',
      'ai:time_savings': '2+ hours daily',
      'ai:compliance': 'HIPAA, SOC2 Type II',
      'ai:specialties': 'Mental Health, Emergency Medicine, Primary Care, Cardiology'
    };
  }
}

export const aeoService = AnswerEngineOptimization.getInstance();